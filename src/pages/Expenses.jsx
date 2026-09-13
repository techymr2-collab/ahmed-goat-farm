import { useMemo, useState } from 'react'
import { Plus, Wallet } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import { usePagedQuery } from '../hooks/usePagedQuery'
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
import ExpenseModal from '../components/ExpenseModal'
import ConfirmDialog from '../components/ConfirmDialog'
import { ChartCard } from '../components/charts'
import { Skeleton } from '../components/Skeleton'
import { formatDate, formatINR } from '../lib/format'
import { resolveRange, periodLabel } from '../lib/dateRanges'
import { exporters } from '../lib/exports'

const CATEGORY_TONE = { Feed: 'green', Medical: 'red', Labor: 'amber', Equipment: 'gray', Transport: 'gray', Other: 'gray' }
const CATEGORIES = ['All', 'Feed', 'Medical', 'Labor', 'Equipment', 'Transport', 'Other']

export default function Expenses() {
  const toast = useToast()
  const [range, setRange] = useState({ preset: 'month', from: null, to: null })
  const [category, setCategory] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const { from, to } = useMemo(() => resolveRange(range), [range])

  const breakdown = useSupabaseTable(() => supabase.rpc('expense_by_category', { p_from: from, p_to: to }), [from, to])
  const allTime = useSupabaseTable(() => supabase.rpc('expense_by_category', { p_from: null, p_to: null }), [])

  const records = usePagedQuery(() => {
    let query = supabase.from('expenses').select('*', { count: 'exact' })
    if (from && to) query = query.gte('expense_date', from).lte('expense_date', to)
    if (category !== 'All') query = query.eq('category', category)
    return query.order('expense_date', { ascending: false }).order('created_at', { ascending: false })
  }, [from, to, category])

  useNewParam(() => {
    setEditing(null)
    setModalOpen(true)
  })

  const rows = breakdown.data.map((r) => ({ label: r.category, total: Number(r.total), hint: `${r.entries} entr${Number(r.entries) === 1 ? 'y' : 'ies'}` }))
  const periodTotal = rows.reduce((s, r) => s + r.total, 0)
  const allTimeTotal = allTime.data.reduce((s, r) => s + Number(r.total), 0)
  const biggest = rows[0]

  function refresh() {
    records.refetch()
    breakdown.refetch()
    allTime.refetch()
  }

  async function handleDelete() {
    const target = deleteTarget
    setDeleteTarget(null)
    const { error } = await supabase.from('expenses').delete().eq('id', target.id)
    if (error) return toast.error(`Couldn't delete: ${error.message}`)
    toast.success('Expense deleted.')
    refresh()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Feed, medical, labour, and other farm costs."
        action={
          <div className="flex flex-wrap gap-2">
            <ExportButton load={() => exporters.expenses.load(from, to)} onExport={(r) => exporters.expenses.save(r, from, to)} />
            <Button
              icon={Plus}
              onClick={() => {
                setEditing(null)
                setModalOpen(true)
              }}
            >
              Add expense
            </Button>
          </div>
        }
      />

      <DateRangeFilter preset={range.preset} from={range.from} to={range.to} onChange={(patch) => setRange((r) => ({ ...r, ...patch }))} />

      {(breakdown.error || records.error) && <p className="text-sm text-destructive">{breakdown.error || records.error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={periodLabel(range, from, to)} value={formatINR(periodTotal)} icon={Wallet} loading={breakdown.loading} />
        <StatCard
          label="Biggest category"
          value={biggest ? biggest.label : '—'}
          icon={Wallet}
          hint={biggest ? `${formatINR(biggest.total)} · ${Math.round((biggest.total / periodTotal) * 100)}% of spend` : 'No expenses'}
          loading={breakdown.loading}
        />
        <StatCard label="All time" value={formatINR(allTimeTotal)} icon={Wallet} tone="accent" loading={allTime.loading} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:order-2">
          <ChartCard title="Where the money went" description={periodLabel(range, from, to)}>
            {breakdown.loading ? <Skeleton className="h-48 w-full" /> : <BreakdownList rows={rows} />}
          </ChartCard>
        </div>

        <div className="xl:order-1 xl:col-span-2">
          <div className="mb-3">
            <FilterChips label="Filter by category" options={CATEGORIES} value={category} onChange={setCategory} />
          </div>
          <DataTable
            rows={records.data}
            loading={records.loading}
            totalCount={records.count}
            page={records.page}
            onPageChange={records.setPage}
            minWidth={560}
            empty={<EmptyState icon={Wallet} title="No expenses in this period" description="Try a different date range or category, or add an expense." />}
            columns={[
              { header: 'Description', cell: (r) => <span className="text-foreground">{r.description || r.category}</span> },
              { header: 'Date', cell: (r) => formatDate(r.expense_date) },
              { header: 'Category', cell: (r) => <Badge tone={CATEGORY_TONE[r.category] ?? 'gray'}>{r.category}</Badge> },
              { header: 'Amount', align: 'right', cell: (r) => <span className="font-medium text-foreground">{formatINR(r.amount)}</span> },
            ]}
            actions={(r) => (
              <RowActions
                label={`expense ${r.description || r.category}`}
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

      <ExpenseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        record={editing}
        onSaved={() => {
          setModalOpen(false)
          toast.success(editing ? 'Expense updated.' : 'Expense added.')
          refresh()
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete expense?"
        description="This record will be permanently removed."
      />
    </div>
  )
}
