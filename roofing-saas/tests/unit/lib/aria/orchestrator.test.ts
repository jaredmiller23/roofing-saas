/**
 * Unit tests for ARIA Orchestrator
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ariaOrchestrator } from '@/lib/aria/orchestrator'
import { ariaFunctionRegistry } from '@/lib/aria/function-registry'
import { buildARIAContext } from '@/lib/aria/context-builder'
import type { ARIAContext, ARIAFunction, ARIAExecutionResult, ARIAOrchestrator } from '@/lib/aria/types'

// Create a constructor for testing
const OrchestratorConstructor = (ariaOrchestrator as any).constructor

// Import mocks
import '@/tests/__mocks__/supabase'
import '@/tests/__mocks__/auth'
import '@/tests/__mocks__/external-services'
import { createMockSupabaseClient, createMockContact, createMockProject } from '@/tests/__mocks__/supabase'

// Mock the function registry
vi.mock('@/lib/aria/function-registry', () => ({
  ariaFunctionRegistry: {
    get: vi.fn(),
    getVoiceFunctions: vi.fn().mockReturnValue([]),
    getEnabledFunctions: vi.fn().mockReturnValue([]),
  },
}))

// Mock context builder
vi.mock('@/lib/aria/context-builder', () => ({
  buildARIAContext: vi.fn(),
  getContextSummary: vi.fn((context) => {
    // Mock actual behavior - return summary if context has contact/project
    if (context?.contact || context?.project) {
      return 'Test context summary'
    }
    return ''
  }),
}))

describe('Orchestrator', () => {
  let orchestrator: any
  let mockContext: any
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  const createMockFunction = (
    name: string,
    options?: {
      requiresConfirmation?: boolean
      shouldSucceed?: boolean
      executionResult?: Partial<ARIAExecutionResult>
    }
  ): ARIAFunction => ({
    name,
    category: 'crm',
    description: `Test ${name} function`,
    riskLevel: 'low',
    enabledByDefault: true,
    requiresConfirmation: options?.requiresConfirmation || false,
    voiceDefinition: {
      type: 'function',
      name,
      description: `Test ${name} function`,
      parameters: {
        type: 'object',
        properties: {},
      },
    },
    execute: vi.fn().mockResolvedValue({
      success: options?.shouldSucceed !== false,
      data: options?.executionResult?.data || { result: 'success' },
      message: options?.executionResult?.message || 'Test successful',
      error: options?.shouldSucceed === false ? 'Test error' : undefined,
      ...options?.executionResult,
    }),
  })

  beforeEach(() => {
    orchestrator = new OrchestratorConstructor() // Access the class directly
    mockSupabase = createMockSupabaseClient()

    mockContext = {
      tenantId: 'tenant-1',
      userId: 'user-1',
      supabase: mockSupabase as any,
      channel: 'chat',
    }

    // Reset all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('executeFunction()', () => {
    it('should execute a function successfully', async () => {
      const mockFn = createMockFunction('test_function')
      vi.mocked(ariaFunctionRegistry.get).mockReturnValue(mockFn)

      const result = await orchestrator.executeFunction(
        'test_function',
        { query: 'test' },
        mockContext
      )

      expect(vi.mocked(ariaFunctionRegistry.get)).toHaveBeenCalledWith('test_function')
      expect(mockFn.execute).toHaveBeenCalledWith({ query: 'test' }, mockContext)
      expect(result.success).toBe(true)
      expect(result.data).toEqual({ result: 'success' })
      expect(result.message).toBe('Test successful')
    })

    it('should return error for unknown function', async () => {
      vi.mocked(ariaFunctionRegistry.get).mockReturnValue(undefined)

      const result = await orchestrator.executeFunction(
        'unknown_function',
        {},
        mockContext
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown function: unknown_function')
    })

    it('should handle function requiring confirmation', async () => {
      const mockFn = createMockFunction('confirmation_function', {
        requiresConfirmation: true,
      })
      vi.mocked(ariaFunctionRegistry.get).mockReturnValue(mockFn)

      const result = await orchestrator.executeFunction(
        'confirmation_function',
        {},
        mockContext
      )

      expect(result.success).toBe(false)
      expect(result.awaitingConfirmation).toBe(true)
      expect(result.confirmationPrompt).toContain('Are you sure you want to test confirmation_function function')
      expect(mockFn.execute).not.toHaveBeenCalled()
    })

    it('should execute function requiring confirmation when confirmation is disabled', async () => {
      const mockFn = createMockFunction('confirmation_function', {
        requiresConfirmation: true,
      })
      vi.mocked(ariaFunctionRegistry.get).mockReturnValue(mockFn)

      const contextWithNoConfirmation = {
        ...mockContext,
        requiresConfirmation: false,
      }

      const result = await orchestrator.executeFunction(
        'confirmation_function',
        {},
        contextWithNoConfirmation
      )

      expect(result.success).toBe(true)
      expect(result.awaitingConfirmation).toBeUndefined()
      expect(mockFn.execute).toHaveBeenCalled()
    })

    it('should handle function execution error', async () => {
      const mockFn = createMockFunction('error_function', { shouldSucceed: false })
      vi.mocked(ariaFunctionRegistry.get).mockReturnValue(mockFn)

      const result = await orchestrator.executeFunction(
        'error_function',
        {},
        mockContext
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Test error')
    })

    it('should handle function execution exception', async () => {
      const mockFn = createMockFunction('exception_function')
      mockFn.execute = vi.fn().mockRejectedValue(new Error('Execution failed'))
      vi.mocked(ariaFunctionRegistry.get).mockReturnValue(mockFn)

      const result = await orchestrator.executeFunction(
        'exception_function',
        {},
        mockContext
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Execution failed')
    })

    it('should handle non-Error exception', async () => {
      const mockFn = createMockFunction('string_error_function')
      mockFn.execute = vi.fn().mockRejectedValue('String error')
      vi.mocked(ariaFunctionRegistry.get).mockReturnValue(mockFn)

      const result = await orchestrator.executeFunction(
        'string_error_function',
        {},
        mockContext
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Function execution failed')
    })

    it('should pass through core result properties', async () => {
      const customResult = {
        success: true,
        data: { customData: 'value' },
        message: 'Custom message',
        requiresFollowUp: true,
        followUpAction: 'send_email',
      }

      const mockFn = createMockFunction('custom_function', {
        executionResult: customResult,
      })
      vi.mocked(ariaFunctionRegistry.get).mockReturnValue(mockFn)

      const result = await orchestrator.executeFunction(
        'custom_function',
        {},
        mockContext
      )

      // Orchestrator only passes through specific properties
      expect(result).toMatchObject({
        success: true,
        data: { customData: 'value' },
        message: 'Custom message',
      })
      // Additional properties are not passed through by design
      expect(result).not.toHaveProperty('requiresFollowUp')
      expect(result).not.toHaveProperty('followUpAction')
    })
  })

  describe('enrichContext()', () => {
    it('should call buildARIAContext with base context', async () => {
      const baseContext = {
        tenantId: 'tenant-1',
        userId: 'user-1',
      }

      const expectedContext = {
        ...baseContext,
        channel: 'chat',
        supabase: mockSupabase,
      }

      const mockBuildContext = vi.mocked(buildARIAContext)
      mockBuildContext.mockResolvedValue(expectedContext as any)

      const result = await orchestrator.enrichContext(baseContext)

      expect(mockBuildContext).toHaveBeenCalledWith(baseContext)
      expect(result).toEqual(expectedContext)
    })

    it('should handle enrichment with entity context', async () => {
      const baseContext = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        entityType: 'contact' as const,
        entityId: 'contact-1',
      }

      const expectedContext = {
        ...baseContext,
        channel: 'chat',
        supabase: mockSupabase,
        contact: createMockContact(),
      }

      const mockBuildContext = vi.mocked(buildARIAContext)
      mockBuildContext.mockResolvedValue(expectedContext as any)

      const result = await orchestrator.enrichContext(baseContext)

      expect(result.contact).toBeDefined()
      expect(result.contact?.id).toBe('contact-1')
    })
  })

  describe('getSystemPrompt()', () => {
    it('should return base system prompt for chat channel', () => {
      const prompt = orchestrator.getSystemPrompt(mockContext)

      expect(prompt).toContain('You are ARIA, an AI assistant for a Tennessee roofing company')
      expect(prompt).toContain('Your capabilities include')
      expect(prompt).toContain('Be helpful, professional, and concise')
    })

    it('should include channel-specific instructions for voice_inbound', () => {
      const voiceContext = {
        ...mockContext,
        channel: 'voice_inbound' as const,
      }

      const prompt = orchestrator.getSystemPrompt(voiceContext)

      expect(prompt).toContain('You are answering an inbound phone call')
      expect(prompt).toContain('Greet the caller appropriately')
      expect(prompt).toContain('Try to identify who is calling')
    })

    it('should include channel-specific instructions for voice_outbound', () => {
      const voiceContext = {
        ...mockContext,
        channel: 'voice_outbound' as const,
      }

      const prompt = orchestrator.getSystemPrompt(voiceContext)

      expect(prompt).toContain('You are on an outbound call')
      expect(prompt).toContain('Be professional and to the point')
      expect(prompt).toContain('Help the team member with their task')
    })

    it('should include channel-specific instructions for SMS', () => {
      const smsContext = {
        ...mockContext,
        channel: 'sms' as const,
      }

      const prompt = orchestrator.getSystemPrompt(smsContext)

      expect(prompt).toContain('You are responding via SMS text message')
      expect(prompt).toContain('Keep responses brief and to the point')
      expect(prompt).toContain('If complex, offer to call them instead')
    })

    it('should include context summary when available', () => {
      const contextWithContact = {
        ...mockContext,
        contact: createMockContact(),
        project: createMockProject(),
      }

      const prompt = orchestrator.getSystemPrompt(contextWithContact)

      expect(prompt).toContain('Current context:')
      expect(prompt).toContain('Test context summary')
    })

    it('should include authorization rules', () => {
      const prompt = orchestrator.getSystemPrompt(mockContext)

      expect(prompt).toContain('Authorization rules:')
      expect(prompt).toContain('You CAN: Look up contacts')
      expect(prompt).toContain('You CANNOT: Process payments')
    })
  })

  describe('getAvailableFunctions()', () => {
    it('should return the function registry', () => {
      const result = orchestrator.getAvailableFunctions()

      expect(result).toBe(ariaFunctionRegistry)
    })

    it('should return registry with empty integrations array', () => {
      const result = orchestrator.getAvailableFunctions([])

      expect(result).toBe(ariaFunctionRegistry)
    })

    it('should return registry with integrations', () => {
      const result = orchestrator.getAvailableFunctions(['quickbooks', 'calendar'])

      expect(result).toBe(ariaFunctionRegistry)
    })
  })

  describe('Integration with real functions', () => {
    it('should work with different risk levels', async () => {
      const lowRiskFn = createMockFunction('low_risk_function')
      lowRiskFn.riskLevel = 'low'

      const highRiskFn = createMockFunction('high_risk_function')
      highRiskFn.riskLevel = 'high'

      vi.mocked(ariaFunctionRegistry.get)
        .mockReturnValueOnce(lowRiskFn)
        .mockReturnValueOnce(highRiskFn)

      const lowResult = await orchestrator.executeFunction('low_risk_function', {}, mockContext)
      const highResult = await orchestrator.executeFunction('high_risk_function', {}, mockContext)

      expect(lowResult.success).toBe(true)
      expect(highResult.success).toBe(true)
    })

    it('should work with different categories', async () => {
      const crmFn = createMockFunction('crm_function')
      crmFn.category = 'crm'

      const weatherFn = createMockFunction('weather_function')
      weatherFn.category = 'weather'

      vi.mocked(ariaFunctionRegistry.get)
        .mockReturnValueOnce(crmFn)
        .mockReturnValueOnce(weatherFn)

      const crmResult = await orchestrator.executeFunction('crm_function', {}, mockContext)
      const weatherResult = await orchestrator.executeFunction('weather_function', {}, mockContext)

      expect(crmResult.success).toBe(true)
      expect(weatherResult.success).toBe(true)
    })
  })

  describe('Error Handling Edge Cases', () => {
    it('should handle null function result', async () => {
      const mockFn = createMockFunction('null_function')
      mockFn.execute = vi.fn().mockResolvedValue(null)
      vi.mocked(ariaFunctionRegistry.get).mockReturnValue(mockFn)

      const result = await orchestrator.executeFunction('null_function', {}, mockContext)

      // The orchestrator should handle null by wrapping it properly
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle empty context', async () => {
      const emptyContext = {} as any
      const prompt = orchestrator.getSystemPrompt(emptyContext)

      expect(prompt).toContain('You are ARIA')
      // Should not throw error even with incomplete context
    })
  })
})