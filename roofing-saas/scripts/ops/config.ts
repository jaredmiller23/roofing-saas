/**
 * Operations Configuration
 *
 * Central configuration for all ops scripts. This file contains:
 * - Environment URLs (production, local)
 * - Supabase project details
 * - Test account configuration
 *
 * USAGE: Import this in any ops script to get consistent configuration.
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.test for test credentials (quiet to suppress logs)
config({ path: resolve(__dirname, '../../.env.test'), quiet: true })
// Also load .env.local for any other env vars
config({ path: resolve(__dirname, '../../.env.local'), quiet: true })

// =============================================================================
// ENVIRONMENTS
// =============================================================================

export const environments = {
  production: {
    url: 'https://roofing-saas.vercel.app',
    name: 'Production',
  },
  local: {
    url: 'http://localhost:3000',
    name: 'Local Development',
  },
} as const

export type Environment = keyof typeof environments

// Default to production for ops scripts
export const DEFAULT_ENV: Environment = 'production'

// =============================================================================
// SUPABASE
// =============================================================================

export const supabase = {
  url: 'https://wfifizczqvogbcqamnmw.supabase.co',
  projectRef: 'wfifizczqvogbcqamnmw',

  // Anon key (public, safe to include)
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmaWZpemN6cXZvZ2JjcWFtbm13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMDMwOTMsImV4cCI6MjA3MzY3OTA5M30.UaMCkJmypS4T5DopA6efaZs_3YvvLluG0MK-4s7gTBI',

  // Service role key - from environment variable only (never hardcode)
  get serviceRoleKey(): string {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!key) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not set in environment')
    }
    return key
  },
} as const

// =============================================================================
// TEST ACCOUNT
// =============================================================================

/**
 * Test account for automated testing and Claude verification.
 *
 * This account:
 * - Is in the Clarity AI Development tenant (sandbox)
 * - Has admin role for full access during testing
 * - Should NEVER be used in production tenant
 */
export const testAccount = {
  email: 'claude-test@roofingsaas.com',

  // Password from environment variable
  get password(): string {
    const pwd = process.env.TEST_USER_PASSWORD
    if (!pwd) {
      throw new Error(
        'TEST_USER_PASSWORD not set. Create .env.test with:\n' +
        'TEST_USER_PASSWORD=ClaudeTest2025!Secure'
      )
    }
    return pwd
  },

  // User ID (for direct database queries)
  userId: '5dc43384-1509-4da8-a795-71060988140a',

  // Tenant ID (Clarity AI Development - sandbox)
  tenantId: '478d279b-5b8a-4040-a805-75d595d59702',
} as const

// =============================================================================
// TENANTS
// =============================================================================

export const tenants = {
  production: {
    id: '00000000-0000-0000-0000-000000000000',
    name: 'Appalachian Storm Restoration',
    purpose: 'PRODUCTION - Real customer data',
  },
  development: {
    id: '478d279b-5b8a-4040-a805-75d595d59702',
    name: 'Clarity AI Development',
    purpose: 'SANDBOX - Testing and development',
  },
} as const

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get environment configuration
 */
export function getEnvConfig(env: Environment = DEFAULT_ENV) {
  return environments[env]
}

/**
 * Get the base URL for an environment
 */
export function getBaseUrl(env: Environment = DEFAULT_ENV): string {
  return environments[env].url
}

/**
 * Parse environment from CLI args or env var
 */
export function parseEnvironment(): Environment {
  // Check CLI args
  const args = process.argv.slice(2)
  if (args.includes('--local')) return 'local'
  if (args.includes('--production') || args.includes('--prod')) return 'production'

  // Check env var
  const envVar = process.env.TEST_ENV?.toLowerCase()
  if (envVar === 'local') return 'local'
  if (envVar === 'production' || envVar === 'prod') return 'production'

  return DEFAULT_ENV
}
