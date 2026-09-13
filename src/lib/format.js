const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 })

export function formatINR(amount) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return '—'
  return inrFormatter.format(Number(amount))
}

export function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  return numberFormatter.format(Number(value))
}

export function formatLitres(value) {
  if (value === null || value === undefined) return '—'
  return `${formatNumber(value)} L`
}

// Parse 'YYYY-MM-DD' as a local date (new Date('YYYY-MM-DD') parses as UTC).
export function parseDate(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export function formatDate(dateStr) {
  const date = parseDate(dateStr)
  return date ? dateFormatter.format(date) : '—'
}

export function ageFromDOB(dob) {
  const birth = parseDate(dob)
  if (!birth) return '—'
  const now = new Date()
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  if (now.getDate() < birth.getDate()) months -= 1
  if (months < 0) months = 0
  if (months < 1) return '<1 month'
  if (months < 24) return `${months} month${months === 1 ? '' : 's'}`
  const years = Math.floor(months / 12)
  const rem = months % 12
  return rem ? `${years}y ${rem}m` : `${years}y`
}

export function daysUntil(dateStr) {
  const target = parseDate(dateStr)
  if (!target) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.round((target - now) / (1000 * 60 * 60 * 24))
}

export function goatLabel(goat) {
  if (!goat) return '—'
  return goat.name ? `${goat.tag_id} · ${goat.name}` : goat.tag_id
}
