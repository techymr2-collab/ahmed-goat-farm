import { useMemo, useState } from 'react'
import { Plus, IndianRupee, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import Badge from '../components/Badge'
import EmptyState from '../components/EmptyState'
import SaleModal from '../components/SaleModal'
import ConfirmDialog from '../components/ConfirmDialog'
import { formatDate, formatINR } from '../lib/format'

const TYPE_TONE = { Goat: 'green', Milk: 'amber', Other: 'gray' }

export default function Sales() {
  const { data: goats } = useSupabaseTable(() => supabase.from('goats').select('id, tag_id, name, sex').order('tag_id'), [])
  const { data: records, loading, error, refetch } = useSupabaseTable(
    () =>
      supabase
        .from('sales')
        .select('*, goats(tag_id, name)')
        .order('sale_date', { ascending: false }),
    []
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { totalAll, totalThisMonth } = useMemo(() => {
    const now = new Date()
    const thisMonth = records
      .filter((r) => {
        const d = new Date(r.sale_date)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      .reduce((sum, r) => sum + Number(r.amount), 0)
    const all = records.reduce((sum, r) => sum + Number(r.amount), 0)
    return { totalAll: all, totalThisMonth: thisMonth }
  }, [records])

  async function handleDelete() {
    if (!deleteTarget) return
    await supabase.from('sales').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    refetch()
  }

  return (
    <div>
      <PageHeader
        title="Sales"
        description="Goat and milk sales, buyers, and revenue."
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
            Add sale
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="This month" value={formatINR(totalThisMonth)} icon={IndianRupee} />
        <StatCard label="All time" value={formatINR(totalAll)} icon={IndianRupee} tone="accent" />
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {!loading && records.length === 0 ? (
        <EmptyState icon={IndianRupee} title="No sales recorded yet" description="Log goat and milk sales to track farm revenue." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                  <th className="px-4 py-3 font-medium">Buyer</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(r.sale_date)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={TYPE_TONE[r.sale_type] ?? 'gray'}>{r.sale_type}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.sale_type === 'Goat' && r.goats
                        ? `${r.goats.tag_id}${r.goats.name ? ' · ' + r.goats.name : ''}`
                        : r.sale_type === 'Milk' && r.quantity
                          ? `${r.quantity} L`
                          : r.notes || '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.buyer_name || '—'}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{formatINR(r.amount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          aria-label="Edit sale"
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
                          aria-label="Delete sale"
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

      <SaleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        record={editing}
        goats={goats}
        onSaved={() => {
          setModalOpen(false)
          refetch()
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete sale?"
        description="This record will be permanently removed."
      />
    </div>
  )
}
