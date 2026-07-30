const PRESETS = [
  { key: 'month', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'year', label: 'This Year' },
  { key: 'all', label: 'All Time' },
  { key: 'custom', label: 'Custom' },
]

const dateInputClasses =
  'rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30'

export default function DateRangeFilter({ preset, from, to, onChange }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => onChange({ preset: p.key })}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              preset === p.key ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {preset === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            aria-label="From date"
            value={from ?? ''}
            onChange={(e) => onChange({ from: e.target.value })}
            className={dateInputClasses}
          />
          <span className="text-sm text-muted-foreground">to</span>
          <input
            type="date"
            aria-label="To date"
            value={to ?? ''}
            onChange={(e) => onChange({ to: e.target.value })}
            className={dateInputClasses}
          />
        </div>
      )}
    </div>
  )
}
