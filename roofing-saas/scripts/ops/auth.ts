#!/usr/bin/env npx tsx
/**
 * Authentication Helper
 *
 * Gets auth tokens for programmatic API access.
 *
 * USAGE:
 *   npx tsx scripts/ops/auth.ts              # Get token for test user
 *   npx tsx scripts/ops/auth.ts --json       # Output as JSON
 *   npm run ops:auth                         # Via npm script
 *
 * The token can be used for API calls:
 *   curl -H "Authorization: Bearer <token>" https://roofing-saas.vercel.app/api/...
 */

import { supabase, testAccount, getBaseUrl, parseEnvironment } from './config'

interface AuthResult {
  success: boolean
  token?: string
  expiresAt?: string
  user?: {
    id: string
    email: string
  }
  error?: string
}

async function getAuthToken(): Promise<AuthResult> {
  const env = parseEnvironment()
  const baseUrl = getBaseUrl(env)

  console.error(`\n🔐 Getting auth token for ${testAccount.email}...`)
  console.error(`   Environment: ${env} (${baseUrl})\n`)

  try {
    // Authenticate via Supabase Auth API
    const response = await fetch(
      `${supabase.url}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: {
          'apikey': supabase.anonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testAccount.email,
          password: testAccount.password,
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error_description || data.error || 'Authentication failed',
      }
    }

    const expiresAt = new Date(data.expires_at * 1000).toISOString()

    return {
      success: true,
      token: data.access_token,
      expiresAt,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

async function main() {
  const args = process.argv.slice(2)
  const jsonOutput = args.includes('--json')

  const result = await getAuthToken()

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    if (result.success) {
      console.error('✅ Authentication successful!\n')
      console.error(`   User: ${result.user?.email}`)
      console.error(`   Expires: ${result.expiresAt}\n`)
      console.error('Token (copy this for API calls):')
      console.error('─'.repeat(60))
      console.log(result.token)
      console.error('─'.repeat(60))
      console.error('\nUsage example:')
      console.error(`  curl -H "Authorization: Bearer <token>" \\`)
      console.error(`       https://roofing-saas.vercel.app/api/contacts\n`)
    } else {
      console.error(`❌ Authentication failed: ${result.error}\n`)
      process.exit(1)
    }
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
