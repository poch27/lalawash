-- ============================================================
-- 05_family_members_qr.sql — Model B: one wallet, many members, each with own QR
-- Applied directly to lalawash-wallet via apply_migration; saved here for the record.
-- ============================================================

create table wallet_members (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id),
  name        text not null,
  mobile      text,
  qr_token    text not null unique default encode(gen_random_bytes(16), 'hex'),
  is_primary  boolean not null default false,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index on wallet_members (customer_id);
create index on wallet_members (qr_token);

alter table wallet_members enable row level security;
create policy members_staff_read on wallet_members
  for select using (exists (select 1 from staff where id = auth.uid() and is_active));
create policy members_staff_insert on wallet_members
  for insert with check (exists (select 1 from staff where id = auth.uid() and is_active));
create policy members_staff_update on wallet_members
  for update using (exists (select 1 from staff where id = auth.uid() and is_active));

-- Auto-create the primary member when a customer is created
create or replace function create_primary_member() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into wallet_members (customer_id, name, mobile, is_primary)
  values (new.id, new.full_name, new.mobile, true);
  return new;
end;
$$;
create trigger customer_primary_member after insert on customers
  for each row execute function create_primary_member();

-- Track WHICH member a transaction was for
alter table wallet_transactions add column member_id uuid references wallet_members (id);

-- Staff QR scan: token -> wallet + member
create or replace function scan_qr(p_qr text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s staff := current_staff(); m record;
begin
  if s.id is null then raise exception 'not authorized'; end if;
  select wm.id as member_id, wm.name as member_name, wm.is_primary,
         c.id as customer_id, c.full_name, c.mobile, c.tier
    into m
  from wallet_members wm join customers c on c.id = wm.customer_id
  where wm.qr_token = p_qr and wm.is_active and c.is_active;
  if m.member_id is null then raise exception 'QR not recognized'; end if;
  return to_jsonb(m);
end;
$$;
revoke execute on function scan_qr(text) from public, anon;
grant execute on function scan_qr(text) to authenticated;

-- deduct_wallet gains p_member (see 06_fix_deduct_ambiguous_column.sql for the
-- corrected body — this migration's original version had a bug, fixed there).
drop function deduct_wallet(uuid, numeric, text);
create or replace function deduct_wallet(
  p_customer uuid, p_amount numeric, p_description text, p_member uuid default null
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
  if p_member is not null and not exists (
    select 1 from wallet_members where id = p_member and customer_id = p_customer
  ) then raise exception 'member does not belong to this wallet'; end if;

  perform expire_stale_bonuses(p_customer, s.id);
  select paid, bonus, total into v_paid, v_bonus, v_total from get_balance(p_customer);
  if v_total < p_amount then
    raise exception 'insufficient balance: have %, need %', v_total, p_amount;
  end if;

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
    insert into wallet_transactions (customer_id, type, credit_type, amount, description, staff_id, member_id)
    values (p_customer, 'deduct', 'bonus', -take, 'lot:' || lot.id, s.id, p_member);
    v_need := v_need - take;
  end loop;

  if v_need > 0 then
    insert into wallet_transactions (customer_id, type, credit_type, amount, description, staff_id, member_id)
    values (p_customer, 'deduct', 'paid', -v_need, p_description, s.id, p_member);
  end if;

  insert into audit_log (staff_id, action, customer_id, detail)
  values (s.id, 'deduct', p_customer,
          jsonb_build_object('amount', p_amount, 'description', p_description, 'member', p_member));

  return query select * from get_balance(p_customer);
end;
$$;
revoke execute on function deduct_wallet(uuid, numeric, text, uuid) from public, anon;
grant execute on function deduct_wallet(uuid, numeric, text, uuid) to authenticated;

-- Customer view now shows which member used it
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
    'members', (
      select coalesce(jsonb_agg(jsonb_build_object('name', name, 'is_primary', is_primary)
        order by is_primary desc, created_at), '[]'::jsonb)
      from wallet_members where customer_id = c.id and is_active
    ),
    'transactions', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', t.created_at, 'type', t.type, 'amount', t.amount,
        'description', t.description,
        'member', (select name from wallet_members where id = t.member_id)
      ) order by t.created_at desc), '[]'::jsonb)
      from wallet_transactions t where t.customer_id = c.id
        and t.type in ('load','bonus','deduct','void','adjust')
    )
  );
end;
$$;
revoke execute on function get_my_wallet(text) from public;
grant execute on function get_my_wallet(text) to anon, authenticated;
