import { Database } from 'lucide-react'

export default function SetupRequired() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-light/60 text-accent">
          <Database size={22} aria-hidden="true" />
        </div>
        <h1 className="font-heading text-lg font-semibold text-foreground">Connect your database</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ahmed Goat Farm needs a Supabase project to store data and manage logins. Add{' '}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">VITE_SUPABASE_URL</code> and{' '}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">VITE_SUPABASE_ANON_KEY</code> to a{' '}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">.env</code> file, then restart the dev server.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">See README.md for the full setup guide.</p>
      </div>
    </div>
  )
}
