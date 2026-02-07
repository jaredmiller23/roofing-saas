/**
 * Mock authentication utilities for testing
 */

import { vi } from 'vitest'

export const createMockUser = (overrides?: Record<string, unknown>) => ({
  id: 'user-1',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  email_confirmed_at: new Date().toISOString(),
  phone_confirmed_at: null,
  confirmation_sent_at: null,
  recovery_sent_at: null,
  email_change_sent_at: null,
  new_email: null,
  invited_at: null,
  action_link: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_anonymous: false,
  ...overrides,
})

export const mockUser = createMockUser()

// Mock auth session utilities
vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: vi.fn().mockResolvedValue(mockUser),
  getUserTenantId: vi.fn().mockResolvedValue('tenant-1'),
}))

// Mock rate limiting
vi.mock('@/lib/rate-limit', () => ({
  ariaRateLimit: {
    max: 100,
    window: '1m',
  },
  applyRateLimit: vi.fn().mockResolvedValue({
    headers: {
      'X-RateLimit-Limit': '100',
      'X-RateLimit-Remaining': '99',
      'X-RateLimit-Reset': '60',
    },
  }),
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  getClientIdentifier: vi.fn().mockReturnValue('test-client'),
}))

// Mock API response helpers
vi.mock('@/lib/api/response', () => ({
  successResponse: vi.fn((data) => ({
    ok: true,
    status: 200,
    headers: new Map(),
    json: () => Promise.resolve({ success: true, data }),
  })),
  errorResponse: vi.fn((error) => ({
    ok: false,
    status: error.statusCode || 500,
    headers: new Map(),
    json: () => Promise.resolve({
      success: false,
      error: error.message || 'Internal server error'
    }),
  })),
}))

// Mock API errors
vi.mock('@/lib/api/errors', () => ({
  AuthenticationError: class extends Error {
    statusCode = 401
    constructor(message: string) {
      super(message)
      this.name = 'AuthenticationError'
    }
  },
  AuthorizationError: class extends Error {
    statusCode = 403
    constructor(message: string) {
      super(message)
      this.name = 'AuthorizationError'
    }
  },
  ValidationError: class extends Error {
    statusCode = 400
    constructor(message: string) {
      super(message)
      this.name = 'ValidationError'
    }
  },
}))