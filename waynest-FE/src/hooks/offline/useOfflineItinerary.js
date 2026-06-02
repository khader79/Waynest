import { useState, useEffect, useCallback, useRef } from 'react'
import { cacheTripPlan, getCachedTripPlan } from '@/utils/offline/indexedDb'

const useStableCallback = (fn) => {
  const ref = useRef(fn)
  ref.current = fn
  return useCallback((...args) => ref.current(...args), [])
}

export const useOfflineItinerary = (cacheKey, fetcher) => {
  const [data, setData] = useState(null)
  const [isFromCache, setIsFromCache] = useState(false)
  const [isStale, setIsStale] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const dataRef = useRef(null)

  const refetch = useCallback(async () => {
    if (!cacheKey || !fetcher) return
    try {
      const fresh = await fetcher()
      setData(fresh)
      dataRef.current = fresh
      setIsFromCache(false)
      setIsStale(false)
      setError(null)
      cacheTripPlan(cacheKey, fresh)
    } catch (err) {
      if (dataRef.current) {
        setIsStale(true)
      } else {
        setError(err)
      }
    }
  }, [cacheKey, fetcher])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      if (cacheKey) {
        const cached = await getCachedTripPlan(cacheKey)
        if (cancelled) return
        if (cached?.plan) {
          setData(cached.plan)
          dataRef.current = cached.plan
          setIsFromCache(true)
          setLoading(false)
        }
      }
      if (navigator.onLine && fetcher) {
        try {
          const fresh = await fetcher()
          if (cancelled) return
          setData(fresh)
          dataRef.current = fresh
          setIsFromCache(false)
          setIsStale(false)
          setError(null)
          if (cacheKey) cacheTripPlan(cacheKey, fresh)
        } catch (err) {
          if (cancelled) return
          if (dataRef.current) {
            setIsStale(true)
          } else {
            setError(err)
          }
        }
      }
      if (!cancelled) setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [cacheKey, fetcher])

  return { data, isFromCache, isStale, loading, error, refetch }
}
