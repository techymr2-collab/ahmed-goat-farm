import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Syringe, HeartHandshake, Scale, X, CheckCheck, ChevronDown } from 'lucide-react'
import { useNotifications, NOTIFICATION_SETTINGS } from '../context/NotificationsContext'
import { useToast } from '../context/ToastContext'
import { formatDate, goatLabel } from '../lib/format'

const KIND = {
  health: { icon: Syringe, label: 'Health' },
  kidding: { icon: HeartHandshake, label: 'Kidding' },
  weight: { icon: Scale, label: 'Weight check' },
}

function whenText(item) {
  const d = item.days_until
  if (item.kind === 'weight') {
    return d === null ? 'Weigh-in needed' : `Weigh-in overdue by ${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'}`
  }
  const verb = item.kind === 'kidding' ? 'Expected' : 'Due'
  if (d < 0) return `Overdue by ${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'} · ${formatDate(item.due_date)}`
  if (d === 0) return `${verb} today`
  if (d === 1) return `${verb} tomorrow`
  return `${verb} in ${d} days · ${formatDate(item.due_date)}`
}

function urgency(item) {
  if (item.kind === 'weight') return 'soon'
  if (item.days_until < 0) return 'overdue'
  if (item.days_until <= 1) return 'today'
  return 'soon'
}

const DOT = { overdue: 'bg-destructive', today: 'bg-accent', soon: 'bg-muted-foreground/50' }

export default function NotificationBell() {
  const { items, count, loading, error, dismiss } = useNotifications()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [showWeights, setShowWeights] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e) => containerRef.current && !containerRef.current.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const urgent = items.filter((i) => i.kind !== 'weight')
  const weights = items.filter((i) => i.kind === 'weight')
  const overdueCount = urgent.filter((i) => i.days_until < 0).length

  async function handleDismiss(keys, message) {
    const failure = await dismiss(keys)
    if (failure) toast.error(`Couldn't dismiss: ${failure}`)
    else if (message) toast.success(message)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={count > 0 ? `Notifications, ${count} alert${count === 1 ? '' : 's'}` : 'Notifications'}
        className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted"
      >
        <Bell size={20} aria-hidden="true" />
        {count > 0 && (
          <span
            className={`absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-surface ${
              overdueCount > 0 ? 'bg-destructive' : 'bg-primary'
            }`}
            aria-hidden="true"
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="fixed inset-x-3 top-16 z-50 flex max-h-[75vh] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[400px]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <h2 className="font-heading text-base font-semibold text-foreground">Notifications</h2>
              <p className="text-xs text-muted-foreground">
                {count === 0 ? 'Nothing needs attention' : `${count} alert${count === 1 ? '' : 's'}${overdueCount ? ` · ${overdueCount} overdue` : ''}`}
              </p>
            </div>
            {count > 0 && (
              <button
                type="button"
                onClick={() => handleDismiss(items.map((i) => i.notification_key), 'All notifications dismissed.')}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
              >
                <CheckCheck size={14} aria-hidden="true" />
                Dismiss all
              </button>
            )}
          </div>

          <div className="overflow-y-auto">
            {error ? (
              <p className="px-4 py-8 text-center text-sm text-destructive">{error}</p>
            ) : loading ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Checking…</p>
            ) : count === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <CheckCheck size={20} aria-hidden="true" />
                </div>
                <p className="text-sm font-medium text-foreground">All caught up</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Health due within {NOTIFICATION_SETTINGS.healthDays} days, kiddings within {NOTIFICATION_SETTINGS.kiddingDays} days, and goats
                  not weighed for {NOTIFICATION_SETTINGS.weightDays} days will show here.
                </p>
              </div>
            ) : (
              <>
                {urgent.length > 0 && (
                  <ul className="divide-y divide-border">
                    {urgent.map((item) => (
                      <NotificationItem key={item.notification_key} item={item} onNavigate={() => setOpen(false)} onDismiss={() => handleDismiss(item.notification_key)} />
                    ))}
                  </ul>
                )}

                {weights.length > 0 && (
                  <div className="border-t border-border">
                    <button
                      type="button"
                      aria-expanded={showWeights}
                      onClick={() => setShowWeights((s) => !s)}
                      className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-muted/50"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Scale size={15} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-foreground">
                          {weights.length === 1 ? '1 goat needs' : `${weights.length} goats need`} a weigh-in
                        </span>
                        <span className="block text-xs text-muted-foreground">Not weighed in {NOTIFICATION_SETTINGS.weightDays}+ days</span>
                      </span>
                      <ChevronDown size={16} className={`shrink-0 text-muted-foreground transition-transform ${showWeights ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </button>
                    {showWeights && (
                      <>
                        <ul className="divide-y divide-border border-t border-border bg-muted/20">
                          {weights.map((item) => (
                            <NotificationItem key={item.notification_key} item={item} compact onNavigate={() => setOpen(false)} onDismiss={() => handleDismiss(item.notification_key)} />
                          ))}
                        </ul>
                        <div className="border-t border-border px-4 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleDismiss(weights.map((i) => i.notification_key), 'Weight reminders dismissed.')}
                            className="cursor-pointer text-xs font-medium text-primary hover:underline"
                          >
                            Dismiss all weight reminders
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function NotificationItem({ item, onDismiss, onNavigate, compact = false }) {
  const kind = KIND[item.kind]
  const level = urgency(item)
  const Icon = kind.icon

  return (
    <li className="group flex items-start gap-3 px-4 py-3 hover:bg-muted/40">
      {!compact && (
        <span className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon size={15} aria-hidden="true" />
          <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-surface ${DOT[level]}`} aria-hidden="true" />
        </span>
      )}
      <Link to={`/goats/${item.goat_id}`} onClick={onNavigate} className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-sm font-medium text-foreground group-hover:text-primary">
          {goatLabel({ tag_id: item.tag_id, name: item.goat_name })}
          {!compact && <span className="font-normal text-muted-foreground"> · {item.title}</span>}
        </span>
        <span className={`block text-xs ${level === 'overdue' ? 'font-medium text-destructive' : level === 'today' ? 'font-medium text-accent' : 'text-muted-foreground'}`}>
          {compact ? item.title : whenText(item)}
        </span>
      </Link>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={`Dismiss ${kind.label.toLowerCase()} alert for ${item.tag_id}`}
        className="-mr-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X size={15} aria-hidden="true" />
      </button>
    </li>
  )
}
