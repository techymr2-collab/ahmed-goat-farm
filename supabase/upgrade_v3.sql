-- Bharat Goat Farm (Geedgarh) — upgrade v3: in-app notifications
-- Run after upgrade_v2.sql. Safe to run more than once.

-- ─────────────────────────────────────────────────────────────
-- Dismissed notifications (per user)
-- A notification's key includes its due date, so dismissing one doesn't hide
-- the next cycle (e.g. next year's vaccination).
-- ─────────────────────────────────────────────────────────────
create table if not exists notification_dismissals (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  notification_key text not null,
  dismissed_at timestamptz not null default now(),
  primary key (user_id, notification_key)
);

alter table notification_dismissals enable row level security;

drop policy if exists "Users can read their own dismissals" on notification_dismissals;
create policy "Users can read their own dismissals" on notification_dismissals
  for select using (user_id = auth.uid());

drop policy if exists "Users can add their own dismissals" on notification_dismissals;
create policy "Users can add their own dismissals" on notification_dismissals
  for insert with check (user_id = auth.uid());

drop policy if exists "Users can remove their own dismissals" on notification_dismissals;
create policy "Users can remove their own dismissals" on notification_dismissals
  for delete using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- Notification feed
-- Computed from live records, so alerts clear themselves once handled.
-- p_today is passed by the app so "today" follows India time, not the
-- database server's UTC clock.
-- ─────────────────────────────────────────────────────────────
create or replace function farm_notifications(
  p_today date default current_date,
  p_health_days integer default 7,
  p_kidding_days integer default 14,
  p_weight_days integer default 60
)
returns table (
  notification_key text,
  kind text,
  goat_id uuid,
  tag_id text,
  goat_name text,
  title text,
  due_date date,
  days_until integer
)
language sql stable security invoker set search_path = public
as $$
  with latest_health as (
    -- Only the most recent entry of each treatment per goat counts: once the
    -- next dose is recorded, the old due date stops alerting.
    select distinct on (h.goat_id, h.record_type, lower(trim(h.title)))
      h.id, h.goat_id, h.record_type, h.title, h.next_due_date
    from health_records h
    order by h.goat_id, h.record_type, lower(trim(h.title)), h.record_date desc, h.created_at desc
  ),
  feed as (
    select
      'health:' || lh.id || ':' || lh.next_due_date as notification_key,
      'health' as kind,
      g.id as goat_id, g.tag_id, g.name as goat_name,
      lh.record_type || ': ' || trim(lh.title) as title,
      lh.next_due_date as due_date,
      (lh.next_due_date - p_today) as days_until
    from latest_health lh
    join goats g on g.id = lh.goat_id
    where g.status = 'Active'
      and lh.next_due_date is not null
      and lh.next_due_date <= p_today + p_health_days

    union all

    select
      'kidding:' || b.id || ':' || b.expected_kidding_date,
      'kidding',
      g.id, g.tag_id, g.name,
      'Kidding expected',
      b.expected_kidding_date,
      (b.expected_kidding_date - p_today)
    from breeding_records b
    join goats g on g.id = b.doe_id
    where g.status = 'Active'
      and b.outcome = 'Pending'
      and b.actual_kidding_date is null
      and b.expected_kidding_date is not null
      and b.expected_kidding_date <= p_today + p_kidding_days

    union all

    select
      'weight:' || g.id || ':' || coalesce(lw.last_date::text, 'never'),
      'weight',
      g.id, g.tag_id, g.name,
      case when lw.last_date is null then 'No weigh-in recorded yet'
           else 'Last weighed ' || to_char(lw.last_date, 'DD Mon YYYY') end,
      coalesce(lw.last_date, g.acquired_date, g.date_of_birth) + p_weight_days,
      (coalesce(lw.last_date, g.acquired_date, g.date_of_birth) + p_weight_days - p_today)
    from goats g
    left join lateral (
      select max(w.record_date) as last_date from weight_records w where w.goat_id = g.id
    ) lw on true
    where g.status = 'Active'
      and coalesce(lw.last_date, g.acquired_date, g.date_of_birth, g.created_at::date) < p_today - p_weight_days
  )
  select f.*
  from feed f
  where not exists (
    select 1 from notification_dismissals d
    where d.user_id = auth.uid() and d.notification_key = f.notification_key
  )
  order by f.days_until nulls last, f.tag_id;
$$;

grant execute on function farm_notifications(date, integer, integer, integer) to authenticated;

create index if not exists idx_weight_records_goat_date on weight_records(goat_id, record_date);
create index if not exists idx_health_records_goat_type on health_records(goat_id, record_type, record_date);

notify pgrst, 'reload schema';

-- Confirms the upgrade ran — you should see one row with notifications_ready = true.
select to_regprocedure('farm_notifications(date, integer, integer, integer)') is not null as notifications_ready;
