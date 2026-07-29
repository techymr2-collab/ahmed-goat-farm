import Modal from './Modal'

export default function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = 'Delete', danger = true }) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-sm">
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-white ${
            danger ? 'bg-destructive hover:opacity-90' : 'bg-primary hover:bg-primary-dark'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
