import { formatDate } from './format'

// Dates are stored as plain 'YYYY-MM-DD' strings. Build them from local date
// parts — Date#toISOString() converts to UTC first, which in India (UTC+5:30)
// shifts local midnight back to the previous day.
export function toLocalISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayISO() {
  return toLocalISODate(new Date())
}

export function offsetISO(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return toLocalISODate(d)
}

export function getMonthRange(monthOffset = 0) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0)
  return { from: toLocalISODate(start), to: toLocalISODate(end) }
}

export function getYearRange() {
  const now = new Date()
  return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` }
}

const MONTH_LABEL = new Intl.DateTimeFormat('en-IN', { month: 'short' })

/** The last `count` calendar months (oldest first), including the current one. */
export function lastMonths(count) {
  const now = new Date()
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1)
    return { key: toLocalISODate(start).slice(0, 7), label: MONTH_LABEL.format(start), from: toLocalISODate(start) }
  })
}

/** Resolve a DateRangeFilter value into concrete from/to dates (null = unbounded). */
export function resolveRange(range) {
  switch (range.preset) {
    case 'month':
      return getMonthRange(0)
    case 'lastMonth':
      return getMonthRange(-1)
    case 'year':
      return getYearRange()
    case 'custom':
      return range.from && range.to ? { from: range.from, to: range.to } : { from: null, to: null }
    default:
      return { from: null, to: null }
  }
}

const PERIOD_LABELS = { month: 'This month', lastMonth: 'Last month', year: 'This year', all: 'All time' }

export function periodLabel(range, from, to) {
  if (range.preset === 'custom') return from && to ? `${formatDate(from)} – ${formatDate(to)}` : 'All time'
  return PERIOD_LABELS[range.preset]
}
