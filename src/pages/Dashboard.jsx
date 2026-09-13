import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { PawPrint, Syringe, HeartHandshake, Milk, TrendingUp, Wallet, IndianRupee, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import StatCard from '../components/StatCard'
import Badge from '../components/Badge'
import EmptyState from '../components/EmptyState'
import { Skeleton } from '../components/Skeleton'
import { FARM_NAME, FARM_LOCATION } from '../components/Brand'
import {
  CHART_COLORS,
  axisProps,
  gridProps,
  BAR_SIZE,
  BAR_RADIUS_UP,
  BAR_RADIUS_RIGHT,
  ChartTooltip,
  ChartLegend,
  ChartCard,
  compactINR,
} from '../components/charts'
import { formatDate, formatINR, formatLitres, daysUntil, goatLabel } from '../lib/format'
import { getMonthRange, lastMonths, offsetISO } from '../lib/dateRanges'

const HEALTH_WINDOW = { start: -3, end: 14 }
const KIDDING_WINDOW = { start: -7, end: 30 }
const MAX_BREEDS = 6

const QUICK_ACTIONS = [
  { to: '/goats?new=1', label: 'Add goat', icon: PawPrint },
  { to: '/milk?new=1', label: 'Record milking', icon: Milk },
  { to: '/health?new=1', label: 'Health record', icon: Syringe },
  { to: '/expenses?new=1', label: 'Add expense', icon: Wallet },
  { to: '/sales?new=1', label: 'Add sale', icon: IndianRupee },
]

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const month = useMemo(() => getMonthRange(0), [])
  const months = useMemo(() => lastMonths(6), [])

  const activeGoats = useSupabaseTable(
    () => supabase.from('goats').select('id', { count: 'exact', head: true }).eq('status', 'Active'),
    []
  )

  const health = useSupabaseTable(
    () =>
      supabase
        .from('health_records')
        .select('id, title, next_due_date, goats(tag_id, name)', { count: 'exact' })
        .gte('next_due_date', offsetISO(HEALTH_WINDOW.start))
        .lte('next_due_date', offsetISO(HEALTH_WINDOW.end))
        .order('next_due_date', { ascending: true })
        .limit(5),
    []
  )

  const kiddings = useSupabaseTable(
    () =>
      supabase
        .from('breeding_records')
        .select('id, expected_kidding_date, doe:goats!breeding_records_doe_id_fkey(tag_id, name)', { count: 'exact' })
        .is('actual_kidding_date', null)
        .eq('outcome', 'Pending')
        .gte('expected_kidding_date', offsetISO(KIDDING_WINDOW.start))
        .lte('expected_kidding_date', offsetISO(KIDDING_WINDOW.end))
        .order('expected_kidding_date', { ascending: true })
        .limit(5),
    []
  )

  const finance = useSupabaseTable(
    () => supabase.rpc('finance_monthly', { p_from: months[0].from, p_to: month.to }),
    [months, month]
  )
  const milk = useSupabaseTable(() => supabase.rpc('milk_daily_totals', { p_from: month.from, p_to: month.to }), [month])
  const herd = useSupabaseTable(() => supabase.rpc('herd_breakdown'), [])

  const financeSeries = useMemo(() => {
    const byMonth = Object.fromEntries(finance.data.map((r) => [String(r.month).slice(0, 7), r]))
    return months.map((m) => ({
      label: m.label,
      income: Number(byMonth[m.key]?.income ?? 0),
      expense: Number(byMonth[m.key]?.expense ?? 0),
    }))
  }, [finance.data, months])

  const thisMonth = financeSeries[financeSeries.length - 1] ?? { income: 0, expense: 0 }
  const net = thisMonth.income - thisMonth.expense
  const milkThisMonth = milk.data.reduce((sum, r) => sum + Number(r.litres), 0)

  const { breeds, does, bucks } = useMemo(() => {
    const active = herd.data.filter((r) => r.status === 'Active')
    const byBreed = {}
    let doeCount = 0
    let buckCount = 0
    for (const r of active) {
      byBreed[r.breed] = (byBreed[r.breed] ?? 0) + Number(r.total)
      if (r.sex === 'Female') doeCount += Number(r.total)
      else buckCount += Number(r.total)
    }
    const sorted = Object.entries(byBreed)
      .map(([breed, total]) => ({ breed, total }))
      .sort((a, b) => b.total - a.total)
    // Fold the long tail into "Other", but never fold a single breed on its own.
    if (sorted.length <= MAX_BREEDS + 1) return { breeds: sorted, does: doeCount, bucks: buckCount }
    const top = sorted.slice(0, MAX_BREEDS)
    top.push({ breed: 'Other', total: sorted.slice(MAX_BREEDS).reduce((sum, r) => sum + r.total, 0) })
    return { breeds: top, does: doeCount, bucks: buckCount }
  }, [herd.data])

  const upgradeError = [finance.error, milk.error, herd.error].find(Boolean)
  const today = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{today}</p>
          <h1 className="mt-1 font-heading text-2xl font-semibold text-foreground sm:text-3xl">{greeting()}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's how {FARM_NAME}, {FARM_LOCATION} is doing.
          </p>
        </div>
      </div>

      <nav aria-label="Quick actions" className="no-print flex gap-2 overflow-x-auto pb-1">
        {QUICK_ACTIONS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary hover:text-primary"
          >
            <Icon size={15} aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>

      {upgradeError && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-accent-light bg-accent-light/40 px-4 py-3 text-sm text-accent">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>{upgradeError}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5 [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-2 xl:[&>*:last-child]:col-span-1">
        <StatCard
          label="Active goats"
          value={activeGoats.count ?? 0}
          icon={PawPrint}
          hint={`${does} does · ${bucks} bucks`}
          loading={activeGoats.loading}
        />
        <StatCard label="Health due" value={health.count ?? 0} icon={Syringe} hint="Overdue or next 14 days" tone="accent" loading={health.loading} />
        <StatCard label="Kiddings due" value={kiddings.count ?? 0} icon={HeartHandshake} hint="Next 30 days" loading={kiddings.loading} />
        <StatCard label="Milk this month" value={formatLitres(milkThisMonth)} icon={Milk} hint={`${milk.data.length} days recorded`} loading={milk.loading} />
        <StatCard
          label="Net this month"
          value={formatINR(net)}
          icon={TrendingUp}
          hint={`${formatINR(thisMonth.income)} in · ${formatINR(thisMonth.expense)} out`}
          tone={net >= 0 ? 'default' : 'destructive'}
          loading={finance.loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartCard
            title="Income vs expenses"
            description="Last 6 months"
            action={
              <ChartLegend
                items={[
                  { label: 'Income', color: CHART_COLORS.income },
                  { label: 'Expenses', color: CHART_COLORS.expense },
                ]}
              />
            }
          >
            {finance.loading ? (
              <Skeleton className="h-64 w-full" />
            ) : financeSeries.every((m) => m.income === 0 && m.expense === 0) ? (
              <EmptyState icon={TrendingUp} title="No income or expenses yet" description="Sales and expenses from the last 6 months will be charted here." />
            ) : (
              <div className="h-64 w-full" role="img" aria-label={`Income and expenses for the last 6 months. This month: income ${formatINR(thisMonth.income)}, expenses ${formatINR(thisMonth.expense)}.`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financeSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="label" {...axisProps} />
                    <YAxis {...axisProps} tickFormatter={compactINR} width={56} />
                    <Tooltip cursor={{ fill: 'rgba(21,128,61,0.06)' }} content={<ChartTooltip formatValue={formatINR} />} />
                    <Bar dataKey="income" name="Income" fill={CHART_COLORS.income} radius={BAR_RADIUS_UP} maxBarSize={BAR_SIZE} />
                    <Bar dataKey="expense" name="Expenses" fill={CHART_COLORS.expense} radius={BAR_RADIUS_UP} maxBarSize={BAR_SIZE} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        </div>

        <ChartCard
          title="Herd by breed"
          description="Active goats"
          action={
            <Link to="/goats" className="text-sm font-medium text-primary hover:underline">
              View herd
            </Link>
          }
        >
          {herd.loading ? (
            <Skeleton className="h-64 w-full" />
          ) : breeds.length === 0 ? (
            <EmptyState icon={PawPrint} title="No goats yet" description="Add goats to see the herd breakdown." />
          ) : (
            <div style={{ height: Math.max(160, breeds.length * 40) }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breeds} layout="vertical" margin={{ top: 0, right: 32, left: 0, bottom: 0 }}>
                  <CartesianGrid {...gridProps} horizontal={false} vertical />
                  <XAxis type="number" {...axisProps} allowDecimals={false} />
                  <YAxis type="category" dataKey="breed" {...axisProps} width={96} />
                  <Tooltip cursor={{ fill: 'rgba(21,128,61,0.06)' }} content={<ChartTooltip />} />
                  <Bar
                    dataKey="total"
                    name="Goats"
                    fill={CHART_COLORS.primary}
                    radius={BAR_RADIUS_RIGHT}
                    maxBarSize={BAR_SIZE}
                    label={{ position: 'right', fontSize: 12, fill: CHART_COLORS.axis }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard
          title="Health due dates"
          description="Overdue or due in the next 14 days"
          action={
            <Link to="/health" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          }
        >
          {health.loading ? (
            <Skeleton className="h-32 w-full" />
          ) : health.data.length === 0 ? (
            <EmptyState icon={Syringe} title="Nothing due soon" description="Vaccination and deworming due dates will show up here." />
          ) : (
            <ul className="divide-y divide-border">
              {health.data.map((r) => {
                const days = daysUntil(r.next_due_date)
                return (
                  <li key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <Badge tone={days <= 0 ? 'red' : days <= 3 ? 'amber' : 'gray'}>
                      {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `In ${days}d`}
                    </Badge>
                    <span className="truncate text-foreground">{goatLabel(r.goats)}</span>
                    <span className="ml-auto truncate text-muted-foreground">{r.title}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </ChartCard>

        <ChartCard
          title="Expected kiddings"
          description="Pending pregnancies due in the next 30 days"
          action={
            <Link to="/breeding" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          }
        >
          {kiddings.loading ? (
            <Skeleton className="h-32 w-full" />
          ) : kiddings.data.length === 0 ? (
            <EmptyState icon={HeartHandshake} title="No kiddings due" description="Expected kidding dates from pending pregnancies will show up here." />
          ) : (
            <ul className="divide-y divide-border">
              {kiddings.data.map((r) => {
                const days = daysUntil(r.expected_kidding_date)
                return (
                  <li key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <Badge tone={days <= 3 ? 'amber' : 'gray'}>{days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `In ${days}d`}</Badge>
                    <span className="truncate text-foreground">{goatLabel(r.doe)}</span>
                    <span className="ml-auto text-muted-foreground">{formatDate(r.expected_kidding_date)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </ChartCard>
      </div>
    </div>
  )
}
