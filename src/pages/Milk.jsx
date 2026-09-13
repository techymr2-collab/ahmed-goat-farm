import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Plus, Milk as MilkIcon, Droplets, CalendarDays, Trophy } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import { usePagedQuery } from '../hooks/usePagedQuery'
import { useGoatOptions } from '../hooks/useGoatOptions'
import { useNewParam } from '../hooks/useNewParam'
import { useToast } from '../context/ToastContext'
import PageHeader from '../components/PageHeader'
import Badge from '../components/Badge'
import Button from '../components/Button'
import StatCard from '../components/StatCard'
import EmptyState from '../components/EmptyState'
import DataTable, { RowActions } from '../components/DataTable'
import DateRangeFilter from '../components/DateRangeFilter'
import ExportButton from '../components/ExportButton'
import MilkEntryModal from '../components/MilkEntryModal'
import ConfirmDialog from '../components/ConfirmDialog'
import { Skeleton } from '../components/Skeleton'
import { CHART_COLORS, axisProps, gridProps, BAR_SIZE, BAR_RADIUS_UP, ChartTooltip, ChartCard } from '../components/charts'
import { formatDate, formatLitres, formatNumber, goatLabel, parseDate } from '../lib/format'
import { resolveRange, toLocalISODate } from '../lib/dateRanges'
import { exporters } from '../lib/exports'

const DAY_TICK = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' })

/** Fill in missing days with 0 so gaps in recording are visible, not skipped. */
function fillDays(rows, from, to) {
  const byDate = Object.fromEntries(rows.map((r) => [r.record_date, Number(r.litres)]))
  const start = parseDate(from ?? rows[0]?.record_date)
  const end = parseDate(to ?? rows[rows.length - 1]?.record_date)
  if (!start || !end) return []
  const today = new Date()
  const last = end > today ? today : end
  // Very long ranges (e.g. "All time") show the most recent 366 days.
  const earliest = new Date(last)
  earliest.setDate(earliest.getDate() - 365)
  const first = start < earliest ? earliest : start
  const days = []
  for (const d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    const key = toLocalISODate(d)
    days.push({ date: key, litres: byDate[key] ?? 0 })
  }
  return days
}

export default function Milk() {
  const toast = useToast()
  const { goats } = useGoatOptions()
  const [range, setRange] = useState({ preset: 'month', from: null, to: null })
  const [entryOpen, setEntryOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const { from, to } = useMemo(() => resolveRange(range), [range])

  const daily = useSupabaseTable(() => supabase.rpc('milk_daily_totals', { p_from: from, p_to: to }), [from, to])
  const perGoat = useSupabaseTable(() => supabase.rpc('milk_goat_totals', { p_from: from, p_to: to }), [from, to])

  const log = usePagedQuery(() => {
    let query = supabase.from('milk_records').select('*, goats(tag_id, name)', { count: 'exact' })
    if (from && to) query = query.gte('record_date', from).lte('record_date', to)
    // 'Evening' sorts before 'Morning', so the latest session of each day comes first.
    return query.order('record_date', { ascending: false }).order('session', { ascending: true })
  }, [from, to])

  useNewParam(() => setEntryOpen(true))

  const totalLitres = daily.data.reduce((sum, r) => sum + Number(r.litres), 0)
  const daysRecorded = daily.data.length
  const top = perGoat.data[0]
  const chartData = useMemo(() => fillDays(daily.data, from, to), [daily.data, from, to])

  function refresh() {
    daily.refetch()
    perGoat.refetch()
    log.refetch()
  }

  async function handleDelete() {
    const target = deleteTarget
    setDeleteTarget(null)
    const { error } = await supabase.from('milk_records').delete().eq('id', target.id)
    if (error) return toast.error(`Couldn't delete: ${error.message}`)
    toast.success('Milk entry deleted.')
    refresh()
  }

  const rangeLabel = from && to ? `${formatDate(from)} – ${formatDate(to)}` : 'All time'
  const loadingSummary = daily.loading || perGoat.loading
  const upgradeError = daily.error || perGoat.error || log.error

  return (
    <div className="space-y-6">
      <PageHeader
        title="Milk Production"
        description="Daily milk yield per doe, morning and evening."
        action={
          <div className="flex flex-wrap gap-2">
            <ExportButton load={() => exporters.milk.load(from, to)} onExport={(rows) => exporters.milk.save(rows, from, to)} />
            <Button icon={Plus} onClick={() => setEntryOpen(true)}>
              Record milking
            </Button>
          </div>
        }
      />

      <DateRangeFilter preset={range.preset} from={range.from} to={range.to} onChange={(patch) => setRange((r) => ({ ...r, ...patch }))} />

      {upgradeError && <p className="text-sm text-destructive">{upgradeError}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total milk" value={formatLitres(totalLitres)} icon={MilkIcon} hint={rangeLabel} loading={loadingSummary} />
        <StatCard
          label="Average per recorded day"
          value={formatLitres(daysRecorded ? totalLitres / daysRecorded : 0)}
          icon={Droplets}
          hint={`${daysRecorded} day${daysRecorded === 1 ? '' : 's'} recorded`}
          loading={loadingSummary}
        />
        <StatCard label="Does milked" value={perGoat.data.length} icon={CalendarDays} hint="With at least one entry" loading={loadingSummary} />
        <StatCard
          label="Top producer"
          value={top ? top.tag_id : '—'}
          icon={Trophy}
          tone="accent"
          hint={top ? `${top.name ? `${top.name} · ` : ''}${formatLitres(top.litres)}` : 'No entries yet'}
          loading={loadingSummary}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartCard title="Daily milk" description={`Litres per day · ${rangeLabel}`}>
            {daily.loading ? (
              <Skeleton className="h-64 w-full" />
            ) : daily.data.length === 0 ? (
              <EmptyState icon={MilkIcon} title="No milk recorded" description="Use “Record milking” after each milking session." />
            ) : (
              <div className="h-64 w-full" role="img" aria-label={`Daily milk totals, ${formatLitres(totalLitres)} over ${rangeLabel}.`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="date" {...axisProps} tickFormatter={(d) => DAY_TICK.format(parseDate(d))} minTickGap={16} />
                    <YAxis {...axisProps} width={44} tickFormatter={(v) => `${v} L`} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(21,128,61,0.06)' }}
                      content={<ChartTooltip labelFormatter={formatDate} formatValue={formatLitres} />}
                    />
                    <Bar dataKey="litres" name="Milk" fill={CHART_COLORS.primary} radius={BAR_RADIUS_UP} maxBarSize={BAR_SIZE} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        </div>

        <ChartCard title="By doe" description="Ranked by total litres">
          {perGoat.loading ? (
            <Skeleton className="h-64 w-full" />
          ) : perGoat.data.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No entries in this period.</p>
          ) : (
            <ol className="max-h-72 divide-y divide-border overflow-y-auto">
              {perGoat.data.map((g, i) => {
                const share = totalLitres ? (Number(g.litres) / Number(perGoat.data[0].litres)) * 100 : 0
                return (
                  <li key={g.goat_id} className="py-2.5">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="w-5 text-right text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                      <Link to={`/goats/${g.goat_id}`} className="min-w-0 flex-1 truncate font-medium text-foreground hover:text-primary hover:underline">
                        {goatLabel(g)}
                      </Link>
                      <span className="tabular-nums text-foreground">{formatLitres(g.litres)}</span>
                    </div>
                    <div className="ml-8 mt-1.5 h-1.5 rounded-full bg-muted">
                      <div className="h-1.5 rounded-full bg-primary" style={{ width: `${share}%` }} />
                    </div>
                    <p className="ml-8 mt-1 text-xs text-muted-foreground">
                      {g.days} day{Number(g.days) === 1 ? '' : 's'} · {formatNumber(Number(g.litres) / Number(g.days))} L/day
                    </p>
                  </li>
                )
              })}
            </ol>
          )}
        </ChartCard>
      </div>

      <section>
        <h2 className="mb-3 font-heading text-base font-semibold text-foreground">Entries</h2>
        <DataTable
          rows={log.data}
          loading={log.loading}
          totalCount={log.count}
          page={log.page}
          onPageChange={log.setPage}
          minWidth={560}
          empty={<EmptyState icon={MilkIcon} title="No entries in this period" description="Try a different date range, or record today’s milking." />}
          columns={[
            {
              header: 'Goat',
              cell: (r) => (
                <Link to={`/goats/${r.goat_id}`} className="font-medium text-foreground hover:text-primary hover:underline">
                  {goatLabel(r.goats)}
                </Link>
              ),
            },
            { header: 'Date', cell: (r) => formatDate(r.record_date) },
            { header: 'Session', cell: (r) => <Badge tone={r.session === 'Morning' ? 'amber' : 'gray'}>{r.session}</Badge> },
            { header: 'Litres', align: 'right', cell: (r) => formatLitres(r.litres) },
          ]}
          actions={(r) => <RowActions label={`milk entry for ${r.goats?.tag_id}`} onDelete={() => setDeleteTarget(r)} />}
        />
        <p className="mt-2 text-xs text-muted-foreground">To correct an entry, open “Record milking” for that date and session.</p>
      </section>

      <MilkEntryModal
        open={entryOpen}
        onClose={() => setEntryOpen(false)}
        goats={goats}
        onSaved={({ count, litres, session, date }) => {
          setEntryOpen(false)
          toast.success(`${session} milking on ${formatDate(date)} saved — ${count} does, ${formatLitres(litres)}.`)
          refresh()
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete milk entry?"
        description="This entry will be permanently removed."
      />
    </div>
  )
}
