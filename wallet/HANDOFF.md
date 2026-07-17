# Lala Wash Wallet — Handoff to Frontend Dev (lalawashdev)

**Role:** Build the React PWA frontend. The database is **already live, tested, and
empty** — you do NOT touch the schema or wallet logic. You call RPCs and render results.

---

## What's already done (by the architect)
- Supabase project `lalawash-wallet` created, region ap-southeast-1 (Singapore).
- Schema, functions, RLS, and grants applied (see `01_schema.sql`–`03_rls.sql` + the
  `04_harden_grants` migration already in the DB). Smoke-tested:
  load ₱2,000 → 2000/300/2300 ✓ · deduct ₱500 → 1800/0/1800 (bonus-first) ✓ ·
  perks active +90d ✓ · ledger is append-only (UPDATE/DELETE blocked at DB level) ✓.
- Database is empty and production-ready.

## Connection (client-side safe — anon/publishable keys, RLS protects everything)
```
SUPABASE_URL      = https://vhshpjmgmchijmjdbgjk.supabase.co
SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoc2hwam1nbWNoaWptamRiZ2prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMDYxNDgsImV4cCI6MjA5OTg4MjE0OH0.p-neYTX0V0Kqx7oA9yuCYdh4_tPNnKH5NoP-I0NsKlg
```
(Publishable key alt: `sb_publishable_BfkuILfFgeKBIjT-LCP-IA_ek1gwNbt`. Use the anon JWT
with `@supabase/supabase-js` unless you know why you'd prefer the publishable key.)
Put these in `.env` as `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.

## Before you can log in: create the owner account (one-time, owner does this)
1. Supabase dashboard → Authentication → Users → **Add user** → email + password.
2. SQL editor → run (replace `<UUID>` with that new user's id):
   ```sql
   insert into staff (id, name, role) values ('<UUID>', 'Poch', 'owner');
   ```
   Add more staff the same way with `role = 'staff'`.

---

## What to build
Read **`SPEC.md`** — it is the contract (stack, routes, all 9 screens, API table,
business rules). Visual reference: **`mockup.html`** (open in a browser). Match its look
(reuses the landing page's design tokens).

**Stack (fixed):** React + Vite + React Router + `@supabase/supabase-js` +
`vite-plugin-pwa`. Deploy to Cloudflare Pages. Mobile-first.

**Build order:**
1. Vite + React + Router + Supabase client + `.env`. PWA plugin with a basic manifest
   (name "Lala Wash Wallet", theme `#2563EB`, the 🧺 as icon for now).
2. **S1 Login** → `supabase.auth.signInWithPassword`; then `supabase.rpc('current_staff')`
   to get role; guard routes.
3. Core loop (the MVP, do this first and get it working end-to-end):
   **S2 search → S3 customer detail → S4 load → S5 deduct.**
   - search: `supabase.from('customers').select().or('full_name.ilike.%q%,mobile.ilike.%q%')`
   - detail: `rpc('get_balance',{p_customer})`, `rpc('get_perks',{p_customer})`, and
     `from('wallet_transactions').select().eq('customer_id',id).order('created_at',{ascending:false})`
   - load: `rpc('load_wallet',{p_customer,p_amount,p_method})` → returns `{paid,bonus,total}`
   - deduct: `rpc('deduct_wallet',{p_customer,p_amount,p_description})`
4. **S6 new customer** → `from('customers').insert({...}).select().single()`; show the
   returned `access_token`; build the share link `${origin}/w/${access_token}`.
5. **C1 customer page** at `/w/:token` (public) → `rpc('get_my_wallet',{p_token})`.
6. **QR + family (Model B — see SPEC S8/S9):**
   - Scan (staff): camera via `html5-qrcode`; QR content = member `qr_token` →
     `rpc('scan_qr',{p_qr})` → S3 with member pre-selected.
   - Members section on S3: list/add `wallet_members`; render each member's `qr_token`
     as a QR image (`qrcode` npm lib). Primary member is auto-created by the DB.
   - Deduct: `rpc('deduct_wallet',{p_customer,p_amount,p_description,p_member})` —
     `p_member` optional (null = walk-in/primary).
7. Medium layer: **S7 daily summary** (`rpc('daily_summary',{p_day})`, owner-only),
   per-transaction **Void** (owner → `rpc('void_transaction',{p_txn,p_reason})`),
   **adjust** (`rpc('adjust_wallet',...)`), perk chips (`rpc('claim_perk',...)` +
   read `from('perk_claims')`).
8. Deploy to Cloudflare Pages. Return the URL.

## Rules you must NOT reimplement (already in the DB — just call and display)
- Balance = sum of ledger. Never compute or store a balance yourself.
- Founding bonus (Founder 300 / Starter 100) auto-applies once on first load ≥ ₱1,000.
- Deduction takes bonus first, then paid. Perks window: Founder +90d, Starter +30d.
- All errors from RPCs (e.g. "insufficient balance", "owner only") — surface the message
  to the user as a toast.

## Error handling
Every `rpc()` can throw. Wrap in try/catch, show `error.message`. Common ones:
`minimum load is 200`, `insufficient balance: have X, need Y`, `owner only`,
`not authorized`, `already voided`.

## Decisions already locked (don't re-ask)
- Customer = no login, private token link, view-only.
- Founding bonus one-time; later reloads renew perks only (no new bonus).
- Welcome drink / birthday wash = redeemed as service (tracked in `perk_claims`), NOT
  added as wallet credits.
- Pesos with 2 decimals.

## If you (the AI dev) run low on context
Write your own `FRONTEND_HANDOFF.md`: what's built, what's left, current file tree, and
any deviation from `SPEC.md`. Commit it so the next session continues cleanly.
