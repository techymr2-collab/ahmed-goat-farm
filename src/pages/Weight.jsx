import { useMemo, useState } from 'react'
import { Plus, Scale, Pencil, Trash2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import WeightRecordModal from '../components/WeightRecordModal'
import ConfirmDialog from '../components/ConfirmDialog'
import { Select } from '../components/FormField'
import { formatDate } from '../lib/format'

export default function Weight() {
  const { data: goats } = useSupabaseTable(() => supabase.from('goats').select('id, tag_id, name, sex').order('tag_id'), [])
  const { data: records, loading, error, refetch } = useSupabaseTable(
    () =>
      supabase
        .from('weight_records')
        .select('*, goats(tag_id, name)')
        .order('record_date', { ascending: true }),
    []
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [chartGoatId, setChartGoatId] = useState('')

  const chartData = useMemo(() => {
    if (!chartGoatId) return []
    return records
      .filter((r) => r.goat_id === chartGoatId)
      .map((r) => ({ date: formatDate(r.record_date), weight: Number(r.weight_kg) }))
  }, [records, chartGoatId])

  const sortedRecords = useMemo(() => [...records].reverse(), [records])

  async function handleDelete() {
    if (!deleteTarget) return
    await supabase.from('weight_records').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    refetch()
  }

  return (
    <div>
      <PageHeader
        title="Weight Tracking"
        description="Periodic weight logs and growth trends per goat."
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

      <div className="mb-6 rounded-2xl border border-border bg-surface p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-base font-semibold text-foreground">Growth chart</h2>
          <div className="w-56">
            <Select value={chartGoatId} onChange={(e) => setChartGoatId(e.target.value)}>
              <option value="">Select a goat…</option>
              {goats.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.tag_id} {g.name ? `· ${g.name}` : ''}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {chartGoatId && chartData.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} unit=" kg" />
                <Tooltip
                  contentStyle={{ borderRadius: 8, borderColor: 'var(--color-border)', fontSize: 13 }}
                  formatter={(value) => [`${value} kg`, 'Weight']}
                />
                <Line type="monotone" dataKey="weight" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {chartGoatId ? 'No weight records for this goat yet.' : 'Select a goat to see its growth chart.'}
          </p>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {!loading && records.length === 0 ? (
        <EmptyState icon={Scale} title="No weight records yet" description="Log periodic weigh-ins to track growth over time." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Goat</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Weight</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedRecords.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {r.goats?.tag_id} {r.goats?.name ? `· ${r.goats.name}` : ''}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(r.record_date)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.weight_kg} kg</td>
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

      <WeightRecordModal
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
        title="Delete weight record?"
        description="This record will be permanently removed."
      />
    </div>
  )
}
