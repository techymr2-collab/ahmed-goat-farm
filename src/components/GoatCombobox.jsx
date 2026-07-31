import { useEffect, useRef, useState } from 'react'
import { ChevronsUpDown, Check, Search } from 'lucide-react'

const triggerClasses =
  'flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30'

/**
 * Searchable goat picker — swaps a plain <select> for a filterable dropdown.
 * Matters once a herd grows past a couple dozen goats and a native <select>
 * turns into an unusable wall of options.
 */
export default function GoatCombobox({ goats, value, onChange, placeholder = 'Select a goat…', nullLabel, disabled = false }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef(null)
  const searchRef = useRef(null)

  const selected = goats.find((g) => g.id === value)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    searchRef.current?.focus()
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const q = query.trim().toLowerCase()
  const filtered = q
    ? goats.filter((g) => `${g.tag_id} ${g.name ?? ''} ${g.breed ?? ''}`.toLowerCase().includes(q))
    : goats

  function handleSelect(id) {
    onChange(id)
    setOpen(false)
    setQuery('')
  }

  const displayLabel = selected ? `${selected.tag_id}${selected.name ? ' · ' + selected.name : ''}` : ''

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`${triggerClasses} ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
      >
        <span className={displayLabel ? 'truncate' : 'truncate text-muted-foreground'}>
          {displayLabel || nullLabel || placeholder}
        </span>
        <ChevronsUpDown size={15} className="shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>

      {open && !disabled && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          <div className="relative border-b border-border">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tag, name, breed…"
              className="w-full py-2 pl-9 pr-3 text-sm text-foreground outline-none"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {nullLabel && (
              <button
                type="button"
                onClick={() => handleSelect('')}
                className="flex w-full cursor-pointer items-center px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
              >
                {nullLabel}
              </button>
            )}
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-sm text-muted-foreground">No goats found.</p>
            ) : (
              filtered.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => handleSelect(g.id)}
                  className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                >
                  <span className="truncate">
                    {g.tag_id} {g.name ? `· ${g.name}` : ''}
                  </span>
                  {value === g.id && <Check size={14} className="shrink-0 text-primary" aria-hidden="true" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
