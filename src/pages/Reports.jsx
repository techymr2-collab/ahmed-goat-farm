import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Printer, TrendingUp, TrendingDown, Wallet, IndianRupee, Milk, FileBarChart } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import Button from '../components/Button'
import DateRangeFilter from '../components/DateRangeFilter'
import ExportButton from '../components/ExportButton'
import BreakdownList from '../components/BreakdownList'
import { Skeleton } from '../components/Skeleton'
import { FARM_NAME, FARM_LOCATION } from '../components/Brand'
import {
  CHART_COLORS,
  axisProps,
  gridProps,
  BAR_SIZE,
  BAR_RADIUS_UP,
  ChartTooltip,
  ChartLegend,
  ChartCard,
  compactINR,
} from '../components/charts'
import { formatDate, formatINR, formatLitres, formatNumber } from '../lib/format'
import { resolveRange, periodLabel, todayISO } from '../lib/dateRanges'
import { exporters } from '../lib/exports'

const MONTH_LABEL = new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit' })

export default function Reports() {
  const [range, setRange] = useState({ preset: 'year', from: null, to: null })
  const { from, to } = useMemo(() => resolveRange(range), [range])
  const label = periodLabel(range, from, to)

  const monthly = useSupabaseTable(() => supabase.rpc('finance_monthly', { p_from: from, p_to: to }), [from, to])
  const expenses = useSupabaseTable(() => supabase.rpc('expense_by_category', { p_from: from, p_to: to }), [from, to])
  const sales = useSupabaseTable(() => supabase.rpc('sales_by_type', { p_from: from, p_to: to }), [from, to])
  const milk = useSupabaseTable(() => supabase.rpc('milk_daily_totals', { p_from: from, p_to: to }), [from, to])
  const herd = useSupabaseTable(() => supabase.rpc('herd_breakdown'), [])

  const series = monthly.data.map((r) => {
    const [y, m] = String(r.month).split('-').map(Number)
    const income = Number(r.income)
    const expense = Number(r.expense)
    return { label: MONTH_LABEL.format(new Date(y, m - 1, 1)), income, expense, net: income - expense }
  })

  const income = sales.data.reduce((s, r) => s + Number(r.total), 0)
  const spend = expenses.data.reduce((s, r) => s + Number(r.total), 0)
  const net = income - spend
  const milkLitres = milk.data.reduce((s, r) => s + Number(r.litres), 0)
  const milkSold = sales.data.find((r) => r.sale_type === 'Milk')

  const herdSummary = useMemo(() => {
    const byStatus = { Active: 0, Sold: 0, Deceased: 0 }
    let does = 0
    let bucks = 0
    for (const r of herd.data) {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + Number(r.total)
      if (r.status !== 'Active') continue
      if (r.sex === 'Female') does += Number(r.total)
      else bucks += Number(r.total)
    }
    return { ...byStatus, does, bucks }
  }, [herd.data])

  const loading = monthly.loading || expenses.loading || sales.loading
  const error = [monthly.error, expenses.error, sales.error, milk.error, herd.error].find(Boolean)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Profit & loss, production and herd summary for any period."
        action={
          <Button variant="secondary" icon={Printer} onClick={() => window.print()} className="no-print">
            Print report
          </Button>
        }
      />

      {/* Shown only on paper */}
      <div className="hidden print:block">
        <p className="font-heading text-xl font-semibold">
          {FARM_NAME}, {FARM_LOCATION}
        </p>
        <p className="text-sm">
          Report for {label}
          {from && to ? '' : ` (to ${formatDate(todayISO())})`} · generated {formatDate(todayISO())}
        </p>
      </div>

      <div className="no-print">
        <DateRangeFilter preset={range.preset} from={range.from} to={range.to} onChange={(patch) => setRange((r) => ({ ...r, ...patch }))} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Income" value={formatINR(income)} icon={IndianRupee} hint={label} loading={loading} />
        <StatCard label="Expenses" value={formatINR(spend)} icon={Wallet} tone="accent" hint={label} loading={loading} />
        <StatCard
          label={net >= 0 ? 'Profit' : 'Loss'}
          value={formatINR(Math.abs(net))}
          icon={net >= 0 ? TrendingUp : TrendingDown}
          tone={net >= 0 ? 'default' : 'destructive'}
          hint={income ? `${Math.round((net / income) * 100)}% margin` : 'No income recorded'}
          loading={loading}
        />
        <StatCard
          label="Milk produced"
          value={formatLitres(milkLitres)}
          icon={Milk}
          hint={milkSold?.quantity ? `${formatNumber(milkSold.quantity)} L sold for ${formatINR(milkSold.total)}` : `${milk.data.length} days recorded`}
          loading={milk.loading}
        />
      </div>

      <ChartCard
        title="Income vs expenses by month"
        description={label}
        action={
          <ChartLegend
            items={[
              { label: 'Income', color: CHART_COLORS.income },
              { label: 'Expenses', color: CHART_COLORS.expense },
            ]}
          />
        }
      >
        {monthly.loading ? (
          <Skeleton className="h-64 w-full" />
        ) : series.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No income or expenses recorded in this period.</p>
        ) : (
          <>
            <div className="h-64 w-full" role="img" aria-label={`Monthly income and expenses for ${label}. Table below.`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis {...axisProps} tickFormatter={compactINR} width={56} />
                  <Tooltip cursor={{ fill: 'rgba(21,128,61,0.06)' }} content={<ChartTooltip formatValue={formatINR} />} />
                  <Bar dataKey="income" name="Income" fill={CHART_COLORS.income} radius={BAR_RADIUS_UP} maxBarSize={BAR_SIZE} isAnimationActive={false} />
                  <Bar dataKey="expense" name="Expenses" fill={CHART_COLORS.expense} radius={BAR_RADIUS_UP} maxBarSize={BAR_SIZE} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <caption className="sr-only">Monthly profit and loss</caption>
                <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="py-2 pr-4 font-medium">Month</th>
                    <th scope="col" className="py-2 pr-4 text-right font-medium">Income</th>
                    <th scope="col" className="py-2 pr-4 text-right font-medium">Expenses</th>
                    <th scope="col" className="py-2 text-right font-medium">Net</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {series.map((row) => (
                    <tr key={row.label} className="border-b border-border last:border-0">
                      <th scope="row" className="py-2 pr-4 font-normal text-foreground">{row.label}</th>
                      <td className="py-2 pr-4 text-right text-muted-foreground">{formatINR(row.income)}</td>
                      <td className="py-2 pr-4 text-right text-muted-foreground">{formatINR(row.expense)}</td>
                      <td className={`py-2 text-right font-medium ${row.net < 0 ? 'text-destructive' : 'text-foreground'}`}>{formatINR(row.net)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="tabular-nums">
                  <tr className="border-t-2 border-border">
                    <th scope="row" className="py-2 pr-4 text-left font-semibold text-foreground">Total</th>
                    <td className="py-2 pr-4 text-right font-semibold text-foreground">{formatINR(income)}</td>
                    <td className="py-2 pr-4 text-right font-semibold text-foreground">{formatINR(spend)}</td>
                    <td className={`py-2 text-right font-semibold ${net < 0 ? 'text-destructive' : 'text-foreground'}`}>{formatINR(net)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </ChartCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard title="Expenses by category" description={label}>
          {expenses.loading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <BreakdownList
              rows={expenses.data.map((r) => ({ label: r.category, total: Number(r.total), hint: `${r.entries} entr${Number(r.entries) === 1 ? 'y' : 'ies'}` }))}
              emptyText="No expenses in this period."
            />
          )}
        </ChartCard>

        <ChartCard title="Income by type" description={label}>
          {sales.loading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <BreakdownList
              rows={sales.data.map((r) => ({
                label: r.sale_type,
                total: Number(r.total),
                hint: r.sale_type === 'Milk' && r.quantity ? `${formatNumber(r.quantity)} L` : `${r.entries} sale${Number(r.entries) === 1 ? '' : 's'}`,
              }))}
              emptyText="No sales in this period."
            />
          )}
        </ChartCard>

        <ChartCard title="Herd today" description="Current registry">
          {herd.loading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <HerdFigure label="Active" value={herdSummary.Active} />
              <HerdFigure label="Does / bucks" value={`${herdSummary.does} / ${herdSummary.bucks}`} />
              <HerdFigure label="Sold" value={herdSummary.Sold} />
              <HerdFigure label="Deceased" value={herdSummary.Deceased} />
            </dl>
          )}
        </ChartCard>
      </div>

      <section className="no-print rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileBarChart size={20} aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-heading text-base font-semibold text-foreground">Download data (CSV)</h2>
            <p className="text-sm text-muted-foreground">
              Opens in Excel or Google Sheets. Dated records use the selected period ({label}); the goat list is always the full registry.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(exporters).map(([key, exporter]) => (
            <ExportButton
              key={key}
              label={exporter.label}
              size="sm"
              load={() => (exporter.dated ? exporter.load(from, to) : exporter.load())}
              onExport={(rows) => (exporter.dated ? exporter.save(rows, from, to) : exporter.save(rows))}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function HerdFigure({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-heading text-xl font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  )
}
