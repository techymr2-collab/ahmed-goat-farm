const TONES = {
  green: 'bg-primary/10 text-primary',
  amber: 'bg-accent-light/60 text-accent',
  red: 'bg-destructive/10 text-destructive',
  gray: 'bg-muted text-muted-foreground',
}

export default function Badge({ children, tone = 'gray' }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  )
}
