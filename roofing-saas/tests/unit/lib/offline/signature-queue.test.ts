/**
 * Unit tests for offline signature queue
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'

// Mock the indexed-db module before importing the queue
const mockDb = {
  put: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  getAll: vi.fn(),
  getAllFromIndex: vi.fn(),
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

      mockDb.put.mockResolvedValueOnce(undefined)

      const id = await queueOfflineSignature(submission)

      expect(id).toMatch(/^sig_\d+_[a-z0-9]+$/)
      expect(mockDb.put).toHaveBeenCalledWith(
        'offline_forms',
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
      const mockForms = [
        {
          id: 'sig_1',
          form_type: 'signature',
          data: { id: 'sig_1', document_id: 'doc-1', synced: false, sync_attempts: 0 },
          synced: false,
        },
        {
          id: 'form_2',
          form_type: 'inspection', // Not a signature
          data: {},
          synced: false,
        },
        {
          id: 'sig_2',
          form_type: 'signature',
          data: { id: 'sig_2', document_id: 'doc-2', synced: false, sync_attempts: 0 },
          synced: false,
        },
      ]

      mockDb.getAllFromIndex.mockResolvedValueOnce(mockForms)

      const pending = await getPendingSignatures()

      expect(pending).toHaveLength(2)
      expect(pending[0].document_id).toBe('doc-1')
      expect(pending[1].document_id).toBe('doc-2')
    })

    it('should return empty array when no pending signatures', async () => {
      mockDb.getAllFromIndex.mockResolvedValueOnce([])

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
      const mockForm = {
        id: 'sig_123',
        form_type: 'signature',
        data: { id: 'sig_123', synced: false },
        synced: false,
      }

      mockDb.get.mockResolvedValueOnce(mockForm)
      mockDb.put.mockResolvedValueOnce(undefined)

      await markSignatureSynced('sig_123')

      expect(mockDb.put).toHaveBeenCalledWith(
        'offline_forms',
        expect.objectContaining({
          synced: true,
          data: expect.objectContaining({ synced: true }),
        })
      )
    })
  })

  describe('markSignatureFailed()', () => {
    it('should increment retry count and set error', async () => {
      const mockForm = {
        id: 'sig_123',
        form_type: 'signature',
        data: { id: 'sig_123', sync_attempts: 2, synced: false },
      }

      mockDb.get.mockResolvedValueOnce(mockForm)
      mockDb.put.mockResolvedValueOnce(undefined)

      await markSignatureFailed('sig_123', 'Network error')

      expect(mockDb.put).toHaveBeenCalledWith(
        'offline_forms',
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
      mockDb.delete.mockResolvedValueOnce(undefined)

      await removeSignatureFromQueue('sig_123')

      expect(mockDb.delete).toHaveBeenCalledWith('offline_forms', 'sig_123')
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
      const mockForms = [
        {
          id: 'sig_1',
          form_type: 'signature',
          data: { id: 'sig_1', document_id: 'doc-1', sync_attempts: 10, synced: false },
          synced: false,
        },
      ]

      mockDb.getAllFromIndex.mockResolvedValueOnce(mockForms)

      const result = await processSignatureQueue()

      expect(result.skipped).toBe(1)
      expect(result.success).toBe(0)
      expect(result.failed).toBe(0)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should successfully sync valid signatures', async () => {
      const mockForms = [
        {
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
        },
      ]

      mockDb.getAllFromIndex.mockResolvedValueOnce(mockForms)
      mockDb.get.mockResolvedValue(mockForms[0])
      mockDb.put.mockResolvedValue(undefined)

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
      const mockForms = [
        {
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
        },
      ]

      mockDb.getAllFromIndex.mockResolvedValueOnce(mockForms)
      mockDb.get.mockResolvedValue(mockForms[0])
      mockDb.put.mockResolvedValue(undefined)

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
      const mockForms = [
        {
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
        },
      ]

      mockDb.getAllFromIndex.mockResolvedValueOnce(mockForms)
      mockDb.get.mockResolvedValue(mockForms[0])
      mockDb.put.mockResolvedValue(undefined)

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
      const mockForms = [
        {
          id: 'sig_1',
          form_type: 'signature',
          data: { id: 'sig_1', sync_attempts: 0, synced: false },
          synced: false,
        },
        {
          id: 'sig_2',
          form_type: 'signature',
          data: { id: 'sig_2', sync_attempts: 10, synced: false }, // Exceeded max
          synced: false,
        },
        {
          id: 'sig_3',
          form_type: 'signature',
          data: { id: 'sig_3', sync_attempts: 5, synced: false },
          synced: false,
        },
      ]

      mockDb.getAllFromIndex.mockResolvedValueOnce(mockForms)

      const count = await getPendingSignatureCount()

      expect(count).toBe(2)
    })
  })

  describe('getFailedSignatures()', () => {
    it('should return only signatures that exceeded max retries', async () => {
      const mockForms = [
        {
          id: 'sig_1',
          form_type: 'signature',
          data: { id: 'sig_1', sync_attempts: 0, synced: false },
          synced: false,
        },
        {
          id: 'sig_2',
          form_type: 'signature',
          data: { id: 'sig_2', sync_attempts: 10, synced: false },
          synced: false,
        },
      ]

      mockDb.getAllFromIndex.mockResolvedValueOnce(mockForms)

      const failed = await getFailedSignatures()

      expect(failed).toHaveLength(1)
      expect(failed[0].id).toBe('sig_2')
    })
  })

  describe('retryFailedSignature()', () => {
    it('should reset sync attempts and clear error', async () => {
      const mockForm = {
        id: 'sig_123',
        form_type: 'signature',
        data: {
          id: 'sig_123',
          sync_attempts: 10,
          last_error: 'Network error',
          last_sync_attempt: Date.now(),
        },
      }

      mockDb.get.mockResolvedValueOnce(mockForm)
      mockDb.put.mockResolvedValueOnce(undefined)

      await retryFailedSignature('sig_123')

      expect(mockDb.put).toHaveBeenCalledWith(
        'offline_forms',
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
      const mockForms = [
        { id: 'sig_1', form_type: 'signature', synced: true },
        { id: 'sig_2', form_type: 'signature', synced: false },
        { id: 'form_3', form_type: 'inspection', synced: true },
        { id: 'sig_4', form_type: 'signature', synced: true },
      ]

      mockDb.getAll.mockResolvedValueOnce(mockForms)
      mockDb.delete.mockResolvedValue(undefined)

      const cleared = await clearSyncedSignatures()

      expect(cleared).toBe(2)
      expect(mockDb.delete).toHaveBeenCalledTimes(2)
      expect(mockDb.delete).toHaveBeenCalledWith('offline_forms', 'sig_1')
      expect(mockDb.delete).toHaveBeenCalledWith('offline_forms', 'sig_4')
    })
  })
})
