const inputClasses =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30'

export function Field({ label, required, children, error }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function Input({ className, ...props }) {
  return <input {...props} className={className ? `${inputClasses} ${className}` : inputClasses} />
}

export function Select({ children, ...props }) {
  return (
    <select {...props} className={`${inputClasses} cursor-pointer`}>
      {children}
    </select>
  )
}

export function Textarea(props) {
  return <textarea {...props} rows={props.rows ?? 3} className={inputClasses} />
}
