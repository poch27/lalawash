-- ============================================================
-- 10_founder_perks_75_days.sql
-- Founder active-perks window 90 -> 75 days, to match the landing page & T&C.
-- Starter stays 30. Bonus-credit expiry (load_wallet, current_date + 90) is
-- intentionally left at 90 — bonus is consumed before paid, and it is no longer
-- marketed as a countdown, so the exact unused-expiry number is a T&C detail only.
-- Applied live 2026-07-21. (02_functions.sql was also updated in place to match.)
-- ============================================================

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
