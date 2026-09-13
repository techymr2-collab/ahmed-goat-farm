import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'
import { Field, Input, Select } from './FormField'
import { supabase } from '../lib/supabaseClient'
import { todayISO } from '../lib/dateRanges'
import { formatNumber, goatLabel } from '../lib/format'
import { friendlyError } from '../hooks/useSupabaseTable'

/**
 * Record one milking session for many does at once. Loads what's already been
 * entered for that date + session so it can be corrected in place.
 */
export default function MilkEntryModal({ open, onClose, onSaved, goats, lockGoatId, initialDate }) {
  const [date, setDate] = useState(todayISO())
  const [session, setSession] = useState('Morning')
  const [existing, setExisting] = useState({})
  const [values, setValues] = useState({})
  const [query, setQuery] = useState('')
  const [loadingExisting, setLoadingExisting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setDate(initialDate ?? todayISO())
    setSession(new Date().getHours() < 12 ? 'Morning' : 'Evening')
    setQuery('')
    setError('')
  }, [open, initialDate])

  useEffect(() => {
    if (!open || !date) return
    let cancelled = false
    setLoadingExisting(true)
    supabase
      .from('milk_records')
      .select('id, goat_id, litres')
      .eq('record_date', date)
      .eq('session', session)
      .then(({ data, error }) => {
        if (cancelled) return
        setLoadingExisting(false)
        if (error) {
          setError(friendlyError(error))
          return
        }
        const byGoat = Object.fromEntries((data ?? []).map((r) => [r.goat_id, r]))
        setExisting(byGoat)
        setValues(Object.fromEntries((data ?? []).map((r) => [r.goat_id, String(Number(r.litres))])))
      })
    return () => {
      cancelled = true
    }
  }, [open, date, session])

  const rows = useMemo(() => {
    const eligible = goats.filter((g) =>
      lockGoatId ? g.id === lockGoatId : (g.sex === 'Female' && g.status === 'Active') || existing[g.id]
    )
    const q = query.trim().toLowerCase()
    return q ? eligible.filter((g) => `${g.tag_id} ${g.name ?? ''} ${g.breed ?? ''}`.toLowerCase().includes(q)) : eligible
  }, [goats, lockGoatId, existing, query])

  const entered = Object.entries(values).filter(([, v]) => v !== '' && v !== undefined)
  const totalLitres = entered.reduce((sum, [, v]) => sum + (Number(v) || 0), 0)

  async function handleSave() {
    setError('')
    if (entered.some(([, v]) => Number.isNaN(Number(v)) || Number(v) < 0)) {
      setError('Litres must be zero or more.')
      return
    }

    setSaving(true)
    const upserts = entered.map(([goat_id, v]) => ({ goat_id, record_date: date, session, litres: Number(v) }))
    const clearedIds = Object.values(existing)
      .filter((r) => values[r.goat_id] === '' || values[r.goat_id] === undefined)
      .map((r) => r.id)

    if (upserts.length > 0) {
      const { error } = await supabase.from('milk_records').upsert(upserts, { onConflict: 'goat_id,record_date,session' })
      if (error) {
        setSaving(false)
        setError(friendlyError(error))
        return
      }
    }
    if (clearedIds.length > 0) {
      const { error } = await supabase.from('milk_records').delete().in('id', clearedIds)
      if (error) {
        setSaving(false)
        setError(friendlyError(error))
        return
      }
    }

    setSaving(false)
    onSaved({ count: upserts.length, litres: totalLitres, date, session })
  }

  return (
    <Modal open={open} onClose={onClose} title="Record milking" maxWidth="max-w-xl">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date" required>
            <Input type="date" required value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Session" required>
            <Select value={session} onChange={(e) => setSession(e.target.value)}>
              <option value="Morning">Morning</option>
              <option value="Evening">Evening</option>
            </Select>
          </Field>
        </div>

        {!lockGoatId && (
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a doe by tag, name, breed…"
              aria-label="Find a doe"
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </div>
        )}

        <div className="max-h-[45vh] overflow-y-auto rounded-xl border border-border">
          {rows.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {goats.length === 0 ? 'Loading goats…' : 'No active does found. Add female goats in the Goats section first.'}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((g) => (
                <li key={g.id} className="flex items-center gap-3 px-4 py-2">
                  <label htmlFor={`milk-${g.id}`} className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {goatLabel(g)}
                    {g.breed && <span className="ml-1.5 text-xs text-muted-foreground">{g.breed}</span>}
                  </label>
                  <div className="relative w-28 shrink-0">
                    <input
                      id={`milk-${g.id}`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.1"
                      value={values[g.id] ?? ''}
                      onChange={(e) => setValues((v) => ({ ...v, [g.id]: e.target.value }))}
                      placeholder="0.0"
                      className="w-full rounded-lg border border-border bg-background py-1.5 pl-3 pr-7 text-right text-sm tabular-nums text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                    />
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">L</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {loadingExisting ? 'Loading entries…' : `${entered.length} does · ${formatNumber(totalLitres)} L total`}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || loadingExisting}>
              {saving ? 'Saving…' : 'Save milking'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
