-- ============================================================
-- 09_perk_guardrails_period_summary.sql
-- (1) T&C enforcement in the DB — perks can't be claimed outside their rules,
--     no matter what the frontend or a staff member tries:
--       welcome_drink : requires a first load >= 1000
--       birthday_wash : member >= 6 months + perks active + it IS their birthday month
-- (2) Manager role can void (same-day corrections); adjust stays owner-only.
-- (3) period_summary(from, to): month/range dashboard with per-day and
--     per-staff breakdowns (per-staff supports the "hindi nagde-deduct" audit).
-- Applied live 2026-07-19. See the migration in Supabase for the source of truth.
-- ============================================================

create or replace function claim_perk(p_customer uuid, p_perk perk_type)
returns void
language plpgsql security definer set search_path = public as $$
declare
  s staff := current_staff();
  v_year int;
  c customers;
  perks_ok boolean;
begin
  if s.id is null then raise exception 'not authorized'; end if;
  select * into c from customers where id = p_customer;
  if c.id is null then raise exception 'customer not found'; end if;

  if p_perk = 'welcome_drink' then
    if not exists (
      select 1 from wallet_transactions
      where customer_id = p_customer and type = 'load' and amount >= 1000
    ) then
      raise exception 'welcome drink requires a first load of at least 1000';
    end if;
    v_year := 0;
  else -- birthday_wash
    if c.birthday_month is null or c.birthday_month <> extract(month from current_date)::int then
      raise exception 'birthday wash is only claimable during the member''s birthday month';
    end if;
    if c.created_at > now() - interval '6 months' then
      raise exception 'birthday wash requires at least 6 months of membership';
    end if;
    select gp.active into perks_ok from get_perks(p_customer) gp;
    if not coalesce(perks_ok, false) then
      raise exception 'birthday wash requires active member perks — reload 1000+ to renew';
    end if;
    v_year := extract(year from current_date)::int;
  end if;

  insert into perk_claims (customer_id, perk, claim_year, staff_id)
  values (p_customer, p_perk, v_year, s.id);
  insert into audit_log (staff_id, action, customer_id, detail)
  values (s.id, 'claim_perk', p_customer, jsonb_build_object('perk', p_perk, 'year', v_year));
end;
$$;

create or replace function void_transaction(p_txn bigint, p_reason text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  s staff := current_staff();
  orig wallet_transactions;
begin
  if s.id is null or s.role not in ('owner','manager') then
    raise exception 'owner or manager only';
  end if;
  select * into orig from wallet_transactions where id = p_txn;
  if orig.id is null then raise exception 'transaction not found'; end if;
  if exists (select 1 from wallet_transactions where reverses_txn_id = p_txn) then
    raise exception 'already voided';
  end if;
  insert into wallet_transactions
    (customer_id, type, credit_type, amount, description, reverses_txn_id, staff_id)
  values
    (orig.customer_id, orig.type, orig.credit_type, -orig.amount,
     'Void: ' || coalesce(p_reason, ''), p_txn, s.id);
  insert into audit_log (staff_id, action, customer_id, detail)
  values (s.id, 'void', orig.customer_id, jsonb_build_object('txn', p_txn, 'reason', p_reason));
end;
$$;

create or replace function period_summary(p_from date, p_to date)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'from', p_from, 'to', p_to,
    'cash_loaded',   coalesce(sum(amount) filter (where type='load' and method='cash'), 0),
    'gcash_loaded',  coalesce(sum(amount) filter (where type='load' and method='gcash'), 0),
    'total_loaded',  coalesce(sum(amount) filter (where type='load'), 0),
    'total_deducted', coalesce(-sum(amount) filter (where type='deduct'), 0),
    'bonus_granted', coalesce(sum(amount) filter (where type='bonus'), 0),
    'txn_count', count(*) filter (where type in ('load','deduct')),
    'by_day', (
      select coalesce(jsonb_agg(d order by d.day), '[]'::jsonb)
      from (
        select created_at::date as day,
               coalesce(sum(amount) filter (where type='load'), 0) as loaded,
               coalesce(-sum(amount) filter (where type='deduct'), 0) as deducted,
               count(*) filter (where type in ('load','deduct')) as txns
        from wallet_transactions
        where created_at::date between p_from and p_to
        group by 1
      ) d
    ),
    'by_staff', (
      select coalesce(jsonb_agg(st), '[]'::jsonb)
      from (
        select s.name,
               coalesce(sum(t.amount) filter (where t.type='load'), 0) as loaded,
               coalesce(-sum(t.amount) filter (where t.type='deduct'), 0) as deducted,
               count(*) filter (where t.type in ('load','deduct')) as txns
        from wallet_transactions t join staff s on s.id = t.staff_id
        where t.created_at::date between p_from and p_to
        group by s.name
      ) st
    )
  )
  from wallet_transactions
  where created_at::date between p_from and p_to;
$$;
revoke execute on function period_summary(date, date) from public, anon;
grant execute on function period_summary(date, date) to authenticated;
