export default function StatCard({ label, value, icon: Icon, hint, tone = 'default' }) {
  const toneClasses = {
    default: 'bg-primary/10 text-primary',
    accent: 'bg-accent-light/60 text-accent',
    destructive: 'bg-destructive/10 text-destructive',
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1.5 truncate font-heading text-2xl font-semibold text-foreground">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClasses[tone]}`}>
            <Icon size={20} aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  )
}
