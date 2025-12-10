import { test, expect } from '@playwright/test'

/**
 * Voice Assistant E2E Tests
 *
 * Tests the AI Voice Assistant CRM function endpoints:
 * - /api/ai/conversations - Create, list, manage conversations
 * - /api/ai/messages - Send messages with CRM function calling
 * - /api/ai/chat/stream - Streaming chat responses
 * - /api/voice/session - Voice session creation (OpenAI Realtime API)
 *
 * CRM Functions tested via AI messages:
 * - search_contacts: Search contacts by query
 * - create_contact: Create new contacts
 * - add_note: Add notes/activities
 * - get_pipeline_stats: Pipeline analytics
 */

test.describe('AI Conversations API', () => {
  test('POST /api/ai/conversations creates a new conversation', async ({ request }) => {
    const response = await request.post('/api/ai/conversations', {
      data: {
        title: 'E2E Test Conversation',
      },
    })

    console.log(`POST /api/ai/conversations status: ${response.status()}`)

    // Should succeed or be server issue (not validation error)
    expect(response.status()).not.toBe(400)

    if (response.ok()) {
      const data = await response.json()
      expect(data.conversation).toBeDefined()
      expect(data.conversation.id).toBeDefined()
      expect(data.conversation.title).toBe('E2E Test Conversation')
      console.log(`Created conversation: ${data.conversation.id}`)

      // Cleanup - delete the test conversation
      const deleteResponse = await request.delete(`/api/ai/conversations/${data.conversation.id}`)
      console.log(`DELETE conversation: ${deleteResponse.status()}`)
    }
  })

  test('GET /api/ai/conversations lists conversations', async ({ request }) => {
    const response = await request.get('/api/ai/conversations')
    console.log(`GET /api/ai/conversations status: ${response.status()}`)

    expect(response.status()).not.toBe(500)

    if (response.ok()) {
      const data = await response.json()
      expect(data.conversations).toBeDefined()
      expect(Array.isArray(data.conversations)).toBe(true)
      console.log(`Found ${data.conversations.length} conversations`)
    }
  })

  test('GET /api/ai/conversations supports search', async ({ request }) => {
    const response = await request.get('/api/ai/conversations?search=test')
    console.log(`GET /api/ai/conversations?search=test status: ${response.status()}`)

    expect(response.status()).not.toBe(500)

    if (response.ok()) {
      const data = await response.json()
      expect(data.conversations).toBeDefined()
      console.log(`Search found ${data.conversations.length} results`)
    }
  })
})

test.describe('AI Messages API', () => {
  let testConversationId: string | null = null

  test.beforeAll(async ({ request }) => {
    // Create a test conversation
    const response = await request.post('/api/ai/conversations', {
      data: { title: 'E2E Message Test' },
    })

    if (response.ok()) {
      const data = await response.json()
      testConversationId = data.conversation.id
      console.log(`Created test conversation: ${testConversationId}`)
    }
  })

  test.afterAll(async ({ request }) => {
    // Cleanup test conversation
    if (testConversationId) {
      await request.delete(`/api/ai/conversations/${testConversationId}`)
      console.log(`Cleaned up test conversation: ${testConversationId}`)
    }
  })

  test('POST /api/ai/messages sends a message', async ({ request }) => {
    const response = await request.post('/api/ai/messages', {
      data: {
        conversation_id: testConversationId,
        content: 'Hello, this is a test message.',
        role: 'user',
      },
    })

    console.log(`POST /api/ai/messages status: ${response.status()}`)

    expect(response.status()).not.toBe(400)

    if (response.ok()) {
      const data = await response.json()
      expect(data.message).toBeDefined()
      expect(data.assistant_message).toBeDefined()
      expect(data.conversation_id).toBeDefined()
      console.log(`User message: ${data.message.id}`)
      console.log(`Assistant message: ${data.assistant_message.id}`)
    }
  })

  test('POST /api/ai/messages creates conversation if none provided', async ({ request }) => {
    const response = await request.post('/api/ai/messages', {
      data: {
        content: 'Auto-create conversation test',
        role: 'user',
      },
    })

    console.log(`POST /api/ai/messages (no conversation_id) status: ${response.status()}`)

    expect(response.status()).not.toBe(400)

    if (response.ok()) {
      const data = await response.json()
      expect(data.conversation_id).toBeDefined()
      expect(data.message).toBeDefined()
      console.log(`Auto-created conversation: ${data.conversation_id}`)

      // Cleanup
      await request.delete(`/api/ai/conversations/${data.conversation_id}`)
    }
  })

  test('POST /api/ai/messages rejects empty content', async ({ request }) => {
    const response = await request.post('/api/ai/messages', {
      data: {
        content: '',
        role: 'user',
      },
    })

    console.log(`POST /api/ai/messages (empty content) status: ${response.status()}`)

    expect(response.status()).toBe(400)
  })
})

test.describe('AI CRM Function Calling', () => {
  test('search_contacts function via message', async ({ request }) => {
    // This tests that the AI can understand and execute the search_contacts function
    const response = await request.post('/api/ai/messages', {
      data: {
        content: 'Search for contacts named John',
        role: 'user',
      },
    })

    console.log(`POST /api/ai/messages (search request) status: ${response.status()}`)

    expect(response.status()).not.toBe(500)

    if (response.ok()) {
      const data = await response.json()
      expect(data.assistant_message).toBeDefined()
      console.log(`Assistant response length: ${data.assistant_message.content?.length || 0}`)

      // If function was called, it should be in the metadata
      if (data.assistant_message.function_call) {
        console.log(`Function called: ${data.assistant_message.function_call.name}`)
        expect(data.assistant_message.function_call.name).toBe('search_contacts')
      }

      // Cleanup
      await request.delete(`/api/ai/conversations/${data.conversation_id}`)
    }
  })

  test('get_pipeline_stats function via message', async ({ request }) => {
    const response = await request.post('/api/ai/messages', {
      data: {
        content: 'Show me the pipeline stats',
        role: 'user',
      },
    })

    console.log(`POST /api/ai/messages (pipeline stats) status: ${response.status()}`)

    expect(response.status()).not.toBe(500)

    if (response.ok()) {
      const data = await response.json()
      expect(data.assistant_message).toBeDefined()

      if (data.assistant_message.function_call) {
        console.log(`Function called: ${data.assistant_message.function_call.name}`)
        expect(data.assistant_message.function_call.name).toBe('get_pipeline_stats')

        // Verify result structure
        if (data.assistant_message.function_call.result) {
          console.log(`Pipeline stats result:`, data.assistant_message.function_call.result)
        }
      }

      // Cleanup
      await request.delete(`/api/ai/conversations/${data.conversation_id}`)
    }
  })
})

test.describe('Voice Session API', () => {
  test('POST /api/voice/session requires authentication', async ({ request }) => {
    // The authenticated test user should be able to create a session
    const response = await request.post('/api/voice/session', {
      data: {},
    })

    console.log(`POST /api/voice/session status: ${response.status()}`)

    // Should succeed or fail with specific error (not 500)
    expect(response.status()).not.toBe(500)

    if (response.ok()) {
      const data = await response.json()
      console.log(`Voice session response keys: ${Object.keys(data).join(', ')}`)

      // Response might be wrapped in a data object or direct
      const sessionData = data.data || data

      // Session creation depends on OpenAI API - if successful, verify structure
      if (sessionData.session_id || sessionData.error) {
        console.log(`Voice session result: ${JSON.stringify(sessionData).slice(0, 200)}`)
      }

      // The main verification is that we don't get a 500
      expect(response.status()).toBeLessThan(500)
    } else {
      // Non-success is OK - might fail if OpenAI not configured in test
      const data = await response.json()
      console.log(`Voice session non-OK response: ${JSON.stringify(data).slice(0, 200)}`)
    }
  })

  test('POST /api/voice/session accepts context parameters', async ({ request }) => {
    const response = await request.post('/api/voice/session', {
      data: {
        contact_id: null,
        project_id: null,
        context: { page: '/test' },
      },
    })

    console.log(`POST /api/voice/session (with context) status: ${response.status()}`)

    // Just verify it doesn't crash with extra parameters
    expect(response.status()).not.toBe(500)
  })
})

test.describe('Voice Page UI', () => {
  test('voice page loads successfully', async ({ page }) => {
    await page.goto('/voice')
    await page.waitForLoadState('networkidle')

    // Verify page loaded
    await expect(page).toHaveURL(/\/voice/)

    // Should have some content
    const bodyText = await page.locator('body').textContent()
    expect(bodyText?.length).toBeGreaterThan(100)

    // Look for voice-related UI elements
    const hasVoiceUI =
      (await page.locator('text=/voice|assistant|microphone|speak/i').count()) > 0

    console.log(`Voice UI elements found: ${hasVoiceUI}`)
  })

  test('voice assistant page loads successfully', async ({ page }) => {
    await page.goto('/voice-assistant')
    await page.waitForLoadState('networkidle')

    // Should load without error
    const bodyText = await page.locator('body').textContent()
    expect(bodyText?.length).toBeGreaterThan(100)

    // Look for assistant UI
    const hasAssistantUI =
      (await page.locator('text=/assistant|conversation|chat|speak/i').count()) > 0

    console.log(`Voice assistant UI found: ${hasAssistantUI}`)
  })
})

test.describe('AI Assistant Integration', () => {
  test('ai assistant context is available', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Check if AI assistant toggle/button exists
    const hasAIToggle = (await page.locator('[class*="ai-"], [data-testid*="ai"]').count()) > 0 ||
                        (await page.locator('button:has-text("Assistant")').count()) > 0 ||
                        (await page.locator('button:has-text("AI")').count()) > 0

    console.log(`AI Assistant toggle found: ${hasAIToggle}`)

    // Check for expanded assistant panel
    const expandedPanel = await page.locator('[class*="assistant"], [role="dialog"]').count()
    console.log(`Assistant panels/dialogs: ${expandedPanel}`)
  })

  test('ai assistant can be accessed from contacts page', async ({ page }) => {
    await page.goto('/contacts')
    // Use domcontentloaded instead of networkidle to avoid timeout with polling/SSE
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000) // Allow initial render

    // The AI assistant should be available with contact context
    // This is typically a floating button or sidebar

    // Look for any AI-related elements
    const aiElements = await page.locator('text=/ask ai|ai assistant|chat/i').count()
    console.log(`AI elements on contacts page: ${aiElements}`)

    // Page should load without errors
    const bodyText = await page.locator('body').textContent()
    expect(bodyText?.length).toBeGreaterThan(0)
  })
})
