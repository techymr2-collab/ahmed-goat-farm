import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PawPrint, Syringe, HeartHandshake, Wallet, IndianRupee, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import Badge from '../components/Badge'
import EmptyState from '../components/EmptyState'
import { formatDate, formatINR, daysUntil } from '../lib/format'
import { getMonthRange } from '../lib/dateRanges'

const HEALTH_WINDOW_START_DAYS = -3
const HEALTH_WINDOW_END_DAYS = 14
const KIDDING_WINDOW_START_DAYS = -7

function isoDateOffset(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export default function Dashboard() {
  const { count: totalGoats, loading: totalLoading } = useSupabaseTable(
    () => supabase.from('goats').select('id', { count: 'exact', head: true }),
    []
  )
  const { count: activeGoatCount, loading: activeLoading } = useSupabaseTable(
    () => supabase.from('goats').select('id', { count: 'exact', head: true }).eq('status', 'Active'),
    []
  )

  const { data: healthRecords } = useSupabaseTable(
    () =>
      supabase
        .from('health_records')
        .select('*, goats(tag_id, name)')
        .gte('next_due_date', isoDateOffset(HEALTH_WINDOW_START_DAYS))
        .lte('next_due_date', isoDateOffset(HEALTH_WINDOW_END_DAYS))
        .order('next_due_date', { ascending: true })
        .limit(5),
    []
  )
  const { data: breedingRecords } = useSupabaseTable(
    () =>
      supabase
        .from('breeding_records')
        .select('*, doe:goats!breeding_records_doe_id_fkey(tag_id, name)')
        .is('actual_kidding_date', null)
        .gte('expected_kidding_date', isoDateOffset(KIDDING_WINDOW_START_DAYS))
        .order('expected_kidding_date', { ascending: true })
        .limit(5),
    []
  )

  const { from: monthFrom, to: monthTo } = useMemo(() => getMonthRange(0), [])
  const { data: monthExpenses } = useSupabaseTable(
    () => supabase.from('expenses').select('amount').gte('expense_date', monthFrom).lte('expense_date', monthTo),
    [monthFrom, monthTo]
  )
  const { data: monthSales } = useSupabaseTable(
    () => supabase.from('sales').select('amount').gte('sale_date', monthFrom).lte('sale_date', monthTo),
    [monthFrom, monthTo]
  )

  const upcomingHealth = useMemo(
    () => healthRecords.map((r) => ({ ...r, days: daysUntil(r.next_due_date) })),
    [healthRecords]
  )

  const upcomingKidding = useMemo(
    () => breedingRecords.map((r) => ({ ...r, days: daysUntil(r.expected_kidding_date) })),
    [breedingRecords]
  )

  const monthlyExpense = useMemo(() => monthExpenses.reduce((s, e) => s + Number(e.amount), 0), [monthExpenses])
  const monthlySales = useMemo(() => monthSales.reduce((s, r) => s + Number(r.amount), 0), [monthSales])

  const goatsLoading = totalLoading || activeLoading

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your herd, health, and finances." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active goats"
          value={goatsLoading ? '—' : activeGoatCount ?? 0}
          icon={PawPrint}
          hint={`${totalGoats ?? 0} total in registry`}
        />
        <StatCard label="Due soon" value={upcomingHealth.length} icon={Syringe} hint="Vaccinations & deworming" tone="accent" />
        <StatCard label="Expected kiddings" value={upcomingKidding.length} icon={HeartHandshake} hint="Next 7+ days" />
        <StatCard
          label="This month"
          value={formatINR(monthlySales - monthlyExpense)}
          icon={TrendingUp}
          hint="Net (sales − expenses)"
          tone={monthlySales - monthlyExpense >= 0 ? 'default' : 'destructive'}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold text-foreground">Upcoming health due dates</h2>
            <Link to="/health" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          {upcomingHealth.length === 0 ? (
            <EmptyState icon={Syringe} title="Nothing due soon" description="Vaccination and deworming due dates will show up here." />
          ) : (
            <ul className="divide-y divide-border">
              {upcomingHealth.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <Badge tone={r.days <= 0 ? 'red' : r.days <= 3 ? 'amber' : 'gray'}>
                    {r.days < 0 ? `${Math.abs(r.days)}d overdue` : r.days === 0 ? 'Today' : `In ${r.days}d`}
                  </Badge>
                  <span className="text-foreground">
                    {r.goats?.tag_id} {r.goats?.name ? `· ${r.goats.name}` : ''}
                  </span>
                  <span className="ml-auto text-muted-foreground">{r.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold text-foreground">Expected kiddings</h2>
            <Link to="/breeding" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          {upcomingKidding.length === 0 ? (
            <EmptyState icon={HeartHandshake} title="No upcoming kiddings" description="Expected kidding dates from active pregnancies will show up here." />
          ) : (
            <ul className="divide-y divide-border">
              {upcomingKidding.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <Badge tone={r.days <= 3 ? 'amber' : 'gray'}>{r.days < 0 ? `${Math.abs(r.days)}d overdue` : `In ${r.days}d`}</Badge>
                  <span className="text-foreground">
                    {r.doe?.tag_id} {r.doe?.name ? `· ${r.doe.name}` : ''}
                  </span>
                  <span className="ml-auto text-muted-foreground">{formatDate(r.expected_kidding_date)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Expenses this month" value={formatINR(monthlyExpense)} icon={Wallet} />
        <StatCard label="Sales this month" value={formatINR(monthlySales)} icon={IndianRupee} />
      </div>
    </div>
  )
}
