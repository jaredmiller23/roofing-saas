'use client'

import { useEffect } from 'react'
import { initDB } from '@/lib/db/indexeddb'
import { initializeOfflineQueue } from '@/lib/db/offline-queue'
import { setupNetworkListeners } from '@/lib/services/photo-queue'
import { setupSyncListeners } from '@/lib/sync/queue'
import { InstallPrompt } from './InstallPrompt'
import { OfflineIndicator } from './OfflineIndicator'
import { SyncStatus } from './SyncStatus'
import OfflineQueueStatus from '@/components/photos/OfflineQueueStatus'

interface PWAProviderProps {
  children: React.ReactNode
  tenantId?: string // Optional - will only show sync status if provided
}

export function PWAProvider({ children, tenantId }: PWAProviderProps) {
  useEffect(() => {
    // Initialize IndexedDB for contacts/projects cache
    initDB().catch(error => {
      console.error('Failed to initialize IndexedDB:', error)
    })

    // Initialize Dexie database for offline photo queue
    initializeOfflineQueue().catch(error => {
      console.error('Failed to initialize offline queue:', error)
    })

    // Setup network listeners for photo queue auto-sync
    setupNetworkListeners()

    // Setup sync listeners if tenantId is provided
    if (tenantId) {
      setupSyncListeners(tenantId)
    }

    // Register service worker (handled by next-pwa)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        console.log('✅ Service Worker registered:', registration.scope)

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'SYNC_PHOTOS') {
            console.log('📡 Received sync request from service worker')
          }
        })
      }).catch(error => {
        console.error('❌ Service Worker registration failed:', error)
      })
    }
  }, [tenantId])

  return (
    <>
      {children}
      <InstallPrompt />
      <OfflineIndicator />
      {/* <OfflineQueueStatus /> */}
      {tenantId && <SyncStatus tenantId={tenantId} />}
    </>
  )
}
