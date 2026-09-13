import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, PawPrint, Search } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import { usePagedQuery } from '../hooks/usePagedQuery'
import { useGoatOptions } from '../hooks/useGoatOptions'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useNewParam } from '../hooks/useNewParam'
import { useToast } from '../context/ToastContext'
import PageHeader from '../components/PageHeader'
import Badge from '../components/Badge'
import Button from '../components/Button'
import EmptyState from '../components/EmptyState'
import DataTable, { RowActions } from '../components/DataTable'
import FilterChips from '../components/FilterChips'
import ExportButton from '../components/ExportButton'
import GoatFormModal from '../components/GoatFormModal'
import ConfirmDialog from '../components/ConfirmDialog'
import { STATUS_TONE } from '../components/RecordBadges'
import { ageFromDOB } from '../lib/format'
import { exporters } from '../lib/exports'

const STATUSES = ['Active', 'Sold', 'Deceased', 'All']

// Strip characters that have meaning inside a PostgREST or() filter.
const sanitize = (text) => text.replace(/[,()%*\\]/g, ' ').trim()

export default function Goats() {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Active')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingGoat, setEditingGoat] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const debouncedSearch = sanitize(useDebouncedValue(search))

  const { goats: allGoats, refetch: refetchOptions } = useGoatOptions()

  const statusCounts = useSupabaseTable(async () => {
    const results = await Promise.all(
      ['Active', 'Sold', 'Deceased'].map((s) => supabase.from('goats').select('id', { count: 'exact', head: true }).eq('status', s))
    )
    const failed = results.find((r) => r.error)
    if (failed) return failed
    const counts = Object.fromEntries(results.map((r, i) => [['Active', 'Sold', 'Deceased'][i], r.count ?? 0]))
    return { data: [{ ...counts, All: counts.Active + counts.Sold + counts.Deceased }], error: null }
  }, [])
  const counts = statusCounts.data[0] ?? {}

  const goats = usePagedQuery(() => {
    let query = supabase.from('goats').select('*', { count: 'exact' }).order('tag_id', { ascending: true })
    if (statusFilter !== 'All') query = query.eq('status', statusFilter)
    if (debouncedSearch) {
      const q = `%${debouncedSearch}%`
      query = query.or(`tag_id.ilike.${q},name.ilike.${q},breed.ilike.${q},color.ilike.${q}`)
    }
    return query
  }, [statusFilter, debouncedSearch])

  useNewParam(() => openAdd())

  function refreshAll() {
    goats.refetch()
    statusCounts.refetch()
    refetchOptions()
  }

  function openAdd() {
    setEditingGoat(null)
    setModalOpen(true)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const target = deleteTarget
    setDeleteTarget(null)
    const { error } = await supabase.from('goats').delete().eq('id', target.id)
    if (error) {
      toast.error(`Couldn't delete ${target.tag_id}: ${error.message}`)
      return
    }
    toast.success(`${target.tag_id} deleted.`)
    refreshAll()
  }

  const hasFilters = Boolean(debouncedSearch) || statusFilter !== 'All'
  const registryEmpty = counts.All === 0

  return (
    <div>
      <PageHeader
        title="Goats"
        description="Herd registry — profiles, lineage, and status."
        action={
          <div className="flex flex-wrap gap-2">
            <ExportButton load={exporters.goats.load} onExport={exporters.goats.save} />
            <Button icon={Plus} onClick={openAdd}>
              Add goat
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tag, name, breed, colour…"
            aria-label="Search goats"
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
          />
        </div>
        <FilterChips
          label="Filter by status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUSES.map((s) => ({ value: s, label: s, count: counts[s] }))}
        />
      </div>

      {goats.error && <p className="mb-4 text-sm text-destructive">{goats.error}</p>}

      <DataTable
        rows={goats.data}
        loading={goats.loading}
        totalCount={goats.count}
        page={goats.page}
        onPageChange={goats.setPage}
        minWidth={680}
        empty={
          <EmptyState
            icon={PawPrint}
            title={registryEmpty ? 'No goats yet' : 'No goats match'}
            description={registryEmpty ? 'Add your first goat to start the herd registry.' : hasFilters ? 'Try a different search or status.' : ''}
            action={
              registryEmpty && (
                <Button icon={Plus} onClick={openAdd}>
                  Add goat
                </Button>
              )
            }
          />
        }
        columns={[
          {
            header: 'Goat',
            cell: (g) => (
              <Link to={`/goats/${g.id}`} className="group flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                  {g.photo_url ? (
                    <img src={g.photo_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <PawPrint size={15} className="text-muted-foreground" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block font-medium text-foreground group-hover:text-primary group-hover:underline">{g.tag_id}</span>
                  {g.name && <span className="block truncate text-xs text-muted-foreground">{g.name}</span>}
                </span>
              </Link>
            ),
          },
          { header: 'Breed', cell: (g) => g.breed || '—' },
          { header: 'Sex', cell: (g) => g.sex },
          { header: 'Age', cell: (g) => ageFromDOB(g.date_of_birth) },
          { header: 'Status', cell: (g) => <Badge tone={STATUS_TONE[g.status] ?? 'gray'}>{g.status}</Badge> },
        ]}
        actions={(g) => (
          <RowActions
            label={g.tag_id}
            onEdit={() => {
              setEditingGoat(g)
              setModalOpen(true)
            }}
            onDelete={() => setDeleteTarget(g)}
          />
        )}
      />

      <GoatFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        goat={editingGoat}
        allGoats={allGoats}
        onSaved={() => {
          setModalOpen(false)
          toast.success(editingGoat ? `${editingGoat.tag_id} updated.` : 'Goat added.')
          refreshAll()
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Delete ${deleteTarget?.tag_id}?`}
        description="This permanently deletes the goat and all of its health, breeding, weight and milk records. Consider marking it Sold or Deceased instead."
      />
    </div>
  )
}
