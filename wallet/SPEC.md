# Lala Wash Wallet — Build Spec (for lalawashdev)

This spec is **complete and buildable**. The database is defined in `01_schema.sql`,
`02_functions.sql`, `03_rls.sql`. The frontend contracts and screens are below.
Scope = **Medium** (Phase 1 + Phase 2 folded together): ledger, staff app, customer
view, void/adjust, daily summary, audit log, perk-claim tracking.

---

## Stack (fixed)
- **DB/Auth/API:** Supabase project `lalawash-wallet` (Postgres 17). Apply the 3 SQL
  files in order, then `04_seed.sql`.
- **Frontend:** single-page web app, vanilla or lightweight (no heavy framework needed).
  Use the Supabase JS client (`@supabase/supabase-js`) via CDN ESM import. Deploy to
  Cloudflare Pages, same as the landing page.
- **Design language:** reuse the landing page's tokens — Inter font, `#2563EB` primary,
  `#0F172A` navy, `#F8FAFC` surfaces, 20px card radius, soft shadows. Mobile-first.

## Auth model
- **Staff:** Supabase email+password. Each staff = one `auth.users` row + one `staff` row.
  Owner creates staff accounts in the Supabase dashboard (or a Phase 3 admin screen).
- **Customer:** NO login. Their `access_token` is embedded in a private URL:
  `/w/<access_token>`. The page calls `get_my_wallet(token)`.

## API surface (all via Supabase RPC — `supabase.rpc('name', {...})`)
| RPC | Who | Params | Returns |
|---|---|---|---|
| `load_wallet` | staff | `p_customer, p_amount, p_method` | `{paid,bonus,total}` |
| `deduct_wallet` | staff | `p_customer, p_amount, p_description` | `{paid,bonus,total}` |
| `get_balance` | staff | `p_customer` | `{paid,bonus,total}` |
| `get_perks` | staff | `p_customer` | `{active,until}` |
| `void_transaction` | owner | `p_txn, p_reason` | void |
| `adjust_wallet` | owner | `p_customer, p_amount, p_reason` | `{paid,bonus,total}` |
| `claim_perk` | staff | `p_customer, p_perk` | void |
| `daily_summary` | staff | `p_day?` | summary json |
| `get_my_wallet` | anon | `p_token` | full customer view json |

Direct table reads (via PostgREST, RLS-scoped): `customers` (search), `wallet_transactions`
(history), `perk_claims`, `audit_log` (owner).

---

## Screens

### STAFF APP (authenticated, mobile-first)

**S1 · Login**
- Email + password → `supabase.auth.signInWithPassword`.
- On success, fetch `current_staff()`; store role. Route to S2.

**S2 · Home / Search**
- Top: search input (debounced). Query: `customers` where `mobile ilike %q%` or
  `full_name ilike %q%`, limit 20. Show name, mobile, tier badge.
- Row tap → S3.
- FAB "+ Bagong Customer" → S6.
- If role=owner, header link to S7 (Daily Summary).

**S3 · Customer Detail**
- Header: name, mobile, tier badge.
- **Balance card** (hero): Total ₱X,XXX.XX big; below it "Paid ₱X · Bonus ₱X (expires MMM D)".
  Call `get_balance` + `get_perks`.
- **Perks badge:** green "ACTIVE until MMM D" or grey "EXPIRED — reload ₱1,000+ to renew".
- **Perk chips:** Welcome drink [Claim/Claimed], Birthday wash [Claim/Claimed] (check
  `perk_claims`; birthday chip only enabled during birthday_month). Claim → `claim_perk`.
- Two big buttons: **LOAD** (S4) and **BAWAS/Deduct** (S5).
- **History list:** `wallet_transactions` for this customer, newest first. Row: date,
  description/type, signed amount (green +, red −). Owner sees a "Void" action per row → confirm + reason → `void_transaction`.

**S4 · Load sheet (bottom sheet)**
- Amount presets: ₱1,000 · ₱2,000 · Custom (min ₱200).
- Method: Cash / GCash toggle.
- Live preview: "Customer gets ₱X,XXX (+₱XXX founding bonus)" — show bonus only if amount≥1000
  AND customer has no prior founding bonus (query `wallet_transactions` is_founding_bonus).
- CONFIRM → `load_wallet` → toast new balance → back to S3.

**S5 · Deduct sheet (bottom sheet)**
- Amount input + description. Description presets: "Wash & Fold", "Dry Clean", "Comforter",
  "Others" (free text).
- Guard: if amount > total balance, disable confirm, show "Kulang ang balance".
- CONFIRM → `deduct_wallet` → toast new balance → back to S3.

**S6 · New Customer**
- Fields: full name, mobile (unique), email (optional), tier (Starter/Founder), birthday month (optional).
- Save → insert into `customers` → returns row with `access_token`.
- Show success screen with the customer's private link `/w/<token>` + a "Copy link" and
  "Share via SMS" button (`sms:?body=...`). Staff sends this to the customer.

**S7 · Daily Summary (owner)**
- Date picker (default today). Call `daily_summary(day)`.
- Cards: Cash loaded, GCash loaded, Total deducted, Bonus granted, Txn count.
- **Expected cash in drawer = Cash loaded** (GCash and deducts don't touch the drawer).
- Below: audit_log feed for the day (who did what).

### CUSTOMER PAGE (public, token URL `/w/<token>`)

**C1 · My Wallet**
- Call `get_my_wallet(token)`. If invalid → friendly "Link not valid" page.
- Lala Wash branding header.
- Balance card: Total big; "Paid (never expires) ₱X · Bonus ₱X (expires MMM D)".
- Perks badge: ACTIVE until / EXPIRED.
- Transaction history (read-only).
- Footer CTA: "Mag-reload sa counter — cash o GCash. Balance mo, ikaw lang ang nakakakita."
- No actions. View-only.

---

## Business rules (already encoded in SQL — do not re-implement in JS)
1. Append-only ledger; balance = SUM. Never store a balance field.
2. Min load ₱200. Founding bonus (Founder 300 / Starter 100) auto-granted once, on first
   load ≥ ₱1,000, expires +90 days.
3. Deduction consumes bonus (oldest unexpired) before paid.
4. Perks window from last load ≥ ₱1,000: Founder +90d, Starter +30d.
5. Paid balance never expires. Bonus expires; expiry is applied lazily on read/deduct.
6. Void = reversing entry (owner). Adjust = manual signed entry with reason (owner).
7. Every mutating call writes `audit_log`.

## Open decisions (owner to confirm; defaults chosen)
- **Reload bonus for founding members:** default = founding bonus is one-time only;
  later reloads just renew perks (no new bonus). If owner wants a standing reload bonus,
  add it in `load_wallet` (one line).
- **Welcome drink / birthday wash** tracked in `perk_claims` but NOT auto-added to wallet
  (they're redeemed as service, not credits). Correct per current design.

## Build order for lalawashdev
1. Apply SQL (01→02→03→04). Verify with the test script in `04_seed.sql` comments.
2. Scaffold app + Supabase client + auth (S1).
3. S2 search → S3 detail → S4 load → S5 deduct (core loop first — this is the MVP).
4. S6 new customer + private link.
5. C1 customer page.
6. S7 daily summary + void/adjust + perk claims (Medium layer).
7. Deploy to Cloudflare Pages. Hand back a URL + list of any deviations.
