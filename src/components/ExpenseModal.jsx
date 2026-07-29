import { useEffect, useState } from 'react'
import Modal from './Modal'
import { Field, Input, Select, Textarea } from './FormField'
import { supabase } from '../lib/supabaseClient'

const emptyForm = {
  expense_date: new Date().toISOString().slice(0, 10),
  category: 'Feed',
  description: '',
  amount: '',
}

export default function ExpenseModal({ open, onClose, onSaved, record }) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setError('')
      setForm(
        record
          ? {
              expense_date: record.expense_date ?? '',
              category: record.category ?? 'Feed',
              description: record.description ?? '',
              amount: record.amount ?? '',
            }
          : emptyForm
      )
    }
  }, [open, record])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = { ...form, amount: Number(form.amount) }

    const { error } = record
      ? await supabase.from('expenses').update(payload).eq('id', record.id)
      : await supabase.from('expenses').insert(payload)

    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title={record ? 'Edit expense' : 'Add expense'} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date" required>
            <Input required type="date" value={form.expense_date} onChange={(e) => update('expense_date', e.target.value)} />
          </Field>
          <Field label="Category" required>
            <Select required value={form.category} onChange={(e) => update('category', e.target.value)}>
              <option value="Feed">Feed</option>
              <option value="Medical">Medical</option>
              <option value="Labor">Labor</option>
              <option value="Equipment">Equipment</option>
              <option value="Transport">Transport</option>
              <option value="Other">Other</option>
            </Select>
          </Field>
        </div>

        <Field label="Description">
          <Textarea value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="e.g. 3 bags of maize feed" />
        </Field>

        <Field label="Amount (₹)" required>
          <Input required type="number" min="0" step="0.01" value={form.amount} onChange={(e) => update('amount', e.target.value)} />
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
            {saving ? 'Saving…' : record ? 'Save changes' : 'Add expense'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
