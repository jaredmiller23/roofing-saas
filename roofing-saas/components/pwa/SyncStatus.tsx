'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { getPendingCount } from '@/lib/db/indexeddb'
import { checkAndSync } from '@/lib/sync/queue'

interface SyncStatusProps {
  tenantId: string
}

export function SyncStatus({ tenantId }: SyncStatusProps) {
  const [pendingCount, setPendingCount] = useState({ uploads: 0, actions: 0 })
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncError, setLastSyncError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  // Poll for pending items every 30 seconds
  useEffect(() => {
    const checkPending = async () => {
      try {
        const count = await getPendingCount(tenantId)
        setPendingCount(count)
      } catch (error) {
        console.error('Error checking pending count:', error)
      }
    }

    checkPending()
    const interval = setInterval(checkPending, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [tenantId])

  const handleSyncClick = async () => {
    setIsSyncing(true)
    setLastSyncError(null)

    try {
      const success = await checkAndSync(tenantId)

      if (success) {
        // Refresh pending count
        const count = await getPendingCount(tenantId)
        setPendingCount(count)

        // Show success message
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
      } else {
        setLastSyncError('Sync failed. Please try again.')
      }
    } catch (error) {
      setLastSyncError((error as Error).message)
    } finally {
      setIsSyncing(false)
    }
  }

  const totalPending = pendingCount.uploads + pendingCount.actions

  // Don't show if nothing pending and no errors
  if (totalPending === 0 && !lastSyncError && !showSuccess) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {/* Success toast */}
      {showSuccess && (
        <div className="mb-2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom duration-300">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">Synced successfully</span>
        </div>
      )}

      {/* Pending items badge */}
      {totalPending > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[200px]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {isSyncing ? (
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 text-blue-600" />
                )}
                <span className="text-sm font-medium text-gray-900">
                  {isSyncing ? 'Syncing...' : `${totalPending} pending`}
                </span>
              </div>

              <div className="text-xs text-gray-600">
                {pendingCount.uploads > 0 && `${pendingCount.uploads} upload${pendingCount.uploads > 1 ? 's' : ''}`}
                {pendingCount.uploads > 0 && pendingCount.actions > 0 && ', '}
                {pendingCount.actions > 0 && `${pendingCount.actions} action${pendingCount.actions > 1 ? 's' : ''}`}
              </div>

              {lastSyncError && (
                <div className="flex items-center gap-1 mt-2 text-xs text-red-600">
                  <AlertCircle className="w-3 h-3" />
                  <span>{lastSyncError}</span>
                </div>
              )}
            </div>

            {!isSyncing && navigator.onLine && (
              <button
                onClick={handleSyncClick}
                className="flex-shrink-0 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
              >
                Sync Now
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
