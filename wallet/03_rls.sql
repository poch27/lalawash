-- ============================================================
-- 03_rls.sql — Row-Level Security policies
-- Principle: clients cannot touch wallet_transactions directly. All writes go
-- through the SECURITY DEFINER functions in 02_functions.sql. Reads are scoped.
-- ============================================================

-- ── staff: a staff member can read their own row; owners read all ──
create policy staff_self_read on staff
  for select using (id = auth.uid()
    or exists (select 1 from staff s where s.id = auth.uid() and s.role = 'owner'));

-- ── customers: any active staff can read/insert/update; no deletes ──
create policy customers_staff_read on customers
  for select using (exists (select 1 from staff where id = auth.uid() and is_active));
create policy customers_staff_insert on customers
  for insert with check (exists (select 1 from staff where id = auth.uid() and is_active));
create policy customers_staff_update on customers
  for update using (exists (select 1 from staff where id = auth.uid() and is_active));

-- ── wallet_transactions: staff may READ; NO direct insert/update/delete ──
-- (Writes happen only inside SECURITY DEFINER functions, which bypass RLS.)
create policy wtxn_staff_read on wallet_transactions
  for select using (exists (select 1 from staff where id = auth.uid() and is_active));
-- No insert/update/delete policies => clients are blocked entirely.

-- ── perk_claims & audit_log: staff read only ──
create policy perk_staff_read on perk_claims
  for select using (exists (select 1 from staff where id = auth.uid() and is_active));
create policy audit_staff_read on audit_log
  for select using (exists (select 1 from staff where id = auth.uid() and role = 'owner'));

-- ── Grant execute on RPCs ──
-- authenticated staff:
grant execute on function load_wallet, deduct_wallet, void_transaction, adjust_wallet,
  claim_perk, get_balance, get_perks, daily_summary, current_staff,
  expire_stale_bonuses to authenticated;
-- anonymous customer self-view (token-gated inside the function):
grant execute on function get_my_wallet to anon;

-- Note: get_my_wallet is SECURITY DEFINER and validates the token itself, so anon
-- can call it but only ever sees the row matching the token they already hold.
