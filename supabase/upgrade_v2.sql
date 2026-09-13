-- Bharat Goat Farm (Geedgarh) — upgrade v2
-- Adds milk production records, reporting functions and performance indexes.
-- Run after schema.sql. Safe to run more than once.

-- ─────────────────────────────────────────────────────────────
-- Milk production
-- ─────────────────────────────────────────────────────────────
create table if not exists milk_records (
  id uuid primary key default gen_random_uuid(),
  goat_id uuid not null references goats(id) on delete cascade,
  record_date date not null default current_date,
  session text not null default 'Morning' check (session in ('Morning', 'Evening')),
  litres numeric(6, 2) not null check (litres >= 0),
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) default auth.uid()
);

-- One entry per goat per milking session.
create unique index if not exists uq_milk_goat_date_session on milk_records(goat_id, record_date, session);
create index if not exists idx_milk_records_date on milk_records(record_date);

alter table milk_records enable row level security;

drop policy if exists "Authenticated users can read milk_records" on milk_records;
create policy "Authenticated users can read milk_records" on milk_records
  for select using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can write milk_records" on milk_records;
create policy "Authenticated users can write milk_records" on milk_records
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────
-- Indexes for the date and status filters the app queries by
-- ─────────────────────────────────────────────────────────────
create index if not exists idx_goats_status on goats(status);
create index if not exists idx_goats_mother on goats(mother_id);
create index if not exists idx_goats_father on goats(father_id);
create index if not exists idx_health_next_due on health_records(next_due_date);
create index if not exists idx_health_record_date on health_records(record_date);
create index if not exists idx_breeding_expected on breeding_records(expected_kidding_date);
create index if not exists idx_weight_record_date on weight_records(record_date);
create index if not exists idx_expenses_date on expenses(expense_date);
create index if not exists idx_sales_date on sales(sale_date);
create index if not exists idx_sales_goat on sales(goat_id);

-- Record who created each row.
alter table goats alter column created_by set default auth.uid();
alter table health_records alter column created_by set default auth.uid();
alter table breeding_records alter column created_by set default auth.uid();
alter table weight_records alter column created_by set default auth.uid();
alter table expenses alter column created_by set default auth.uid();
alter table sales alter column created_by set default auth.uid();

-- ─────────────────────────────────────────────────────────────
-- Reporting functions
-- security invoker: they run with the caller's permissions, so row level
-- security still applies. A null date bound means "no limit".
-- ─────────────────────────────────────────────────────────────
create or replace function finance_monthly(p_from date default null, p_to date default null)
returns table (month date, income numeric, expense numeric)
language sql stable security invoker set search_path = public
as $$
  select t.month, sum(t.income), sum(t.expense)
  from (
    select date_trunc('month', s.sale_date)::date as month, s.amount as income, 0::numeric as expense
    from sales s
    where (p_from is null or s.sale_date >= p_from) and (p_to is null or s.sale_date <= p_to)
    union all
    select date_trunc('month', e.expense_date)::date, 0::numeric, e.amount
    from expenses e
    where (p_from is null or e.expense_date >= p_from) and (p_to is null or e.expense_date <= p_to)
  ) t
  group by t.month
  order by t.month;
$$;

create or replace function expense_by_category(p_from date default null, p_to date default null)
returns table (category text, total numeric, entries bigint)
language sql stable security invoker set search_path = public
as $$
  select e.category, sum(e.amount), count(*)
  from expenses e
  where (p_from is null or e.expense_date >= p_from) and (p_to is null or e.expense_date <= p_to)
  group by e.category
  order by sum(e.amount) desc;
$$;

create or replace function sales_by_type(p_from date default null, p_to date default null)
returns table (sale_type text, total numeric, quantity numeric, entries bigint)
language sql stable security invoker set search_path = public
as $$
  select s.sale_type, sum(s.amount), sum(s.quantity), count(*)
  from sales s
  where (p_from is null or s.sale_date >= p_from) and (p_to is null or s.sale_date <= p_to)
  group by s.sale_type
  order by sum(s.amount) desc;
$$;

create or replace function milk_daily_totals(p_from date default null, p_to date default null)
returns table (record_date date, litres numeric, goats bigint)
language sql stable security invoker set search_path = public
as $$
  select m.record_date, sum(m.litres), count(distinct m.goat_id)
  from milk_records m
  where (p_from is null or m.record_date >= p_from) and (p_to is null or m.record_date <= p_to)
  group by m.record_date
  order by m.record_date;
$$;

create or replace function milk_goat_totals(p_from date default null, p_to date default null)
returns table (goat_id uuid, tag_id text, name text, litres numeric, days bigint)
language sql stable security invoker set search_path = public
as $$
  select m.goat_id, g.tag_id, g.name, sum(m.litres), count(distinct m.record_date)
  from milk_records m
  join goats g on g.id = m.goat_id
  where (p_from is null or m.record_date >= p_from) and (p_to is null or m.record_date <= p_to)
  group by m.goat_id, g.tag_id, g.name
  order by sum(m.litres) desc;
$$;

create or replace function herd_breakdown()
returns table (breed text, sex text, status text, total bigint)
language sql stable security invoker set search_path = public
as $$
  select coalesce(nullif(trim(g.breed), ''), 'Unknown'), g.sex, g.status, count(*)
  from goats g
  group by 1, 2, 3;
$$;

grant execute on function finance_monthly(date, date) to authenticated;
grant execute on function expense_by_category(date, date) to authenticated;
grant execute on function sales_by_type(date, date) to authenticated;
grant execute on function milk_daily_totals(date, date) to authenticated;
grant execute on function milk_goat_totals(date, date) to authenticated;
grant execute on function herd_breakdown() to authenticated;

-- Refresh the API schema cache so the new table and functions are visible immediately.
notify pgrst, 'reload schema';

-- Confirms the upgrade ran — you should see one row with milk_records_table = true.
select to_regclass('public.milk_records') is not null as milk_records_table;
