import { useEffect, useState } from 'react'
import Modal from './Modal'
import { Field, Input, Select, Textarea } from './FormField'
import { supabase } from '../lib/supabaseClient'

const emptyForm = {
  goat_id: '',
  record_date: new Date().toISOString().slice(0, 10),
  weight_kg: '',
  notes: '',
}

export default function WeightRecordModal({ open, onClose, onSaved, record, goats, lockGoatId }) {
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
              record_date: record.record_date ?? '',
              weight_kg: record.weight_kg ?? '',
              notes: record.notes ?? '',
            }
          : { ...emptyForm, goat_id: lockGoatId ?? '' }
      )
    }
  }, [open, record, lockGoatId])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = { ...form, weight_kg: Number(form.weight_kg) }

    const { error } = record
      ? await supabase.from('weight_records').update(payload).eq('id', record.id)
      : await supabase.from('weight_records').insert(payload)

    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title={record ? 'Edit weight record' : 'Add weight record'} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Goat" required>
          <Select required disabled={Boolean(lockGoatId)} value={form.goat_id} onChange={(e) => update('goat_id', e.target.value)}>
            <option value="">Select a goat…</option>
            {goats.map((g) => (
              <option key={g.id} value={g.id}>
                {g.tag_id} {g.name ? `· ${g.name}` : ''}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Date" required>
            <Input required type="date" value={form.record_date} onChange={(e) => update('record_date', e.target.value)} />
          </Field>
          <Field label="Weight (kg)" required>
            <Input required type="number" min="0" step="0.1" value={form.weight_kg} onChange={(e) => update('weight_kg', e.target.value)} />
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
