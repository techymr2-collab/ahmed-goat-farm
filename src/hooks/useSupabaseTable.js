import { useCallback, useEffect, useState } from 'react'

/**
 * Generic fetch/loading/error wrapper around a Supabase query.
 * `queryFn` must be stable across renders that shouldn't refetch — pass a
 * `deps` array (like useEffect) for values the query depends on.
 */
export function useSupabaseTable(queryFn, deps = []) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await queryFn()
      if (error) setError(error.message)
      else setData(data ?? [])
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }, deps)

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}
