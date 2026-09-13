import { useEffect, useState } from 'react'
import { useSupabaseTable } from './useSupabaseTable'

export const PAGE_SIZE = 25

/**
 * Server-side pagination on top of useSupabaseTable. `buildQuery` must request
 * an exact count, e.g. `.select('*', { count: 'exact' })`. The page resets to 1
 * whenever `filters` change.
 */
export function usePagedQuery(buildQuery, filters = [], pageSize = PAGE_SIZE) {
  const filterKey = JSON.stringify(filters)
  const [page, setPage] = useState(1)
  const [lastFilterKey, setLastFilterKey] = useState(filterKey)

  if (lastFilterKey !== filterKey) {
    setLastFilterKey(filterKey)
    setPage(1)
  }

  const result = useSupabaseTable(() => {
    const start = (page - 1) * pageSize
    return buildQuery().range(start, start + pageSize - 1)
  }, [filterKey, page, pageSize])

  // Deleting the last row on the last page would otherwise strand an empty page.
  const pageCount = Math.max(1, Math.ceil((result.count ?? 0) / pageSize))
  useEffect(() => {
    if (!result.loading && result.count !== null && page > pageCount) setPage(pageCount)
  }, [result.loading, result.count, page, pageCount])

  return { ...result, page, setPage, pageSize }
}
