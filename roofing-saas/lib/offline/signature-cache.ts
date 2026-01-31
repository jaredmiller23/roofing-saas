/**
 * Signature Document Cache
 *
 * Handles pre-caching signature documents for offline access.
 * Uses the existing IndexedDB infrastructure (offline_documents store).
 */

import { getEnhancedDB } from './indexed-db'
import type { OfflineSignatureDocument } from './signature-types'
import { SIGNATURE_CACHE_CONFIG } from './signature-types'

/**
 * Cache a signature document for offline access.
 * Fetches the document from the API and stores it in IndexedDB.
 *
 * @param documentId - The signature document ID to cache
 * @param ttlMs - Optional custom TTL in milliseconds (default: 24 hours)
 * @throws Error if the document cannot be fetched or cached
 */
export async function cacheSignatureDocument(
  documentId: string,
  ttlMs: number = SIGNATURE_CACHE_CONFIG.DEFAULT_TTL_MS
): Promise<void> {
  // Fetch the document from the API
  const res = await fetch(`/api/signature-documents/${documentId}/sign`)

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `Failed to fetch document: ${res.status}`)
  }

  const data = await res.json()

  // API returns { success, data: <document> }
  const document = data.data
  if (!document) {
    throw new Error('Invalid response: missing document data')
  }

  const now = Date.now()
  const cacheEntry: OfflineSignatureDocument = {
    id: documentId,
    document_data: document,
    cached_at: now,
    expires_at: now + Math.min(ttlMs, SIGNATURE_CACHE_CONFIG.MAX_TTL_MS),
    synced: true, // Cached documents are considered "synced" (no pending changes)
  }

  // Store in IndexedDB
  const db = await getEnhancedDB()
  await db.put('offline_documents', {
    id: documentId,
    name: document.title,
    type: 'signature_document',
    blob_data: JSON.stringify(cacheEntry),
    size: JSON.stringify(cacheEntry).length,
    timestamp: now,
    synced: true,
  })
}

/**
 * Get a cached signature document.
 * Returns null if not cached or if the cache has expired.
 *
 * @param documentId - The signature document ID to retrieve
 * @returns The cached document or null
 */
export async function getCachedSignatureDocument(
  documentId: string
): Promise<OfflineSignatureDocument | null> {
  const db = await getEnhancedDB()
  const cached = await db.get('offline_documents', documentId)

  if (!cached) {
    return null
  }

  // Parse the stored data
  let cacheEntry: OfflineSignatureDocument
  try {
    cacheEntry = JSON.parse(cached.blob_data)
  } catch {
    // Invalid cache entry, remove it
    await db.delete('offline_documents', documentId)
    return null
  }

  // Check if expired
  if (cacheEntry.expires_at < Date.now()) {
    // Cache expired, remove it
    await db.delete('offline_documents', documentId)
    return null
  }

  return cacheEntry
}

/**
 * Cache all pending signature documents for offline access.
 * Fetches the list of pending documents and caches each one.
 *
 * @returns Number of documents cached
 */
export async function cacheAllPendingDocuments(): Promise<number> {
  // Fetch pending documents list
  const res = await fetch('/api/signature-documents?status=pending')

  if (!res.ok) {
    console.warn('[SignatureCache] Failed to fetch pending documents:', res.status)
    return 0
  }

  const data = await res.json()
  // API returns { success, data: [...documents], pagination: {...} }
  const documents = data.data || []

  let cached = 0

  // Cache each document (in parallel with concurrency limit)
  const CONCURRENCY_LIMIT = 3
  for (let i = 0; i < documents.length; i += CONCURRENCY_LIMIT) {
    const batch = documents.slice(i, i + CONCURRENCY_LIMIT)
    const results = await Promise.allSettled(
      batch.map((doc: { id: string }) => cacheSignatureDocument(doc.id))
    )

    cached += results.filter((r) => r.status === 'fulfilled').length
  }

  // Enforce max cached documents limit
  await enforceMaxCachedDocuments()

  return cached
}

/**
 * Clear expired document cache entries.
 * Should be called periodically (e.g., on app startup or during sync).
 */
export async function clearExpiredDocumentCache(): Promise<number> {
  const db = await getEnhancedDB()
  const now = Date.now()

  // Get all cached documents
  const allDocs = await db.getAll('offline_documents')
  let cleared = 0

  for (const doc of allDocs) {
    // Only process signature documents
    if (doc.type !== 'signature_document') {
      continue
    }

    try {
      const cacheEntry: OfflineSignatureDocument = JSON.parse(doc.blob_data)
      if (cacheEntry.expires_at < now) {
        await db.delete('offline_documents', doc.id)
        cleared++
      }
    } catch {
      // Invalid entry, remove it
      await db.delete('offline_documents', doc.id)
      cleared++
    }
  }

  return cleared
}

/**
 * Remove a specific document from the cache.
 *
 * @param documentId - The document ID to remove
 */
export async function removeCachedDocument(documentId: string): Promise<void> {
  const db = await getEnhancedDB()
  await db.delete('offline_documents', documentId)
}

/**
 * Get all cached signature documents (not expired).
 *
 * @returns Array of cached documents
 */
export async function getAllCachedDocuments(): Promise<OfflineSignatureDocument[]> {
  const db = await getEnhancedDB()
  const allDocs = await db.getAll('offline_documents')
  const now = Date.now()

  const validDocs: OfflineSignatureDocument[] = []

  for (const doc of allDocs) {
    if (doc.type !== 'signature_document') {
      continue
    }

    try {
      const cacheEntry: OfflineSignatureDocument = JSON.parse(doc.blob_data)
      if (cacheEntry.expires_at >= now) {
        validDocs.push(cacheEntry)
      }
    } catch {
      // Skip invalid entries
    }
  }

  return validDocs
}

/**
 * Enforce the maximum number of cached documents.
 * Removes oldest entries if over the limit.
 */
async function enforceMaxCachedDocuments(): Promise<void> {
  const db = await getEnhancedDB()
  const allDocs = await db.getAll('offline_documents')

  // Filter to signature documents only
  const signatureDocs = allDocs.filter((doc) => doc.type === 'signature_document')

  if (signatureDocs.length <= SIGNATURE_CACHE_CONFIG.MAX_CACHED_DOCUMENTS) {
    return
  }

  // Sort by timestamp (oldest first)
  signatureDocs.sort((a, b) => a.timestamp - b.timestamp)

  // Remove oldest entries to get under the limit
  const toRemove = signatureDocs.length - SIGNATURE_CACHE_CONFIG.MAX_CACHED_DOCUMENTS
  for (let i = 0; i < toRemove; i++) {
    await db.delete('offline_documents', signatureDocs[i].id)
  }
}

/**
 * Check if a document is cached and valid.
 *
 * @param documentId - The document ID to check
 * @returns True if cached and not expired
 */
export async function isDocumentCached(documentId: string): Promise<boolean> {
  const cached = await getCachedSignatureDocument(documentId)
  return cached !== null
}

/**
 * Get cache statistics.
 */
export async function getCacheStats(): Promise<{
  total_cached: number
  total_size_bytes: number
  oldest_entry: number | null
  newest_entry: number | null
}> {
  const db = await getEnhancedDB()
  const allDocs = await db.getAll('offline_documents')

  const signatureDocs = allDocs.filter((doc) => doc.type === 'signature_document')

  if (signatureDocs.length === 0) {
    return {
      total_cached: 0,
      total_size_bytes: 0,
      oldest_entry: null,
      newest_entry: null,
    }
  }

  const timestamps = signatureDocs.map((doc) => doc.timestamp)

  return {
    total_cached: signatureDocs.length,
    total_size_bytes: signatureDocs.reduce((sum, doc) => sum + doc.size, 0),
    oldest_entry: Math.min(...timestamps),
    newest_entry: Math.max(...timestamps),
  }
}
