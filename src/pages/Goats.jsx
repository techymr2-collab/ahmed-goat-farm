import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, PawPrint, Search, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import PageHeader from '../components/PageHeader'
import Badge from '../components/Badge'
import EmptyState from '../components/EmptyState'
import GoatFormModal from '../components/GoatFormModal'
import ConfirmDialog from '../components/ConfirmDialog'
import { ageFromDOB } from '../lib/format'

const STATUS_TONE = { Active: 'green', Sold: 'amber', Deceased: 'gray' }

export default function Goats() {
  const { data: goats, loading, error, refetch } = useSupabaseTable(
    () => supabase.from('goats').select('*').order('tag_id', { ascending: true }),
    []
  )

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Active')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingGoat, setEditingGoat] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const filtered = useMemo(() => {
    return goats.filter((g) => {
      if (statusFilter !== 'All' && g.status !== statusFilter) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        g.tag_id?.toLowerCase().includes(q) ||
        g.name?.toLowerCase().includes(q) ||
        g.breed?.toLowerCase().includes(q)
      )
    })
  }, [goats, search, statusFilter])

  function openAdd() {
    setEditingGoat(null)
    setModalOpen(true)
  }

  function openEdit(goat) {
    setEditingGoat(goat)
    setModalOpen(true)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    await supabase.from('goats').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    refetch()
  }

  return (
    <div>
      <PageHeader
        title="Goats"
        description="Herd registry — profiles, lineage, and status."
        action={
          <button
            type="button"
            onClick={openAdd}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark"
          >
            <Plus size={16} aria-hidden="true" />
            Add goat
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by tag, name, breed…"
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
          />
        </div>
        <div className="flex gap-1.5">
          {['Active', 'Sold', 'Deceased', 'All'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {!loading && filtered.length === 0 ? (
        <EmptyState
          icon={PawPrint}
          title={goats.length === 0 ? 'No goats yet' : 'No goats match your filters'}
          description={goats.length === 0 ? 'Add your first goat to start building the herd registry.' : 'Try a different search or status filter.'}
          action={
            goats.length === 0 && (
              <button type="button" onClick={openAdd} className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">
                Add goat
              </button>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Tag / Name</th>
                  <th className="px-4 py-3 font-medium">Breed</th>
                  <th className="px-4 py-3 font-medium">Sex</th>
                  <th className="px-4 py-3 font-medium">Age</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((g) => (
                  <tr key={g.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                          {g.photo_url ? (
                            <img src={g.photo_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <PawPrint size={14} className="text-muted-foreground" aria-hidden="true" />
                          )}
                        </div>
                        <div>
                          <Link to={`/goats/${g.id}`} className="font-medium text-foreground hover:text-primary hover:underline">
                            {g.tag_id}
                          </Link>
                          {g.name && <span className="ml-1.5 text-muted-foreground">· {g.name}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{g.breed || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{g.sex}</td>
                    <td className="px-4 py-3 text-muted-foreground">{ageFromDOB(g.date_of_birth)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[g.status] ?? 'gray'}>{g.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          aria-label={`Edit ${g.tag_id}`}
                          onClick={() => openEdit(g)}
                          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Pencil size={15} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${g.tag_id}`}
                          onClick={() => setDeleteTarget(g)}
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

      <GoatFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        goat={editingGoat}
        allGoats={goats}
        onSaved={() => {
          setModalOpen(false)
          refetch()
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete goat?"
        description={`This will permanently delete ${deleteTarget?.tag_id} and all of its health, breeding, and weight records.`}
      />
    </div>
  )
}
