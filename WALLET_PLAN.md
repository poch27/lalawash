# Lala Wash Wallet — Closed-Loop Wallet System Plan

**Status:** Draft for owner approval — walang code na isusulat hangga't hindi aprubado.
**Stack:** Supabase (bagong project `lalawash-wallet`, same account) + static web app deployed sa Cloudflare.
**Scope ngayon:** Phase 1 (MVP). Ang schema ay dinisenyo na para sa Phase 2 para walang migration re-work.

---

## Mga prinsipyo

1. **Closed loop, store credit lang.** Walang cash-out, walang transfer sa ibang tao. Credits ay pambayad lang sa serbisyo ng Lala Wash. (Legal na dahilan: ito ang nagpapanatili sa atin sa labas ng e-money licensing.)
2. **Append-only ledger.** Walang direktang pag-edit ng balance, kailanman. Bawat galaw = bagong transaction row. Ang balance ay laging computed (SUM). Ito ang anti-theft/anti-error na pundasyon.
3. **Bawat transaksyon ay may staff na nakatala.** Sino ang nag-load, sino ang nag-deduct, kailan.
4. **Paid balance ≠ bonus credits.** Paid: never expires. Bonus: may expiry (90 days). Sa pag-deduct, bonus muna ang nauubos (mas mabuti sa customer, mas mabuti sa libro mo).

---

## Database schema (Postgres / Supabase)

### `customers`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| full_name | text | |
| mobile | text UNIQUE | pangunahing identifier sa counter |
| email | text nullable | |
| birthday_month | int 1-12 nullable | para sa birthday perk |
| tier | enum: `starter` \| `founder` | |
| access_token | text UNIQUE | private link ng customer (view-only) |
| is_active | boolean default true | |
| notes | text | |
| created_at | timestamptz | |

### `staff`
| column | type | notes |
|---|---|---|
| id | uuid PK → auth.users | Supabase auth account per staff |
| name | text | |
| role | enum: `owner` \| `staff` | owner: pwede mag-adjustment/void; staff: load + deduct lang |
| is_active | boolean | |

### `wallet_transactions` (append-only — walang UPDATE/DELETE, enforced sa DB level)
| column | type | notes |
|---|---|---|
| id | bigint PK | |
| customer_id | uuid FK | |
| type | enum: `load` \| `bonus` \| `deduct` \| `expire` \| `adjust` | |
| credit_type | enum: `paid` \| `bonus` | |
| amount | numeric(10,2) | signed: positive = pasok, negative = labas |
| description | text | hal. "Wash & Fold 8kg", "Founding bonus" |
| payment_method | enum: `cash` \| `gcash` \| null | para sa `load` lang |
| bonus_expires_at | date nullable | para sa `bonus` rows |
| staff_id | uuid FK | sino ang gumawa |
| created_at | timestamptz | |

**Logic (Postgres functions, hindi sa frontend, para walang madadaya):**
- `load_wallet(customer, amount, method)` — isang `load` row (+amount, paid). Kung qualifying (₱1,000+) at may founding bonus pa, awtomatikong sabay na `bonus` row na may `bonus_expires_at = today + 90`.
- `deduct_wallet(customer, amount, description)` — bonus muna ang kainin (unexpired, oldest first), tapos paid. Isa o dalawang rows (bonus portion + paid portion). Mag-e-error kung kulang ang balance.
- `expire_stale_bonuses(customer)` — lazy: bago mag-compute ng balance, ang mga bonus na lampas na sa expiry at may natitira ay gagawan ng `expire` row (−natitira). Kaya laging tama ang balance na nakikita.
- `customer_summary` view — balance (paid + live bonus), perks_active (huling ₱1,000+ load + 30/90 days vs today), perks_until.

### Row-level security
- `staff` role (authenticated): full read; write **via functions lang** (walang direct INSERT sa ledger mula sa client).
- Customer link: anon + `access_token` → isang RPC lang (`get_my_wallet(token)`) na nagbabalik ng sariling summary + transactions. Walang ibang mababasa.

---

## Screens — Phase 1 (Madali / MVP)

### Staff app (mobile-first web, naka-login)
1. **Login** — email + password (Supabase auth), isang account bawat staff
2. **Home / Hanap** — search bar (pangalan o mobile), listahan ng customers, "+ Bagong customer"
3. **Customer detail** — malaking balance card (paid + bonus + bonus expiry), perks status badge (ACTIVE hanggang [date] / EXPIRED), transaction history, dalawang malaking button: **LOAD** at **BAWAS**
4. **Load sheet** — amount presets (₱1,000 / ₱2,000 / custom ₱200+), cash o GCash, preview ng bonus kung founding/qualifying, CONFIRM → bagong balance
5. **Deduct sheet** — amount + description (presets: Wash & Fold, Dry Clean, atbp.), CONFIRM → bagong balance
6. **Bagong customer** — pangalan, mobile, tier, birthday month → auto-generate ng private link (i-text ng staff sa customer)

### Customer page (walang login — private link)
7. **Balance page** — Lala Wash branding, balance card (paid + bonus na may "expires [date]"), perks status, transaction list, "Mag-reload sa counter — cash o GCash"

## Phase 2 (Medium — pagkatapos ng launch)
- Daily summary screen para sa owner (kabuuang load/bawas ngayong araw, expected cash sa drawer, per-staff breakdown)
- Void/adjustment flow (owner-only, may dahilan, naka-log)
- Email/SMS notification sa bawat transaksyon
- Birthday perk claim tracking + welcome drink claim tracking

## Phase 3 (Endgame — papalitan ang SpinScale)
- Order module: customer → serbisyo → kilo → presyo → status (received/washing/ready/claimed) → auto-deduct sa wallet
- Kapag stable: goodbye SpinScale, isang app na lang

---

## Mga desisyon na kailangan ng approval

1. Bagong Supabase project `lalawash-wallet` sa existing account (libre, may 1 slot pa)
2. Customer access = private tokenized link (walang password/OTP) — view-only, hindi makaka-transact, kaya acceptable ang risk. SMS OTP ay may per-text na gastos; iwas muna.
3. Presyo sa pesos na may 2 decimals (numeric), hindi centavos integer
4. Deduction order: bonus muna bago paid
5. Ang founding bonus ay awtomatikong naa-apply sa unang qualifying load ng customer, base sa tier nila
