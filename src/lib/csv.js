const BATCH_SIZE = 1000

/**
 * Fetch every row of a query, paging past Supabase's 1000-row response cap.
 * `buildQuery` must return a fresh query each call (ordering included).
 */
export async function fetchAll(buildQuery) {
  const rows = []
  for (let from = 0; ; from += BATCH_SIZE) {
    const { data, error } = await buildQuery().range(from, from + BATCH_SIZE - 1)
    if (error) throw Object.assign(new Error(error.message), { code: error.code })
    rows.push(...data)
    if (data.length < BATCH_SIZE) return rows
  }
}

function escapeCell(value) {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/**
 * Download rows as a CSV file. `columns` is [{ label, value: (row) => any }].
 * Prefixed with a BOM so Excel reads ₹ and Hindi names correctly.
 */
export function downloadCSV(filename, rows, columns) {
  const header = columns.map((c) => escapeCell(c.label)).join(',')
  const body = rows.map((row) => columns.map((c) => escapeCell(c.value(row))).join(','))
  const blob = new Blob([`\uFEFF${[header, ...body].join('\r\n')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
