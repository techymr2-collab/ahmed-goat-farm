import { formatINR } from '../lib/format'

/** Ranked horizontal bars for a category → amount breakdown (single series, direct-labelled). */
export default function BreakdownList({ rows, emptyText = 'Nothing recorded in this period.' }) {
  const max = Math.max(0, ...rows.map((r) => r.total))
  const sum = rows.reduce((s, r) => s + r.total, 0)
  if (rows.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">{emptyText}</p>

  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-foreground">{r.label}</span>
            <span className="tabular-nums text-foreground">
              {formatINR(r.total)}
              <span className="ml-1.5 text-xs text-muted-foreground">{sum ? Math.round((r.total / sum) * 100) : 0}%</span>
            </span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${max ? (r.total / max) * 100 : 0}%` }} />
          </div>
          {r.hint && <p className="mt-1 text-xs text-muted-foreground">{r.hint}</p>}
        </li>
      ))}
    </ul>
  )
}
