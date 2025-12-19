/**
 * Unit tests for offline signature document cache
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock the indexed-db module before importing the cache
const mockDb = {
  put: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  getAll: vi.fn(),
}

vi.mock('@/lib/offline/indexed-db', () => ({
  getEnhancedDB: vi.fn(() => Promise.resolve(mockDb)),
}))

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import {
  cacheSignatureDocument,
  getCachedSignatureDocument,
  cacheAllPendingDocuments,
  clearExpiredDocumentCache,
  removeCachedDocument,
  getAllCachedDocuments,
  isDocumentCached,
  getCacheStats,
} from '@/lib/offline/signature-cache'

describe('Signature Cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('cacheSignatureDocument()', () => {
    it('should fetch and cache a document', async () => {
      const mockDocument = {
        id: 'doc-123',
        title: 'Service Agreement',
        description: 'Standard agreement',
        document_type: 'service_agreement',
        file_url: null,
        html_content: '<p>Content</p>',
        status: 'pending',
        expires_at: null,
        signature_fields: [],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ document: mockDocument }),
      })
      mockDb.put.mockResolvedValueOnce(undefined)

      await cacheSignatureDocument('doc-123')

      expect(mockFetch).toHaveBeenCalledWith('/api/signature-documents/doc-123/sign')
      expect(mockDb.put).toHaveBeenCalledWith(
        'offline_documents',
        expect.objectContaining({
          id: 'doc-123',
          name: 'Service Agreement',
          type: 'signature_document',
          synced: true,
        })
      )
    })

    it('should throw on fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
      })

      await expect(cacheSignatureDocument('doc-123')).rejects.toThrow('Not found')
    })

    it('should throw on invalid response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}), // Missing document field
      })

      await expect(cacheSignatureDocument('doc-123')).rejects.toThrow(
        'Invalid response: missing document data'
      )
    })

    it('should respect custom TTL', async () => {
      const mockDocument = {
        id: 'doc-123',
        title: 'Test',
        description: '',
        document_type: 'test',
        file_url: null,
        html_content: null,
        status: 'pending',
        expires_at: null,
        signature_fields: [],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ document: mockDocument }),
      })
      mockDb.put.mockResolvedValueOnce(undefined)

      const customTTL = 2 * 60 * 60 * 1000 // 2 hours

      await cacheSignatureDocument('doc-123', customTTL)

      expect(mockDb.put).toHaveBeenCalledWith(
        'offline_documents',
        expect.objectContaining({
          blob_data: expect.stringContaining('"expires_at":'),
        })
      )

      // Verify the expires_at in the blob_data
      const call = mockDb.put.mock.calls[0]
      const blobData = JSON.parse(call[1].blob_data)
      const expectedExpiry = Date.now() + customTTL
      expect(blobData.expires_at).toBe(expectedExpiry)
    })
  })

  describe('getCachedSignatureDocument()', () => {
    it('should return cached document when valid', async () => {
      const cachedEntry = {
        id: 'doc-123',
        document_data: { id: 'doc-123', title: 'Test' },
        cached_at: Date.now() - 1000,
        expires_at: Date.now() + 1000000, // Still valid
        synced: true,
      }

      mockDb.get.mockResolvedValueOnce({
        id: 'doc-123',
        type: 'signature_document',
        blob_data: JSON.stringify(cachedEntry),
      })

      const result = await getCachedSignatureDocument('doc-123')

      expect(result).not.toBeNull()
      expect(result?.document_data.title).toBe('Test')
    })

    it('should return null when not cached', async () => {
      mockDb.get.mockResolvedValueOnce(null)

      const result = await getCachedSignatureDocument('doc-123')

      expect(result).toBeNull()
    })

    it('should return null and delete when expired', async () => {
      const cachedEntry = {
        id: 'doc-123',
        document_data: { id: 'doc-123', title: 'Test' },
        cached_at: Date.now() - 1000000,
        expires_at: Date.now() - 1000, // Expired
        synced: true,
      }

      mockDb.get.mockResolvedValueOnce({
        id: 'doc-123',
        type: 'signature_document',
        blob_data: JSON.stringify(cachedEntry),
      })
      mockDb.delete.mockResolvedValueOnce(undefined)

      const result = await getCachedSignatureDocument('doc-123')

      expect(result).toBeNull()
      expect(mockDb.delete).toHaveBeenCalledWith('offline_documents', 'doc-123')
    })

    it('should return null and delete on invalid JSON', async () => {
      mockDb.get.mockResolvedValueOnce({
        id: 'doc-123',
        type: 'signature_document',
        blob_data: 'invalid json{{{',
      })
      mockDb.delete.mockResolvedValueOnce(undefined)

      const result = await getCachedSignatureDocument('doc-123')

      expect(result).toBeNull()
      expect(mockDb.delete).toHaveBeenCalledWith('offline_documents', 'doc-123')
    })
  })

  describe('cacheAllPendingDocuments()', () => {
    it('should cache multiple documents with concurrency limit', async () => {
      const mockDocuments = [
        { id: 'doc-1' },
        { id: 'doc-2' },
        { id: 'doc-3' },
        { id: 'doc-4' },
      ]

      // First call: list pending documents
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ documents: mockDocuments }),
      })

      // Subsequent calls: fetch each document
      for (const doc of mockDocuments) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              document: { ...doc, title: `Doc ${doc.id}`, signature_fields: [] },
            }),
        })
      }

      mockDb.put.mockResolvedValue(undefined)
      mockDb.getAll.mockResolvedValue([]) // For enforceMaxCachedDocuments

      const cached = await cacheAllPendingDocuments()

      expect(cached).toBe(4)
      expect(mockFetch).toHaveBeenCalledTimes(5) // 1 list + 4 individual
    })

    it('should return 0 when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const cached = await cacheAllPendingDocuments()

      expect(cached).toBe(0)
    })

    it('should handle partial failures gracefully', async () => {
      const mockDocuments = [{ id: 'doc-1' }, { id: 'doc-2' }]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ documents: mockDocuments }),
      })

      // First doc succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            document: { id: 'doc-1', title: 'Doc 1', signature_fields: [] },
          }),
      })

      // Second doc fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
      })

      mockDb.put.mockResolvedValue(undefined)
      mockDb.getAll.mockResolvedValue([])

      const cached = await cacheAllPendingDocuments()

      expect(cached).toBe(1)
    })
  })

  describe('clearExpiredDocumentCache()', () => {
    it('should remove expired signature documents', async () => {
      const now = Date.now()
      const mockDocs = [
        {
          id: 'doc-1',
          type: 'signature_document',
          blob_data: JSON.stringify({ expires_at: now - 1000 }), // Expired
        },
        {
          id: 'doc-2',
          type: 'signature_document',
          blob_data: JSON.stringify({ expires_at: now + 100000 }), // Valid
        },
        {
          id: 'doc-3',
          type: 'other_document', // Not a signature document
          blob_data: JSON.stringify({ expires_at: now - 1000 }),
        },
        {
          id: 'doc-4',
          type: 'signature_document',
          blob_data: 'invalid json', // Invalid
        },
      ]

      mockDb.getAll.mockResolvedValueOnce(mockDocs)
      mockDb.delete.mockResolvedValue(undefined)

      const cleared = await clearExpiredDocumentCache()

      expect(cleared).toBe(2) // doc-1 (expired) + doc-4 (invalid)
      expect(mockDb.delete).toHaveBeenCalledWith('offline_documents', 'doc-1')
      expect(mockDb.delete).toHaveBeenCalledWith('offline_documents', 'doc-4')
    })
  })

  describe('removeCachedDocument()', () => {
    it('should delete the document from cache', async () => {
      mockDb.delete.mockResolvedValueOnce(undefined)

      await removeCachedDocument('doc-123')

      expect(mockDb.delete).toHaveBeenCalledWith('offline_documents', 'doc-123')
    })
  })

  describe('getAllCachedDocuments()', () => {
    it('should return only valid, non-expired signature documents', async () => {
      const now = Date.now()
      const mockDocs = [
        {
          id: 'doc-1',
          type: 'signature_document',
          blob_data: JSON.stringify({
            id: 'doc-1',
            expires_at: now + 100000,
            document_data: { title: 'Doc 1' },
          }),
        },
        {
          id: 'doc-2',
          type: 'signature_document',
          blob_data: JSON.stringify({
            id: 'doc-2',
            expires_at: now - 1000, // Expired
            document_data: { title: 'Doc 2' },
          }),
        },
        {
          id: 'doc-3',
          type: 'other_type',
          blob_data: '{}',
        },
      ]

      mockDb.getAll.mockResolvedValueOnce(mockDocs)

      const docs = await getAllCachedDocuments()

      expect(docs).toHaveLength(1)
      expect(docs[0].id).toBe('doc-1')
    })
  })

  describe('isDocumentCached()', () => {
    it('should return true when document is cached and valid', async () => {
      const cachedEntry = {
        id: 'doc-123',
        document_data: {},
        cached_at: Date.now(),
        expires_at: Date.now() + 100000,
        synced: true,
      }

      mockDb.get.mockResolvedValueOnce({
        id: 'doc-123',
        type: 'signature_document',
        blob_data: JSON.stringify(cachedEntry),
      })

      const isCached = await isDocumentCached('doc-123')

      expect(isCached).toBe(true)
    })

    it('should return false when not cached', async () => {
      mockDb.get.mockResolvedValueOnce(null)

      const isCached = await isDocumentCached('doc-123')

      expect(isCached).toBe(false)
    })
  })

  describe('getCacheStats()', () => {
    it('should return correct statistics', async () => {
      const now = Date.now()
      const mockDocs = [
        {
          id: 'doc-1',
          type: 'signature_document',
          size: 1000,
          timestamp: now - 5000,
        },
        {
          id: 'doc-2',
          type: 'signature_document',
          size: 2000,
          timestamp: now - 1000,
        },
        {
          id: 'doc-3',
          type: 'other_type',
          size: 500,
          timestamp: now,
        },
      ]

      mockDb.getAll.mockResolvedValueOnce(mockDocs)

      const stats = await getCacheStats()

      expect(stats.total_cached).toBe(2)
      expect(stats.total_size_bytes).toBe(3000)
      expect(stats.oldest_entry).toBe(now - 5000)
      expect(stats.newest_entry).toBe(now - 1000)
    })

    it('should handle empty cache', async () => {
      mockDb.getAll.mockResolvedValueOnce([])

      const stats = await getCacheStats()

      expect(stats.total_cached).toBe(0)
      expect(stats.total_size_bytes).toBe(0)
      expect(stats.oldest_entry).toBeNull()
      expect(stats.newest_entry).toBeNull()
    })
  })
})
