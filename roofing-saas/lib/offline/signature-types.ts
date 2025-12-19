/**
 * Offline Signature Types
 *
 * Type definitions for offline signature document caching and signature submission queuing.
 * These types integrate with the existing offline infrastructure (IndexedDB, sync manager).
 */

import type { SignatureFieldPlacement } from '@/components/signatures'

/**
 * Cached signature document for offline access.
 * Stored in IndexedDB 'offline_documents' store.
 */
export interface OfflineSignatureDocument {
  /** Document ID (primary key) */
  id: string

  /** Cached API response data from GET /api/signature-documents/[id]/sign */
  document_data: {
    id: string
    title: string
    description: string
    document_type: string
    file_url: string | null
    html_content: string | null
    status: string
    expires_at: string | null
    requires_customer_signature: boolean
    requires_company_signature: boolean
    signature_fields: SignatureFieldPlacement[]
    project?: { name: string }
    signatures?: Array<{ signer_type: string }>
  }

  /** When this document was cached (timestamp) */
  cached_at: number

  /** When this cache entry expires (timestamp) */
  expires_at: number

  /** Whether this is marked for sync (unused for cached docs, but consistent with pattern) */
  synced: boolean
}

/**
 * Queued signature submission for offline sync.
 * Stored in IndexedDB 'offline_forms' store with form_type = 'signature'.
 */
export interface OfflineSignatureSubmission {
  /** Unique submission ID (generated client-side) */
  id: string

  /** The document being signed */
  document_id: string

  /** Signer information */
  signer_name: string
  signer_email: string
  signer_type: 'customer' | 'company' | 'witness'

  /** Signature data - base64 encoded PNG */
  signature_data: string

  /** How the signature was captured */
  signature_method: 'draw' | 'type' | 'upload'

  /** IDs of completed fields */
  completed_fields: string[]

  /** Field values for non-signature fields (text, date, checkbox, etc.) */
  field_values?: Record<string, string | boolean>

  /** When the signature was captured offline (timestamp) */
  captured_at: number

  /** Whether this submission has been synced to the server */
  synced: boolean

  /** Number of sync attempts */
  sync_attempts: number

  /** Last sync error message, if any */
  last_error?: string

  /** Timestamp of last sync attempt */
  last_sync_attempt?: number
}

/**
 * Input type for queuing a new offline signature (without auto-generated fields)
 */
export type OfflineSignatureInput = Omit<
  OfflineSignatureSubmission,
  'id' | 'synced' | 'sync_attempts' | 'last_error' | 'last_sync_attempt'
>

/**
 * Cache configuration for signature documents
 */
export const SIGNATURE_CACHE_CONFIG = {
  /** Default cache duration: 24 hours */
  DEFAULT_TTL_MS: 24 * 60 * 60 * 1000,

  /** Maximum cache duration: 7 days */
  MAX_TTL_MS: 7 * 24 * 60 * 60 * 1000,

  /** Maximum number of cached documents per user */
  MAX_CACHED_DOCUMENTS: 50,

  /** Maximum sync retry attempts before giving up */
  MAX_SYNC_RETRIES: 10,

  /** Base delay for exponential backoff (ms) */
  RETRY_BASE_DELAY_MS: 1000,

  /** Maximum delay between retries (ms) */
  RETRY_MAX_DELAY_MS: 5 * 60 * 1000,
} as const

/**
 * Result of processing the signature sync queue
 */
export interface SignatureQueueResult {
  /** Number of signatures successfully synced */
  success: number

  /** Number of signatures that failed to sync */
  failed: number

  /** Number of signatures skipped (max retries exceeded) */
  skipped: number

  /** Error details for failed submissions */
  errors: Array<{
    submission_id: string
    document_id: string
    error: string
  }>
}
