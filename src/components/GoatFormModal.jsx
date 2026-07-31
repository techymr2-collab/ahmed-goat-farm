import { useEffect, useRef, useState } from 'react'
import { PawPrint } from 'lucide-react'
import Modal from './Modal'
import { Field, Input, Select, Textarea } from './FormField'
import GoatCombobox from './GoatCombobox'
import { supabase } from '../lib/supabaseClient'

const emptyForm = {
  tag_id: '',
  name: '',
  breed: '',
  sex: 'Female',
  date_of_birth: '',
  color: '',
  mother_id: '',
  father_id: '',
  status: 'Active',
  source: 'Born on farm',
  acquired_date: '',
  notes: '',
  photo_url: '',
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const TAG_PREFIX = 'AG-'

function getNextTagId(goats) {
  const numbers = goats
    .map((g) => /^AG-(\d+)$/i.exec(g.tag_id || ''))
    .filter(Boolean)
    .map((match) => parseInt(match[1], 10))
  const next = numbers.length ? Math.max(...numbers) + 1 : 1
  return `${TAG_PREFIX}${String(next).padStart(3, '0')}`
}

export default function GoatFormModal({ open, onClose, onSaved, goat, allGoats }) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setError('')
      setPhotoFile(null)
      setForm(
        goat
          ? {
              tag_id: goat.tag_id ?? '',
              name: goat.name ?? '',
              breed: goat.breed ?? '',
              sex: goat.sex ?? 'Female',
              date_of_birth: goat.date_of_birth ?? '',
              color: goat.color ?? '',
              mother_id: goat.mother_id ?? '',
              father_id: goat.father_id ?? '',
              status: goat.status ?? 'Active',
              source: goat.source ?? 'Born on farm',
              acquired_date: goat.acquired_date ?? '',
              notes: goat.notes ?? '',
              photo_url: goat.photo_url ?? '',
            }
          : { ...emptyForm, tag_id: getNextTagId(allGoats) }
      )
      setPhotoPreview(goat?.photo_url ?? '')
    }
  }, [open, goat, allGoats])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_PHOTO_BYTES) {
      setError('Photo must be under 5 MB.')
      e.target.value = ''
      return
    }
    setError('')
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function handleRemovePhoto() {
    setPhotoFile(null)
    setPhotoPreview('')
    update('photo_url', '')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    let photo_url = form.photo_url || null

    if (photoFile) {
      const ext = photoFile.name.split('.').pop()
      const path = `${goat?.id ?? crypto.randomUUID()}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('goat-photos').upload(path, photoFile)
      if (uploadError) {
        setSaving(false)
        setError(uploadError.message)
        return
      }
      photo_url = supabase.storage.from('goat-photos').getPublicUrl(path).data.publicUrl
    }

    const payload = {
      ...form,
      photo_url,
      date_of_birth: form.date_of_birth || null,
      acquired_date: form.acquired_date || null,
      mother_id: form.mother_id || null,
      father_id: form.father_id || null,
    }

    const { error } = goat
      ? await supabase.from('goats').update(payload).eq('id', goat.id)
      : await supabase.from('goats').insert(payload)

    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    onSaved()
  }

  const mothers = allGoats.filter((g) => g.sex === 'Female' && g.id !== goat?.id)
  const fathers = allGoats.filter((g) => g.sex === 'Male' && g.id !== goat?.id)

  return (
    <Modal open={open} onClose={onClose} title={goat ? 'Edit goat' : 'Add goat'} maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
            {photoPreview ? (
              <img src={photoPreview} alt="" className="h-full w-full object-cover" />
            ) : (
              <PawPrint size={28} className="text-muted-foreground" aria-hidden="true" />
            )}
          </div>
          <div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                {photoPreview ? 'Change photo' : 'Upload photo'}
              </button>
              {photoPreview && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">JPG, PNG or WEBP, up to 5 MB.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tag / ID">
            <Input value={form.tag_id} disabled readOnly className="cursor-not-allowed opacity-70" />
          </Field>
          <Field label="Name">
            <Input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Optional" />
          </Field>
          <Field label="Breed">
            <Input value={form.breed} onChange={(e) => update('breed', e.target.value)} placeholder="e.g. Sirohi, Jamunapari" />
          </Field>
          <Field label="Sex" required>
            <Select required value={form.sex} onChange={(e) => update('sex', e.target.value)}>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
            </Select>
          </Field>
          <Field label="Date of birth">
            <Input type="date" value={form.date_of_birth} onChange={(e) => update('date_of_birth', e.target.value)} />
          </Field>
          <Field label="Color / markings">
            <Input value={form.color} onChange={(e) => update('color', e.target.value)} />
          </Field>
          <Field label="Mother">
            <GoatCombobox
              goats={mothers}
              value={form.mother_id}
              onChange={(id) => update('mother_id', id)}
              nullLabel="— Unknown / external —"
            />
          </Field>
          <Field label="Father">
            <GoatCombobox
              goats={fathers}
              value={form.father_id}
              onChange={(id) => update('father_id', id)}
              nullLabel="— Unknown / external —"
            />
          </Field>
          <Field label="Status" required>
            <Select required value={form.status} onChange={(e) => update('status', e.target.value)}>
              <option value="Active">Active</option>
              <option value="Sold">Sold</option>
              <option value="Deceased">Deceased</option>
            </Select>
          </Field>
          <Field label="Source">
            <Select value={form.source} onChange={(e) => update('source', e.target.value)}>
              <option value="Born on farm">Born on farm</option>
              <option value="Purchased">Purchased</option>
            </Select>
          </Field>
          <Field label="Acquired date">
            <Input type="date" value={form.acquired_date} onChange={(e) => update('acquired_date', e.target.value)} />
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
            {saving ? 'Saving…' : goat ? 'Save changes' : 'Add goat'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
