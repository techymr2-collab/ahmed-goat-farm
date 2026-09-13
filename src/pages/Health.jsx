import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Syringe } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { usePagedQuery } from '../hooks/usePagedQuery'
import { useGoatOptions } from '../hooks/useGoatOptions'
import { useNewParam } from '../hooks/useNewParam'
import { useToast } from '../context/ToastContext'
import PageHeader from '../components/PageHeader'
import Badge from '../components/Badge'
import Button from '../components/Button'
import EmptyState from '../components/EmptyState'
import DataTable, { RowActions } from '../components/DataTable'
import FilterChips from '../components/FilterChips'
import GoatCombobox from '../components/GoatCombobox'
import ExportButton from '../components/ExportButton'
import HealthRecordModal from '../components/HealthRecordModal'
import ConfirmDialog from '../components/ConfirmDialog'
import { HEALTH_TYPE_TONE, DueBadge } from '../components/RecordBadges'
import { formatDate, formatINR, goatLabel } from '../lib/format'
import { offsetISO } from '../lib/dateRanges'
import { exporters } from '../lib/exports'

const TYPES = ['All', 'Vaccination', 'Deworming', 'Illness', 'Treatment', 'Vet Visit']

export default function Health() {
  const toast = useToast()
  const { goats } = useGoatOptions()
  const [typeFilter, setTypeFilter] = useState('All')
  const [goatFilter, setGoatFilter] = useState('')
  const [dueOnly, setDueOnly] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const records = usePagedQuery(() => {
    let query = supabase.from('health_records').select('*, goats(tag_id, name)', { count: 'exact' })
    if (typeFilter !== 'All') query = query.eq('record_type', typeFilter)
    if (goatFilter) query = query.eq('goat_id', goatFilter)
    if (dueOnly) {
      return query
        .not('next_due_date', 'is', null)
        .lte('next_due_date', offsetISO(30))
        .order('next_due_date', { ascending: true })
    }
    return query.order('record_date', { ascending: false }).order('created_at', { ascending: false })
  }, [typeFilter, goatFilter, dueOnly])

  useNewParam(() => {
    setEditing(null)
    setModalOpen(true)
  })

  async function handleDelete() {
    const target = deleteTarget
    setDeleteTarget(null)
    const { error } = await supabase.from('health_records').delete().eq('id', target.id)
    if (error) return toast.error(`Couldn't delete: ${error.message}`)
    toast.success('Health record deleted.')
    records.refetch()
  }

  return (
    <div>
      <PageHeader
        title="Health & Vaccination"
        description="Vaccinations, deworming, illnesses, and vet visits across the herd."
        action={
          <div className="flex flex-wrap gap-2">
            <ExportButton load={() => exporters.health.load()} onExport={(rows) => exporters.health.save(rows)} />
            <Button
              icon={Plus}
              onClick={() => {
                setEditing(null)
                setModalOpen(true)
              }}
            >
              Add record
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips label="Filter by type" options={TYPES} value={typeFilter} onChange={setTypeFilter} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={dueOnly}
              onChange={(e) => setDueOnly(e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-[var(--color-primary)]"
            />
            Due within 30 days or overdue
          </label>
          <div className="w-full sm:w-60">
            <GoatCombobox goats={goats} value={goatFilter} onChange={setGoatFilter} nullLabel="All goats" />
          </div>
        </div>
      </div>

      {records.error && <p className="mb-4 text-sm text-destructive">{records.error}</p>}

      <DataTable
        rows={records.data}
        loading={records.loading}
        totalCount={records.count}
        page={records.page}
        onPageChange={records.setPage}
        minWidth={760}
        empty={
          <EmptyState
            icon={Syringe}
            title={dueOnly ? 'Nothing due' : 'No health records found'}
            description={
              dueOnly ? 'No vaccinations or treatments are due in the next 30 days.' : 'Log vaccinations, deworming and vet visits to build each goat’s health history.'
            }
          />
        }
        columns={[
          {
            header: 'Goat',
            cell: (r) => (
              <Link to={`/goats/${r.goat_id}`} className="font-medium text-foreground hover:text-primary hover:underline">
                {goatLabel(r.goats)}
              </Link>
            ),
          },
          { header: 'Type', cell: (r) => <Badge tone={HEALTH_TYPE_TONE[r.record_type] ?? 'gray'}>{r.record_type}</Badge> },
          { header: 'Title', cell: (r) => r.title },
          { header: 'Date', cell: (r) => formatDate(r.record_date) },
          { header: 'Next due', cell: (r) => <DueBadge date={r.next_due_date} /> },
          { header: 'Cost', align: 'right', cell: (r) => formatINR(r.cost) },
        ]}
        actions={(r) => (
          <RowActions
            label={`${r.title} for ${r.goats?.tag_id}`}
            onEdit={() => {
              setEditing(r)
              setModalOpen(true)
            }}
            onDelete={() => setDeleteTarget(r)}
          />
        )}
      />

      <HealthRecordModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        record={editing}
        goats={goats}
        onSaved={() => {
          setModalOpen(false)
          toast.success(editing ? 'Health record updated.' : 'Health record added.')
          records.refetch()
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
