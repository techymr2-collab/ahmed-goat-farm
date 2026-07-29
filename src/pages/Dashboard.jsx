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

export default function Dashboard() {
  const { data: goats, loading: goatsLoading } = useSupabaseTable(() => supabase.from('goats').select('*'), [])
  const { data: healthRecords } = useSupabaseTable(
    () => supabase.from('health_records').select('*, goats(tag_id, name)').not('next_due_date', 'is', null),
    []
  )
  const { data: breedingRecords } = useSupabaseTable(
    () =>
      supabase
        .from('breeding_records')
        .select('*, doe:goats!breeding_records_doe_id_fkey(tag_id, name)')
        .is('actual_kidding_date', null),
    []
  )
  const { data: expenses } = useSupabaseTable(() => supabase.from('expenses').select('*'), [])
  const { data: sales } = useSupabaseTable(() => supabase.from('sales').select('*'), [])

  const activeGoats = useMemo(() => goats.filter((g) => g.status === 'Active'), [goats])

  const upcomingHealth = useMemo(
    () =>
      healthRecords
        .map((r) => ({ ...r, days: daysUntil(r.next_due_date) }))
        .filter((r) => r.days !== null && r.days >= -3 && r.days <= 14)
        .sort((a, b) => a.days - b.days)
        .slice(0, 5),
    [healthRecords]
  )

  const upcomingKidding = useMemo(
    () =>
      breedingRecords
        .map((r) => ({ ...r, days: daysUntil(r.expected_kidding_date) }))
        .filter((r) => r.days !== null && r.days >= -7)
        .sort((a, b) => a.days - b.days)
        .slice(0, 5),
    [breedingRecords]
  )

  const { monthlyExpense, monthlySales } = useMemo(() => {
    const now = new Date()
    const inMonth = (dateStr) => {
      const d = new Date(dateStr)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }
    return {
      monthlyExpense: expenses.filter((e) => inMonth(e.expense_date)).reduce((s, e) => s + Number(e.amount), 0),
      monthlySales: sales.filter((s) => inMonth(s.sale_date)).reduce((s, r) => s + Number(r.amount), 0),
    }
  }, [expenses, sales])

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your herd, health, and finances." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active goats" value={goatsLoading ? '—' : activeGoats.length} icon={PawPrint} hint={`${goats.length} total in registry`} />
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
