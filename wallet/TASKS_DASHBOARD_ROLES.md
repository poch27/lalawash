# Tasks: Month-filter Dashboard + Manager Role (frontend only)

**For:** lalawashdev / any cheaper model.
**Read first:** `AGENTS.md` (deploy rules!), `wallet/SPEC.md` (esp. the
returns-table array gotcha), `wallet/HANDOFF.md`.
**Scope:** frontend only. The database work is DONE and live — do NOT touch
`wallet/*.sql` or any Supabase function. Commit per task; do NOT deploy
(owner deploys after review).

---

## Task A — Summary page: month/range filter

The DB now has a new RPC (already live, already granted):

`supabase.rpc('period_summary', { p_from: 'YYYY-MM-DD', p_to: 'YYYY-MM-DD' })`
→ returns a **plain jsonb object** (NOT an array — no `[0]` needed):
```json
{
  "from": "...", "to": "...",
  "cash_loaded": 0, "gcash_loaded": 0, "total_loaded": 0,
  "total_deducted": 0, "bonus_granted": 0, "txn_count": 0,
  "by_day":   [ { "day": "2026-07-18", "loaded": 3000, "deducted": 680, "txns": 5 } ],
  "by_staff": [ { "name": "Poch (Owner)", "loaded": 3000, "deducted": 680, "txns": 5 } ]
}
```

Build in `Summary.jsx`:
1. **View toggle** at the top: `Day | Month` (segmented control, Day = current
   behavior, unchanged).
2. **Month mode:** a `<input type="month">` picker (default: current month).
   Compute `p_from` = first day, `p_to` = last day of that month, call
   `period_summary`, and render:
   - The same 5 stat cards as Day mode (cash/gcash/deducted/bonus/txn count).
   - **Per-day table** from `by_day`: Day · Loaded · Deducted · Txns. Simple
     rows, newest first is fine.
   - **Per-staff table** from `by_staff`: Staff · Loaded · Deducted · Txns.
     Label this section "Per Staff" — the owner uses it to spot a staff member
     whose deduct count looks off.
3. Audit-log list: in Month mode, extend the existing `created_at` range filter
   to the whole month (same `.gte/.lte` pattern already in the file).
4. Keep it mobile-first; match existing styles (`summary-cards`, `txn` rows).

## Task B — Manager role in the frontend

The DB enum `staff_role` now has three values: `owner`, `staff`, `manager`.
Manager's server-side powers (already enforced in the DB — do not re-implement):
- Everything staff can do (load, deduct, customers, perks)
- Can **void** transactions (like owner)
- **Cannot** adjust wallets (owner only — the DB will reject it)

Frontend changes:
1. `AuthContext.jsx`: add `isManager: staff?.role === 'manager'` and
   `canVoid: staff?.role === 'owner' || staff?.role === 'manager'`, and
   `canViewSummary` with the same value as `canVoid`.
2. `TransactionList.jsx`: show the Void (✕) action based on `canVoid` (currently
   `isOwner`).
3. `Layout.jsx` + `Search.jsx`: show the 📊 Summary link based on
   `canViewSummary` (currently `isOwner`). Role chip in the header should show
   "Manager" for managers.
4. `Summary.jsx`: the "Adjust Wallet" button stays **owner-only** (`isOwner`) —
   managers see the summary but not the adjust button. Route guard for
   `/summary` in `App.jsx`: change `ownerOnly` to allow owner OR manager (rename
   the prop or add a `roles` prop — your choice, keep it simple).
5. If a manager somehow triggers an owner-only RPC, the DB throws
   `owner only` — the existing toast pattern already surfaces it. No extra
   handling needed.

## Definition of done
- `npm run build` passes.
- Day mode behaves exactly as before.
- Month mode shows totals + per-day + per-staff for any picked month.
- A `staff`-role login sees no Summary link and no void buttons; a `manager`
  sees Summary + void but no Adjust; `owner` sees everything.
- Committed with clear messages. NOT deployed.
