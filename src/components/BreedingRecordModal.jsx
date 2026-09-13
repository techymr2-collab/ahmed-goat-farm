import { useEffect, useState } from 'react'
import Modal from './Modal'
import { Field, Input, Select, Textarea } from './FormField'
import GoatCombobox from './GoatCombobox'
import { supabase } from '../lib/supabaseClient'

const emptyForm = {
  doe_id: '',
  buck_id: '',
  buck_name: '',
  mating_date: '',
  expected_kidding_date: '',
  actual_kidding_date: '',
  number_of_kids: '',
  outcome: 'Pending',
  notes: '',
}

// Gestation period for goats averages ~150 days.
function addDays(dateStr, days) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export default function BreedingRecordModal({ open, onClose, onSaved, record, goats, lockDoeId }) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const does = goats.filter((g) => g.sex === 'Female')
  const bucks = goats.filter((g) => g.sex === 'Male')

  useEffect(() => {
    if (open) {
      setError('')
      setForm(
        record
          ? {
              doe_id: record.doe_id ?? '',
              buck_id: record.buck_id ?? '',
              buck_name: record.buck_name ?? '',
              mating_date: record.mating_date ?? '',
              expected_kidding_date: record.expected_kidding_date ?? '',
              actual_kidding_date: record.actual_kidding_date ?? '',
              number_of_kids: record.number_of_kids ?? '',
              outcome: record.outcome ?? 'Pending',
              notes: record.notes ?? '',
            }
          : { ...emptyForm, doe_id: lockDoeId ?? '' }
      )
    }
  }, [open, record, lockDoeId])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleMatingDateChange(value) {
    setForm((f) => ({
      ...f,
      mating_date: value,
      // Keep the expected date in step with the mating date unless it was changed by hand.
      expected_kidding_date:
        !f.expected_kidding_date || f.expected_kidding_date === addDays(f.mating_date, 150)
          ? addDays(value, 150)
          : f.expected_kidding_date,
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.doe_id) {
      setError('Select a doe.')
      return
    }
    setSaving(true)
    setError('')

    const payload = {
      ...form,
      buck_id: form.buck_id || null,
      buck_name: form.buck_name || null,
      expected_kidding_date: form.expected_kidding_date || null,
      actual_kidding_date: form.actual_kidding_date || null,
      number_of_kids: form.number_of_kids === '' ? null : Number(form.number_of_kids),
    }

    const { error } = record
      ? await supabase.from('breeding_records').update(payload).eq('id', record.id)
      : await supabase.from('breeding_records').insert(payload)

    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title={record ? 'Edit breeding record' : 'Add breeding record'} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Doe (mother)" required>
          <GoatCombobox
            goats={does}
            value={form.doe_id}
            onChange={(id) => update('doe_id', id)}
            placeholder="Select a doe…"
            disabled={Boolean(lockDoeId)}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Buck (on farm)">
            <GoatCombobox
              goats={bucks}
              value={form.buck_id}
              onChange={(id) => update('buck_id', id)}
              nullLabel="— External / unknown —"
            />
          </Field>
          <Field label="Buck name (if external)">
            <Input value={form.buck_name} onChange={(e) => update('buck_name', e.target.value)} placeholder="Optional" />
          </Field>
          <Field label="Mating date" required>
            <Input required type="date" value={form.mating_date} onChange={(e) => handleMatingDateChange(e.target.value)} />
          </Field>
          <Field label="Expected kidding date">
            <Input type="date" value={form.expected_kidding_date} onChange={(e) => update('expected_kidding_date', e.target.value)} />
          </Field>
          <Field label="Actual kidding date">
            <Input type="date" value={form.actual_kidding_date} onChange={(e) => update('actual_kidding_date', e.target.value)} />
          </Field>
          <Field label="Number of kids">
            <Input type="number" min="0" value={form.number_of_kids} onChange={(e) => update('number_of_kids', e.target.value)} />
          </Field>
          <Field label="Outcome" required>
            <Select required value={form.outcome} onChange={(e) => update('outcome', e.target.value)}>
              <option value="Pending">Pending</option>
              <option value="Successful">Successful</option>
              <option value="Miscarried">Miscarried</option>
              <option value="Failed">Failed</option>
            </Select>
          </Field>
        </div>

        <Field label="Notes">
          <Textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} />
        </Field>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
          >
            {saving ? 'Saving…' : record ? 'Save changes' : 'Add record'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
