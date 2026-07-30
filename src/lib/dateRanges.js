function toISODate(date) {
  return date.toISOString().slice(0, 10)
}

export function getMonthRange(monthOffset = 0) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0)
  return { from: toISODate(start), to: toISODate(end) }
}

export function getYearRange() {
  const now = new Date()
  return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` }
}
