-- Ahmed Goat Farm — database schema
-- Run this once in your Supabase project's SQL Editor (Project → SQL Editor → New query → Run)

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- Goats
-- ─────────────────────────────────────────────────────────────
create table if not exists goats (
  id uuid primary key default gen_random_uuid(),
  tag_id text not null unique,
  name text,
  breed text,
  sex text not null check (sex in ('Male', 'Female')),
  date_of_birth date,
  color text,
  mother_id uuid references goats(id) on delete set null,
  father_id uuid references goats(id) on delete set null,
  status text not null default 'Active' check (status in ('Active', 'Sold', 'Deceased')),
  acquired_date date default current_date,
  source text default 'Born on farm' check (source in ('Born on farm', 'Purchased')),
  photo_url text,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

-- ─────────────────────────────────────────────────────────────
-- Health & vaccination records
-- ─────────────────────────────────────────────────────────────
create table if not exists health_records (
  id uuid primary key default gen_random_uuid(),
  goat_id uuid not null references goats(id) on delete cascade,
  record_type text not null check (record_type in ('Vaccination', 'Deworming', 'Illness', 'Treatment', 'Vet Visit')),
  title text not null,
  record_date date not null default current_date,
  next_due_date date,
  cost numeric(10, 2),
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

-- ─────────────────────────────────────────────────────────────
-- Breeding records
-- ─────────────────────────────────────────────────────────────
create table if not exists breeding_records (
  id uuid primary key default gen_random_uuid(),
  doe_id uuid not null references goats(id) on delete cascade,
  buck_id uuid references goats(id) on delete set null,
  buck_name text,
  mating_date date not null,
  expected_kidding_date date,
  actual_kidding_date date,
  number_of_kids integer,
  outcome text not null default 'Pending' check (outcome in ('Pending', 'Successful', 'Miscarried', 'Failed')),
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

-- ─────────────────────────────────────────────────────────────
-- Weight records
-- ─────────────────────────────────────────────────────────────
create table if not exists weight_records (
  id uuid primary key default gen_random_uuid(),
  goat_id uuid not null references goats(id) on delete cascade,
  record_date date not null default current_date,
  weight_kg numeric(6, 2) not null,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

-- ─────────────────────────────────────────────────────────────
-- Expenses
-- ─────────────────────────────────────────────────────────────
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  category text not null check (category in ('Feed', 'Medical', 'Labor', 'Equipment', 'Transport', 'Other')),
  description text,
  amount numeric(10, 2) not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

-- ─────────────────────────────────────────────────────────────
-- Sales
-- ─────────────────────────────────────────────────────────────
create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  sale_date date not null default current_date,
  sale_type text not null check (sale_type in ('Goat', 'Milk', 'Other')),
  goat_id uuid references goats(id) on delete set null,
  buyer_name text,
  buyer_contact text,
  quantity numeric(10, 2),
  amount numeric(10, 2) not null,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

-- ─────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────
create index if not exists idx_health_records_goat on health_records(goat_id);
create index if not exists idx_breeding_records_doe on breeding_records(doe_id);
create index if not exists idx_weight_records_goat on weight_records(goat_id);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- Any signed-in farm user can read/write all records (small trusted team,
-- no per-user data partitioning needed).
-- ─────────────────────────────────────────────────────────────
alter table goats enable row level security;
alter table health_records enable row level security;
alter table breeding_records enable row level security;
alter table weight_records enable row level security;
alter table expenses enable row level security;
alter table sales enable row level security;

create policy "Authenticated users can read goats" on goats for select using (auth.role() = 'authenticated');
create policy "Authenticated users can write goats" on goats for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated users can read health_records" on health_records for select using (auth.role() = 'authenticated');
create policy "Authenticated users can write health_records" on health_records for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated users can read breeding_records" on breeding_records for select using (auth.role() = 'authenticated');
create policy "Authenticated users can write breeding_records" on breeding_records for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated users can read weight_records" on weight_records for select using (auth.role() = 'authenticated');
create policy "Authenticated users can write weight_records" on weight_records for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated users can read expenses" on expenses for select using (auth.role() = 'authenticated');
create policy "Authenticated users can write expenses" on expenses for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated users can read sales" on sales for select using (auth.role() = 'authenticated');
create policy "Authenticated users can write sales" on sales for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
