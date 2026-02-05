/**
 * Perfect Packet Validation Tests
 *
 * Tests the ASR workflow requirement that 4 items must be present
 * before a project can advance to production:
 * 1. Photos of home/damage
 * 2. Measurement report
 * 3. Insurance estimate
 * 4. Job submission form
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  validatePerfectPacket,
  formatPerfectPacketError,
  requiresPerfectPacketValidation,
  validateCompleteTransitionAsync,
  PERFECT_PACKET_REQUIREMENTS,
} from '@/lib/pipeline/validation'

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
}

describe('Perfect Packet Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('PERFECT_PACKET_REQUIREMENTS', () => {
    it('should have exactly 4 requirements', () => {
      expect(PERFECT_PACKET_REQUIREMENTS).toHaveLength(4)
    })

    it('should include all required categories', () => {
      const categories = PERFECT_PACKET_REQUIREMENTS.map(r => r.category)
      expect(categories).toContain('photos-damage')
      expect(categories).toContain('measurements')
      expect(categories).toContain('insurance-estimate')
      expect(categories).toContain('job-submission')
    })
  })

  describe('requiresPerfectPacketValidation', () => {
    it('should return true for won -> production transition', () => {
      expect(requiresPerfectPacketValidation('won', 'production')).toBe(true)
    })

    it('should return false for other transitions', () => {
      expect(requiresPerfectPacketValidation('prospect', 'qualified')).toBe(false)
      expect(requiresPerfectPacketValidation('qualified', 'quote_sent')).toBe(false)
      expect(requiresPerfectPacketValidation('negotiation', 'won')).toBe(false)
      expect(requiresPerfectPacketValidation('production', 'complete')).toBe(false)
    })
  })

  describe('validatePerfectPacket', () => {
    it('should return complete when all 4 categories have files', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  { file_category: 'photos-damage' },
                  { file_category: 'measurements' },
                  { file_category: 'insurance-estimate' },
                  { file_category: 'job-submission' },
                ],
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await validatePerfectPacket('test-project-id', mockSupabase as any)

      expect(result.isComplete).toBe(true)
      expect(result.missing).toHaveLength(0)
      expect(result.present).toHaveLength(4)
    })

    it('should return incomplete when categories are missing', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  { file_category: 'photos-damage' },
                  { file_category: 'measurements' },
                  // Missing: insurance-estimate, job-submission
                ],
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await validatePerfectPacket('test-project-id', mockSupabase as any)

      expect(result.isComplete).toBe(false)
      expect(result.missing).toHaveLength(2)
      expect(result.present).toHaveLength(2)
      expect(result.missing.map(m => m.category)).toContain('insurance-estimate')
      expect(result.missing.map(m => m.category)).toContain('job-submission')
    })

    it('should return incomplete when no files exist', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await validatePerfectPacket('test-project-id', mockSupabase as any)

      expect(result.isComplete).toBe(false)
      expect(result.missing).toHaveLength(4)
      expect(result.present).toHaveLength(0)
    })

    it('should count multiple files per category correctly', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  { file_category: 'photos-damage' },
                  { file_category: 'photos-damage' },
                  { file_category: 'photos-damage' },
                  { file_category: 'measurements' },
                  { file_category: 'insurance-estimate' },
                  { file_category: 'job-submission' },
                ],
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await validatePerfectPacket('test-project-id', mockSupabase as any)

      expect(result.isComplete).toBe(true)
      expect(result.fileCounts['photos-damage']).toBe(3)
      expect(result.fileCounts['measurements']).toBe(1)
    })

    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
              }),
            }),
          }),
        }),
      })

      const result = await validatePerfectPacket('test-project-id', mockSupabase as any)

      // Should fail safely - return as if nothing present
      expect(result.isComplete).toBe(false)
      expect(result.missing).toHaveLength(4)
    })
  })

  describe('formatPerfectPacketError', () => {
    it('should return empty string when complete', () => {
      const result = {
        isComplete: true,
        missing: [],
        present: PERFECT_PACKET_REQUIREMENTS,
        fileCounts: {},
      }

      expect(formatPerfectPacketError(result)).toBe('')
    })

    it('should list missing items when incomplete', () => {
      const result = {
        isComplete: false,
        missing: [
          { category: 'insurance-estimate' as const, label: 'Insurance Estimate', description: '' },
          { category: 'job-submission' as const, label: 'Job Submission Form', description: '' },
        ],
        present: [],
        fileCounts: {},
      }

      const error = formatPerfectPacketError(result)

      expect(error).toContain('Perfect Packet incomplete')
      expect(error).toContain('Insurance Estimate')
      expect(error).toContain('Job Submission Form')
    })
  })

  describe('validateCompleteTransitionAsync', () => {
    it('should validate Perfect Packet for won -> production', async () => {
      // Mock: all files present
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  { file_category: 'photos-damage' },
                  { file_category: 'measurements' },
                  { file_category: 'insurance-estimate' },
                  { file_category: 'job-submission' },
                ],
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await validateCompleteTransitionAsync(
        'won',
        'production',
        { approved_value: 10000 },
        'test-project-id',
        mockSupabase as any
      )

      expect(result.valid).toBe(true)
      expect(result.perfectPacketResult?.isComplete).toBe(true)
    })

    it('should reject won -> production when packet incomplete', async () => {
      // Mock: missing files
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  { file_category: 'photos-damage' },
                ],
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await validateCompleteTransitionAsync(
        'won',
        'production',
        { approved_value: 10000 },
        'test-project-id',
        mockSupabase as any
      )

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Perfect Packet incomplete')
      expect(result.perfectPacketResult?.missing).toHaveLength(3)
    })

    it('should skip Perfect Packet validation with admin override', async () => {
      // Mock: missing files (but should be skipped)
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await validateCompleteTransitionAsync(
        'won',
        'production',
        { approved_value: 10000 },
        'test-project-id',
        mockSupabase as any,
        { skipPerfectPacket: true }
      )

      expect(result.valid).toBe(true)
      expect(result.perfectPacketResult).toBeUndefined()
    })

    it('should not validate Perfect Packet for non-production transitions', async () => {
      const result = await validateCompleteTransitionAsync(
        'prospect',
        'qualified',
        {},
        'test-project-id',
        mockSupabase as any
      )

      expect(result.valid).toBe(true)
      expect(result.perfectPacketResult).toBeUndefined()
      // Supabase should not have been called
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })
  })
})
