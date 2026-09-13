import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, HeartHandshake } from 'lucide-react'
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
import BreedingRecordModal from '../components/BreedingRecordModal'
import ConfirmDialog from '../components/ConfirmDialog'
import { OUTCOME_TONE, KiddingDate } from '../components/RecordBadges'
import { formatDate, goatLabel } from '../lib/format'
import { exporters } from '../lib/exports'

const OUTCOMES = ['All', 'Pending', 'Successful', 'Miscarried', 'Failed']

export default function Breeding() {
  const toast = useToast()
  const { goats } = useGoatOptions()
  const [outcomeFilter, setOutcomeFilter] = useState('All')
  const [doeFilter, setDoeFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const records = usePagedQuery(() => {
    let query = supabase
      .from('breeding_records')
      .select('*, doe:goats!breeding_records_doe_id_fkey(tag_id, name), buck:goats!breeding_records_buck_id_fkey(tag_id, name)', {
        count: 'exact',
      })
    if (outcomeFilter !== 'All') query = query.eq('outcome', outcomeFilter)
    if (doeFilter) query = query.eq('doe_id', doeFilter)
    return outcomeFilter === 'Pending'
      ? query.order('expected_kidding_date', { ascending: true, nullsFirst: false })
      : query.order('mating_date', { ascending: false })
  }, [outcomeFilter, doeFilter])

  useNewParam(() => {
    setEditing(null)
    setModalOpen(true)
  })

  async function handleDelete() {
    const target = deleteTarget
    setDeleteTarget(null)
    const { error } = await supabase.from('breeding_records').delete().eq('id', target.id)
    if (error) return toast.error(`Couldn't delete: ${error.message}`)
    toast.success('Breeding record deleted.')
    records.refetch()
  }

  return (
    <div>
      <PageHeader
        title="Breeding"
        description="Matings, expected kidding dates, and litter outcomes. Kidding is expected about 150 days after mating."
        action={
          <div className="flex flex-wrap gap-2">
            <ExportButton load={() => exporters.breeding.load()} onExport={(rows) => exporters.breeding.save(rows)} />
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
        <FilterChips label="Filter by outcome" options={OUTCOMES} value={outcomeFilter} onChange={setOutcomeFilter} />
        <div className="w-full sm:w-60">
          <GoatCombobox goats={goats.filter((g) => g.sex === 'Female')} value={doeFilter} onChange={setDoeFilter} nullLabel="All does" />
        </div>
      </div>

      {records.error && <p className="mb-4 text-sm text-destructive">{records.error}</p>}

      <DataTable
        rows={records.data}
        loading={records.loading}
        totalCount={records.count}
        page={records.page}
        onPageChange={records.setPage}
        minWidth={820}
        empty={<EmptyState icon={HeartHandshake} title="No breeding records found" description="Track matings, expected kidding dates and outcomes here." />}
        columns={[
          {
            header: 'Doe',
            cell: (r) => (
              <Link to={`/goats/${r.doe_id}`} className="font-medium text-foreground hover:text-primary hover:underline">
                {goatLabel(r.doe)}
              </Link>
            ),
          },
          { header: 'Buck', cell: (r) => (r.buck ? goatLabel(r.buck) : r.buck_name || '—') },
          { header: 'Mated', cell: (r) => formatDate(r.mating_date) },
          { header: 'Kidding', cell: (r) => <KiddingDate record={r} /> },
          { header: 'Kids', align: 'right', cell: (r) => r.number_of_kids ?? '—' },
          { header: 'Outcome', cell: (r) => <Badge tone={OUTCOME_TONE[r.outcome] ?? 'gray'}>{r.outcome}</Badge> },
        ]}
        actions={(r) => (
          <>
            {r.outcome === 'Pending' && (
              <Button
                variant="ghost"
                size="sm"
                className="hidden text-primary lg:inline-flex"
                onClick={() => {
                  setEditing(r)
                  setModalOpen(true)
                }}
              >
                Record kidding
              </Button>
            )}
            <RowActions
              label={`breeding record for ${r.doe?.tag_id}`}
              onEdit={() => {
                setEditing(r)
                setModalOpen(true)
              }}
              onDelete={() => setDeleteTarget(r)}
            />
          </>
        )}
      />

      <BreedingRecordModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        record={editing}
        goats={goats}
        onSaved={() => {
          setModalOpen(false)
          toast.success(editing ? 'Breeding record updated.' : 'Breeding record added.')
          records.refetch()
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
