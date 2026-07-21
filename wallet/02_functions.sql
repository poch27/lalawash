-- ============================================================
-- 02_functions.sql — all wallet mutations go through these.
-- Clients NEVER insert into wallet_transactions directly (RLS blocks it).
-- All functions are SECURITY DEFINER so they can write the append-only table,
-- but each re-checks the caller's staff role from auth.uid().
-- ============================================================

-- ── Helper: current staff row (or null) ────────────────
create or replace function current_staff() returns staff
language sql stable security definer set search_path = public as $$
  select * from staff where id = auth.uid() and is_active limit 1;
$$;

-- ── Helper: expire stale bonus credits (lazy, idempotent) ─
-- For each bonus lot past its expiry that still has remaining value, write an
-- offsetting 'expire' row. Called before every balance read/deduct.
create or replace function expire_stale_bonuses(p_customer uuid, p_staff uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  lot record;
  consumed numeric(10,2);
  remaining numeric(10,2);
begin
  -- Each founding/bonus lot is identified by its original row id.
  for lot in
    select t.id, t.amount, t.bonus_expires_at
    from wallet_transactions t
    where t.customer_id = p_customer
      and t.type = 'bonus'
      and t.bonus_expires_at is not null
      and t.bonus_expires_at < current_date
  loop
    -- How much of THIS lot was already consumed or expired?
    select coalesce(sum(-amount), 0) into consumed
    from wallet_transactions
    where customer_id = p_customer
      and credit_type = 'bonus'
      and amount < 0
      and reverses_txn_id is not distinct from null   -- deduct/expire rows
      and description = 'lot:' || lot.id;
    remaining := lot.amount - consumed;
    if remaining > 0 then
      insert into wallet_transactions
        (customer_id, type, credit_type, amount, description, staff_id)
      values
        (p_customer, 'expire', 'bonus', -remaining, 'lot:' || lot.id || ' expired', p_staff);
    end if;
  end loop;
end;
$$;

-- ── Balance ────────────────────────────────────────────
-- Returns paid, bonus (live/unexpired), and total.
create or replace function get_balance(p_customer uuid)
returns table (paid numeric, bonus numeric, total numeric)
language sql stable security definer set search_path = public as $$
  select
    coalesce(sum(amount) filter (where credit_type = 'paid'), 0)  as paid,
    coalesce(sum(amount) filter (where credit_type = 'bonus'), 0) as bonus,
    coalesce(sum(amount), 0)                                       as total
  from wallet_transactions
  where customer_id = p_customer;
$$;

-- ── Perks status ───────────────────────────────────────
-- Perks are tied to the most recent qualifying load (>= 1000).
-- Founder: +90 days, Starter: +30 days.
create or replace function get_perks(p_customer uuid)
returns table (active boolean, until date)
language sql stable security definer set search_path = public as $$
  with last_load as (
    select t.created_at::date as d
    from wallet_transactions t
    where t.customer_id = p_customer and t.type = 'load' and t.amount >= 1000
    order by t.created_at desc limit 1
  ),
  c as (select tier from customers where id = p_customer)
  select
    case when ll.d is null then false
         else (ll.d + (case when c.tier = 'founder' then 75 else 30 end)) >= current_date end,
    case when ll.d is null then null
         else (ll.d + (case when c.tier = 'founder' then 75 else 30 end)) end
  from c left join last_load ll on true;
$$;

-- ── LOAD ───────────────────────────────────────────────
-- Adds paid credit. On the customer's FIRST qualifying load (>= 1000) and if they
-- have not yet received a founding bonus, also grants the tier's founding bonus
-- (Founder 300 / Starter 100), expiring in 90 days.
create or replace function load_wallet(
  p_customer uuid, p_amount numeric, p_method payment_method
) returns table (paid numeric, bonus numeric, total numeric)
language plpgsql security definer set search_path = public as $$
declare
  s staff := current_staff();
  v_tier tier_type;
  v_already_bonused boolean;
  v_bonus numeric(10,2);
  v_load_id bigint;
begin
  if s.id is null then raise exception 'not authorized'; end if;
  if p_amount < 200 then raise exception 'minimum load is 200'; end if;

  select tier into v_tier from customers where id = p_customer;

  insert into wallet_transactions (customer_id, type, credit_type, amount, method, staff_id)
  values (p_customer, 'load', 'paid', p_amount, p_method, s.id)
  returning id into v_load_id;

  if p_amount >= 1000 then
    select exists(
      select 1 from wallet_transactions
      where customer_id = p_customer and is_founding_bonus
    ) into v_already_bonused;

    if not v_already_bonused then
      v_bonus := case when v_tier = 'founder' then 300 else 100 end;
      insert into wallet_transactions
        (customer_id, type, credit_type, amount, description, bonus_expires_at, is_founding_bonus, staff_id)
      values
        (p_customer, 'bonus', 'bonus', v_bonus, 'Founding bonus',
         current_date + 90, true, s.id);
    end if;
  end if;

  insert into audit_log (staff_id, action, customer_id, detail)
  values (s.id, 'load', p_customer,
          jsonb_build_object('amount', p_amount, 'method', p_method, 'load_id', v_load_id));

  return query select * from get_balance(p_customer);
end;
$$;

-- ── DEDUCT ─────────────────────────────────────────────
-- Consumes bonus credits first (oldest unexpired lot first), then paid.
-- Writes one row per portion, tagging bonus consumption with 'lot:<id>' so
-- expire_stale_bonuses can track per-lot remaining. Errors if balance short.
create or replace function deduct_wallet(
  p_customer uuid, p_amount numeric, p_description text
) returns table (paid numeric, bonus numeric, total numeric)
language plpgsql security definer set search_path = public as $$
declare
  s staff := current_staff();
  v_need numeric(10,2) := p_amount;
  v_paid numeric; v_bonus numeric; v_total numeric;
  lot record; lot_remaining numeric(10,2); take numeric(10,2);
begin
  if s.id is null then raise exception 'not authorized'; end if;
  if p_amount <= 0 then raise exception 'amount must be positive'; end if;

  perform expire_stale_bonuses(p_customer, s.id);
  select paid, bonus, total into v_paid, v_bonus, v_total from get_balance(p_customer);
  if v_total < p_amount then
    raise exception 'insufficient balance: have %, need %', v_total, p_amount;
  end if;

  -- Consume bonus lots (unexpired), oldest first.
  for lot in
    select t.id, t.amount from wallet_transactions t
    where t.customer_id = p_customer and t.type = 'bonus'
      and (t.bonus_expires_at is null or t.bonus_expires_at >= current_date)
    order by t.created_at
  loop
    exit when v_need <= 0;
    select lot.amount - coalesce(sum(-amount), 0) into lot_remaining
    from wallet_transactions
    where customer_id = p_customer and credit_type = 'bonus' and amount < 0
      and description = 'lot:' || lot.id;
    if lot_remaining <= 0 then continue; end if;
    take := least(lot_remaining, v_need);
    insert into wallet_transactions (customer_id, type, credit_type, amount, description, staff_id)
    values (p_customer, 'deduct', 'bonus', -take, 'lot:' || lot.id, s.id);
    v_need := v_need - take;
  end loop;

  -- Remainder from paid.
  if v_need > 0 then
    insert into wallet_transactions (customer_id, type, credit_type, amount, description, staff_id)
    values (p_customer, 'deduct', 'paid', -v_need, p_description, s.id);
  end if;

  insert into audit_log (staff_id, action, customer_id, detail)
  values (s.id, 'deduct', p_customer,
          jsonb_build_object('amount', p_amount, 'description', p_description));

  return query select * from get_balance(p_customer);
end;
$$;

-- ── VOID (owner only) ──────────────────────────────────
-- Reverses a prior transaction by inserting an equal-and-opposite row.
-- The original stays; the ledger remains complete and auditable.
create or replace function void_transaction(p_txn bigint, p_reason text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  s staff := current_staff();
  orig wallet_transactions;
begin
  if s.id is null or s.role <> 'owner' then raise exception 'owner only'; end if;
  select * into orig from wallet_transactions where id = p_txn;
  if orig.id is null then raise exception 'transaction not found'; end if;
  if exists (select 1 from wallet_transactions where reverses_txn_id = p_txn) then
    raise exception 'already voided';
  end if;

  insert into wallet_transactions
    (customer_id, type, credit_type, amount, description, reverses_txn_id, staff_id)
  values
    (orig.customer_id, 'void', orig.credit_type, -orig.amount,
     'Void: ' || coalesce(p_reason, ''), p_txn, s.id);

  insert into audit_log (staff_id, action, customer_id, detail)
  values (s.id, 'void', orig.customer_id,
          jsonb_build_object('txn', p_txn, 'reason', p_reason));
end;
$$;

-- ── ADJUST (owner only) — manual correction with reason ─
create or replace function adjust_wallet(
  p_customer uuid, p_amount numeric, p_reason text
) returns table (paid numeric, bonus numeric, total numeric)
language plpgsql security definer set search_path = public as $$
declare s staff := current_staff();
begin
  if s.id is null or s.role <> 'owner' then raise exception 'owner only'; end if;
  insert into wallet_transactions (customer_id, type, credit_type, amount, description, staff_id)
  values (p_customer, 'adjust', 'paid', p_amount, 'Adjustment: ' || coalesce(p_reason,''), s.id);
  insert into audit_log (staff_id, action, customer_id, detail)
  values (s.id, 'adjust', p_customer, jsonb_build_object('amount', p_amount, 'reason', p_reason));
  return query select * from get_balance(p_customer);
end;
$$;

-- ── CLAIM PERK (welcome drink / birthday wash) ─────────
create or replace function claim_perk(p_customer uuid, p_perk perk_type)
returns void
language plpgsql security definer set search_path = public as $$
declare s staff := current_staff(); v_year int;
begin
  if s.id is null then raise exception 'not authorized'; end if;
  v_year := case when p_perk = 'welcome_drink' then 0 else extract(year from current_date)::int end;
  insert into perk_claims (customer_id, perk, claim_year, staff_id)
  values (p_customer, p_perk, v_year, s.id);  -- unique constraint blocks double-claim
  insert into audit_log (staff_id, action, customer_id, detail)
  values (s.id, 'claim_perk', p_customer, jsonb_build_object('perk', p_perk, 'year', v_year));
end;
$$;

-- ── CUSTOMER SELF-VIEW (no login; access_token) ────────
create or replace function get_my_wallet(p_token text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare c customers; b record; pk record;
begin
  select * into c from customers where access_token = p_token and is_active;
  if c.id is null then raise exception 'invalid link'; end if;
  perform expire_stale_bonuses(c.id, (select id from staff where role='owner' limit 1));
  select * into b from get_balance(c.id);
  select * into pk from get_perks(c.id);
  return jsonb_build_object(
    'name', c.full_name,
    'tier', c.tier,
    'paid', b.paid, 'bonus', b.bonus, 'total', b.total,
    'perks_active', pk.active, 'perks_until', pk.until,
    'transactions', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', created_at, 'type', type, 'amount', amount, 'description', description
      ) order by created_at desc), '[]'::jsonb)
      from wallet_transactions where customer_id = c.id
        and type in ('load','bonus','deduct','void','adjust')
    )
  );
end;
$$;

-- ── DAILY SUMMARY (owner dashboard; Medium tier) ───────
create or replace function daily_summary(p_day date default current_date)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'day', p_day,
    'cash_loaded',  coalesce(sum(amount) filter (where type='load' and method='cash'), 0),
    'gcash_loaded', coalesce(sum(amount) filter (where type='load' and method='gcash'), 0),
    'total_loaded', coalesce(sum(amount) filter (where type='load'), 0),
    'total_deducted', coalesce(-sum(amount) filter (where type='deduct'), 0),
    'bonus_granted', coalesce(sum(amount) filter (where type='bonus'), 0),
    'txn_count', count(*) filter (where type in ('load','deduct'))
  )
  from wallet_transactions
  where created_at::date = p_day;
$$;
