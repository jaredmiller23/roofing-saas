/**
 * Sync Queue Service
 * Handles synchronizing pending actions and uploads when back online
 */

import {
  getPendingActions,
  getPendingUploads,
  deletePendingAction,
  deletePendingUpload,
  updatePendingActionRetry,
  updatePendingUploadRetry,
} from '@/lib/db/indexeddb'
import { logger } from '@/lib/logger'

const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second base delay

/**
 * Process all pending actions for a tenant
 */
export async function syncPendingActions(tenantId: string): Promise<{ success: number; failed: number }> {
  const actions = await getPendingActions(tenantId)

  let success = 0
  let failed = 0

  for (const action of actions) {
    try {
      // Skip if max retries exceeded
      if (action.retry_count >= MAX_RETRIES) {
        logger.warn('Max retries exceeded for action', { actionId: action.id })
        failed++
        continue
      }

      // Execute the action based on type
      const result = await executeAction(action)

      if (result.success) {
        // Remove from pending queue
        await deletePendingAction(action.id)
        success++
        logger.info('Action synced successfully', { actionId: action.id, type: action.action_type })
      } else {
        // Update retry count
        await updatePendingActionRetry(action.id, result.error)
        failed++
        logger.error('Action sync failed', { actionId: action.id, error: result.error })
      }
    } catch (error) {
      // Update retry count
      await updatePendingActionRetry(action.id, (error as Error).message)
      failed++
      logger.error('Action sync error', { actionId: action.id, error })
    }

    // Add delay between requests to avoid rate limiting
    await delay(RETRY_DELAY)
  }

  return { success, failed }
}

/**
 * Process all pending uploads for a tenant
 */
export async function syncPendingUploads(tenantId: string): Promise<{ success: number; failed: number }> {
  const uploads = await getPendingUploads(tenantId)

  let success = 0
  let failed = 0

  for (const upload of uploads) {
    try {
      // Skip if max retries exceeded
      if (upload.retry_count >= MAX_RETRIES) {
        logger.warn('Max retries exceeded for upload', { uploadId: upload.id })
        failed++
        continue
      }

      // Upload the file
      const result = await uploadFile(upload)

      if (result.success) {
        // Remove from pending queue
        await deletePendingUpload(upload.id)
        success++
        logger.info('Upload synced successfully', { uploadId: upload.id })
      } else {
        // Update retry count
        await updatePendingUploadRetry(upload.id, result.error)
        failed++
        logger.error('Upload sync failed', { uploadId: upload.id, error: result.error })
      }
    } catch (error) {
      // Update retry count
      await updatePendingUploadRetry(upload.id, (error as Error).message)
      failed++
      logger.error('Upload sync error', { uploadId: upload.id, error })
    }

    // Add delay between requests to avoid rate limiting
    await delay(RETRY_DELAY)
  }

  return { success, failed }
}

/**
 * Execute a pending action
 */
async function executeAction(action: any): Promise<{ success: boolean; error?: string }> {
  try {
    const { action_type, entity_type, entity_id, data } = action

    let url = ''
    let method = ''

    // Determine API endpoint and method based on action
    if (action_type === 'create') {
      url = `/api/${entity_type}s`
      method = 'POST'
    } else if (action_type === 'update') {
      url = `/api/${entity_type}s/${entity_id}`
      method = 'PATCH'
    } else if (action_type === 'delete') {
      url = `/api/${entity_type}s/${entity_id}`
      method = 'DELETE'
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: action_type !== 'delete' ? JSON.stringify(data) : undefined,
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Upload a file to the server
 */
async function uploadFile(upload: any): Promise<{ success: boolean; error?: string }> {
  try {
    const formData = new FormData()

    // Add file
    formData.append('file', upload.file, upload.file_name)

    // Add metadata
    if (upload.contact_id) {
      formData.append('contact_id', upload.contact_id)
    }
    if (upload.project_id) {
      formData.append('project_id', upload.project_id)
    }
    if (upload.metadata) {
      formData.append('metadata', JSON.stringify(upload.metadata))
    }

    const response = await fetch('/api/photos/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Sync all pending items (actions + uploads)
 */
export async function syncAll(tenantId: string): Promise<{
  actions: { success: number; failed: number }
  uploads: { success: number; failed: number }
}> {
  logger.info('Starting sync', { tenantId })

  const [actions, uploads] = await Promise.all([
    syncPendingActions(tenantId),
    syncPendingUploads(tenantId),
  ])

  logger.info('Sync completed', {
    tenantId,
    actions,
    uploads,
  })

  return { actions, uploads }
}

/**
 * Check if online and trigger sync if needed
 */
export async function checkAndSync(tenantId: string): Promise<boolean> {
  if (!navigator.onLine) {
    logger.info('Device is offline, skipping sync')
    return false
  }

  try {
    await syncAll(tenantId)
    return true
  } catch (error) {
    logger.error('Sync error', { error })
    return false
  }
}

/**
 * Setup online/offline event listeners
 */
export function setupSyncListeners(tenantId: string) {
  // Sync when coming back online
  window.addEventListener('online', () => {
    logger.info('Device is back online, starting sync')
    checkAndSync(tenantId)
  })

  // Log when going offline
  window.addEventListener('offline', () => {
    logger.info('Device is offline')
  })

  // Sync on page visibility (when tab becomes active)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && navigator.onLine) {
      logger.info('Page visible and online, checking for pending items')
      checkAndSync(tenantId)
    }
  })
}

/**
 * Delay utility
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
