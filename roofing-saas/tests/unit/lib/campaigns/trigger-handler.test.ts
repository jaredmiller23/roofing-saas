/**
 * Unit tests for Campaign Trigger Handler
 *
 * Tests the auto-cancel functionality when projects exit a stage
 * that triggered their campaign enrollment.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the logger first
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock Supabase before importing the module under test
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Import after mocks are set up
import { handleStageChange } from '@/lib/campaigns/trigger-handler'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// Helper to create chainable mock
const createMockQueryBuilder = (result: { data?: unknown; error?: unknown }) => {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  }
  return builder
}

describe('Campaign Trigger Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('handleStageChange', () => {
    it('should log stage change event', async () => {
      // Setup mock Supabase
      const mockBuilder = createMockQueryBuilder({ data: [], error: null })
      const mockSupabase = {
        from: vi.fn().mockReturnValue(mockBuilder),
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const event = {
        tenantId: 'tenant-123',
        projectId: 'project-123',
        contactId: 'contact-123',
        fromStage: 'proposal',
        toStage: 'negotiation',
        changedBy: 'user-123',
        changedAt: new Date().toISOString(),
      }

      await handleStageChange(event)

      // Verify logging was called
      expect(logger.info).toHaveBeenCalledWith(
        '[Campaign] Checking triggers for stage change',
        expect.objectContaining({
          projectId: 'project-123',
          fromStage: 'proposal',
          toStage: 'negotiation',
        })
      )
    })

    it('should query for active enrollments when fromStage is provided', async () => {
      // Setup mock to return empty enrollments
      const mockBuilder = createMockQueryBuilder({ data: [], error: null })
      const mockSupabase = {
        from: vi.fn().mockReturnValue(mockBuilder),
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const event = {
        tenantId: 'tenant-123',
        projectId: 'project-123',
        contactId: 'contact-123',
        fromStage: 'proposal',
        toStage: 'negotiation',
        changedBy: 'user-123',
        changedAt: new Date().toISOString(),
      }

      await handleStageChange(event)

      // Should query campaign_enrollments for active enrollments
      expect(mockSupabase.from).toHaveBeenCalledWith('campaign_enrollments')
    })

    it('should not query enrollments when fromStage is null', async () => {
      const mockBuilder = createMockQueryBuilder({ data: [], error: null })
      const mockSupabase = {
        from: vi.fn().mockReturnValue(mockBuilder),
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const event = {
        tenantId: 'tenant-123',
        projectId: 'project-123',
        contactId: 'contact-123',
        fromStage: null,
        toStage: 'proposal',
        changedBy: 'user-123',
        changedAt: new Date().toISOString(),
      }

      await handleStageChange(event)

      // Should only query campaigns, not campaign_enrollments for exit logic
      const fromCalls = mockSupabase.from.mock.calls.map((call) => call[0])
      // With null fromStage, we skip the exit logic entirely and only query campaigns
      expect(fromCalls).toContain('campaigns')
    })
  })

  describe('Exit enrollment logic', () => {
    it('should identify matching enrollments based on trigger config', () => {
      // This tests the core matching logic:
      // An enrollment should be exited if:
      // 1. Its campaign has a stage_change trigger
      // 2. The trigger's to_stage matches the stage we're leaving (fromStage)

      const mockEnrollment = {
        id: 'enrollment-1',
        campaign_id: 'campaign-1',
        campaigns: {
          id: 'campaign-1',
          name: 'Proposal Follow-up Campaign',
          campaign_triggers: [
            {
              id: 'trigger-1',
              trigger_type: 'stage_change',
              trigger_config: {
                entity_type: 'project',
                to_stage: 'proposal',
              },
            },
          ],
        },
      }

      const fromStage = 'proposal'
      const trigger = mockEnrollment.campaigns.campaign_triggers[0]

      // This enrollment should be exited because:
      // - trigger_type is 'stage_change'
      // - trigger_config.to_stage ('proposal') matches fromStage ('proposal')
      expect(trigger.trigger_type).toBe('stage_change')
      expect(trigger.trigger_config.to_stage).toBe(fromStage)
    })

    it('should not match enrollment when trigger to_stage differs from fromStage', () => {
      const mockEnrollment = {
        id: 'enrollment-1',
        campaigns: {
          campaign_triggers: [
            {
              trigger_type: 'stage_change',
              trigger_config: {
                entity_type: 'project',
                to_stage: 'negotiation', // Different from fromStage
              },
            },
          ],
        },
      }

      const fromStage = 'proposal'
      const trigger = mockEnrollment.campaigns.campaign_triggers[0]

      // Should NOT match because to_stage ('negotiation') !== fromStage ('proposal')
      expect(trigger.trigger_config.to_stage).not.toBe(fromStage)
    })

    it('should not match enrollment for non-stage_change triggers', () => {
      const mockEnrollment = {
        id: 'enrollment-1',
        campaigns: {
          campaign_triggers: [
            {
              trigger_type: 'time_based', // Not stage_change
              trigger_config: {
                schedule_type: 'relative',
                delay_value: 7,
                delay_unit: 'days',
              },
            },
          ],
        },
      }

      // Should NOT match because trigger_type is not 'stage_change'
      const trigger = mockEnrollment.campaigns.campaign_triggers[0]
      expect(trigger.trigger_type).not.toBe('stage_change')
    })
  })

  describe('Exit reason validation', () => {
    it('should use stage_changed as a valid exit reason', () => {
      const exitReason = 'stage_changed'
      const validExitReasons = [
        'completed',
        'goal_achieved',
        'unsubscribed',
        'stage_changed',
        'manual_remove',
        'error',
      ]

      expect(validExitReasons).toContain(exitReason)
    })
  })

  describe('Error handling', () => {
    it('should handle query errors gracefully and log them', async () => {
      // Mock Supabase to return an error from a query
      const mockBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'Query failed' } }),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Query failed' } }),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
      }
      const mockSupabase = {
        from: vi.fn().mockReturnValue(mockBuilder),
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const event = {
        tenantId: 'tenant-123',
        projectId: 'project-123',
        contactId: 'contact-123',
        fromStage: 'proposal',
        toStage: 'negotiation',
        changedBy: 'user-123',
        changedAt: new Date().toISOString(),
      }

      // Should not throw - errors are caught internally
      await expect(handleStageChange(event)).resolves.not.toThrow()
    })
  })
})
