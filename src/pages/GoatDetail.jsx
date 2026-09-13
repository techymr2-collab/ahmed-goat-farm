import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Pencil,
  PawPrint,
  Syringe,
  Scale,
  HeartHandshake,
  Milk,
  IndianRupee,
  Baby,
  Cake,
  ShoppingBag,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import { useGoatOptions } from '../hooks/useGoatOptions'
import { useToast } from '../context/ToastContext'
import Badge from '../components/Badge'
import Button from '../components/Button'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import { RowActions } from '../components/DataTable'
import { Skeleton } from '../components/Skeleton'
import { ChartCard } from '../components/charts'
import WeightChart from '../components/WeightChart'
import GoatFormModal from '../components/GoatFormModal'
import HealthRecordModal from '../components/HealthRecordModal'
import BreedingRecordModal from '../components/BreedingRecordModal'
import WeightRecordModal from '../components/WeightRecordModal'
import MilkEntryModal from '../components/MilkEntryModal'
import { STATUS_TONE, HEALTH_TYPE_TONE, OUTCOME_TONE, DueBadge, KiddingDate } from '../components/RecordBadges'
import { ageFromDOB, formatDate, formatINR, formatLitres, formatNumber, goatLabel, parseDate } from '../lib/format'
import { offsetISO } from '../lib/dateRanges'

const MILK_WINDOW_DAYS = 90

export default function GoatDetail() {
  const { id } = useParams()
  const toast = useToast()
  const { goats: allGoats, refetch: refetchOptions } = useGoatOptions()

  const goatQuery = useSupabaseTable(() => supabase.from('goats').select('*').eq('id', id).limit(1), [id])
  const goat = goatQuery.data[0]

  const parents = useSupabaseTable(
    () =>
      goat && (goat.mother_id || goat.father_id)
        ? supabase.from('goats').select('id, tag_id, name').in('id', [goat.mother_id, goat.father_id].filter(Boolean))
        : Promise.resolve({ data: [], error: null }),
    [goat?.mother_id, goat?.father_id]
  )
  const offspring = useSupabaseTable(
    () =>
      supabase
        .from('goats')
        .select('id, tag_id, name, sex, date_of_birth, status')
        .or(`mother_id.eq.${id},father_id.eq.${id}`)
        .order('date_of_birth', { ascending: false, nullsFirst: false }),
    [id]
  )
  const health = useSupabaseTable(
    () => supabase.from('health_records').select('*').eq('goat_id', id).order('record_date', { ascending: false }),
    [id]
  )
  const weights = useSupabaseTable(
    () => supabase.from('weight_records').select('*').eq('goat_id', id).order('record_date', { ascending: true }),
    [id]
  )
  const breeding = useSupabaseTable(
    () =>
      supabase
        .from('breeding_records')
        .select('*, doe:goats!breeding_records_doe_id_fkey(id, tag_id, name), buck:goats!breeding_records_buck_id_fkey(id, tag_id, name)')
        .or(`doe_id.eq.${id},buck_id.eq.${id}`)
        .order('mating_date', { ascending: false }),
    [id]
  )
  const milk = useSupabaseTable(
    () =>
      supabase
        .from('milk_records')
        .select('id, record_date, session, litres')
        .eq('goat_id', id)
        .gte('record_date', offsetISO(-MILK_WINDOW_DAYS))
        .order('record_date', { ascending: false }),
    [id]
  )
  const sales = useSupabaseTable(() => supabase.from('sales').select('*').eq('goat_id', id).order('sale_date', { ascending: false }), [id])

  const [tab, setTab] = useState('timeline')
  const [modal, setModal] = useState(null) // { type, record? }
  const [deleteTarget, setDeleteTarget] = useState(null) // { table, id, label }

  const mother = parents.data.find((p) => p.id === goat?.mother_id)
  const father = parents.data.find((p) => p.id === goat?.father_id)
  const isFemale = goat?.sex === 'Female'

  const milkStats = useMemo(() => {
    const cutoff = offsetISO(-30)
    const last30 = milk.data.filter((r) => r.record_date >= cutoff)
    const litres = last30.reduce((s, r) => s + Number(r.litres), 0)
    const days = new Set(last30.map((r) => r.record_date)).size
    return { litres, days, perDay: days ? litres / days : 0 }
  }, [milk.data])

  const latestWeight = weights.data[weights.data.length - 1]
  const nextDue = health.data
    .filter((r) => r.next_due_date && r.next_due_date >= offsetISO(-30))
    .sort((a, b) => a.next_due_date.localeCompare(b.next_due_date))[0]

  const timeline = useMemo(() => {
    if (!goat) return []
    const events = []
    if (goat.date_of_birth) events.push({ date: goat.date_of_birth, icon: Cake, title: 'Born', detail: goat.source === 'Born on farm' ? 'Born on the farm' : null })
    if (goat.source === 'Purchased' && goat.acquired_date)
      events.push({ date: goat.acquired_date, icon: ShoppingBag, title: 'Purchased', detail: 'Joined the herd' })
    for (const r of health.data)
      events.push({ date: r.record_date, icon: Syringe, title: r.title, detail: r.record_type + (r.cost ? ` · ${formatINR(r.cost)}` : '') })
    for (const r of weights.data) events.push({ date: r.record_date, icon: Scale, title: `Weighed ${formatNumber(r.weight_kg)} kg`, detail: r.notes })
    for (const r of breeding.data) {
      const partner = r.doe_id === id ? (r.buck ? goatLabel(r.buck) : r.buck_name || 'external buck') : goatLabel(r.doe)
      events.push({ date: r.mating_date, icon: HeartHandshake, title: `Mated with ${partner}`, detail: `Outcome: ${r.outcome}` })
      if (r.actual_kidding_date)
        events.push({
          date: r.actual_kidding_date,
          icon: Baby,
          title: r.doe_id === id ? 'Kidded' : `${goatLabel(r.doe)} kidded`,
          detail: r.number_of_kids ? `${r.number_of_kids} kid${r.number_of_kids === 1 ? '' : 's'}` : null,
        })
    }
    for (const r of sales.data)
      events.push({ date: r.sale_date, icon: IndianRupee, title: `Sold for ${formatINR(r.amount)}`, detail: r.buyer_name ? `To ${r.buyer_name}` : null })
    return events.sort((a, b) => b.date.localeCompare(a.date))
  }, [goat, health.data, weights.data, breeding.data, sales.data, id])

  function refreshAll() {
    goatQuery.refetch()
    parents.refetch()
    offspring.refetch()
    health.refetch()
    weights.refetch()
    breeding.refetch()
    milk.refetch()
    sales.refetch()
    refetchOptions()
  }

  function saved(message) {
    setModal(null)
    toast.success(message)
    refreshAll()
  }

  async function handleDelete() {
    const target = deleteTarget
    setDeleteTarget(null)
    const { error } = await supabase.from(target.table).delete().eq('id', target.id)
    if (error) return toast.error(`Couldn't delete: ${error.message}`)
    toast.success(`${target.label} deleted.`)
    refreshAll()
  }

  if (goatQuery.loading && !goat) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  if (!goat) {
    return (
      <div>
        <BackLink />
        <EmptyState
          icon={PawPrint}
          title="Goat not found"
          description={goatQuery.error ?? 'It may have been deleted.'}
          action={
            <Link to="/goats" className="text-sm font-medium text-primary hover:underline">
              Back to the registry
            </Link>
          }
        />
      </div>
    )
  }

  const tabs = [
    { key: 'timeline', label: 'Timeline', count: timeline.length },
    { key: 'health', label: 'Health', count: health.data.length },
    { key: 'breeding', label: 'Breeding', count: breeding.data.length },
    { key: 'weight', label: 'Weight', count: weights.data.length },
    ...(isFemale ? [{ key: 'milk', label: 'Milk', count: milk.data.length }] : []),
    { key: 'offspring', label: 'Offspring', count: offspring.data.length },
  ]

  return (
    <div className="space-y-6">
      <BackLink />

      {/* Profile header */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted">
            {goat.photo_url ? (
              <img src={goat.photo_url} alt={`Photo of ${goatLabel(goat)}`} className="h-full w-full object-cover" />
            ) : (
              <PawPrint size={40} className="text-muted-foreground" aria-hidden="true" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-semibold text-foreground">{goat.tag_id}</h1>
              {goat.name && <span className="font-heading text-xl text-muted-foreground">· {goat.name}</span>}
              <Badge tone={STATUS_TONE[goat.status] ?? 'gray'}>{goat.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {goat.sex} · {goat.breed || 'Breed not recorded'} · {goat.date_of_birth ? `${ageFromDOB(goat.date_of_birth)} old` : 'Age unknown'}
            </p>

            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
              <Info label="Born" value={formatDate(goat.date_of_birth)} />
              <Info label="Colour" value={goat.color || '—'} />
              <Info label="Mother" value={mother ? <GoatLink goat={mother} /> : '—'} />
              <Info label="Father" value={father ? <GoatLink goat={father} /> : '—'} />
              <Info label="Source" value={goat.source || '—'} />
              <Info label="Acquired" value={formatDate(goat.acquired_date)} />
            </dl>
            {goat.notes && <p className="mt-4 rounded-lg bg-muted/60 px-3 py-2 text-sm text-foreground">{goat.notes}</p>}
          </div>

          <div className="no-print flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
            <Button variant="secondary" icon={Pencil} onClick={() => setModal({ type: 'goat' })}>
              Edit profile
            </Button>
          </div>
        </div>

        <div className="no-print mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
          <Button size="sm" variant="secondary" icon={Syringe} onClick={() => setModal({ type: 'health' })}>
            Health record
          </Button>
          <Button size="sm" variant="secondary" icon={Scale} onClick={() => setModal({ type: 'weight' })}>
            Weigh-in
          </Button>
          {isFemale && (
            <>
              <Button size="sm" variant="secondary" icon={Milk} onClick={() => setModal({ type: 'milk' })}>
                Milk entry
              </Button>
              <Button size="sm" variant="secondary" icon={HeartHandshake} onClick={() => setModal({ type: 'breeding' })}>
                Breeding record
              </Button>
            </>
          )}
        </div>
      </section>

      {/* Key figures */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniStat
          label="Latest weight"
          value={latestWeight ? `${formatNumber(latestWeight.weight_kg)} kg` : '—'}
          hint={latestWeight ? formatDate(latestWeight.record_date) : 'No weigh-ins'}
        />
        <MiniStat
          label="Next health due"
          value={nextDue ? <DueBadge date={nextDue.next_due_date} /> : '—'}
          hint={nextDue ? nextDue.title : 'Nothing scheduled'}
        />
        {isFemale ? (
          <MiniStat
            label="Milk, last 30 days"
            value={formatLitres(milkStats.litres)}
            hint={milkStats.days ? `${formatNumber(milkStats.perDay)} L/day over ${milkStats.days} days` : 'No entries'}
          />
        ) : (
          <MiniStat label="Matings" value={breeding.data.length} hint="As sire" />
        )}
        <MiniStat label="Offspring" value={offspring.data.length} hint={offspring.data.length ? `${offspring.data.filter((o) => o.status === 'Active').length} active` : 'None recorded'} />
      </div>

      {weights.data.length > 1 && (
        <ChartCard title="Growth" description={`${weights.data.length} weigh-ins`}>
          <WeightChart records={weights.data} height={220} />
        </ChartCard>
      )}

      {/* Tabs */}
      <section className="rounded-2xl border border-border bg-surface shadow-sm">
        <div role="tablist" aria-label="Goat records" className="flex gap-1 overflow-x-auto border-b border-border px-3">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              type="button"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`-mb-px shrink-0 cursor-pointer border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">{t.count}</span>
            </button>
          ))}
        </div>

        <div role="tabpanel" className="p-5">
          {tab === 'timeline' &&
            (timeline.length === 0 ? (
              <EmptyState icon={Cake} title="No history yet" description="Health records, weigh-ins, breeding and sales will build this goat’s timeline." />
            ) : (
              <ol className="relative space-y-5 border-l border-border pl-6">
                {timeline.map((event, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[37px] flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-primary/10 text-primary">
                      <event.icon size={12} aria-hidden="true" />
                    </span>
                    <p className="text-xs text-muted-foreground">{formatDate(event.date)}</p>
                    <p className="text-sm font-medium text-foreground">{event.title}</p>
                    {event.detail && <p className="text-sm text-muted-foreground">{event.detail}</p>}
                  </li>
                ))}
              </ol>
            ))}

          {tab === 'health' && (
            <RecordList
              rows={health.data}
              empty="No health records for this goat yet."
              render={(r) => (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                      {r.title} <Badge tone={HEALTH_TYPE_TONE[r.record_type] ?? 'gray'}>{r.record_type}</Badge>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(r.record_date)}
                      {r.cost ? ` · ${formatINR(r.cost)}` : ''}
                    </p>
                  </div>
                  {r.next_due_date && (
                    <div className="text-right text-xs">
                      <p className="text-muted-foreground">Next due</p>
                      <DueBadge date={r.next_due_date} />
                    </div>
                  )}
                  <RowActions
                    label={r.title}
                    onEdit={() => setModal({ type: 'health', record: r })}
                    onDelete={() => setDeleteTarget({ table: 'health_records', id: r.id, label: 'Health record' })}
                  />
                </>
              )}
            />
          )}

          {tab === 'breeding' && (
            <RecordList
              rows={breeding.data}
              empty="No breeding records for this goat yet."
              render={(r) => (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                      {r.doe_id === id ? `With ${r.buck ? goatLabel(r.buck) : r.buck_name || 'external buck'}` : `Mated with ${goatLabel(r.doe)}`}
                      <Badge tone={OUTCOME_TONE[r.outcome] ?? 'gray'}>{r.outcome}</Badge>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Mated {formatDate(r.mating_date)} · Kidding <KiddingDate record={r} />
                      {r.number_of_kids ? ` · ${r.number_of_kids} kids` : ''}
                    </p>
                  </div>
                  <RowActions
                    label="breeding record"
                    onEdit={() => setModal({ type: 'breeding', record: r })}
                    onDelete={() => setDeleteTarget({ table: 'breeding_records', id: r.id, label: 'Breeding record' })}
                  />
                </>
              )}
            />
          )}

          {tab === 'weight' && (
            <RecordList
              rows={[...weights.data].reverse()}
              empty="No weigh-ins for this goat yet."
              render={(r) => (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium tabular-nums text-foreground">{formatNumber(r.weight_kg)} kg</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(r.record_date)}
                      {r.notes ? ` · ${r.notes}` : ''}
                    </p>
                  </div>
                  <RowActions
                    label="weight record"
                    onEdit={() => setModal({ type: 'weight', record: r })}
                    onDelete={() => setDeleteTarget({ table: 'weight_records', id: r.id, label: 'Weight record' })}
                  />
                </>
              )}
            />
          )}

          {tab === 'milk' && (
            <RecordList
              rows={milk.data}
              empty={`No milk entries in the last ${MILK_WINDOW_DAYS} days.`}
              footer={milk.data.length > 0 ? `Showing the last ${MILK_WINDOW_DAYS} days. See Milk Production for full history.` : null}
              render={(r) => (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium tabular-nums text-foreground">{formatLitres(r.litres)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(r.record_date)} · {r.session}
                    </p>
                  </div>
                  <RowActions label="milk entry" onDelete={() => setDeleteTarget({ table: 'milk_records', id: r.id, label: 'Milk entry' })} />
                </>
              )}
            />
          )}

          {tab === 'offspring' && (
            <RecordList
              rows={offspring.data}
              empty="No offspring recorded. Set this goat as mother or father when adding a kid."
              render={(o) => (
                <>
                  <div className="min-w-0 flex-1">
                    <GoatLink goat={o} />
                    <p className="text-xs text-muted-foreground">
                      {o.sex} · born {formatDate(o.date_of_birth)}
                      {o.date_of_birth && parseDate(o.date_of_birth) ? ` · ${ageFromDOB(o.date_of_birth)}` : ''}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[o.status] ?? 'gray'}>{o.status}</Badge>
                </>
              )}
            />
          )}
        </div>
      </section>

      {sales.data.length === 0 && goat.status === 'Active' && (
        <p className="no-print text-xs text-muted-foreground">
          Selling this goat? Record it under{' '}
          <Link to="/sales?new=1" className="font-medium text-primary hover:underline">
            Sales
          </Link>{' '}
          and it will be marked as sold automatically.
        </p>
      )}

      <GoatFormModal
        open={modal?.type === 'goat'}
        onClose={() => setModal(null)}
        goat={goat}
        allGoats={allGoats}
        onSaved={() => saved(`${goat.tag_id} updated.`)}
      />
      <HealthRecordModal
        open={modal?.type === 'health'}
        onClose={() => setModal(null)}
        record={modal?.type === 'health' ? modal.record : null}
        goats={allGoats}
        lockGoatId={goat.id}
        onSaved={() => saved(modal?.record ? 'Health record updated.' : 'Health record added.')}
      />
      <WeightRecordModal
        open={modal?.type === 'weight'}
        onClose={() => setModal(null)}
        record={modal?.type === 'weight' ? modal.record : null}
        goats={allGoats}
        lockGoatId={goat.id}
        onSaved={() => saved(modal?.record ? 'Weight record updated.' : 'Weight recorded.')}
      />
      <BreedingRecordModal
        open={modal?.type === 'breeding'}
        onClose={() => setModal(null)}
        record={modal?.type === 'breeding' ? modal.record : null}
        goats={allGoats}
        lockDoeId={modal?.record ? undefined : goat.id}
        onSaved={() => saved(modal?.record ? 'Breeding record updated.' : 'Breeding record added.')}
      />
      <MilkEntryModal
        open={modal?.type === 'milk'}
        onClose={() => setModal(null)}
        goats={allGoats}
        lockGoatId={goat.id}
        onSaved={({ litres, session }) => saved(`${session} milk saved — ${formatLitres(litres)}.`)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Delete ${deleteTarget?.label.toLowerCase()}?`}
        description="This record will be permanently removed."
      />
    </div>
  )
}

function BackLink() {
  return (
    <Link to="/goats" className="no-print inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft size={16} aria-hidden="true" /> Back to goats
    </Link>
  )
}

function GoatLink({ goat }) {
  return (
    <Link to={`/goats/${goat.id}`} className="font-medium text-primary hover:underline">
      {goatLabel(goat)}
    </Link>
  )
}

function Info({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-foreground">{value}</dd>
    </div>
  )
}

function MiniStat({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 font-heading text-lg font-semibold text-foreground">{value}</div>
      {hint && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function RecordList({ rows, empty, render, footer }) {
  if (rows.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>
  return (
    <>
      <ul className="divide-y divide-border">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center gap-3 py-3">
            {render(row)}
          </li>
        ))}
      </ul>
      {footer && <p className="mt-3 text-xs text-muted-foreground">{footer}</p>}
    </>
  )
}
