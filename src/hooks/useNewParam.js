import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

/** Run `onNew` when the URL has ?new=1 (used by dashboard quick actions), then clear it. */
export function useNewParam(onNew) {
  const [params, setParams] = useSearchParams()
  const onNewRef = useRef(onNew)
  onNewRef.current = onNew

  useEffect(() => {
    if (params.get('new') !== '1') return
    onNewRef.current()
    const next = new URLSearchParams(params)
    next.delete('new')
    setParams(next, { replace: true })
  }, [params, setParams])
}
