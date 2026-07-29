import { useState } from 'react'
import { Plus, HeartHandshake, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import PageHeader from '../components/PageHeader'
import Badge from '../components/Badge'
import EmptyState from '../components/EmptyState'
import BreedingRecordModal from '../components/BreedingRecordModal'
import ConfirmDialog from '../components/ConfirmDialog'
import { formatDate } from '../lib/format'

const OUTCOME_TONE = { Pending: 'amber', Successful: 'green', Miscarried: 'red', Failed: 'red' }

export default function Breeding() {
  const { data: goats } = useSupabaseTable(() => supabase.from('goats').select('id, tag_id, name, sex').order('tag_id'), [])
  const { data: records, loading, error, refetch } = useSupabaseTable(
    () =>
      supabase
        .from('breeding_records')
        .select('*, doe:goats!breeding_records_doe_id_fkey(tag_id, name), buck:goats!breeding_records_buck_id_fkey(tag_id, name)')
        .order('mating_date', { ascending: false }),
    []
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  async function handleDelete() {
    if (!deleteTarget) return
    await supabase.from('breeding_records').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    refetch()
  }

  return (
    <div>
      <PageHeader
        title="Breeding"
        description="Mating records, expected kidding dates, and litter outcomes."
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

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {!loading && records.length === 0 ? (
        <EmptyState
          icon={HeartHandshake}
          title="No breeding records yet"
          description="Track matings, expected kidding dates, and outcomes here."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Doe</th>
                  <th className="px-4 py-3 font-medium">Buck</th>
                  <th className="px-4 py-3 font-medium">Mating date</th>
                  <th className="px-4 py-3 font-medium">Expected kidding</th>
                  <th className="px-4 py-3 font-medium">Kids</th>
                  <th className="px-4 py-3 font-medium">Outcome</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {r.doe?.tag_id} {r.doe?.name ? `· ${r.doe.name}` : ''}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.buck ? `${r.buck.tag_id}${r.buck.name ? ' · ' + r.buck.name : ''}` : r.buck_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(r.mating_date)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(r.expected_kidding_date)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.number_of_kids ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge tone={OUTCOME_TONE[r.outcome] ?? 'gray'}>{r.outcome}</Badge>
                    </td>
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <BreedingRecordModal
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
        title="Delete breeding record?"
        description="This record will be permanently removed."
      />
    </div>
  )
}
