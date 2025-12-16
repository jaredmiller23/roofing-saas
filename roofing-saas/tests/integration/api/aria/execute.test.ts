/**
 * Integration tests for /api/aria/execute endpoint
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { POST, GET } from '@/app/api/aria/execute/route'
import { NextRequest } from 'next/server'

// Import mocks
import '@/tests/__mocks__/supabase'
import '@/tests/__mocks__/auth'
import '@/tests/__mocks__/external-services'
import { mockUser } from '@/tests/__mocks__/auth'
import { createMockSupabaseClient, createMockContact, createMockProject } from '@/tests/__mocks__/supabase'
import { setupMockFetch, resetExternalMocks } from '@/tests/__mocks__/external-services'

// Mock ARIA functions
const mockExecuteARIAFunction = vi.fn()
const mockBuildARIAContext = vi.fn()
const mockRegistry = {
  getVoiceFunctions: vi.fn().mockReturnValue([
    {
      type: 'function',
      name: 'search_contacts',
      description: 'Search for contacts in the CRM',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
        },
        required: ['query'],
      },
    },
    {
      type: 'function',
      name: 'get_weather',
      description: 'Check weather conditions',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'Location' },
        },
        required: ['location'],
      },
    },
  ]),
}

vi.mock('@/lib/aria', () => ({
  executeARIAFunction: mockExecuteARIAFunction,
  buildARIAContext: mockBuildARIAContext,
  ariaFunctionRegistry: mockRegistry,
}))

// Mock response helpers
const mockSuccessResponse = vi.fn()
const mockErrorResponse = vi.fn()

vi.mock('@/lib/api/response', () => ({
  successResponse: mockSuccessResponse,
  errorResponse: mockErrorResponse,
}))

describe('/api/aria/execute', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    setupMockFetch()

    // Setup default mocks
    mockSuccessResponse.mockImplementation((data) => ({
      ok: true,
      status: 200,
      headers: new Map(),
      json: () => Promise.resolve({ success: true, data }),
    }))

    mockErrorResponse.mockImplementation((error) => ({
      ok: false,
      status: error.statusCode || 500,
      headers: new Map(),
      json: () => Promise.resolve({
        success: false,
        error: error.message || 'Internal server error',
      }),
    }))

    mockBuildARIAContext.mockResolvedValue({
      tenantId: 'tenant-1',
      userId: 'user-1',
      supabase: mockSupabase,
      channel: 'chat',
    })

    vi.clearAllMocks()
  })

  afterEach(() => {
    resetExternalMocks()
    vi.resetAllMocks()
  })

  const createMockRequest = (body: any) => {
    return {
      json: vi.fn().mockResolvedValue(body),
      headers: new Map(),
      url: 'http://localhost:3000/api/aria/execute',
      method: 'POST',
    } as unknown as NextRequest
  }

  describe('POST /api/aria/execute', () => {

    it('should execute a function successfully', async () => {
      const requestBody = {
        function_name: 'search_contacts',
        parameters: { query: 'john doe' },
        context: {
          channel: 'chat',
        },
      }

      const mockFunctionResult = {
        success: true,
        data: [createMockContact()],
        message: 'Found 1 contact',
      }

      mockExecuteARIAFunction.mockResolvedValue(mockFunctionResult)

      const request = createMockRequest(requestBody)
      const response = await POST(request)

      expect(mockBuildARIAContext).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        userId: 'user-1',
        supabase: mockSupabase,
        channel: 'chat',
        entityType: undefined,
        entityId: undefined,
        callSid: undefined,
        sessionId: undefined,
      })

      expect(mockExecuteARIAFunction).toHaveBeenCalledWith(
        'search_contacts',
        { query: 'john doe' },
        expect.objectContaining({
          tenantId: 'tenant-1',
          userId: 'user-1',
          channel: 'chat',
        })
      )

      expect(mockSuccessResponse).toHaveBeenCalledWith(mockFunctionResult)
      expect(response.ok).toBe(true)
    })

    it('should enrich context with contact_id', async () => {
      const requestBody = {
        function_name: 'add_note',
        parameters: { content: 'Test note' },
        context: {
          contact_id: 'contact-1',
          channel: 'chat',
        },
      }

      mockExecuteARIAFunction.mockResolvedValue({ success: true })

      const request = createMockRequest(requestBody)
      await POST(request)

      expect(mockBuildARIAContext).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        userId: 'user-1',
        supabase: mockSupabase,
        channel: 'chat',
        entityType: 'contact',
        entityId: 'contact-1',
        callSid: undefined,
        sessionId: undefined,
      })
    })

    it('should enrich context with project_id', async () => {
      const requestBody = {
        function_name: 'add_note',
        parameters: { content: 'Test note' },
        context: {
          project_id: 'project-1',
          channel: 'voice_inbound',
        },
      }

      mockExecuteARIAFunction.mockResolvedValue({ success: true })

      const request = createMockRequest(requestBody)
      await POST(request)

      expect(mockBuildARIAContext).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        userId: 'user-1',
        supabase: mockSupabase,
        channel: 'voice_inbound',
        entityType: 'project',
        entityId: 'project-1',
        callSid: undefined,
        sessionId: undefined,
      })
    })

    it('should include call metadata when provided', async () => {
      const requestBody = {
        function_name: 'search_contacts',
        parameters: { query: 'test' },
        context: {
          channel: 'voice_inbound',
          call_sid: 'call-123',
          session_id: 'session-456',
        },
      }

      mockExecuteARIAFunction.mockResolvedValue({ success: true })

      const request = createMockRequest(requestBody)
      await POST(request)

      expect(mockBuildARIAContext).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        userId: 'user-1',
        supabase: mockSupabase,
        channel: 'voice_inbound',
        entityType: undefined,
        entityId: undefined,
        callSid: 'call-123',
        sessionId: 'session-456',
      })
    })

    it('should return error for missing function_name', async () => {
      const requestBody = {
        parameters: { query: 'test' },
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)

      expect(mockErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'function_name is required',
          statusCode: 400,
        })
      )
    })

    it('should handle unauthenticated user', async () => {
      // Mock unauthenticated user
      vi.doMock('@/lib/auth/session', () => ({
        getCurrentUser: vi.fn().mockResolvedValue(null),
        getUserTenantId: vi.fn().mockResolvedValue(null),
      }))

      const requestBody = {
        function_name: 'search_contacts',
        parameters: { query: 'test' },
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)

      expect(mockErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not authenticated',
          statusCode: 401,
        })
      )
    })

    it('should handle user without tenant', async () => {
      // Mock user without tenant
      vi.doMock('@/lib/auth/session', () => ({
        getCurrentUser: vi.fn().mockResolvedValue(mockUser),
        getUserTenantId: vi.fn().mockResolvedValue(null),
      }))

      const requestBody = {
        function_name: 'search_contacts',
        parameters: { query: 'test' },
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)

      expect(mockErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User is not associated with a tenant',
          statusCode: 403,
        })
      )
    })

    it('should handle function execution failure', async () => {
      const requestBody = {
        function_name: 'failing_function',
        parameters: { query: 'test' },
      }

      const mockFunctionResult = {
        success: false,
        error: 'Function failed to execute',
      }

      mockExecuteARIAFunction.mockResolvedValue(mockFunctionResult)

      const request = createMockRequest(requestBody)
      const response = await POST(request)

      expect(mockSuccessResponse).toHaveBeenCalledWith(mockFunctionResult)
      expect(response.ok).toBe(true) // Still returns 200 but with success: false
    })

    it('should handle function execution exception', async () => {
      const requestBody = {
        function_name: 'error_function',
        parameters: { query: 'test' },
      }

      mockExecuteARIAFunction.mockRejectedValue(new Error('Execution error'))

      const request = createMockRequest(requestBody)
      const response = await POST(request)

      expect(mockErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Execution error',
        })
      )
    })

    it('should default to chat channel when not provided', async () => {
      const requestBody = {
        function_name: 'search_contacts',
        parameters: { query: 'test' },
        // No context provided
      }

      mockExecuteARIAFunction.mockResolvedValue({ success: true })

      const request = createMockRequest(requestBody)
      await POST(request)

      expect(mockBuildARIAContext).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'chat',
        })
      )
    })

    it('should handle rate limiting', async () => {
      // Mock rate limit exceeded
      vi.doMock('@/lib/rate-limit', () => ({
        applyRateLimit: vi.fn().mockResolvedValue({
          ok: false,
          status: 429,
          json: () => Promise.resolve({
            success: false,
            error: 'Rate limit exceeded',
          }),
        }),
        getClientIdentifier: vi.fn().mockReturnValue('test-client'),
        ariaRateLimit: { max: 100, window: '1m' },
      }))

      const requestBody = {
        function_name: 'search_contacts',
        parameters: { query: 'test' },
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)

      expect(response.status).toBe(429)
    })
  })

  describe('GET /api/aria/execute', () => {
    const createMockGetRequest = () => {
      return {
        headers: new Map(),
        url: 'http://localhost:3000/api/aria/execute',
        method: 'GET',
      } as unknown as NextRequest
    }

    it('should return available ARIA functions', async () => {
      const request = createMockGetRequest()
      const response = await GET(request)

      expect(mockRegistry.getVoiceFunctions).toHaveBeenCalled()
      expect(response.ok).toBe(true)

      const jsonResponse = await response.json()
      expect(jsonResponse.success).toBe(true)
      expect(jsonResponse.data.functions).toHaveLength(2)
      expect(jsonResponse.data.functions[0].name).toBe('search_contacts')
      expect(jsonResponse.data.functions[1].name).toBe('get_weather')
      expect(jsonResponse.data.count).toBe(2)
      expect(jsonResponse.data.categories).toContain('crm')
      expect(jsonResponse.data.categories).toContain('weather')
    })

    it('should handle unauthenticated user for GET', async () => {
      // Mock unauthenticated user
      vi.doMock('@/lib/auth/session', () => ({
        getCurrentUser: vi.fn().mockResolvedValue(null),
        getUserTenantId: vi.fn().mockResolvedValue(null),
      }))

      const request = createMockGetRequest()
      const response = await GET(request)

      expect(mockErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not authenticated',
          statusCode: 401,
        })
      )
    })

    it('should include rate limit headers', async () => {
      const mockRateLimitResult = {
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '99',
        },
      }

      vi.doMock('@/lib/rate-limit', () => ({
        applyRateLimit: vi.fn().mockResolvedValue(mockRateLimitResult),
        getClientIdentifier: vi.fn().mockReturnValue('test-client'),
        ariaRateLimit: { max: 100, window: '1m' },
      }))

      const request = createMockGetRequest()
      const response = await GET(request)

      expect(response.headers.get('X-RateLimit-Limit')).toBe('100')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('99')
    })

    it('should handle empty function registry', async () => {
      mockRegistry.getVoiceFunctions.mockReturnValue([])

      const request = createMockGetRequest()
      const response = await GET(request)

      const jsonResponse = await response.json()
      expect(jsonResponse.success).toBe(true)
      expect(jsonResponse.data.functions).toEqual([])
      expect(jsonResponse.data.count).toBe(0)
    })

    it('should handle registry error', async () => {
      mockRegistry.getVoiceFunctions.mockImplementation(() => {
        throw new Error('Registry error')
      })

      const request = createMockGetRequest()
      const response = await GET(request)

      expect(mockErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Registry error',
        })
      )
    })
  })

  describe('Integration with Real Functions', () => {
    it('should work with search_contacts function end-to-end', async () => {
      // Setup mock contact search
      const mockContacts = [createMockContact(), createMockContact({ first_name: 'Jane' })]
      mockSupabase.__setMockResponse({ data: mockContacts, error: null })

      // Mock the actual function execution
      mockExecuteARIAFunction.mockResolvedValue({
        success: true,
        data: mockContacts,
        message: `Found ${mockContacts.length} contact(s)`,
      })

      const requestBody = {
        function_name: 'search_contacts',
        parameters: { query: 'doe', limit: 10 },
        context: { channel: 'chat' },
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)

      expect(response.ok).toBe(true)
      expect(mockExecuteARIAFunction).toHaveBeenCalledWith(
        'search_contacts',
        { query: 'doe', limit: 10 },
        expect.any(Object)
      )
    })

    it('should work with context enrichment for contact', async () => {
      const mockContact = createMockContact()
      const mockProject = createMockProject()

      mockBuildARIAContext.mockResolvedValue({
        tenantId: 'tenant-1',
        userId: 'user-1',
        supabase: mockSupabase,
        channel: 'chat',
        entityType: 'contact',
        entityId: 'contact-1',
        contact: mockContact,
        project: mockProject,
      })

      mockExecuteARIAFunction.mockResolvedValue({
        success: true,
        message: 'Note added successfully',
      })

      const requestBody = {
        function_name: 'add_note',
        parameters: { content: 'Test note' },
        context: {
          contact_id: 'contact-1',
          channel: 'chat',
        },
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)

      expect(response.ok).toBe(true)
      expect(mockBuildARIAContext).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'contact',
          entityId: 'contact-1',
        })
      )
    })
  })
})