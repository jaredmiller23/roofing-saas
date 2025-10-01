'use client'

import { useEffect } from 'react'
import { initDB } from '@/lib/db/indexeddb'
import { setupSyncListeners } from '@/lib/sync/queue'
import { InstallPrompt } from './InstallPrompt'
import { OfflineIndicator } from './OfflineIndicator'
import { SyncStatus } from './SyncStatus'

interface PWAProviderProps {
  children: React.ReactNode
  tenantId?: string // Optional - will only show sync status if provided
}

export function PWAProvider({ children, tenantId }: PWAProviderProps) {
  useEffect(() => {
    // Initialize IndexedDB
    initDB().catch(error => {
      console.error('Failed to initialize IndexedDB:', error)
    })

    // Setup sync listeners if tenantId is provided
    if (tenantId) {
      setupSyncListeners(tenantId)
    }

    // Register service worker (handled by next-pwa)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        console.log('Service Worker registered:', registration)
      })
    }
  }, [tenantId])

  return (
    <>
      {children}
      <InstallPrompt />
      <OfflineIndicator />
      {tenantId && <SyncStatus tenantId={tenantId} />}
    </>
  )
}
