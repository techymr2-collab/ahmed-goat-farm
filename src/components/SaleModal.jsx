import { useEffect, useState } from 'react'
import Modal from './Modal'
import { Field, Input, Select, Textarea } from './FormField'
import GoatCombobox from './GoatCombobox'
import { supabase } from '../lib/supabaseClient'
import { todayISO } from '../lib/dateRanges'

const emptyForm = () => ({
  sale_date: todayISO(),
  sale_type: 'Goat',
  goat_id: '',
  buyer_name: '',
  buyer_contact: '',
  quantity: '',
  amount: '',
  notes: '',
  mark_sold: true,
})

export default function SaleModal({ open, onClose, onSaved, record, goats }) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setError('')
      setForm(
        record
          ? {
              sale_date: record.sale_date ?? '',
              sale_type: record.sale_type ?? 'Goat',
              goat_id: record.goat_id ?? '',
              buyer_name: record.buyer_name ?? '',
              buyer_contact: record.buyer_contact ?? '',
              quantity: record.quantity ?? '',
              amount: record.amount ?? '',
              notes: record.notes ?? '',
              mark_sold: false,
            }
          : emptyForm()
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

    const { mark_sold, ...fields } = form
    const payload = {
      ...fields,
      goat_id: form.sale_type === 'Goat' && form.goat_id ? form.goat_id : null,
      quantity: form.quantity === '' ? null : Number(form.quantity),
      amount: Number(form.amount),
    }

    const { error } = record
      ? await supabase.from('sales').update(payload).eq('id', record.id)
      : await supabase.from('sales').insert(payload)

    if (!error && mark_sold && payload.goat_id) {
      const { error: statusError } = await supabase.from('goats').update({ status: 'Sold' }).eq('id', payload.goat_id)
      if (statusError) {
        setSaving(false)
        setError(`Sale saved, but the goat's status couldn't be updated: ${statusError.message}`)
        return
      }
    }

    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title={record ? 'Edit sale' : 'Add sale'} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Date" required>
            <Input required type="date" value={form.sale_date} onChange={(e) => update('sale_date', e.target.value)} />
          </Field>
          <Field label="Type" required>
            <Select required value={form.sale_type} onChange={(e) => update('sale_type', e.target.value)}>
              <option value="Goat">Goat</option>
              <option value="Milk">Milk</option>
              <option value="Other">Other</option>
            </Select>
          </Field>

          {form.sale_type === 'Goat' && (
            <Field label="Goat sold">
              <GoatCombobox
                goats={goats.filter((g) => g.status !== 'Sold' || g.id === form.goat_id)}
                value={form.goat_id}
                onChange={(id) => update('goat_id', id)}
              />
            </Field>
          )}

          {form.sale_type === 'Milk' && (
            <Field label="Quantity (litres)">
              <Input type="number" min="0" step="0.1" value={form.quantity} onChange={(e) => update('quantity', e.target.value)} />
            </Field>
          )}

          <Field label="Buyer name">
            <Input value={form.buyer_name} onChange={(e) => update('buyer_name', e.target.value)} />
          </Field>
          <Field label="Buyer contact">
            <Input value={form.buyer_contact} onChange={(e) => update('buyer_contact', e.target.value)} placeholder="Phone number" />
          </Field>
          <Field label="Amount (₹)" required>
            <Input required type="number" min="0" step="0.01" value={form.amount} onChange={(e) => update('amount', e.target.value)} />
          </Field>
        </div>

        {form.sale_type === 'Goat' && form.goat_id && !record && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.mark_sold}
              onChange={(e) => update('mark_sold', e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-[var(--color-primary)]"
            />
            Mark this goat as sold in the registry
          </label>
        )}

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
            {saving ? 'Saving…' : record ? 'Save changes' : 'Add sale'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
