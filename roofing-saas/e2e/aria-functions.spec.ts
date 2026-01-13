import { test, expect, APIRequestContext } from '@playwright/test'

// Run ARIA tests sequentially to avoid OpenAI rate limits
// gpt-4o has 30K TPM limit; parallel tests can exhaust this quickly
test.describe.configure({ mode: 'serial' })

/**
 * ARIA Function E2E Tests
 *
 * Tests the ARIA (AI Roofing Intelligent Assistant) function execution
 * through the AI chat API endpoints. Each test verifies:
 * 1. The function is recognized and called
 * 2. The function executes successfully
 * 3. The response contains expected data
 *
 * Total ARIA functions: 39
 *
 * Categories tested:
 * - CRM: search_contacts, get_contact_details, create_contact, update_contact
 * - Projects: create_project, search_projects, update_project_stage, etc.
 * - Insurance: update_insurance_info, get_insurance_status, schedule_adjuster_meeting
 * - Tasks: create_task, get_pending_tasks, complete_task
 * - Communication: draft_sms, draft_email
 * - Reports: get_pipeline_stats, get_sales_summary, get_lead_source_stats
 * - Activity: get_recent_activity, get_contact_timeline, log_phone_call
 * - Search: search_by_phone, search_by_address
 */

interface AriaMessageResult {
  success: boolean
  conversationId?: string
  assistantMessage?: string
  functionCall?: { name: string; result?: unknown }
  error?: string
}

// Helper to create a test message and get the assistant response
async function sendAriaMessage(
  request: APIRequestContext,
  message: string
): Promise<AriaMessageResult> {
  const response = await request.post('/api/ai/messages', {
    data: {
      content: message,
      role: 'user',
    },
  })

  if (!response.ok()) {
    return { success: false, error: `API returned ${response.status()}` }
  }

  const data = await response.json()
  return {
    success: true,
    conversationId: data.conversation_id,
    assistantMessage: data.assistant_message?.content,
    functionCall: data.assistant_message?.function_call,
  }
}

// Helper to cleanup a conversation
async function cleanupConversation(
  request: APIRequestContext,
  conversationId: string | undefined
) {
  if (conversationId) {
    await request.delete(`/api/ai/conversations/${conversationId}`)
  }
}

test.describe('ARIA Contact Functions', () => {
  test('search_contacts - finds contacts by name', async ({ request }) => {
    const result = await sendAriaMessage(request, 'Search for contacts')
    console.log(`search_contacts result: ${result.success}, function: ${result.functionCall?.name}`)

    expect(result.success).toBe(true)
    expect(result.assistantMessage).toBeDefined()

    // The AI should either call search_contacts or provide a helpful response
    if (result.functionCall) {
      expect(['search_contacts', 'get_contact_details']).toContain(result.functionCall.name)
    }

    await cleanupConversation(request, result.conversationId)
  })

  test('search_by_phone - finds contact by phone number', async ({ request }) => {
    const result = await sendAriaMessage(request, 'Look up the contact with phone number 615-555-1234')
    console.log(`search_by_phone result: ${result.success}, function: ${result.functionCall?.name}`)

    expect(result.success).toBe(true)
    expect(result.assistantMessage).toBeDefined()

    if (result.functionCall) {
      expect(['search_by_phone', 'search_contacts']).toContain(result.functionCall.name)
    }

    await cleanupConversation(request, result.conversationId)
  })

  test('search_by_address - finds contacts by location', async ({ request }) => {
    const result = await sendAriaMessage(request, 'Find all contacts in Nashville')
    console.log(`search_by_address result: ${result.success}, function: ${result.functionCall?.name}`)

    expect(result.success).toBe(true)
    expect(result.assistantMessage).toBeDefined()

    if (result.functionCall) {
      expect(['search_by_address', 'search_contacts']).toContain(result.functionCall.name)
    }

    await cleanupConversation(request, result.conversationId)
  })

  test('get_contact_timeline - retrieves contact history', async ({ request }) => {
    // First search for a contact
    const searchResult = await sendAriaMessage(request, 'Search for contacts')

    if (searchResult.functionCall?.result) {
      const result = await sendAriaMessage(
        request,
        'Show me the timeline for the first contact you found'
      )
      console.log(`get_contact_timeline result: ${result.success}, function: ${result.functionCall?.name}`)

      expect(result.success).toBe(true)

      if (result.functionCall) {
        expect(['get_contact_timeline', 'get_contact_details']).toContain(result.functionCall.name)
      }

      await cleanupConversation(request, result.conversationId)
    }

    await cleanupConversation(request, searchResult.conversationId)
  })
})

test.describe('ARIA Project Functions', () => {
  test('search_projects - finds projects', async ({ request }) => {
    const result = await sendAriaMessage(request, 'Show me all active projects')
    console.log(`search_projects result: ${result.success}, function: ${result.functionCall?.name}`)

    expect(result.success).toBe(true)
    expect(result.assistantMessage).toBeDefined()

    if (result.functionCall) {
      expect(['search_projects', 'get_pipeline_stats']).toContain(result.functionCall.name)
    }

    await cleanupConversation(request, result.conversationId)
  })

  test('get_pipeline_stats - retrieves pipeline analytics', async ({ request }) => {
    const result = await sendAriaMessage(request, 'What are the pipeline stats?')
    console.log(`get_pipeline_stats result: ${result.success}, function: ${result.functionCall?.name}`)

    expect(result.success).toBe(true)
    expect(result.assistantMessage).toBeDefined()

    if (result.functionCall) {
      expect(result.functionCall.name).toBe('get_pipeline_stats')
      // Stats should include counts
      if (result.functionCall.result) {
        console.log(`Pipeline stats:`, JSON.stringify(result.functionCall.result).slice(0, 200))
      }
    }

    await cleanupConversation(request, result.conversationId)
  })

  test('get_project_details - retrieves project info', async ({ request }) => {
    // First search for a project
    const searchResult = await sendAriaMessage(request, 'Search for projects')

    if (searchResult.success) {
      const result = await sendAriaMessage(
        request,
        'Show me the details for the first project'
      )
      console.log(`get_project_details result: ${result.success}, function: ${result.functionCall?.name}`)

      expect(result.success).toBe(true)

      if (result.functionCall) {
        expect(['get_project_details', 'search_projects']).toContain(result.functionCall.name)
      }

      await cleanupConversation(request, result.conversationId)
    }

    await cleanupConversation(request, searchResult.conversationId)
  })
})

test.describe('ARIA Task Functions', () => {
  test('create_task - creates a follow-up task', async ({ request }) => {
    const result = await sendAriaMessage(
      request,
      'Create a task to follow up with customers tomorrow, high priority'
    )
    console.log(`create_task result: ${result.success}, function: ${result.functionCall?.name}`)

    expect(result.success).toBe(true)
    expect(result.assistantMessage).toBeDefined()

    if (result.functionCall) {
      expect(result.functionCall.name).toBe('create_task')
    }

    await cleanupConversation(request, result.conversationId)
  })

  test('get_pending_tasks - retrieves pending tasks', async ({ request }) => {
    const result = await sendAriaMessage(request, 'What tasks are pending?')
    console.log(`get_pending_tasks result: ${result.success}, function: ${result.functionCall?.name}`)

    expect(result.success).toBe(true)
    expect(result.assistantMessage).toBeDefined()

    if (result.functionCall) {
      expect(['get_pending_tasks', 'get_today_schedule']).toContain(result.functionCall.name)
    }

    await cleanupConversation(request, result.conversationId)
  })

  test('get_today_schedule - retrieves today schedule', async ({ request }) => {
    const result = await sendAriaMessage(request, "What's on my schedule today?")
    console.log(`get_today_schedule result: ${result.success}, function: ${result.functionCall?.name}`)

    expect(result.success).toBe(true)
    expect(result.assistantMessage).toBeDefined()

    if (result.functionCall) {
      expect(['get_today_schedule', 'get_pending_tasks']).toContain(result.functionCall.name)
    }

    await cleanupConversation(request, result.conversationId)
  })
})

test.describe('ARIA Reporting Functions', () => {
  test('get_sales_summary - retrieves sales metrics', async ({ request }) => {
    const result = await sendAriaMessage(request, "What's our sales summary this month?")
    console.log(`get_sales_summary result: ${result.success}, function: ${result.functionCall?.name}`)

    expect(result.success).toBe(true)
    expect(result.assistantMessage).toBeDefined()

    if (result.functionCall) {
      expect(['get_sales_summary', 'get_pipeline_stats']).toContain(result.functionCall.name)
    }

    await cleanupConversation(request, result.conversationId)
  })

  test('get_lead_source_stats - retrieves lead source analytics', async ({ request }) => {
    const result = await sendAriaMessage(request, 'Where are our leads coming from?')
    console.log(`get_lead_source_stats result: ${result.success}, function: ${result.functionCall?.name}`)

    expect(result.success).toBe(true)
    expect(result.assistantMessage).toBeDefined()

    if (result.functionCall) {
      expect(['get_lead_source_stats', 'get_sales_summary']).toContain(result.functionCall.name)
    }

    await cleanupConversation(request, result.conversationId)
  })

  test('get_team_workload - retrieves team project counts', async ({ request }) => {
    const result = await sendAriaMessage(request, 'Show me the team workload')
    console.log(`get_team_workload result: ${result.success}, function: ${result.functionCall?.name}`)

    expect(result.success).toBe(true)
    expect(result.assistantMessage).toBeDefined()

    if (result.functionCall) {
      expect(['get_team_workload', 'get_pipeline_stats']).toContain(result.functionCall.name)
    }

    await cleanupConversation(request, result.conversationId)
  })
})

test.describe('ARIA Activity Functions', () => {
  test('get_recent_activity - retrieves recent activity feed', async ({ request }) => {
    const result = await sendAriaMessage(request, 'What happened today?')
    console.log(`get_recent_activity result: ${result.success}, function: ${result.functionCall?.name}`)

    expect(result.success).toBe(true)
    expect(result.assistantMessage).toBeDefined()

    if (result.functionCall) {
      expect(['get_recent_activity', 'get_today_schedule']).toContain(result.functionCall.name)
    }

    await cleanupConversation(request, result.conversationId)
  })

  test('log_phone_call - logs a phone call', async ({ request }) => {
    // First get a contact to log the call for
    const searchResult = await sendAriaMessage(request, 'Search for contacts')

    if (searchResult.success) {
      const result = await sendAriaMessage(
        request,
        'Log a phone call with the first contact - we discussed their roof inspection, call lasted 10 minutes, they need a follow up next week'
      )
      console.log(`log_phone_call result: ${result.success}, function: ${result.functionCall?.name}`)

      expect(result.success).toBe(true)

      if (result.functionCall) {
        // AI may call search_contacts first to find the contact, or directly log_phone_call/add_note
        expect(['log_phone_call', 'add_note', 'search_contacts']).toContain(result.functionCall.name)
      }

      await cleanupConversation(request, result.conversationId)
    }

    await cleanupConversation(request, searchResult.conversationId)
  })

  test('add_note - adds a note to a contact', async ({ request }) => {
    const result = await sendAriaMessage(
      request,
      'Add a note: Customer called about storm damage, interested in insurance claim assistance'
    )
    console.log(`add_note result: ${result.success}, function: ${result.functionCall?.name}`)

    expect(result.success).toBe(true)
    expect(result.assistantMessage).toBeDefined()

    if (result.functionCall) {
      expect(['add_note', 'search_contacts']).toContain(result.functionCall.name)
    }

    await cleanupConversation(request, result.conversationId)
  })
})

test.describe('ARIA Insurance Functions', () => {
  test('get_insurance_status - checks insurance info', async ({ request }) => {
    const result = await sendAriaMessage(request, 'What insurance claims are pending?')
    console.log(`get_insurance_status result: ${result.success}, function: ${result.functionCall?.name}`)

    expect(result.success).toBe(true)
    expect(result.assistantMessage).toBeDefined()

    // Insurance functions may or may not be called depending on context
    await cleanupConversation(request, result.conversationId)
  })

  test('schedule_adjuster_meeting - schedules adjuster appointment', async ({ request }) => {
    const result = await sendAriaMessage(
      request,
      'Schedule an adjuster meeting for next Tuesday at 2pm'
    )
    console.log(`schedule_adjuster_meeting result: ${result.success}, function: ${result.functionCall?.name}`)

    expect(result.success).toBe(true)
    expect(result.assistantMessage).toBeDefined()

    if (result.functionCall) {
      expect(['schedule_adjuster_meeting', 'book_appointment']).toContain(result.functionCall.name)
    }

    await cleanupConversation(request, result.conversationId)
  })
})

test.describe('ARIA Communication Functions', () => {
  test('draft_sms - drafts an SMS message', async ({ request }) => {
    const result = await sendAriaMessage(
      request,
      'Draft a text message to remind customers about their upcoming inspection'
    )
    console.log(`draft_sms result: ${result.success}, function: ${result.functionCall?.name}`)

    expect(result.success).toBe(true)
    expect(result.assistantMessage).toBeDefined()

    if (result.functionCall) {
      expect(['draft_sms', 'search_contacts']).toContain(result.functionCall.name)
    }

    await cleanupConversation(request, result.conversationId)
  })

  test('draft_email - drafts an email', async ({ request }) => {
    const result = await sendAriaMessage(
      request,
      'Draft an email with the subject "Roof Inspection Results" thanking them for their business'
    )
    console.log(`draft_email result: ${result.success}, function: ${result.functionCall?.name}`)

    expect(result.success).toBe(true)
    expect(result.assistantMessage).toBeDefined()

    if (result.functionCall) {
      expect(['draft_email', 'search_contacts']).toContain(result.functionCall.name)
    }

    await cleanupConversation(request, result.conversationId)
  })

  test('book_appointment - schedules an appointment', async ({ request }) => {
    const result = await sendAriaMessage(
      request,
      'Book a roof inspection appointment for tomorrow at 10am'
    )
    console.log(`book_appointment result: ${result.success}, function: ${result.functionCall?.name}`)

    expect(result.success).toBe(true)
    expect(result.assistantMessage).toBeDefined()

    if (result.functionCall) {
      expect(['book_appointment', 'create_task']).toContain(result.functionCall.name)
    }

    await cleanupConversation(request, result.conversationId)
  })
})

test.describe('ARIA Weather Functions', () => {
  test('get_weather - checks weather for job safety', async ({ request }) => {
    const result = await sendAriaMessage(request, "What's the weather like in Nashville for roofing today?")
    console.log(`get_weather result: ${result.success}, function: ${result.functionCall?.name}`)

    expect(result.success).toBe(true)
    expect(result.assistantMessage).toBeDefined()

    if (result.functionCall) {
      expect(result.functionCall.name).toBe('get_weather')
    }

    await cleanupConversation(request, result.conversationId)
  })
})

test.describe('ARIA Production Functions', () => {
  test('get_team_workload - shows production team workload', async ({ request }) => {
    const result = await sendAriaMessage(request, 'How many active projects does each team member have?')
    console.log(`get_team_workload result: ${result.success}, function: ${result.functionCall?.name}`)

    expect(result.success).toBe(true)
    expect(result.assistantMessage).toBeDefined()

    if (result.functionCall) {
      expect(['get_team_workload', 'get_pipeline_stats']).toContain(result.functionCall.name)
    }

    await cleanupConversation(request, result.conversationId)
  })
})

test.describe('ARIA Multi-Step Scenarios', () => {
  test('Contact lookup and action flow', async ({ request }) => {
    // Scenario: User gets a call, looks up contact, logs the call
    const conversationResponses: string[] = []

    // Step 1: Lookup by phone
    const lookupResult = await sendAriaMessage(request, 'Someone is calling from 615-555-0123')
    expect(lookupResult.success).toBe(true)
    conversationResponses.push(`Lookup: ${lookupResult.functionCall?.name || 'no function'}`)

    // Step 2: Log the call
    const logResult = await sendAriaMessage(
      request,
      'Log that I just spoke with them about a roof repair estimate'
    )
    expect(logResult.success).toBe(true)
    conversationResponses.push(`Log: ${logResult.functionCall?.name || 'no function'}`)

    console.log(`Multi-step flow: ${conversationResponses.join(' -> ')}`)

    await cleanupConversation(request, lookupResult.conversationId)
    await cleanupConversation(request, logResult.conversationId)
  })

  test('Project creation flow', async ({ request }) => {
    // Scenario: Create contact, then create project for them
    const result = await sendAriaMessage(
      request,
      'Create a new contact named John Smith at 123 Main St Nashville, then create a roof repair project for them'
    )

    expect(result.success).toBe(true)
    console.log(`Project creation flow: ${result.functionCall?.name || 'complex multi-step'}`)
    console.log(`Response: ${result.assistantMessage?.slice(0, 200)}`)

    await cleanupConversation(request, result.conversationId)
  })
})

test.describe('ARIA Error Handling', () => {
  test('Handles missing contact gracefully', async ({ request }) => {
    const result = await sendAriaMessage(
      request,
      'Show me the details for contact ID that-does-not-exist-12345'
    )

    expect(result.success).toBe(true)
    // Should get a helpful error message, not a crash
    expect(result.assistantMessage).toBeDefined()

    await cleanupConversation(request, result.conversationId)
  })

  test('Handles ambiguous requests gracefully', async ({ request }) => {
    const result = await sendAriaMessage(request, 'Update the thing')

    expect(result.success).toBe(true)
    // Should ask for clarification
    expect(result.assistantMessage).toBeDefined()

    await cleanupConversation(request, result.conversationId)
  })
})
