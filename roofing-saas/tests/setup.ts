/**
 * Vitest global test setup
 */

import { vi } from 'vitest'

// Mock environment variables
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-key'

// Global console mocks to reduce noise in tests
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock Next.js server utilities that aren't needed in unit tests
vi.mock('next/server', () => ({
  NextRequest: class MockNextRequest {},
  NextResponse: {
    json: vi.fn((data) => ({ json: () => data })),
  },
}))

// Global test utilities
declare global {
  var __TEST_ENV__: string
}

globalThis.__TEST_ENV__ = 'test'