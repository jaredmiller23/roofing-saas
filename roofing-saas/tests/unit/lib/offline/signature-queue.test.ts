/**
 * Unit tests for offline signature queue
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'

// In-memory store for testing
let mockStore: Map<string, Record<string, unknown>> = new Map()

// Helper to add data to mock store
function addToMockStore(data: Record<string, unknown>) {
  mockStore.set(data.id as string, data)
}

// Mock Dexie-style table API
const mockOfflineForms = {
  put: vi.fn((obj: Record<string, unknown>) => {
    mockStore.set(obj.id as string, obj)
    return Promise.resolve()
  }),
  get: vi.fn((id: string) => {
    return Promise.resolve(mockStore.get(id))
  }),
  delete: vi.fn((id: string) => {
    mockStore.delete(id)
    return Promise.resolve()
  }),
  toArray: vi.fn(() => {
    return Promise.resolve(Array.from(mockStore.values()))
  }),
  where: vi.fn((field: string) => ({
    equals: (value: unknown) => ({
      toArray: () => {
        // Handle synced field specially (stored as boolean but queried as 0/1)
        const results = Array.from(mockStore.values()).filter((item) => {
          if (field === 'synced') {
            return item[field] === (value === 1 ? true : false) || item[field] === value
          }
          return item[field] === value
        })
        return Promise.resolve(results)
      },
    }),
  })),
}

const mockDb = {
  offline_forms: mockOfflineForms,
  // Backwards-compatible aliases for old test patterns
  get: mockOfflineForms.get,
  put: mockOfflineForms.put,
  delete: mockOfflineForms.delete,
  getAll: mockOfflineForms.toArray,
  getAllFromIndex: vi.fn((_store: string, _index: string, value: unknown) => {
    // Filter by synced value (used for 'synced' index)
    const results = Array.from(mockStore.values()).filter(
      (item) => item.synced === value
    )
    return Promise.resolve(results)
  }),
}

vi.mock('@/lib/offline/indexed-db', () => ({
  getEnhancedDB: vi.fn(() => Promise.resolve(mockDb)),
}))

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import {
  queueOfflineSignature,
  getPendingSignatures,
  getSignatureSubmission,
  markSignatureSynced,
  markSignatureFailed,
  removeSignatureFromQueue,
  processSignatureQueue,
  getPendingSignatureCount,
  getFailedSignatures,
  retryFailedSignature,
  clearSyncedSignatures,
} from '@/lib/offline/signature-queue'

import type { OfflineSignatureInput } from '@/lib/offline/signature-types'

describe('Signature Queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.clear()
  })

  describe('queueOfflineSignature()', () => {
    it('should store a signature submission in IndexedDB', async () => {
      const submission: OfflineSignatureInput = {
        document_id: 'doc-123',
        signer_name: 'John Doe',
        signer_email: 'john@example.com',
        signer_type: 'customer',
        signature_data: 'base64-signature-data',
        signature_method: 'draw',
        completed_fields: ['field-1', 'field-2'],
        captured_at: Date.now(),
      }

      const id = await queueOfflineSignature(submission)

      expect(id).toMatch(/^sig_\d+_[a-z0-9]+$/)
      expect(mockOfflineForms.put).toHaveBeenCalledWith(
        expect.objectContaining({
          form_type: 'signature',
          synced: false,
          data: expect.objectContaining({
            document_id: 'doc-123',
            signer_name: 'John Doe',
            synced: false,
            sync_attempts: 0,
          }),
        })
      )
    })
  })

  describe('getPendingSignatures()', () => {
    it('should return only unsynced signature forms', async () => {
      // Add test data to mock store
      addToMockStore({
        id: 'sig_1',
        form_type: 'signature',
        data: { id: 'sig_1', document_id: 'doc-1', synced: false, sync_attempts: 0 },
        synced: false,
      })
      addToMockStore({
        id: 'form_2',
        form_type: 'inspection', // Not a signature
        data: {},
        synced: false,
      })
      addToMockStore({
        id: 'sig_2',
        form_type: 'signature',
        data: { id: 'sig_2', document_id: 'doc-2', synced: false, sync_attempts: 0 },
        synced: false,
      })

      const pending = await getPendingSignatures()

      expect(pending).toHaveLength(2)
      expect(pending[0].document_id).toBe('doc-1')
      expect(pending[1].document_id).toBe('doc-2')
    })

    it('should return empty array when no pending signatures', async () => {
      // Empty store - no data added

      const pending = await getPendingSignatures()

      expect(pending).toHaveLength(0)
    })
  })

  describe('getSignatureSubmission()', () => {
    it('should return the submission when found', async () => {
      const mockForm = {
        id: 'sig_123',
        form_type: 'signature',
        data: { id: 'sig_123', document_id: 'doc-1', signer_name: 'Jane' },
      }

      mockDb.get.mockResolvedValueOnce(mockForm)

      const submission = await getSignatureSubmission('sig_123')

      expect(submission).not.toBeNull()
      expect(submission?.signer_name).toBe('Jane')
    })

    it('should return null when not found', async () => {
      mockDb.get.mockResolvedValueOnce(null)

      const submission = await getSignatureSubmission('nonexistent')

      expect(submission).toBeNull()
    })

    it('should return null for non-signature forms', async () => {
      const mockForm = {
        id: 'form_123',
        form_type: 'inspection', // Not a signature
        data: {},
      }

      mockDb.get.mockResolvedValueOnce(mockForm)

      const submission = await getSignatureSubmission('form_123')

      expect(submission).toBeNull()
    })
  })

  describe('markSignatureSynced()', () => {
    it('should update the form and submission as synced', async () => {
      // Add form to mock store
      addToMockStore({
        id: 'sig_123',
        form_type: 'signature',
        data: { id: 'sig_123', synced: false },
        synced: false,
      })

      await markSignatureSynced('sig_123')

      expect(mockOfflineForms.put).toHaveBeenCalledWith(
        expect.objectContaining({
          synced: true,
          data: expect.objectContaining({ synced: true }),
        })
      )
    })
  })

  describe('markSignatureFailed()', () => {
    it('should increment retry count and set error', async () => {
      // Add form to mock store
      addToMockStore({
        id: 'sig_123',
        form_type: 'signature',
        data: { id: 'sig_123', sync_attempts: 2, synced: false },
      })

      await markSignatureFailed('sig_123', 'Network error')

      expect(mockOfflineForms.put).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sync_attempts: 3,
            last_error: 'Network error',
          }),
        })
      )
    })
  })

  describe('removeSignatureFromQueue()', () => {
    it('should delete the form from IndexedDB', async () => {
      await removeSignatureFromQueue('sig_123')

      expect(mockOfflineForms.delete).toHaveBeenCalledWith('sig_123')
    })
  })

  describe('processSignatureQueue()', () => {
    it('should return early when queue is empty', async () => {
      mockDb.getAllFromIndex.mockResolvedValueOnce([])

      const result = await processSignatureQueue()

      expect(result).toEqual({ success: 0, failed: 0, skipped: 0, errors: [] })
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should skip signatures that exceeded max retries', async () => {
      addToMockStore({
        id: 'sig_1',
        form_type: 'signature',
        data: { id: 'sig_1', document_id: 'doc-1', sync_attempts: 10, synced: false },
        synced: false,
      })

      const result = await processSignatureQueue()

      expect(result.skipped).toBe(1)
      expect(result.success).toBe(0)
      expect(result.failed).toBe(0)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should successfully sync valid signatures', async () => {
      addToMockStore({
        id: 'sig_1',
        form_type: 'signature',
        data: {
          id: 'sig_1',
          document_id: 'doc-1',
          signer_name: 'John',
          signer_email: 'john@test.com',
          signer_type: 'customer',
          signature_data: 'base64data',
          signature_method: 'draw',
          completed_fields: [],
          sync_attempts: 0,
          synced: false,
        },
        synced: false,
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      const result = await processSignatureQueue()

      expect(result.success).toBe(1)
      expect(result.failed).toBe(0)
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/signature-documents/doc-1/sign',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })

    it('should handle 409 conflict as success (already signed)', async () => {
      addToMockStore({
        id: 'sig_1',
        form_type: 'signature',
        data: {
          id: 'sig_1',
          document_id: 'doc-1',
          signer_name: 'John',
          signer_email: 'john@test.com',
          signer_type: 'customer',
          signature_data: 'base64data',
          signature_method: 'draw',
          completed_fields: [],
          sync_attempts: 0,
          synced: false,
        },
        synced: false,
      })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ error: 'Already signed' }),
      })

      const result = await processSignatureQueue()

      // 409 is treated as success (idempotent)
      expect(result.success).toBe(1)
      expect(result.failed).toBe(0)
    })

    it('should handle API errors gracefully', async () => {
      addToMockStore({
        id: 'sig_1',
        form_type: 'signature',
        data: {
          id: 'sig_1',
          document_id: 'doc-1',
          signer_name: 'John',
          signer_email: 'john@test.com',
          signer_type: 'customer',
          signature_data: 'base64data',
          signature_method: 'draw',
          completed_fields: [],
          sync_attempts: 0,
          synced: false,
        },
        synced: false,
      })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' }),
      })

      const result = await processSignatureQueue()

      expect(result.failed).toBe(1)
      expect(result.success).toBe(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toBe('Server error')
    })
  })

  describe('getPendingSignatureCount()', () => {
    it('should count only signatures below max retries', async () => {
      addToMockStore({
        id: 'sig_1',
        form_type: 'signature',
        data: { id: 'sig_1', sync_attempts: 0, synced: false },
        synced: false,
      })
      addToMockStore({
        id: 'sig_2',
        form_type: 'signature',
        data: { id: 'sig_2', sync_attempts: 10, synced: false }, // Exceeded max
        synced: false,
      })
      addToMockStore({
        id: 'sig_3',
        form_type: 'signature',
        data: { id: 'sig_3', sync_attempts: 5, synced: false },
        synced: false,
      })

      const count = await getPendingSignatureCount()

      expect(count).toBe(2)
    })
  })

  describe('getFailedSignatures()', () => {
    it('should return only signatures that exceeded max retries', async () => {
      addToMockStore({
        id: 'sig_1',
        form_type: 'signature',
        data: { id: 'sig_1', sync_attempts: 0, synced: false },
        synced: false,
      })
      addToMockStore({
        id: 'sig_2',
        form_type: 'signature',
        data: { id: 'sig_2', sync_attempts: 10, synced: false },
        synced: false,
      })

      const failed = await getFailedSignatures()

      expect(failed).toHaveLength(1)
      expect(failed[0].id).toBe('sig_2')
    })
  })

  describe('retryFailedSignature()', () => {
    it('should reset sync attempts and clear error', async () => {
      addToMockStore({
        id: 'sig_123',
        form_type: 'signature',
        data: {
          id: 'sig_123',
          sync_attempts: 10,
          last_error: 'Network error',
          last_sync_attempt: Date.now(),
        },
      })

      await retryFailedSignature('sig_123')

      expect(mockOfflineForms.put).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sync_attempts: 0,
            last_error: undefined,
            last_sync_attempt: undefined,
          }),
        })
      )
    })
  })

  describe('clearSyncedSignatures()', () => {
    it('should remove only synced signature forms', async () => {
      addToMockStore({ id: 'sig_1', form_type: 'signature', synced: true })
      addToMockStore({ id: 'sig_2', form_type: 'signature', synced: false })
      addToMockStore({ id: 'form_3', form_type: 'inspection', synced: true })
      addToMockStore({ id: 'sig_4', form_type: 'signature', synced: true })

      const cleared = await clearSyncedSignatures()

      expect(cleared).toBe(2)
      expect(mockOfflineForms.delete).toHaveBeenCalledTimes(2)
      expect(mockOfflineForms.delete).toHaveBeenCalledWith('sig_1')
      expect(mockOfflineForms.delete).toHaveBeenCalledWith('sig_4')
    })
  })
})
