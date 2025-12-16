/**
 * Unit tests for ARIA Function Registry
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ariaFunctionRegistry } from '@/lib/aria/function-registry'
import type { ARIAFunction, ARIAFunctionCategory, ARIAFunctionRegistry } from '@/lib/aria/types'

// Create a constructor for testing
const FunctionRegistryConstructor = (ariaFunctionRegistry as any).constructor

// Import mocks
import '@/tests/__mocks__/supabase'
import '@/tests/__mocks__/auth'
import '@/tests/__mocks__/external-services'

describe('FunctionRegistry', () => {
  let registry: any

  const createMockFunction = (
    name: string,
    category: ARIAFunctionCategory,
    overrides?: Partial<ARIAFunction>
  ): ARIAFunction => ({
    name,
    category,
    description: `Test ${name} function`,
    riskLevel: 'low',
    enabledByDefault: true,
    voiceDefinition: {
      type: 'function' as const,
      name,
      description: `Test ${name} function`,
      parameters: {
        type: 'object',
        properties: {},
      },
    },
    execute: vi.fn().mockResolvedValue({ success: true }),
    ...overrides,
  })

  beforeEach(() => {
    registry = new FunctionRegistryConstructor() // Access the class directly
  })

  describe('register()', () => {
    it('should register a function successfully', () => {
      const mockFn = createMockFunction('test_function', 'crm')

      registry.register(mockFn)

      expect(registry.functions.has('test_function')).toBe(true)
      expect(registry.functions.get('test_function')).toEqual(mockFn)
    })

    it('should overwrite existing function with same name', () => {
      const mockFn1 = createMockFunction('test_function', 'crm')
      const mockFn2 = createMockFunction('test_function', 'weather', {
        description: 'Updated function',
      })

      registry.register(mockFn1)
      registry.register(mockFn2)

      expect(registry.functions.get('test_function')?.description).toBe('Updated function')
      expect(registry.functions.get('test_function')?.category).toBe('weather')
    })

    it('should handle multiple function registrations', () => {
      const mockFn1 = createMockFunction('function_1', 'crm')
      const mockFn2 = createMockFunction('function_2', 'weather')
      const mockFn3 = createMockFunction('function_3', 'actions')

      registry.register(mockFn1)
      registry.register(mockFn2)
      registry.register(mockFn3)

      expect(registry.functions.size).toBe(3)
      expect(registry.functions.has('function_1')).toBe(true)
      expect(registry.functions.has('function_2')).toBe(true)
      expect(registry.functions.has('function_3')).toBe(true)
    })
  })

  describe('get()', () => {
    beforeEach(() => {
      const mockFn1 = createMockFunction('existing_function', 'crm')
      const mockFn2 = createMockFunction('another_function', 'weather')
      registry.register(mockFn1)
      registry.register(mockFn2)
    })

    it('should return function when it exists', () => {
      const result = registry.get('existing_function')

      expect(result).toBeDefined()
      expect(result?.name).toBe('existing_function')
      expect(result?.category).toBe('crm')
    })

    it('should return undefined for non-existent function', () => {
      const result = registry.get('non_existent_function')

      expect(result).toBeUndefined()
    })

    it('should be case-sensitive', () => {
      const result = registry.get('EXISTING_FUNCTION')

      expect(result).toBeUndefined()
    })
  })

  describe('getByCategory()', () => {
    beforeEach(() => {
      const crmFn1 = createMockFunction('crm_function_1', 'crm')
      const crmFn2 = createMockFunction('crm_function_2', 'crm')
      const weatherFn = createMockFunction('weather_function', 'weather')
      const actionsFn = createMockFunction('actions_function', 'actions')

      registry.register(crmFn1)
      registry.register(crmFn2)
      registry.register(weatherFn)
      registry.register(actionsFn)
    })

    it('should return all functions for specified category', () => {
      const crmFunctions = registry.getByCategory('crm')

      expect(crmFunctions).toHaveLength(2)
      expect(crmFunctions.map((fn: ARIAFunction) => fn.name)).toContain('crm_function_1')
      expect(crmFunctions.map((fn: ARIAFunction) => fn.name)).toContain('crm_function_2')
      expect(crmFunctions.every((fn: ARIAFunction) => fn.category === 'crm')).toBe(true)
    })

    it('should return empty array for category with no functions', () => {
      const result = registry.getByCategory('quickbooks')

      expect(result).toEqual([])
    })

    it('should return single function for category with one function', () => {
      const weatherFunctions = registry.getByCategory('weather')

      expect(weatherFunctions).toHaveLength(1)
      expect(weatherFunctions[0].name).toBe('weather_function')
    })
  })

  describe('getVoiceFunctions()', () => {
    beforeEach(() => {
      const mockFn1 = createMockFunction('function_1', 'crm')
      const mockFn2 = createMockFunction('function_2', 'weather')
      registry.register(mockFn1)
      registry.register(mockFn2)
    })

    it('should return voice definitions for all functions', () => {
      const voiceFunctions = registry.getVoiceFunctions()

      expect(voiceFunctions).toHaveLength(2)
      expect(voiceFunctions[0].type).toBe('function')
      expect(voiceFunctions[1].type).toBe('function')
      expect(voiceFunctions.map((vf: any) => vf.name)).toContain('function_1')
      expect(voiceFunctions.map((vf: any) => vf.name)).toContain('function_2')
    })

    it('should return empty array when no functions registered', () => {
      const emptyRegistry = new FunctionRegistryConstructor()
      const voiceFunctions = emptyRegistry.getVoiceFunctions()

      expect(voiceFunctions).toEqual([])
    })
  })

  describe('getEnabledFunctions()', () => {
    beforeEach(() => {
      const enabledFn = createMockFunction('enabled_function', 'crm', {
        enabledByDefault: true,
      })
      const disabledFn = createMockFunction('disabled_function', 'crm', {
        enabledByDefault: false,
      })
      const integrationFn = createMockFunction('integration_function', 'quickbooks', {
        enabledByDefault: true,
        requiredIntegrations: ['quickbooks'],
      })
      const multiIntegrationFn = createMockFunction('multi_integration_function', 'actions', {
        enabledByDefault: true,
        requiredIntegrations: ['quickbooks', 'calendar'],
      })

      registry.register(enabledFn)
      registry.register(disabledFn)
      registry.register(integrationFn)
      registry.register(multiIntegrationFn)
    })

    it('should return enabled functions when integrations are empty', () => {
      const result = registry.getEnabledFunctions([])

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('enabled_function')
    })

    it('should include functions with required integrations when available', () => {
      const result = registry.getEnabledFunctions(['quickbooks'])

      expect(result).toHaveLength(2)
      expect(result.map((fn: ARIAFunction) => fn.name)).toContain('enabled_function')
      expect(result.map((fn: ARIAFunction) => fn.name)).toContain('integration_function')
    })

    it('should include multi-integration functions when all required integrations are available', () => {
      const result = registry.getEnabledFunctions(['quickbooks', 'calendar'])

      expect(result).toHaveLength(3)
      expect(result.map((fn: ARIAFunction) => fn.name)).toContain('enabled_function')
      expect(result.map((fn: ARIAFunction) => fn.name)).toContain('integration_function')
      expect(result.map((fn: ARIAFunction) => fn.name)).toContain('multi_integration_function')
    })

    it('should exclude functions with missing required integrations', () => {
      const result = registry.getEnabledFunctions(['calendar']) // missing quickbooks

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('enabled_function')
    })

    it('should exclude disabled functions regardless of integrations', () => {
      const result = registry.getEnabledFunctions(['quickbooks', 'calendar', 'perplexity'])

      expect(result.map((fn: ARIAFunction) => fn.name)).not.toContain('disabled_function')
    })
  })

  describe('getFunctionsByRisk()', () => {
    beforeEach(() => {
      const lowRiskFn = createMockFunction('low_risk', 'crm', { riskLevel: 'low' })
      const mediumRiskFn = createMockFunction('medium_risk', 'actions', { riskLevel: 'medium' })
      const highRiskFn = createMockFunction('high_risk', 'quickbooks', { riskLevel: 'high' })

      registry.register(lowRiskFn)
      registry.register(mediumRiskFn)
      registry.register(highRiskFn)
    })

    it('should return only low risk functions for low max risk', () => {
      const result = registry.getFunctionsByRisk('low')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('low_risk')
      expect(result[0].riskLevel).toBe('low')
    })

    it('should return low and medium risk functions for medium max risk', () => {
      const result = registry.getFunctionsByRisk('medium')

      expect(result).toHaveLength(2)
      expect(result.map((fn: ARIAFunction) => fn.name)).toContain('low_risk')
      expect(result.map((fn: ARIAFunction) => fn.name)).toContain('medium_risk')
      expect(result.map((fn: ARIAFunction) => fn.name)).not.toContain('high_risk')
    })

    it('should return all functions for high max risk', () => {
      const result = registry.getFunctionsByRisk('high')

      expect(result).toHaveLength(3)
      expect(result.map((fn: ARIAFunction) => fn.name)).toContain('low_risk')
      expect(result.map((fn: ARIAFunction) => fn.name)).toContain('medium_risk')
      expect(result.map((fn: ARIAFunction) => fn.name)).toContain('high_risk')
    })
  })

  describe('getChatCompletionTools()', () => {
    beforeEach(() => {
      const mockFn1 = createMockFunction('search_contacts', 'crm', {
        voiceDefinition: {
          type: 'function',
          name: 'search_contacts',
          description: 'Search for contacts',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
            },
            required: ['query'],
          },
        },
      })
      const mockFn2 = createMockFunction('get_weather', 'weather')

      registry.register(mockFn1)
      registry.register(mockFn2)
    })

    it('should return ChatCompletion tool format', () => {
      const tools = registry.getChatCompletionTools()

      expect(tools).toHaveLength(2)
      expect(tools[0]).toHaveProperty('type', 'function')
      expect(tools[0]).toHaveProperty('function')
      expect(tools[0].function).toHaveProperty('name', 'search_contacts')
      expect(tools[0].function).toHaveProperty('description', 'Search for contacts')
      expect(tools[0].function).toHaveProperty('parameters')
    })

    it('should include correct function parameters', () => {
      const tools = registry.getChatCompletionTools()
      const searchTool = tools.find((tool: any) => tool.function.name === 'search_contacts')

      expect(searchTool?.function.parameters).toHaveProperty('type', 'object')
      expect(searchTool?.function.parameters.properties).toHaveProperty('query')
      expect(searchTool?.function.parameters.required).toContain('query')
    })

    it('should return empty array when no functions registered', () => {
      const emptyRegistry = new FunctionRegistryConstructor()
      const tools = emptyRegistry.getChatCompletionTools()

      expect(tools).toEqual([])
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined parameters in function definition', () => {
      const mockFn = createMockFunction('edge_case_function', 'crm', {
        voiceDefinition: {
          type: 'function',
          name: 'edge_case_function',
          description: 'Edge case function',
          parameters: undefined as any,
        },
      })

      expect(() => registry.register(mockFn)).not.toThrow()
      expect(registry.get('edge_case_function')).toBeDefined()
    })

    it('should handle empty required integrations array', () => {
      const mockFn = createMockFunction('empty_integrations', 'crm', {
        requiredIntegrations: [],
      })

      registry.register(mockFn)
      const enabled = registry.getEnabledFunctions([])

      expect(enabled.map((fn: ARIAFunction) => fn.name)).toContain('empty_integrations')
    })

    it('should handle function with no enabledByDefault property (defaults to true)', () => {
      const mockFn = createMockFunction('default_enabled', 'crm')
      delete mockFn.enabledByDefault

      registry.register(mockFn)
      const enabled = registry.getEnabledFunctions([])

      expect(enabled.map((fn: ARIAFunction) => fn.name)).toContain('default_enabled')
    })
  })
})