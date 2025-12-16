/**
 * Mock Supabase client for testing
 */

import { vi } from 'vitest'

export const createMockSupabaseClient = () => {
  const mockSelect = vi.fn().mockReturnThis()
  const mockFrom = vi.fn().mockReturnThis()
  const mockEq = vi.fn().mockReturnThis()
  const mockOr = vi.fn().mockReturnThis()
  const mockLimit = vi.fn().mockReturnThis()
  const mockSingle = vi.fn()
  const mockInsert = vi.fn().mockReturnThis()
  const mockOrder = vi.fn().mockReturnThis()

  return {
    from: mockFrom,
    select: mockSelect,
    eq: mockEq,
    or: mockOr,
    limit: mockLimit,
    single: mockSingle,
    insert: mockInsert,
    order: mockOrder,
    // Helper methods for tests
    __mockMethods: {
      from: mockFrom,
      select: mockSelect,
      eq: mockEq,
      or: mockOr,
      limit: mockLimit,
      single: mockSingle,
      insert: mockInsert,
      order: mockOrder,
    },
    // Helper for setting up mock responses
    __setMockResponse: (response: { data?: unknown; error?: unknown }) => {
      mockSingle.mockResolvedValue(response)
      return { data: response.data, error: response.error }
    },
  }
}

export const mockSupabaseClient = createMockSupabaseClient()

// Mock the server Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabaseClient),
}))

// Mock Supabase types
export type MockSupabaseClient = ReturnType<typeof createMockSupabaseClient>

// Test data factories
export const createMockContact = (overrides?: Record<string, unknown>) => ({
  id: 'contact-1',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  mobile_phone: '+1234567890',
  address_street: '123 Main St',
  address_city: 'Nashville',
  address_state: 'TN',
  address_zip: '37201',
  stage: 'new',
  dnc_status: undefined,
  tenant_id: 'tenant-1',
  created_by: 'user-1',
  ...overrides,
})

export const createMockProject = (overrides?: Record<string, unknown>) => ({
  id: 'project-1',
  name: 'Roof Repair',
  status: 'active',
  pipeline_stage: 'estimate',
  estimated_value: 5000,
  insurance_carrier: 'State Farm',
  contact_id: 'contact-1',
  tenant_id: 'tenant-1',
  is_deleted: false,
  created_at: new Date().toISOString(),
  ...overrides,
})

export const createMockActivity = (overrides?: Record<string, unknown>) => ({
  id: 'activity-1',
  type: 'note',
  description: 'Test note',
  contact_id: 'contact-1',
  project_id: null,
  tenant_id: 'tenant-1',
  created_by: 'user-1',
  created_at: new Date().toISOString(),
  ...overrides,
})