import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, PawPrint } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import Badge from '../components/Badge'
import GoatFormModal from '../components/GoatFormModal'
import HealthRecordModal from '../components/HealthRecordModal'
import BreedingRecordModal from '../components/BreedingRecordModal'
import WeightRecordModal from '../components/WeightRecordModal'
import { ageFromDOB, formatDate } from '../lib/format'

const STATUS_TONE = { Active: 'green', Sold: 'amber', Deceased: 'gray' }

export default function GoatDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: allGoats, refetch: refetchAllGoats } = useSupabaseTable(
    () => supabase.from('goats').select('*'),
    []
  )
  const goat = allGoats.find((g) => g.id === id)

  const { data: healthRecords, refetch: refetchHealth } = useSupabaseTable(
    () => supabase.from('health_records').select('*').eq('goat_id', id).order('record_date', { ascending: false }),
    [id]
  )
  const { data: weightRecords, refetch: refetchWeight } = useSupabaseTable(
    () => supabase.from('weight_records').select('*').eq('goat_id', id).order('record_date', { ascending: false }),
    [id]
  )
  const { data: breedingRecords, refetch: refetchBreeding } = useSupabaseTable(
    () => supabase.from('breeding_records').select('*').eq('doe_id', id).order('mating_date', { ascending: false }),
    [id]
  )

  const [editGoatOpen, setEditGoatOpen] = useState(false)
  const [healthModalOpen, setHealthModalOpen] = useState(false)
  const [breedingModalOpen, setBreedingModalOpen] = useState(false)
  const [weightModalOpen, setWeightModalOpen] = useState(false)

  if (!goat) {
    return (
      <div>
        <button
          type="button"
          onClick={() => navigate('/goats')}
          className="mb-4 flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Back to goats
        </button>
        <p className="text-muted-foreground">Goat not found.</p>
      </div>
    )
  }

  const mother = allGoats.find((g) => g.id === goat.mother_id)
  const father = allGoats.find((g) => g.id === goat.father_id)

  return (
    <div>
      <Link to="/goats" className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} aria-hidden="true" /> Back to goats
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted sm:h-20 sm:w-20">
            {goat.photo_url ? (
              <img src={goat.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <PawPrint size={28} className="text-muted-foreground" aria-hidden="true" />
            )}
          </div>
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <h1 className="font-heading text-2xl font-semibold text-foreground">
                {goat.tag_id} {goat.name && <span className="text-muted-foreground">· {goat.name}</span>}
              </h1>
              <Badge tone={STATUS_TONE[goat.status] ?? 'gray'}>{goat.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {goat.sex} · {goat.breed || 'Breed unknown'} · {ageFromDOB(goat.date_of_birth)} old
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditGoatOpen(true)}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          <Pencil size={15} aria-hidden="true" />
          Edit profile
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <InfoItem label="Date of birth" value={formatDate(goat.date_of_birth)} />
        <InfoItem label="Color" value={goat.color || '—'} />
        <InfoItem label="Mother" value={mother ? mother.tag_id : '—'} />
        <InfoItem label="Father" value={father ? father.tag_id : '—'} />
        <InfoItem label="Source" value={goat.source || '—'} />
        <InfoItem label="Acquired" value={formatDate(goat.acquired_date)} />
      </div>

      {goat.notes && (
        <div className="mb-6 rounded-2xl border border-border bg-surface p-5">
          <p className="mb-1 text-sm font-medium text-foreground">Notes</p>
          <p className="text-sm text-muted-foreground">{goat.notes}</p>
        </div>
      )}

      <RecordSection
        title="Health & vaccination"
        onAdd={() => setHealthModalOpen(true)}
        records={healthRecords}
        empty="No health records for this goat yet."
        renderRow={(r) => (
          <>
            <Badge tone="green">{r.record_type}</Badge>
            <span className="text-foreground">{r.title}</span>
            <span className="ml-auto text-muted-foreground">{formatDate(r.record_date)}</span>
          </>
        )}
      />

      {goat.sex === 'Female' && (
        <RecordSection
          title="Breeding history"
          onAdd={() => setBreedingModalOpen(true)}
          records={breedingRecords}
          empty="No breeding records for this goat yet."
          renderRow={(r) => (
            <>
              <Badge tone={r.outcome === 'Successful' ? 'green' : r.outcome === 'Pending' ? 'amber' : 'red'}>{r.outcome}</Badge>
              <span className="text-foreground">Mated {formatDate(r.mating_date)}</span>
              <span className="ml-auto text-muted-foreground">
                {r.actual_kidding_date ? `Kidded ${formatDate(r.actual_kidding_date)}` : `Expected ${formatDate(r.expected_kidding_date)}`}
              </span>
            </>
          )}
        />
      )}

      <RecordSection
        title="Weight history"
        onAdd={() => setWeightModalOpen(true)}
        records={weightRecords}
        empty="No weight records for this goat yet."
        renderRow={(r) => (
          <>
            <span className="font-medium text-foreground">{r.weight_kg} kg</span>
            <span className="ml-auto text-muted-foreground">{formatDate(r.record_date)}</span>
          </>
        )}
      />

      <GoatFormModal
        open={editGoatOpen}
        onClose={() => setEditGoatOpen(false)}
        goat={goat}
        allGoats={allGoats}
        onSaved={() => {
          setEditGoatOpen(false)
          refetchAllGoats()
        }}
      />
      <HealthRecordModal
        open={healthModalOpen}
        onClose={() => setHealthModalOpen(false)}
        goats={allGoats}
        lockGoatId={goat.id}
        onSaved={() => {
          setHealthModalOpen(false)
          refetchHealth()
        }}
      />
      <BreedingRecordModal
        open={breedingModalOpen}
        onClose={() => setBreedingModalOpen(false)}
        goats={allGoats}
        lockDoeId={goat.id}
        onSaved={() => {
          setBreedingModalOpen(false)
          refetchBreeding()
        }}
      />
      <WeightRecordModal
        open={weightModalOpen}
        onClose={() => setWeightModalOpen(false)}
        goats={allGoats}
        lockGoatId={goat.id}
        onSaved={() => {
          setWeightModalOpen(false)
          refetchWeight()
        }}
      />
    </div>
  )
}

function InfoItem({ label, value }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

function RecordSection({ title, onAdd, records, empty, renderRow }) {
  return (
    <div className="mb-6 rounded-2xl border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading text-base font-semibold text-foreground">{title}</h2>
        <button
          type="button"
          onClick={onAdd}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-primary hover:bg-primary/10"
        >
          <Plus size={15} aria-hidden="true" />
          Add
        </button>
      </div>
      {records.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y divide-border">
          {records.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
              {renderRow(r)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
