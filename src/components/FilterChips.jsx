export default function FilterChips({ options, value, onChange, label }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const key = typeof opt === 'string' ? opt : opt.value
        const text = typeof opt === 'string' ? opt : opt.label
        const selected = value === key
        return (
          <button
            key={key}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(key)}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              selected ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {text}
            {typeof opt !== 'string' && opt.count !== undefined && opt.count !== null && (
              <span className={`ml-1.5 tabular-nums ${selected ? 'text-white/80' : 'text-muted-foreground/80'}`}>{opt.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
