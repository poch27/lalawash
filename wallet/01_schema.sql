-- ============================================================
-- Lala Wash Wallet — Closed-Loop Wallet System
-- 01_schema.sql — tables, enums, indexes, RLS
-- Target: Supabase (Postgres 17). Apply in order: 01_schema → 02_functions → 03_rls → 04_seed
-- ============================================================

-- ── Enums ──────────────────────────────────────────────
create type tier_type       as enum ('starter', 'founder');
create type staff_role       as enum ('owner', 'staff');
create type txn_type         as enum ('load', 'bonus', 'deduct', 'expire', 'adjust', 'void');
create type credit_type      as enum ('paid', 'bonus');
create type payment_method   as enum ('cash', 'gcash');
create type perk_type        as enum ('welcome_drink', 'birthday_wash');

-- ── customers ──────────────────────────────────────────
create table customers (
  id             uuid primary key default gen_random_uuid(),
  full_name      text not null,
  mobile         text not null unique,
  email          text,
  birthday_month int check (birthday_month between 1 and 12),
  tier           tier_type not null default 'starter',
  access_token   text not null unique default encode(gen_random_bytes(16), 'hex'),
  is_active      boolean not null default true,
  notes          text,
  created_at     timestamptz not null default now()
);
create index on customers (mobile);
create index on customers (access_token);

-- ── staff (id links to Supabase auth.users) ────────────
create table staff (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null,
  role       staff_role not null default 'staff',
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── wallet_transactions (APPEND-ONLY — no UPDATE/DELETE) ─
-- Every wallet movement is one immutable row. Balance is always SUM(amount).
-- amount is SIGNED: load/bonus/adjust(+) are positive, deduct/expire/void are negative.
create table wallet_transactions (
  id              bigint generated always as identity primary key,
  customer_id     uuid not null references customers (id),
  type            txn_type not null,
  credit_type     credit_type not null,
  amount          numeric(10,2) not null,
  description     text,
  method          payment_method,             -- set only for type='load'
  bonus_expires_at date,                       -- set only for credit_type='bonus'
  is_founding_bonus boolean not null default false,
  reverses_txn_id bigint references wallet_transactions (id),  -- set only for type='void'
  staff_id        uuid not null references staff (id),
  created_at      timestamptz not null default now()
);
create index on wallet_transactions (customer_id, created_at);
create index on wallet_transactions (customer_id, credit_type);
create index on wallet_transactions (type);

-- Enforce append-only at the DB level: block UPDATE and DELETE for everyone.
create or replace function block_mutation() returns trigger
language plpgsql as $$
begin
  raise exception 'wallet_transactions is append-only; % is not allowed', tg_op;
end;
$$;
create trigger no_update before update on wallet_transactions
  for each row execute function block_mutation();
create trigger no_delete before delete on wallet_transactions
  for each row execute function block_mutation();

-- ── perk_claims (welcome drink = once; birthday = once per year) ─
create table perk_claims (
  id          bigint generated always as identity primary key,
  customer_id uuid not null references customers (id),
  perk        perk_type not null,
  claim_year  int not null,               -- for welcome_drink use 0 (once ever)
  claimed_at  timestamptz not null default now(),
  staff_id    uuid not null references staff (id),
  notes       text,
  unique (customer_id, perk, claim_year)  -- prevents double-claim
);

-- ── audit_log (every sensitive action; Medium-tier accountability) ─
create table audit_log (
  id         bigint generated always as identity primary key,
  staff_id   uuid references staff (id),
  action     text not null,               -- 'load','deduct','void','adjust','create_customer','claim_perk'
  customer_id uuid references customers (id),
  detail     jsonb,
  created_at timestamptz not null default now()
);
create index on audit_log (created_at);
create index on audit_log (customer_id);

-- Enable RLS (policies defined in 03_rls.sql)
alter table customers            enable row level security;
alter table staff                enable row level security;
alter table wallet_transactions  enable row level security;
alter table perk_claims          enable row level security;
alter table audit_log            enable row level security;
