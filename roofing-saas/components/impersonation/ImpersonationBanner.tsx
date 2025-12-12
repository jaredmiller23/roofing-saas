'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, X, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ImpersonationStatusResponse } from '@/lib/impersonation/types'
import { IMPERSONATION_WARNING_MINUTES } from '@/lib/impersonation/types'

/**
 * ImpersonationBanner
 * Always-visible warning banner when admin is impersonating another user
 * Shows:
 * - Who is being impersonated
 * - Time remaining
 * - Exit button
 */
export function ImpersonationBanner() {
  const [status, setStatus] = useState<ImpersonationStatusResponse | null>(null)
  const [isExiting, setIsExiting] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)

  // Fetch impersonation status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/admin/impersonate/status')
        if (response.ok) {
          const data: ImpersonationStatusResponse = await response.json()
          if (data.is_impersonating) {
            setStatus(data)
            setTimeRemaining(data.time_remaining_seconds || 0)
          } else {
            setStatus(null)
          }
        }
      } catch (error) {
        console.error('Error checking impersonation status:', error)
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [])

  // Update countdown timer
  useEffect(() => {
    if (!status || !status.is_impersonating) return

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1
        if (newTime <= 0) {
          // Session expired - reload page
          window.location.reload()
          return 0
        }
        return newTime
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [status])

  const handleExitImpersonation = async () => {
    if (!confirm('Are you sure you want to exit impersonation mode?')) {
      return
    }

    setIsExiting(true)

    try {
      const response = await fetch('/api/admin/impersonate', {
        method: 'DELETE',
      })

      if (response.ok) {
        // Reload page to clear session
        window.location.reload()
      } else {
        const data = await response.json()
        alert(`Failed to exit impersonation: ${data.error}`)
        setIsExiting(false)
      }
    } catch (error) {
      console.error('Error exiting impersonation:', error)
      alert('Failed to exit impersonation. Please try again.')
      setIsExiting(false)
    }
  }

  const formatTimeRemaining = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  const isWarning = timeRemaining <= IMPERSONATION_WARNING_MINUTES * 60

  // Don't render if not impersonating
  if (!status || !status.is_impersonating) {
    return null
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 ${
        isWarning ? 'bg-red-600' : 'bg-orange-500'
      } text-white shadow-lg`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          {/* Left: Warning icon + message */}
          <div className="flex items-center gap-3 flex-1">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="font-semibold">
                Impersonating: {status.impersonated_user?.email}
              </span>
              {status.impersonated_user?.role && (
                <span className="text-xs opacity-90">
                  ({status.impersonated_user.role})
                </span>
              )}
              {status.reason && (
                <span className="text-sm opacity-90 hidden md:inline">
                  • Reason: {status.reason}
                </span>
              )}
            </div>
          </div>

          {/* Center: Time remaining */}
          <div className="flex items-center gap-2 mx-4">
            <Clock className="h-4 w-4" />
            <span
              className={`text-sm font-mono ${
                isWarning ? 'font-bold animate-pulse' : ''
              }`}
            >
              {formatTimeRemaining(timeRemaining)}
            </span>
          </div>

          {/* Right: Exit button */}
          <Button
            onClick={handleExitImpersonation}
            disabled={isExiting}
            variant="secondary"
            size="sm"
            className="flex items-center gap-2 bg-white text-foreground hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isExiting ? 'Exiting...' : 'Exit Impersonation'}
            </span>
            <span className="sm:hidden">Exit</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
