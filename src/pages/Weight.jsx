import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Scale } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import { usePagedQuery } from '../hooks/usePagedQuery'
import { useGoatOptions } from '../hooks/useGoatOptions'
import { useNewParam } from '../hooks/useNewParam'
import { useToast } from '../context/ToastContext'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import EmptyState from '../components/EmptyState'
import DataTable, { RowActions } from '../components/DataTable'
import GoatCombobox from '../components/GoatCombobox'
import ExportButton from '../components/ExportButton'
import WeightChart from '../components/WeightChart'
import WeightRecordModal from '../components/WeightRecordModal'
import ConfirmDialog from '../components/ConfirmDialog'
import { ChartCard } from '../components/charts'
import { Skeleton } from '../components/Skeleton'
import { formatDate, formatNumber, goatLabel } from '../lib/format'
import { exporters } from '../lib/exports'

export default function Weight() {
  const toast = useToast()
  const { goats } = useGoatOptions()
  const [goatId, setGoatId] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const selectedGoat = goats.find((g) => g.id === goatId)

  const history = useSupabaseTable(
    () =>
      goatId
        ? supabase.from('weight_records').select('id, record_date, weight_kg').eq('goat_id', goatId).order('record_date', { ascending: true })
        : Promise.resolve({ data: [], error: null }),
    [goatId]
  )

  const records = usePagedQuery(() => {
    let query = supabase.from('weight_records').select('*, goats(tag_id, name)', { count: 'exact' })
    if (goatId) query = query.eq('goat_id', goatId)
    return query.order('record_date', { ascending: false }).order('created_at', { ascending: false })
  }, [goatId])

  useNewParam(() => {
    setEditing(null)
    setModalOpen(true)
  })

  function refresh() {
    records.refetch()
    history.refetch()
  }

  async function handleDelete() {
    const target = deleteTarget
    setDeleteTarget(null)
    const { error } = await supabase.from('weight_records').delete().eq('id', target.id)
    if (error) return toast.error(`Couldn't delete: ${error.message}`)
    toast.success('Weight record deleted.')
    refresh()
  }

  const points = history.data
  const gain = points.length > 1 ? Number(points[points.length - 1].weight_kg) - Number(points[0].weight_kg) : null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Weight Tracking"
        description="Periodic weigh-ins and growth trends per goat."
        action={
          <div className="flex flex-wrap gap-2">
            <ExportButton load={() => exporters.weight.load()} onExport={(rows) => exporters.weight.save(rows)} />
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

      <ChartCard
        title={selectedGoat ? `Growth — ${goatLabel(selectedGoat)}` : 'Growth chart'}
        description={
          gain !== null
            ? `${gain >= 0 ? '+' : ''}${formatNumber(gain)} kg across ${points.length} weigh-ins`
            : 'Choose a goat to see its growth and filter the records below.'
        }
        action={
          <div className="w-full sm:w-64">
            <GoatCombobox goats={goats} value={goatId} onChange={setGoatId} nullLabel="All goats" />
          </div>
        }
      >
        {!goatId ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Select a goat to see its growth chart.</p>
        ) : history.loading ? (
          <Skeleton className="h-64 w-full" />
        ) : points.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No weigh-ins recorded for this goat yet.</p>
        ) : (
          <WeightChart records={points} />
        )}
      </ChartCard>

      <div>
        {records.error && <p className="mb-4 text-sm text-destructive">{records.error}</p>}
        <DataTable
          rows={records.data}
          loading={records.loading}
          totalCount={records.count}
          page={records.page}
          onPageChange={records.setPage}
          minWidth={560}
          empty={<EmptyState icon={Scale} title="No weight records" description="Log periodic weigh-ins to track growth over time." />}
          columns={[
            {
              header: 'Goat',
              cell: (r) => (
                <Link to={`/goats/${r.goat_id}`} className="font-medium text-foreground hover:text-primary hover:underline">
                  {goatLabel(r.goats)}
                </Link>
              ),
            },
            { header: 'Date', cell: (r) => formatDate(r.record_date) },
            { header: 'Weight', align: 'right', cell: (r) => `${formatNumber(r.weight_kg)} kg` },
            { header: 'Notes', cell: (r) => r.notes || '—' },
          ]}
          actions={(r) => (
            <RowActions
              label={`weight record for ${r.goats?.tag_id}`}
              onEdit={() => {
                setEditing(r)
                setModalOpen(true)
              }}
              onDelete={() => setDeleteTarget(r)}
            />
          )}
        />
      </div>

      <WeightRecordModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        record={editing}
        goats={goats}
        lockGoatId={editing ? undefined : goatId || undefined}
        onSaved={() => {
          setModalOpen(false)
          toast.success(editing ? 'Weight record updated.' : 'Weight recorded.')
          refresh()
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete weight record?"
        description="This record will be permanently removed."
      />
    </div>
  )
}
