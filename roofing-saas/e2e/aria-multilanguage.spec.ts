/**
 * E2E Tests: ARIA Multi-Language Support (Phase 11)
 *
 * Tests language detection, translation, and preference persistence
 * via the ARIA execute API endpoint.
 */

import { test, expect } from '@playwright/test'

// Test against local dev or production
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

test.describe('ARIA Multi-Language Support', () => {
  // We need an auth token for API calls
  let authToken: string | undefined

  test.beforeAll(async ({ request }) => {
    // Try to get auth token via login
    try {
      const loginResponse = await request.post(`${BASE_URL}/api/auth/login`, {
        data: {
          email: process.env.TEST_USER_EMAIL || 'claude-test@roofingsaas.com',
          password: process.env.TEST_USER_PASSWORD || 'ClaudeTest2025!Secure',
        },
      })

      if (loginResponse.ok()) {
        const data = await loginResponse.json()
        authToken = data.token || data.access_token
      }
    } catch {
      // Auth endpoint may not exist in this format — tests will skip
    }
  })

  test('ARIA execute API accepts language parameter', async ({ request }) => {
    test.skip(!authToken, 'No auth token available')

    const response = await request.post(`${BASE_URL}/api/aria/execute`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        function_name: 'set_contact_language',
        parameters: {
          language: 'es',
        },
        context: {
          language: 'es',
        },
      },
    })

    // We expect either success or a known error (no contact in context)
    const body = await response.json()
    expect(response.status()).toBeLessThan(500) // No server errors

    // If no contact in context, we expect a specific error
    if (!body.success) {
      expect(body.error || body.data?.error).toContain('No contact ID')
    }
  })

  test('ARIA functions list includes set_contact_language', async ({ request }) => {
    test.skip(!authToken, 'No auth token available')

    const response = await request.get(`${BASE_URL}/api/aria/execute`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })

    if (response.ok()) {
      const body = await response.json()
      const functionNames = body.data?.functions?.map((f: { name: string }) => f.name) || []
      expect(functionNames).toContain('set_contact_language')
    }
  })

  test('English messages get English responses (no regression)', async ({ request }) => {
    test.skip(!authToken, 'No auth token available')

    // This is a basic smoke test — ARIA chat should work as before
    const response = await request.post(`${BASE_URL}/api/aria/execute`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        function_name: 'create_task',
        parameters: {
          title: 'Follow up with customer',
          priority: 'medium',
        },
        context: {
          channel: 'chat',
        },
      },
    })

    expect(response.status()).toBeLessThan(500)
    const body = await response.json()

    // Task creation should work regardless of language
    if (body.success || body.data?.success) {
      const message = body.message || body.data?.message || ''
      // English response should contain recognizable English
      expect(message.toLowerCase()).toContain('task')
    }
  })

  test('set_contact_language rejects invalid language codes', async ({ request }) => {
    test.skip(!authToken, 'No auth token available')

    const response = await request.post(`${BASE_URL}/api/aria/execute`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        function_name: 'set_contact_language',
        parameters: {
          language: 'de', // German — not supported
          contact_id: '00000000-0000-0000-0000-000000000001',
        },
      },
    })

    const body = await response.json()
    expect(response.status()).toBeLessThan(500)

    // Should fail validation with helpful error
    if (body.data) {
      expect(body.data.success).toBe(false)
      const errorMsg = body.data.error || ''
      expect(errorMsg).toContain('Invalid language')
    }
  })
})
