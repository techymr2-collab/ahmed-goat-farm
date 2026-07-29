import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import SetupRequired from '../pages/SetupRequired'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (!isSupabaseConfigured) return <SetupRequired />

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return children
}
