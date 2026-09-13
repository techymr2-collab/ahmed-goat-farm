import { useState } from 'react'
import { Download } from 'lucide-react'
import Button from './Button'
import { useToast } from '../context/ToastContext'
import { friendlyError } from '../hooks/useSupabaseTable'

/** Button that runs `load()` (returning rows) and downloads them as CSV via `onExport(rows)`. */
export default function ExportButton({ load, onExport, label = 'Export CSV', variant = 'secondary', size = 'md' }) {
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  async function handleClick() {
    setBusy(true)
    try {
      const rows = await load()
      if (rows.length === 0) {
        toast.error('Nothing to export for this selection.')
      } else {
        onExport(rows)
        toast.success(`Exported ${rows.length} row${rows.length === 1 ? '' : 's'}.`)
      }
    } catch (err) {
      toast.error(friendlyError(err))
    }
    setBusy(false)
  }

  return (
    <Button variant={variant} size={size} icon={Download} onClick={handleClick} disabled={busy}>
      {busy ? 'Exporting…' : label}
    </Button>
  )
}
