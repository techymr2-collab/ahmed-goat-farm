import { useMemo, useState } from 'react'
import { Plus, Wallet, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import Badge from '../components/Badge'
import EmptyState from '../components/EmptyState'
import ExpenseModal from '../components/ExpenseModal'
import ConfirmDialog from '../components/ConfirmDialog'
import DateRangeFilter from '../components/DateRangeFilter'
import { formatDate, formatINR } from '../lib/format'
import { getMonthRange, getYearRange } from '../lib/dateRanges'

const CATEGORY_TONE = { Feed: 'green', Medical: 'red', Labor: 'amber', Equipment: 'gray', Transport: 'gray', Other: 'gray' }

const PERIOD_LABELS = { month: 'This month', lastMonth: 'Last month', year: 'This year', all: 'All time' }

export default function Expenses() {
  const { data: records, loading, error, refetch } = useSupabaseTable(
    () => supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
    []
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [range, setRange] = useState({ preset: 'month', from: null, to: null })

  const { from, to } = useMemo(() => {
    switch (range.preset) {
      case 'month':
        return getMonthRange(0)
      case 'lastMonth':
        return getMonthRange(-1)
      case 'year':
        return getYearRange()
      case 'custom':
        return { from: range.from, to: range.to }
      default:
        return { from: null, to: null }
    }
  }, [range])

  const filtered = useMemo(() => {
    if (!from || !to) return records
    return records.filter((r) => r.expense_date >= from && r.expense_date <= to)
  }, [records, from, to])

  const periodTotal = useMemo(() => filtered.reduce((sum, r) => sum + Number(r.amount), 0), [filtered])
  const allTimeTotal = useMemo(() => records.reduce((sum, r) => sum + Number(r.amount), 0), [records])

  const periodLabel =
    range.preset === 'custom'
      ? from && to
        ? `${formatDate(from)} – ${formatDate(to)}`
        : 'Custom range'
      : PERIOD_LABELS[range.preset]

  async function handleDelete() {
    if (!deleteTarget) return
    await supabase.from('expenses').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    refetch()
  }

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Feed, medical, labor, and other farm costs."
        action={
          <button
            type="button"
            onClick={() => {
              setEditing(null)
              setModalOpen(true)
            }}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark"
          >
            <Plus size={16} aria-hidden="true" />
            Add expense
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label={periodLabel} value={formatINR(periodTotal)} icon={Wallet} />
        <StatCard label="All time" value={formatINR(allTimeTotal)} icon={Wallet} tone="accent" />
      </div>

      <DateRangeFilter
        preset={range.preset}
        from={range.from}
        to={range.to}
        onChange={(patch) => setRange((r) => ({ ...r, ...patch }))}
      />

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {!loading && filtered.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={records.length === 0 ? 'No expenses logged yet' : 'No expenses in this period'}
          description={records.length === 0 ? 'Track feed, medical, and other farm costs here.' : 'Try a different date range.'}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(r.expense_date)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={CATEGORY_TONE[r.category] ?? 'gray'}>{r.category}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.description || '—'}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{formatINR(r.amount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          aria-label="Edit expense"
                          onClick={() => {
                            setEditing(r)
                            setModalOpen(true)
                          }}
                          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Pencil size={15} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          aria-label="Delete expense"
                          onClick={() => setDeleteTarget(r)}
                          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ExpenseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        record={editing}
        onSaved={() => {
          setModalOpen(false)
          refetch()
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
