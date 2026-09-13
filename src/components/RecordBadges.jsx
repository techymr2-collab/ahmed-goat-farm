import Badge from './Badge'
import { daysUntil, formatDate } from '../lib/format'

export const STATUS_TONE = { Active: 'green', Sold: 'amber', Deceased: 'gray' }
export const HEALTH_TYPE_TONE = { Vaccination: 'green', Deworming: 'green', Illness: 'red', Treatment: 'amber', 'Vet Visit': 'amber' }
export const OUTCOME_TONE = { Pending: 'amber', Successful: 'green', Miscarried: 'red', Failed: 'red' }

function relative(days) {
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Today'
  return `in ${days}d`
}

/** Next-due date with an overdue / due-soon badge. */
export function DueBadge({ date }) {
  if (!date) return <span className="text-muted-foreground">—</span>
  const days = daysUntil(date)
  if (days < 0) return <Badge tone="red">{`${relative(days)} · ${formatDate(date)}`}</Badge>
  if (days <= 7) return <Badge tone="amber">{days === 0 ? 'Due today' : `${relative(days)} · ${formatDate(date)}`}</Badge>
  return <span>{formatDate(date)}</span>
}

/** Actual kidding date, or the expected date with a countdown while pending. */
export function KiddingDate({ record }) {
  if (record.actual_kidding_date) return <span>{formatDate(record.actual_kidding_date)}</span>
  if (!record.expected_kidding_date) return <span className="text-muted-foreground">—</span>
  if (record.outcome !== 'Pending') return <span>{formatDate(record.expected_kidding_date)}</span>
  const days = daysUntil(record.expected_kidding_date)
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {formatDate(record.expected_kidding_date)}
      <Badge tone={days < 0 ? 'red' : days <= 7 ? 'amber' : 'gray'}>{relative(days)}</Badge>
    </span>
  )
}
