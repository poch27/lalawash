# Lalawash — Agent Instructions

Read this before touching anything in this repo. It applies to every AI agent working
here — Claude Code, lalawashdev, Hermes, or any future session.

## What's in this repo
| Part | Path | Stack |
|---|---|---|
| Landing page | `index.html`, `css/`, `js/`, `assets/` | Pure HTML5/CSS3/vanilla JS — no build step |
| Wallet PWA | `wallet/` | React + Vite + Supabase (see `wallet/SPEC.md`, `wallet/HANDOFF.md`) |

Design direction for the landing page: Filipino laundry brand, modern/clean/trustworthy,
warm tones (di puro puti), mobile-first, fast (<3s on 3G).

---

## ⚠️ Deployment rule — read this before running `wrangler` anything

**Git (`main` branch, pushed to GitHub) is the only source of truth. Never deploy
something that isn't committed and pushed first.**

This isn't a style preference — it caused a real incident (2026-07-19): someone
deployed straight to the live Cloudflare Worker multiple times without committing,
so the live site drifted through several different, uncommitted versions of the
landing page while `git log` showed something else entirely. Nobody could tell
which version was "real," and reconciling it cost a full debugging session.

**The rule going forward, no exceptions:**
1. Make your change to the source files (`index.html` at repo root, or `wallet/src/`).
2. Commit it. Push it to `origin main`.
3. *Only then* deploy, using the commands below.
4. If you're not sure whether to deploy, don't — ask first. Deploying is a
   production, user-facing action; committing is not.

**Never** hand-edit a file inside `dist/`, inside a Cloudflare dashboard, or push
straight to a Worker/Pages project as a way to "test something live." If you need
to preview, run it locally (see Commands below).

### How each part actually deploys

**Landing page** → Cloudflare Worker `lalawash` (`lalawash.pochdc-apple.workers.dev`).
Manual deploy via Wrangler, **not** git-connected — pushing to GitHub does **not**
redeploy it by itself.
```bash
cp index.html dist/index.html   # dist/ is gitignored; it's just the deploy staging folder
npx wrangler deploy
```

**Wallet PWA** → Cloudflare Pages project `lalawash-wallet`
(`lalawash-wallet.pages.dev`). Also manual deploy, also **not** git-connected.
```bash
cd wallet
npm run build
npx wrangler pages deploy dist --project-name=lalawash-wallet
```

Both deploys are separate, deliberate steps — commit ≠ deploy for either one.

---

## Wallet-specific rules
- **Never edit `wallet/*.sql` or any Supabase function without reading
  `wallet/SPEC.md` and `wallet/HANDOFF.md` first.** These touch money (the wallet
  ledger) — a mistake there is a different order of severity than a landing-page typo.
- `get_balance`, `get_perks`, `load_wallet`, `deduct_wallet`, `adjust_wallet` are
  Postgres `returns table` functions — Supabase returns them as **arrays**. Always
  index `data?.[0]`. (`get_my_wallet`, `daily_summary`, `scan_qr` are `returns
  jsonb` — those come back as plain objects.) This exact bug has shipped once
  already; don't reintroduce it.
- The ledger (`wallet_transactions`) is append-only at the database level — you
  cannot UPDATE or DELETE rows even as an admin. Corrections go through
  `void_transaction` / `adjust_wallet`, which insert offsetting rows.

## Commands
- **Landing page:** open `index.html` directly, or `python3 -m http.server` from
  repo root. No build step.
- **Wallet:** `cd wallet && npm run dev` (Vite dev server).
