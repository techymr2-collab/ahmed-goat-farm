import { Skeleton } from './Skeleton'

const TONES = {
  default: 'bg-primary/10 text-primary',
  accent: 'bg-accent-light/60 text-accent',
  destructive: 'bg-destructive/10 text-destructive',
}

export default function StatCard({ label, value, icon: Icon, hint, tone = 'default', loading = false }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-2.5 h-7 w-20" />
          ) : (
            <p className="mt-1.5 truncate font-heading text-xl font-semibold text-foreground sm:text-2xl">{value}</p>
          )}
          {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <div className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:flex ${TONES[tone]}`}>
            <Icon size={20} aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  )
}
