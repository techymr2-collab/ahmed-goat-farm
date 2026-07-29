import { useMemo, useState } from 'react'
import { Plus, Syringe, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import PageHeader from '../components/PageHeader'
import Badge from '../components/Badge'
import EmptyState from '../components/EmptyState'
import HealthRecordModal from '../components/HealthRecordModal'
import ConfirmDialog from '../components/ConfirmDialog'
import { formatDate, formatINR, daysUntil } from '../lib/format'

const TYPE_TONE = {
  Vaccination: 'green',
  Deworming: 'green',
  Illness: 'red',
  Treatment: 'amber',
  'Vet Visit': 'amber',
}

export default function Health() {
  const { data: goats } = useSupabaseTable(() => supabase.from('goats').select('id, tag_id, name, sex').order('tag_id'), [])
  const { data: records, loading, error, refetch } = useSupabaseTable(
    () =>
      supabase
        .from('health_records')
        .select('*, goats(tag_id, name)')
        .order('record_date', { ascending: false }),
    []
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [filterType, setFilterType] = useState('All')

  const filtered = useMemo(
    () => (filterType === 'All' ? records : records.filter((r) => r.record_type === filterType)),
    [records, filterType]
  )

  async function handleDelete() {
    if (!deleteTarget) return
    await supabase.from('health_records').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    refetch()
  }

  return (
    <div>
      <PageHeader
        title="Health & Vaccination"
        description="Vaccinations, deworming, illnesses, and vet visits across the herd."
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
            Add record
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {['All', 'Vaccination', 'Deworming', 'Illness', 'Treatment', 'Vet Visit'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilterType(t)}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filterType === t ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {!loading && filtered.length === 0 ? (
        <EmptyState
          icon={Syringe}
          title="No health records yet"
          description="Log vaccinations, deworming, and vet visits to keep the herd's health history in one place."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Goat</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Next due</th>
                  <th className="px-4 py-3 font-medium">Cost</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const due = daysUntil(r.next_due_date)
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {r.goats?.tag_id} {r.goats?.name ? `· ${r.goats.name}` : ''}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={TYPE_TONE[r.record_type] ?? 'gray'}>{r.record_type}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(r.record_date)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {r.next_due_date ? (
                          <span className={due !== null && due <= 7 ? 'font-medium text-accent' : ''}>
                            {formatDate(r.next_due_date)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatINR(r.cost)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            aria-label="Edit record"
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
                            aria-label="Delete record"
                            onClick={() => setDeleteTarget(r)}
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 size={15} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <HealthRecordModal
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
        title="Delete health record?"
        description="This record will be permanently removed."
      />
    </div>
  )
}
