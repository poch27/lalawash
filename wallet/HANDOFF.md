# Lala Wash Wallet — Handoff / Current State

**Last updated:** 2026-07-18
**Status:** MVP built, tested, and live in production. Core loop (search → detail →
load → deduct) verified end-to-end on the deployed URL, not just locally.

**Live URL:** https://lalawash-wallet.pages.dev
**Deploy method:** manual — `cd wallet && npm run build && npx wrangler pages deploy dist --project-name=lalawash-wallet`
(NOT git-connected; pushing to GitHub does NOT redeploy the wallet. Redeploy is a
deliberate step, see "How to redeploy" below.)

---

## What exists right now

**Database:** Supabase project `lalawash-wallet` (ap-southeast-1), fully live.
Schema/functions/RLS applied via migrations `01`–`07` in this folder (see below —
these files are now a historical record of what's actually in the DB, apply in order
on a fresh project). Append-only ledger, staff auth, family/QR (Model B), perk
tracking, audit log — all working.

**Frontend:** React + Vite PWA, built by lalawashdev, scaffolded in commit `75d7edc`.
All 9 screens from `SPEC.md` exist and have real implementations (not stubs):
Login, Search, CustomerDetail (+ Load/Deduct sheets), NewCustomer, CustomerView
(public `/w/:token`), Summary (daily totals + void + adjust), QRScanner.

**Staff accounts (owner role, both usable now):**
- `lalawash@gmail.com`
- `test@gmail.com`

**Test data already in the live DB** (real accounts, not disposable — don't delete
without asking): `lydia de castro` (Founder), `test` (Starter). Both have real
transaction history from testing.

---

## What was found broken and fixed today (2026-07-18)

Testing the deployed app end-to-end surfaced 4 real bugs — 3 in the frontend/DB
integration, 1 a genuine SQL bug in a function the architect (not lalawashdev) wrote.
All fixed, verified live, and deployed.

1. **Login didn't redirect.** `test@gmail.com` had no row in `staff` — fixed by
   inserting the staff row (both accounts are `role='owner'` now).
2. **Load always failed.** `LoadSheet` sends `method: 'Cash'/'GCash'` (capitalized);
   the `payment_method` enum is lowercase-only. Fixed in `CustomerDetail.jsx`
   (`method.toLowerCase()` before the RPC call).
3. **Balance always showed ₱0.00; load/deduct "silently" failed even when the DB
   write succeeded.** `get_balance`, `load_wallet`, `deduct_wallet` are all
   `returns table (...)` in Postgres, so `supabase.rpc()` resolves `data` as an
   **array** (`[{paid,bonus,total}]`), never a plain object. The frontend read
   `data.total` directly → `undefined` → balance rendered as 0, and after a
   successful load/deduct the UI crashed on `.toLocaleString()` before it could
   refresh. Fixed by indexing `data?.[0]` everywhere this pattern was used.
   **This is a real gotcha for any NEW code that calls `get_balance`, `get_perks`,
   `load_wallet`, `deduct_wallet`, or `adjust_wallet` — always index `[0]`.**
   `get_my_wallet`, `daily_summary`, `scan_qr` are `returns jsonb` (scalar) and come
   back as plain objects — no indexing needed for those.
4. **Every real deduct failed with `column reference "paid" is ambiguous`.** The
   `deduct_wallet` SQL function has `returns table (paid, bonus, total)`, which
   implicitly declares `paid`/`bonus`/`total` as PL/pgSQL variables in scope for the
   whole function body — colliding with the same-named columns returned by
   `get_balance()`. This is a bug in the original SQL (not something lalawashdev
   introduced), invisible in the architect's earlier smoke tests because those tests
   hand-inserted ledger rows instead of calling the actual function. Fixed by
   aliasing (`get_balance(p_customer) gb` + `gb.paid` etc).
5. **Transaction history showed `lot:12` instead of "Wash & Fold".** The bonus-lot
   tracking reused the `description` column for both the human-readable text and an
   internal tag. Split into a dedicated `bonus_lot_id` column; `description` now
   always holds what the caller passed in.
6. **Search page was blank until you typed 2+ characters.** Now loads the full
   active-customer list (alphabetical) on mount; typing filters it.

All of the above are committed (`8f97768`, `f097b28` on `main`) and deployed to the
live URL — verified there directly, not just in local dev.

## SQL migration files (05–07) were undocumented — now fixed
Migrations 05 (family/QR), 06 (ambiguous-column fix), 07 (bonus_lot_id) had been
applied directly to the live DB via the Supabase MCP tool but never saved as files.
They're now saved in this folder so `wallet/*.sql` matches what's actually live.

## Git history was split across two repos — now unified
`~/Code/lalawash` (this repo) and `~/Code/lalawash/dist/` both had `origin` pointing
at the same GitHub repo (`poch27/lalawash`) with **unrelated commit histories**. Content
was verified identical (byte-for-byte on index.html/css/js/assets), so they were merged
with `--allow-unrelated-histories` (no force-push, no data loss) and pushed as one
history. `dist/`'s nested `.git` was removed (backed up to `/tmp`, not deleted) so it
can't diverge again. **Going forward, `~/Code/lalawash` is the only repo — `dist/` is
just a leftover folder, safe to ignore or delete.**

**Not yet verified:** whether the landing page's Cloudflare Pages project (git-connected,
separate from the wallet's manual wrangler deploy) has its "Root directory" and
"Framework preset" settings still correct now that the unified repo also contains
`wallet/` at the top level. Check the Cloudflare dashboard if the landing page's next
auto-deploy looks wrong.

---

## Not yet verified by the architect this session
Built by lalawashdev, present in the code, but not personally click-tested this
session — worth a pass before relying on them:
- **S8 QR Scanner** (camera-based scan → `scan_qr` RPC → pre-select member on deduct)
- **S7 Summary** — daily totals, **void transaction**, **adjust wallet** (owner-only)
- **Perk claims** (welcome drink / birthday wash) beyond what showed correctly in
  manual testing of CustomerDetail

## Known non-blocking issue
Production JS bundle is 861 KB (252 KB gzipped) — one warning from Vite about chunk
size. Not broken, just worth code-splitting later (e.g. lazy-load Summary/QRScanner).

---

## Connection details (client-side safe — anon key, RLS protects everything)
```
SUPABASE_URL      = https://vhshpjmgmchijmjdbgjk.supabase.co
SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoc2hwam1nbWNoaWptamRiZ2prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMDYxNDgsImV4cCI6MjA5OTg4MjE0OH0.p-neYTX0V0Kqx7oA9yuCYdh4_tPNnKH5NoP-I0NsKlg
```
Lives in `wallet/.env` (gitignored) as `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.

## How to redeploy the wallet after making changes
```bash
cd wallet
npm run build
npx wrangler pages deploy dist --project-name=lalawash-wallet
```
Requires `wrangler` auth (already logged in as `pochdc.apple@gmail.com` on this
machine — `npx wrangler whoami` to check).

## Decisions locked (don't re-ask)
- Customer = no login, private token link (`/w/:token`), view-only.
- Founding bonus one-time; later reloads renew perks only (no new bonus).
- Welcome drink / birthday wash = redeemed as service (tracked in `perk_claims`), NOT
  added as wallet credits.
- Family model B: one wallet, many `wallet_members`, each with own `qr_token`;
  `deduct_wallet`'s optional `p_member` records who used it.
- Pesos with 2 decimals.

## Reference
- `SPEC.md` — full contract: stack, routes, all 9 screens, API table, business rules,
  the `returns table`-is-an-array gotcha.
- `mockup.html` — visual reference for the design language.
- `01_schema.sql` → `07_separate_bonus_lot_tracking.sql` — apply in order for a fresh
  Supabase project; together they match what's live now.

## If you run low on context mid-task
Update this file (not a new one) with: what changed, what's still broken, and any
new deviation from `SPEC.md`. Commit it.
