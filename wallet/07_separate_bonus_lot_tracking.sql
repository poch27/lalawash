-- ============================================================
-- 07_separate_bonus_lot_tracking.sql
-- Bug: deduct_wallet and expire_stale_bonuses reused the `description` column to
-- tag which bonus "lot" a row consumed (e.g. 'lot:12'), overwriting the caller's
-- actual description ("Wash & Fold"). Staff and customers saw "lot:12" in their
-- transaction history instead of what they paid for.
-- Fix: dedicated `bonus_lot_id` column for internal tracking; `description` always
-- holds the human-readable text.
-- ============================================================

alter table wallet_transactions add column bonus_lot_id bigint references wallet_transactions (id);

create or replace function expire_stale_bonuses(p_customer uuid, p_staff uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  lot record;
  consumed numeric(10,2);
  remaining numeric(10,2);
begin
  for lot in
    select t.id, t.amount, t.bonus_expires_at
    from wallet_transactions t
    where t.customer_id = p_customer
      and t.type = 'bonus'
      and t.bonus_expires_at is not null
      and t.bonus_expires_at < current_date
  loop
    select coalesce(sum(-amount), 0) into consumed
    from wallet_transactions
    where customer_id = p_customer
      and credit_type = 'bonus'
      and amount < 0
      and bonus_lot_id = lot.id;
    remaining := lot.amount - consumed;
    if remaining > 0 then
      insert into wallet_transactions (customer_id, type, credit_type, amount, description, staff_id, bonus_lot_id)
      values (p_customer, 'expire', 'bonus', -remaining, 'Bonus credits expired', p_staff, lot.id);
    end if;
  end loop;
end;
$$;

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
  select gb.paid, gb.bonus, gb.total into v_paid, v_bonus, v_total
  from get_balance(p_customer) gb;
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
      and bonus_lot_id = lot.id;
    if lot_remaining <= 0 then continue; end if;
    take := least(lot_remaining, v_need);
    insert into wallet_transactions (customer_id, type, credit_type, amount, description, staff_id, member_id, bonus_lot_id)
    values (p_customer, 'deduct', 'bonus', -take, p_description, s.id, p_member, lot.id);
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
