/**
 * Signature Queue
 *
 * Handles queuing offline signature submissions and syncing them when online.
 * Uses the existing IndexedDB infrastructure (offline_forms store).
 */

import { getEnhancedDB } from './indexed-db'
import type {
  OfflineSignatureSubmission,
  OfflineSignatureInput,
  SignatureQueueResult,
} from './signature-types'
import { SIGNATURE_CACHE_CONFIG } from './signature-types'

/**
 * Generate a unique ID for offline submissions
 */
function generateSubmissionId(): string {
  return `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoffDelay(attempts: number): number {
  const delay = SIGNATURE_CACHE_CONFIG.RETRY_BASE_DELAY_MS * Math.pow(2, attempts)
  return Math.min(delay, SIGNATURE_CACHE_CONFIG.RETRY_MAX_DELAY_MS)
}

/**
 * Queue a signature for offline sync.
 * The signature will be submitted automatically when the device comes online.
 *
 * @param submission - The signature submission data
 * @returns The generated submission ID
 */
export async function queueOfflineSignature(
  submission: OfflineSignatureInput
): Promise<string> {
  const db = await getEnhancedDB()
  const id = generateSubmissionId()

  const fullSubmission: OfflineSignatureSubmission = {
    ...submission,
    id,
    synced: false,
    sync_attempts: 0,
  }

  // Store in offline_forms with form_type = 'signature'
  await db.offline_forms.put({
    id,
    form_type: 'signature' as const,
    data: fullSubmission as unknown as Record<string, unknown>,
    photos: [], // Signatures don't have associated photos in this context
    timestamp: submission.captured_at,
    synced: false,
  })

  return id
}

/**
 * Get all pending (unsynced) signature submissions.
 *
 * @returns Array of pending signature submissions
 */
export async function getPendingSignatures(): Promise<OfflineSignatureSubmission[]> {
  const db = await getEnhancedDB()

  // Get all unsynced forms with type 'signature'
  const unsyncedForms = await db.offline_forms.where('synced').equals(0).toArray()

  return unsyncedForms
    .filter((form) => form.form_type === 'signature')
    .map((form) => form.data as unknown as OfflineSignatureSubmission)
}

/**
 * Get a specific signature submission by ID.
 *
 * @param id - The submission ID
 * @returns The submission or null if not found
 */
export async function getSignatureSubmission(
  id: string
): Promise<OfflineSignatureSubmission | null> {
  const db = await getEnhancedDB()
  const form = await db.offline_forms.get(id)

  if (!form || form.form_type !== 'signature') {
    return null
  }

  return form.data as unknown as OfflineSignatureSubmission
}

/**
 * Mark a signature submission as synced.
 *
 * @param id - The submission ID
 */
export async function markSignatureSynced(id: string): Promise<void> {
  const db = await getEnhancedDB()
  const form = await db.offline_forms.get(id)

  if (form) {
    const submission = form.data as unknown as OfflineSignatureSubmission
    submission.synced = true

    await db.offline_forms.put({
      ...form,
      synced: true,
      data: submission as unknown as Record<string, unknown>,
    })
  }
}

/**
 * Update a signature submission after a failed sync attempt.
 *
 * @param id - The submission ID
 * @param error - The error message
 */
export async function markSignatureFailed(id: string, error: string): Promise<void> {
  const db = await getEnhancedDB()
  const form = await db.offline_forms.get(id)

  if (form) {
    const submission = form.data as unknown as OfflineSignatureSubmission
    submission.sync_attempts += 1
    submission.last_error = error
    submission.last_sync_attempt = Date.now()

    await db.offline_forms.put({
      ...form,
      data: submission as unknown as Record<string, unknown>,
    })
  }
}

/**
 * Remove a signature submission from the queue.
 * Use this after successful sync or when max retries exceeded.
 *
 * @param id - The submission ID
 */
export async function removeSignatureFromQueue(id: string): Promise<void> {
  const db = await getEnhancedDB()
  await db.offline_forms.delete(id)
}

/**
 * Process the signature queue - attempt to sync all pending signatures.
 * This should be called by the sync manager when the device comes online.
 *
 * @returns Statistics about the sync operation
 */
export async function processSignatureQueue(): Promise<SignatureQueueResult> {
  const result: SignatureQueueResult = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  }

  const pendingSignatures = await getPendingSignatures()

  if (pendingSignatures.length === 0) {
    return result
  }

  // Process each signature sequentially to avoid overwhelming the server
  for (const submission of pendingSignatures) {
    // Skip if max retries exceeded
    if (submission.sync_attempts >= SIGNATURE_CACHE_CONFIG.MAX_SYNC_RETRIES) {
      result.skipped++
      continue
    }

    // Check if we should wait due to backoff
    if (submission.last_sync_attempt) {
      const backoffDelay = calculateBackoffDelay(submission.sync_attempts)
      const timeSinceLastAttempt = Date.now() - submission.last_sync_attempt
      if (timeSinceLastAttempt < backoffDelay) {
        // Not enough time has passed, skip this one for now
        continue
      }
    }

    try {
      await syncSignatureSubmission(submission)
      await markSignatureSynced(submission.id)
      result.success++
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await markSignatureFailed(submission.id, errorMessage)
      result.failed++
      result.errors.push({
        submission_id: submission.id,
        document_id: submission.document_id,
        error: errorMessage,
      })
    }
  }

  return result
}

/**
 * Sync a single signature submission to the server.
 *
 * @param submission - The signature submission to sync
 * @throws Error if the sync fails
 */
async function syncSignatureSubmission(
  submission: OfflineSignatureSubmission
): Promise<void> {
  const res = await fetch(`/api/signature-documents/${submission.document_id}/sign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      signer_name: submission.signer_name,
      signer_email: submission.signer_email,
      signer_type: submission.signer_type,
      signature_data: submission.signature_data,
      signature_method: submission.signature_method,
      completed_fields: submission.completed_fields,
      field_values: submission.field_values,
      // Include metadata about offline capture
      offline_captured_at: submission.captured_at,
    }),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))

    // Handle specific error cases
    if (res.status === 409) {
      // Document already signed - treat as success (idempotent)
      console.log(
        `[SignatureQueue] Document ${submission.document_id} already signed, treating as success`
      )
      return
    }

    throw new Error(errorData.error || `Server error: ${res.status}`)
  }
}

/**
 * Get count of pending signatures.
 */
export async function getPendingSignatureCount(): Promise<number> {
  const pending = await getPendingSignatures()
  return pending.filter(
    (s) => s.sync_attempts < SIGNATURE_CACHE_CONFIG.MAX_SYNC_RETRIES
  ).length
}

/**
 * Get signatures that have exceeded max retry attempts.
 * These may need manual intervention.
 */
export async function getFailedSignatures(): Promise<OfflineSignatureSubmission[]> {
  const pending = await getPendingSignatures()
  return pending.filter(
    (s) => s.sync_attempts >= SIGNATURE_CACHE_CONFIG.MAX_SYNC_RETRIES
  )
}

/**
 * Retry a failed signature (reset retry count).
 *
 * @param id - The submission ID
 */
export async function retryFailedSignature(id: string): Promise<void> {
  const db = await getEnhancedDB()
  const form = await db.offline_forms.get(id)

  if (form && form.form_type === 'signature') {
    const submission = form.data as unknown as OfflineSignatureSubmission
    submission.sync_attempts = 0
    submission.last_error = undefined
    submission.last_sync_attempt = undefined

    await db.offline_forms.put({
      ...form,
      data: submission as unknown as Record<string, unknown>,
    })
  }
}

/**
 * Clear all synced signatures from the queue.
 * Keeps failed signatures for review.
 */
export async function clearSyncedSignatures(): Promise<number> {
  const db = await getEnhancedDB()
  const allForms = await db.offline_forms.toArray()

  let cleared = 0
  for (const form of allForms) {
    if (form.form_type === 'signature' && form.synced) {
      await db.offline_forms.delete(form.id)
      cleared++
    }
  }

  return cleared
}
