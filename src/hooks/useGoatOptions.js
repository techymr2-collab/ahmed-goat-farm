import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { fetchAll } from '../lib/csv'
import { friendlyError } from './useSupabaseTable'

/** Lightweight list of every goat, for pickers and tag numbering. */
export function useGoatOptions() {
  const [goats, setGoats] = useState([])
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    try {
      const rows = await fetchAll(() =>
        supabase.from('goats').select('id, tag_id, name, sex, breed, status').order('tag_id', { ascending: true })
      )
      setGoats(rows)
      setError(null)
    } catch (err) {
      setError(friendlyError(err))
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { goats, error, refetch }
}
