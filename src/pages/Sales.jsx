import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, IndianRupee } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import { usePagedQuery } from '../hooks/usePagedQuery'
import { useGoatOptions } from '../hooks/useGoatOptions'
import { useNewParam } from '../hooks/useNewParam'
import { useToast } from '../context/ToastContext'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import Badge from '../components/Badge'
import Button from '../components/Button'
import EmptyState from '../components/EmptyState'
import DataTable, { RowActions } from '../components/DataTable'
import DateRangeFilter from '../components/DateRangeFilter'
import FilterChips from '../components/FilterChips'
import ExportButton from '../components/ExportButton'
import BreakdownList from '../components/BreakdownList'
import SaleModal from '../components/SaleModal'
import ConfirmDialog from '../components/ConfirmDialog'
import { ChartCard } from '../components/charts'
import { Skeleton } from '../components/Skeleton'
import { formatDate, formatINR, formatNumber, goatLabel } from '../lib/format'
import { resolveRange, periodLabel } from '../lib/dateRanges'
import { exporters } from '../lib/exports'

const TYPE_TONE = { Goat: 'green', Milk: 'amber', Other: 'gray' }
const TYPES = ['All', 'Goat', 'Milk', 'Other']

function saleDetails(r) {
  if (r.sale_type === 'Goat' && r.goats) {
    return (
      <Link to={`/goats/${r.goat_id}`} className="text-foreground hover:text-primary hover:underline">
        {goatLabel(r.goats)}
      </Link>
    )
  }
  if (r.sale_type === 'Milk' && r.quantity) return `${formatNumber(r.quantity)} L`
  return r.notes || '—'
}

export default function Sales() {
  const toast = useToast()
  const { goats, refetch: refetchGoats } = useGoatOptions()
  const [range, setRange] = useState({ preset: 'month', from: null, to: null })
  const [type, setType] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const { from, to } = useMemo(() => resolveRange(range), [range])

  const breakdown = useSupabaseTable(() => supabase.rpc('sales_by_type', { p_from: from, p_to: to }), [from, to])
  const allTime = useSupabaseTable(() => supabase.rpc('sales_by_type', { p_from: null, p_to: null }), [])

  const records = usePagedQuery(() => {
    let query = supabase.from('sales').select('*, goats(tag_id, name)', { count: 'exact' })
    if (from && to) query = query.gte('sale_date', from).lte('sale_date', to)
    if (type !== 'All') query = query.eq('sale_type', type)
    return query.order('sale_date', { ascending: false }).order('created_at', { ascending: false })
  }, [from, to, type])

  useNewParam(() => {
    setEditing(null)
    setModalOpen(true)
  })

  const rows = breakdown.data.map((r) => ({
    label: r.sale_type,
    total: Number(r.total),
    hint:
      r.sale_type === 'Milk' && r.quantity
        ? `${formatNumber(r.quantity)} L sold · ${formatINR(Number(r.total) / Number(r.quantity))}/L`
        : `${r.entries} sale${Number(r.entries) === 1 ? '' : 's'}`,
  }))
  const periodTotal = rows.reduce((s, r) => s + r.total, 0)
  const allTimeTotal = allTime.data.reduce((s, r) => s + Number(r.total), 0)
  const salesCount = breakdown.data.reduce((s, r) => s + Number(r.entries), 0)

  function refresh() {
    records.refetch()
    breakdown.refetch()
    allTime.refetch()
    refetchGoats()
  }

  async function handleDelete() {
    const target = deleteTarget
    setDeleteTarget(null)
    const { error } = await supabase.from('sales').delete().eq('id', target.id)
    if (error) return toast.error(`Couldn't delete: ${error.message}`)
    toast.success('Sale deleted.')
    refresh()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales"
        description="Goat, milk, and other sales — buyers and revenue."
        action={
          <div className="flex flex-wrap gap-2">
            <ExportButton load={() => exporters.sales.load(from, to)} onExport={(r) => exporters.sales.save(r, from, to)} />
            <Button
              icon={Plus}
              onClick={() => {
                setEditing(null)
                setModalOpen(true)
              }}
            >
              Add sale
            </Button>
          </div>
        }
      />

      <DateRangeFilter preset={range.preset} from={range.from} to={range.to} onChange={(patch) => setRange((r) => ({ ...r, ...patch }))} />

      {(breakdown.error || records.error) && <p className="text-sm text-destructive">{breakdown.error || records.error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={periodLabel(range, from, to)} value={formatINR(periodTotal)} icon={IndianRupee} loading={breakdown.loading} />
        <StatCard
          label="Number of sales"
          value={salesCount}
          icon={IndianRupee}
          hint={salesCount ? `Average ${formatINR(periodTotal / salesCount)} per sale` : 'No sales'}
          loading={breakdown.loading}
        />
        <StatCard label="All time" value={formatINR(allTimeTotal)} icon={IndianRupee} tone="accent" loading={allTime.loading} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:order-2">
          <ChartCard title="Revenue by type" description={periodLabel(range, from, to)}>
            {breakdown.loading ? <Skeleton className="h-40 w-full" /> : <BreakdownList rows={rows} emptyText="No sales in this period." />}
          </ChartCard>
        </div>

        <div className="xl:order-1 xl:col-span-2">
          <div className="mb-3">
            <FilterChips label="Filter by type" options={TYPES} value={type} onChange={setType} />
          </div>
          <DataTable
            rows={records.data}
            loading={records.loading}
            totalCount={records.count}
            page={records.page}
            onPageChange={records.setPage}
            minWidth={680}
            empty={<EmptyState icon={IndianRupee} title="No sales in this period" description="Try a different date range or type, or add a sale." />}
            columns={[
              { header: 'Details', cell: saleDetails },
              { header: 'Date', cell: (r) => formatDate(r.sale_date) },
              { header: 'Type', cell: (r) => <Badge tone={TYPE_TONE[r.sale_type] ?? 'gray'}>{r.sale_type}</Badge> },
              { header: 'Buyer', cell: (r) => r.buyer_name || '—' },
              { header: 'Amount', align: 'right', cell: (r) => <span className="font-medium text-foreground">{formatINR(r.amount)}</span> },
            ]}
            actions={(r) => (
              <RowActions
                label={`${r.sale_type} sale`}
                onEdit={() => {
                  setEditing(r)
                  setModalOpen(true)
                }}
                onDelete={() => setDeleteTarget(r)}
              />
            )}
          />
        </div>
      </div>

      <SaleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        record={editing}
        goats={goats}
        onSaved={() => {
          setModalOpen(false)
          toast.success(editing ? 'Sale updated.' : 'Sale added.')
          refresh()
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete sale?"
        description="This record will be permanently removed. The goat's status is not changed."
      />
    </div>
  )
}
