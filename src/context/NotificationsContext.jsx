import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { todayISO } from '../lib/dateRanges'
import { friendlyError } from '../hooks/useSupabaseTable'
import { FARM_NAME, FARM_LOCATION } from '../components/Brand'

// How far ahead each alert looks. Weight: flag active goats not weighed in this many days.
export const NOTIFICATION_SETTINGS = { healthDays: 7, kiddingDays: 14, weightDays: 60 }
const REFRESH_EVERY_MS = 5 * 60 * 1000

const NotificationsContext = createContext(null)

export function NotificationsProvider({ children }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const location = useLocation()
  const latestRequest = useRef(0)

  const refresh = useCallback(async () => {
    const requestId = ++latestRequest.current
    const { data, error } = await supabase.rpc('farm_notifications', {
      p_today: todayISO(),
      p_health_days: NOTIFICATION_SETTINGS.healthDays,
      p_kidding_days: NOTIFICATION_SETTINGS.kiddingDays,
      p_weight_days: NOTIFICATION_SETTINGS.weightDays,
    })
    if (requestId !== latestRequest.current) return
    setLoading(false)
    if (error) {
      setError(friendlyError(error))
      return
    }
    setError(null)
    setItems(data ?? [])
  }, [])

  // Records change on other pages, so re-check whenever the user navigates,
  // comes back to the tab, and every few minutes while it stays open.
  useEffect(() => {
    refresh()
  }, [refresh, location.pathname])

  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVisible)
    const id = setInterval(refresh, REFRESH_EVERY_MS)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(id)
    }
  }, [refresh])

  const dismiss = useCallback(
    async (keys) => {
      const list = Array.isArray(keys) ? keys : [keys]
      if (list.length === 0) return null
      setItems((current) => current.filter((item) => !list.includes(item.notification_key)))
      const { error } = await supabase
        .from('notification_dismissals')
        .upsert(
          list.map((notification_key) => ({ notification_key })),
          { onConflict: 'user_id,notification_key', ignoreDuplicates: true }
        )
      if (error) {
        refresh()
        return friendlyError(error)
      }
      return null
    },
    [refresh]
  )

  const count = items.length

  // Show the alert count in the browser tab, e.g. "(3) Bharat Goat Farm".
  useEffect(() => {
    const base = `${FARM_NAME} (${FARM_LOCATION})`
    document.title = count > 0 ? `(${count}) ${base}` : base
  }, [count])

  const value = useMemo(() => ({ items, count, loading, error, refresh, dismiss }), [items, count, loading, error, refresh, dismiss])

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider')
  return ctx
}
