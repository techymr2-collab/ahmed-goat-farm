import { useEffect, useState } from 'react'
import Modal from './Modal'
import { Field, Input, Select, Textarea } from './FormField'
import GoatCombobox from './GoatCombobox'
import { supabase } from '../lib/supabaseClient'
import { todayISO } from '../lib/dateRanges'

const emptyForm = () => ({
  goat_id: '',
  record_type: 'Vaccination',
  title: '',
  record_date: todayISO(),
  next_due_date: '',
  cost: '',
  notes: '',
})

export default function HealthRecordModal({ open, onClose, onSaved, record, goats, lockGoatId }) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setError('')
      setForm(
        record
          ? {
              goat_id: record.goat_id ?? '',
              record_type: record.record_type ?? 'Vaccination',
              title: record.title ?? '',
              record_date: record.record_date ?? '',
              next_due_date: record.next_due_date ?? '',
              cost: record.cost ?? '',
              notes: record.notes ?? '',
            }
          : { ...emptyForm(), goat_id: lockGoatId ?? '' }
      )
    }
  }, [open, record, lockGoatId])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.goat_id) {
      setError('Select a goat.')
      return
    }
    setSaving(true)
    setError('')

    const payload = {
      ...form,
      next_due_date: form.next_due_date || null,
      cost: form.cost === '' ? null : Number(form.cost),
    }

    const { error } = record
      ? await supabase.from('health_records').update(payload).eq('id', record.id)
      : await supabase.from('health_records').insert(payload)

    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title={record ? 'Edit health record' : 'Add health record'} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Goat" required>
          <GoatCombobox
            goats={goats}
            value={form.goat_id}
            onChange={(id) => update('goat_id', id)}
            disabled={Boolean(lockGoatId)}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Type" required>
            <Select required value={form.record_type} onChange={(e) => update('record_type', e.target.value)}>
              <option value="Vaccination">Vaccination</option>
              <option value="Deworming">Deworming</option>
              <option value="Illness">Illness</option>
              <option value="Treatment">Treatment</option>
              <option value="Vet Visit">Vet Visit</option>
            </Select>
          </Field>
          <Field label="Title" required>
            <Input required value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. PPR vaccine" />
          </Field>
          <Field label="Date" required>
            <Input required type="date" value={form.record_date} onChange={(e) => update('record_date', e.target.value)} />
          </Field>
          <Field label="Next due date">
            <Input type="date" value={form.next_due_date} onChange={(e) => update('next_due_date', e.target.value)} />
          </Field>
          <Field label="Cost (₹)">
            <Input type="number" min="0" step="0.01" value={form.cost} onChange={(e) => update('cost', e.target.value)} />
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
