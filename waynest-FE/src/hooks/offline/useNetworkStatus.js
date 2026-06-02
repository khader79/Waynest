import { useState, useEffect, useRef } from 'react'

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const wasOfflineRef = useRef(!navigator.onLine)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      wasOfflineRef.current = true
    }
    const handleOffline = () => {
      setIsOnline(false)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline, wasOffline: wasOfflineRef.current }
}
