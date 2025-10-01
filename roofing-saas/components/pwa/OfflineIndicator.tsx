'use client'

import { useState, useEffect } from 'react'
import { WifiOff, Wifi } from 'lucide-react'

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [showOnlineToast, setShowOnlineToast] = useState(false)

  useEffect(() => {
    // Set initial status
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      setShowOnlineToast(true)

      // Hide toast after 3 seconds
      setTimeout(() => {
        setShowOnlineToast(false)
      }, 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowOnlineToast(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Show "back online" toast temporarily
  if (showOnlineToast) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top duration-300">
        <Wifi className="w-5 h-5" />
        <span className="font-medium">Back online</span>
      </div>
    )
  }

  // Show persistent offline indicator
  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white px-4 py-2 text-center text-sm font-medium shadow-md">
        <div className="container mx-auto flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          <span>You are offline. Some features may be limited.</span>
        </div>
      </div>
    )
  }

  return null
}
