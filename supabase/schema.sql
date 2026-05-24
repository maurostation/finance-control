-- ════════════════════════════════════════════════
--  Finance Hub — Supabase Schema
--  Execute este SQL no SQL Editor do seu projeto Supabase
-- ════════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── cards ───────────────────────────────────────
create table if not exists cards (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  name          text not null,
  closing_day   int not null check (closing_day between 1 and 31),
  due_day       int not null check (due_day between 1 and 31),
  limit_amount  numeric(12,2) not null default 0,
  color         text not null default '#D97706',
  created_at    timestamptz default now()
);
alter table cards enable row level security;
create policy "owner" on cards using (auth.uid() = user_id);

-- ─── transactions ─────────────────────────────────
create table if not exists transactions (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid references auth.users(id) on delete cascade not null,
  date                date not null,
  description         text not null,
  amount              numeric(12,2) not null,
  type                text not null check (type in ('income','expense')),
  category            text not null,
  card_id             uuid references cards(id) on delete set null,
  is_installment      boolean not null default false,
  installment_number  int,
  total_installments  int,
  parent_id           uuid references transactions(id) on delete cascade,
  is_recurring        boolean not null default false,
  created_at          timestamptz default now()
);
alter table transactions enable row level security;
create policy "owner" on transactions using (auth.uid() = user_id);
create index transactions_user_month on transactions(user_id, date);

-- ─── recurring_templates ──────────────────────────
create table if not exists recurring_templates (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  description   text not null,
  amount        numeric(12,2) not null,
  type          text not null check (type in ('income','expense')),
  category      text not null,
  card_id       uuid references cards(id) on delete set null,
  day_of_month  int not null check (day_of_month between 1 and 31),
  active        boolean not null default true,
  created_at    timestamptz default now()
);
alter table recurring_templates enable row level security;
create policy "owner" on recurring_templates using (auth.uid() = user_id);

-- ─── planned_purchases ────────────────────────────
create table if not exists planned_purchases (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid references auth.users(id) on delete cascade not null,
  name             text not null,
  estimated_value  numeric(12,2) not null default 0,
  priority         text not null check (priority in ('high','low')) default 'low',
  category         text not null,
  status           text not null check (status in ('pending','bought')) default 'pending',
  notes            text,
  created_at       timestamptz default now()
);
alter table planned_purchases enable row level security;
create policy "owner" on planned_purchases using (auth.uid() = user_id);

-- ─── savings_goals ────────────────────────────────
create table if not exists savings_goals (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references auth.users(id) on delete cascade not null unique,
  name            text not null default 'Reserva de Emergência',
  target_amount   numeric(12,2) not null default 5000,
  current_amount  numeric(12,2) not null default 0,
  created_at      timestamptz default now()
);
alter table savings_goals enable row level security;
create policy "owner" on savings_goals using (auth.uid() = user_id);
