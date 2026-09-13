import { useEffect, useRef, useState } from 'react'
import { User as UserIcon } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/PageHeader'
import { Field, Input } from '../components/FormField'

const MAX_PHOTO_BYTES = 5 * 1024 * 1024

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth()
  const [fullName, setFullName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    setFullName(profile?.full_name ?? '')
    setAvatarUrl(profile?.avatar_url ?? '')
    setPhotoPreview(profile?.avatar_url ?? '')
    setPhotoFile(null)
  }, [profile])

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
    setAvatarUrl('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)

    let avatar_url = avatarUrl || null

    if (photoFile) {
      const ext = photoFile.name.split('.').pop()
      const path = `${user.id}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, photoFile)
      if (uploadError) {
        setSaving(false)
        setError(uploadError.message)
        return
      }
      avatar_url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
    }

    const { error: saveError } = await supabase
      .from('profiles')
      .upsert({ id: user.id, full_name: fullName || null, avatar_url, updated_at: new Date().toISOString() })

    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    setSaved(true)
    refreshProfile()
  }

  return (
    <div className="max-w-xl">
      <PageHeader title="Your profile" description="Update how you appear across Bharat Goat Farm." />

      <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-surface p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
            {photoPreview ? (
              <img src={photoPreview} alt="" className="h-full w-full object-cover" />
            ) : (
              <UserIcon size={28} className="text-muted-foreground" aria-hidden="true" />
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

        <div className="space-y-4">
          <Field label="Display name">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
          </Field>

          <Field label="Email">
            <Input value={user?.email ?? ''} disabled className="cursor-not-allowed opacity-70" />
          </Field>
        </div>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        {saved && !error && <p className="mt-4 text-sm text-primary">Profile updated.</p>}

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      <ChangePasswordCard />
    </div>
  )
}

function ChangePasswordCard() {
  const { user } = useAuth()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaved(false)

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }

    setSaving(true)

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    })
    if (verifyError) {
      setSaving(false)
      setError('Current password is incorrect.')
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    setSaving(false)

    if (updateError) {
      setError(updateError.message)
      return
    }
    setOldPassword('')
    setNewPassword('')
    setSaved(true)
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 rounded-2xl border border-border bg-surface p-6">
      <h2 className="mb-1 font-heading text-base font-semibold text-foreground">Change password</h2>
      <p className="mb-4 text-sm text-muted-foreground">Enter your current password and choose a new one.</p>

      <div className="space-y-4">
        <Field label="Current password" required>
          <Input
            type="password"
            required
            autoComplete="current-password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
        </Field>
        <Field label="New password" required>
          <Input
            type="password"
            required
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </Field>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      {saved && !error && <p className="mt-4 text-sm text-primary">Password updated.</p>}

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
        >
          {saving ? 'Updating…' : 'Update password'}
        </button>
      </div>
    </form>
  )
}
