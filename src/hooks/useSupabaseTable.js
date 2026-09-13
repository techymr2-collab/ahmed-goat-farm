import { useCallback, useEffect, useRef, useState } from 'react'

const UPGRADE_HINT = 'Database update needed — run supabase/upgrade_v2.sql in the Supabase SQL Editor.'

/** Turn raw Supabase/PostgREST errors into something a farm user can act on. */
export function friendlyError(error) {
  if (!error) return null
  const code = error.code ?? ''
  // PGRST202: function not found · PGRST205 / 42P01: table not found
  if (code === 'PGRST202' || code === 'PGRST205' || code === '42P01') return UPGRADE_HINT
  if (error.message === 'Failed to fetch') return 'Could not reach the database. Check your internet connection.'
  return error.message
}

/**
 * Generic fetch/loading/error wrapper around a Supabase query or RPC call.
 * `queryFn` re-runs whenever `deps` change (like useEffect). Responses from a
 * superseded request are ignored, so fast filter changes can't show stale rows.
 */
export function useSupabaseTable(queryFn, deps = []) {
  const [data, setData] = useState([])
  const [count, setCount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const latestRequest = useRef(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const refetch = useCallback(async () => {
    const requestId = ++latestRequest.current
    setLoading(true)
    setError(null)
    try {
      const { data, count, error } = await queryFn()
      if (requestId !== latestRequest.current) return
      if (error) setError(friendlyError(error))
      else {
        setData(data ?? [])
        setCount(count ?? null)
      }
    } catch (err) {
      if (requestId !== latestRequest.current) return
      setError(friendlyError(err))
    }
    setLoading(false)
  }, deps)

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, count, loading, error, refetch }
}
