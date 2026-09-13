/* Shared chart styling so every chart reads as one system.
 * Income green + expense amber passed the palette validator's normal-vision and
 * contrast checks; their colour-blind separation is in the 6–8 ΔE floor band,
 * so two-series charts always carry a legend, tooltip and a table view too. */

export const CHART_COLORS = {
  primary: '#15803d',
  income: '#15803d',
  expense: '#b45309',
  grid: '#e5efe7',
  axis: '#5b6b60',
}

export const axisProps = {
  tick: { fontSize: 12, fill: CHART_COLORS.axis },
  tickLine: false,
  axisLine: { stroke: CHART_COLORS.grid },
}

export const gridProps = { stroke: CHART_COLORS.grid, vertical: false }

// Bars: ≤24px thick, 4px rounded at the data end only.
export const BAR_SIZE = 20
export const BAR_RADIUS_UP = [4, 4, 0, 0]
export const BAR_RADIUS_RIGHT = [0, 4, 4, 0]

export function ChartTooltip({ active, payload, label, formatValue = (v) => v, labelFormatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      {label !== undefined && <p className="mb-1 font-medium text-foreground">{labelFormatter ? labelFormatter(label) : label}</p>}
      <ul className="space-y-0.5">
        {payload.map((item) => (
          <li key={item.dataKey} className="flex items-center gap-2 text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ background: item.color }} aria-hidden="true" />
            <span>{item.name}</span>
            <span className="ml-auto pl-3 font-medium tabular-nums text-foreground">{formatValue(item.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ChartLegend({ items }) {
  return (
    <ul className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} aria-hidden="true" />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

export function ChartCard({ title, description, action, children }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-semibold text-foreground">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Compact ₹ for axis ticks: ₹950, ₹12.5K, ₹1.2L */
export function compactINR(value) {
  const n = Number(value)
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`
  return `₹${n}`
}
