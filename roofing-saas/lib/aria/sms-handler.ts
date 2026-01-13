/**
 * ARIA SMS Handler
 * Processes inbound SMS messages and generates AI-powered responses
 */

import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { buildARIAContext, findContactByPhone } from './context-builder'
import { getARIASystemPrompt } from './orchestrator'
import { ariaFunctionRegistry } from './function-registry'
import type { ARIAContext } from './types'
import { openai, getOpenAIModel } from '@/lib/ai/openai-client'
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions'
import type { FunctionCallParameters } from '@/lib/voice/providers/types'

export interface SMSHandlerResult {
  success: boolean
  response?: string
  contactId?: string
  contactName?: string
  shouldAutoSend: boolean
  reason?: string
  error?: string
}

interface InboundSMSParams {
  from: string
  to: string
  body: string
  tenantId: string
  contactId?: string
}

/**
 * Categories of messages that can be auto-responded
 * (Defined for reference - used in classifyMessageIntent)
 */
const _AUTO_RESPOND_CATEGORIES = [
  'greeting',        // "Hi", "Hello"
  'confirmation',    // "Yes", "Sounds good", "OK"
  'thanks',          // "Thank you", "Thanks"
  'simple_question', // "What time?", "Where?"
]

/**
 * Categories that require human review before responding
 * (Defined for reference - used in classifyMessageIntent)
 */
const _HUMAN_REVIEW_CATEGORIES = [
  'complaint',       // Angry/upset messages
  'reschedule',      // Appointment changes
  'pricing',         // Cost/payment questions
  'cancel',          // Cancellation requests
  'complex',         // Multi-part questions
]

// =============================================================================
// Girl Friday Phase 1: Enhanced Intent Classification (ML + Regex Fallback)
// =============================================================================

interface IntentClassification {
  category: string
  shouldAutoSend: boolean
  confidence: number
  reasoning?: string
}

/**
 * ML-based intent classification using OpenAI
 * Falls back to regex if ML fails
 */
async function classifyMessageIntentML(message: string): Promise<IntentClassification> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fast and cheap for classification
      messages: [
        {
          role: 'system',
          content: `You are an intent classifier for a roofing business SMS system.
Classify the customer message into one of these categories:
- greeting: Simple hello/hi messages
- confirmation: Yes/OK/sounds good responses
- thanks: Thank you messages
- question: General questions about services
- status: Checking on project/appointment status
- pricing: Questions about cost, quotes, payment
- reschedule: Wants to change appointment time
- cancel: Wants to cancel service/appointment
- complaint: Unhappy, frustrated, negative sentiment
- conversation: General back-and-forth chat

Also determine if the message can be auto-responded by AI or needs human review.
Auto-respond: greeting, confirmation, thanks, question, status, conversation
Human review: pricing, reschedule, cancel, complaint

Respond in JSON format:
{
  "category": "string",
  "shouldAutoSend": boolean,
  "confidence": number (0-1),
  "reasoning": "brief explanation"
}`
        },
        {
          role: 'user',
          content: `Classify: "${message}"`
        }
      ],
      temperature: 0.1,
      max_tokens: 150,
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (content) {
      const result = JSON.parse(content) as IntentClassification
      logger.debug('ML intent classification result', { message: message.slice(0, 50), result })
      return {
        category: result.category || 'conversation',
        shouldAutoSend: result.shouldAutoSend !== false,
        confidence: typeof result.confidence === 'number' ? result.confidence : 0.8,
        reasoning: result.reasoning,
      }
    }
  } catch (error) {
    logger.warn('ML intent classification failed, using regex fallback', { error })
  }

  // Fallback to regex-based classification
  return classifyMessageIntentRegex(message)
}

/**
 * Regex-based intent classification (fast fallback)
 */
function classifyMessageIntentRegex(message: string): IntentClassification {
  const lowerMessage = message.toLowerCase().trim()

  // === SENSITIVE CATEGORIES - Require human review ===

  // Complaints (negative sentiment - could escalate)
  if (/upset|angry|frustrated|terrible|horrible|worst|sue|lawyer|bbb|attorney|complain|rip\s*off|scam/i.test(lowerMessage)) {
    return { category: 'complaint', shouldAutoSend: false, confidence: 0.9 }
  }

  // Pricing/payment questions (could make promises we can't keep)
  if (/how\s*much|price|cost|quote|estimate|payment|invoice|bill|pay|financing|money/i.test(lowerMessage)) {
    return { category: 'pricing', shouldAutoSend: false, confidence: 0.8 }
  }

  // Cancellation requests (need human judgment)
  if (/cancel|don('t|t)\s*want|not\s*interested|stop\s*service|changed\s*my\s*mind/i.test(lowerMessage)) {
    return { category: 'cancel', shouldAutoSend: false, confidence: 0.85 }
  }

  // Reschedule requests (affects calendar/commitments)
  if (/reschedule|change.*time|different\s*(day|time)|can('t|not)\s*make\s*it|something\s*came\s*up|move\s*(the|my)\s*(appointment|meeting)/i.test(lowerMessage)) {
    return { category: 'reschedule', shouldAutoSend: false, confidence: 0.85 }
  }

  // === AUTO-SEND CATEGORIES - Safe for AI to respond ===

  // Greetings
  if (/^(hi|hello|hey|good\s*(morning|afternoon|evening))[\s!.]*$/i.test(lowerMessage)) {
    return { category: 'greeting', shouldAutoSend: true, confidence: 0.95 }
  }

  // Confirmations
  if (/^(yes|yeah|yep|ok|okay|sure|sounds?\s*good|perfect|great|absolutely|definitely)[\s!.]*$/i.test(lowerMessage)) {
    return { category: 'confirmation', shouldAutoSend: true, confidence: 0.9 }
  }

  // Thanks
  if (/^(thanks?|thank\s*you|thx|ty|appreciate)[\s!.]*$/i.test(lowerMessage)) {
    return { category: 'thanks', shouldAutoSend: true, confidence: 0.95 }
  }

  // General questions and conversation - AUTO-SEND
  return { category: 'conversation', shouldAutoSend: true, confidence: 0.7 }
}

// =============================================================================
// Girl Friday Phase 1: Graceful Error Handling
// =============================================================================

const FALLBACK_RESPONSE = "Thanks for your message! Someone from our team will get back to you shortly."

/**
 * Generate a safe fallback response when ARIA encounters errors
 */
function generateFallbackResponse(error: unknown, contactName?: string): SMSHandlerResult {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error'
  logger.error('ARIA SMS handler error - returning fallback', { error: errorMessage })

  return {
    success: true, // Return success so the webhook doesn't fail
    response: contactName
      ? `Hi ${contactName}! Thanks for reaching out. Someone from our team will get back to you shortly.`
      : FALLBACK_RESPONSE,
    shouldAutoSend: true, // Safe fallback can be auto-sent
    reason: 'Fallback response due to error',
    error: errorMessage,
  }
}

/**
 * Process an inbound SMS with ARIA and generate a response
 * Girl Friday Phase 1: Enhanced with ML classification, error handling, threading
 */
export async function handleInboundSMS(params: InboundSMSParams): Promise<SMSHandlerResult> {
  const { from, body, tenantId, contactId: providedContactId } = params

  logger.info('ARIA processing inbound SMS', { from, tenantId, bodyLength: body.length })

  let contact: ARIAContext['contact'] | null = null
  let contactId = providedContactId

  try {
    const supabase = await createAdminClient()

    // Find or use provided contact
    if (!contactId) {
      contact = await findContactByPhone(from, { tenantId, supabase })
      contactId = contact?.id
    }

    // Girl Friday: ML-based intent classification (with regex fallback)
    const { category, shouldAutoSend, confidence, reasoning } = await classifyMessageIntentML(body)

    logger.info('SMS classified', {
      category,
      shouldAutoSend,
      confidence,
      reasoning,
      contactFound: !!contact,
      method: reasoning ? 'ML' : 'regex',
    })

    // Build ARIA context
    const ariaContext = await buildARIAContext({
      tenantId,
      // Use a system user ID for automated responses
      userId: '00000000-0000-0000-0000-000000000000',
      supabase,
      channel: 'sms',
      entityType: contactId ? 'contact' : undefined,
      entityId: contactId,
    })

    // Override contact if we found one
    if (contact && !ariaContext.contact) {
      ariaContext.contact = contact
    }

    // Get additional context - upcoming appointments, recent projects
    let additionalContext = ''

    if (contactId) {
      // Get upcoming appointments/tasks
      const { data: upcomingTasks } = await supabase
        .from('tasks')
        .select('title, due_date, status')
        .eq('tenant_id', tenantId)
        .eq('contact_id', contactId)
        .gte('due_date', new Date().toISOString())
        .order('due_date', { ascending: true })
        .limit(3)

      if (upcomingTasks && upcomingTasks.length > 0) {
        additionalContext += '\n\nUpcoming appointments/tasks for this contact:\n'
        upcomingTasks.forEach(task => {
          const dueDate = new Date(task.due_date).toLocaleDateString()
          additionalContext += `- ${task.title} (${dueDate})\n`
        })
      }

      // Get active projects
      const { data: projects } = await supabase
        .from('projects')
        .select('name, status, pipeline_stage')
        .eq('tenant_id', tenantId)
        .eq('contact_id', contactId)
        .eq('is_deleted', false)
        .neq('status', 'lost')
        .order('created_at', { ascending: false })
        .limit(2)

      if (projects && projects.length > 0) {
        additionalContext += '\n\nActive projects:\n'
        projects.forEach(project => {
          additionalContext += `- ${project.name} (${project.pipeline_stage || project.status})\n`
        })
      }
    }

    // Build the system prompt with SMS-specific instructions
    let systemPrompt = getARIASystemPrompt(ariaContext)

    // Add SMS-specific instructions
    systemPrompt += `

## SMS Response Guidelines

You are responding to an inbound SMS message. Important guidelines:
- Keep responses under 160 characters if possible (1 SMS segment)
- Be warm, professional, and helpful
- Use simple, clear language
- Never make promises about pricing without checking first

**Consent-First Communication:**
- ASK before committing: "Would you like someone to call you?" not "Someone will call you"
- OFFER options: "I can have someone call, or would you prefer to text?"
- Only CONFIRM after they say yes: "Great! I'll arrange that callback for you."
- For appointment changes: "Would you like me to have someone call to reschedule?"
${additionalContext}

Message category: ${category} (confidence: ${(confidence * 100).toFixed(0)}%)
${shouldAutoSend ? 'This is a simple message - response can be sent automatically.' : 'This message requires human review before sending.'}
`

    // Build messages for OpenAI
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Customer SMS from ${contact?.first_name || 'unknown contact'}: "${body}"`
      },
    ]

    // Get ARIA tools
    const tools = ariaFunctionRegistry.getChatCompletionTools() as ChatCompletionTool[]

    // Generate response with OpenAI
    const completion = await openai.chat.completions.create({
      model: getOpenAIModel(),
      messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? 'auto' : undefined,
      temperature: 0.7,
      max_tokens: 300,
    })

    let responseContent = completion.choices[0]?.message?.content || ''
    const toolCalls = completion.choices[0]?.message?.tool_calls

    // Handle tool calls if any
    if (toolCalls && toolCalls.length > 0) {
      const currentMessages = [...messages]

      // Add assistant message with tool calls
      currentMessages.push({
        role: 'assistant',
        content: responseContent || null,
        tool_calls: toolCalls,
      })

      // Execute each tool
      for (const toolCall of toolCalls) {
        // Skip non-function tool calls
        if (toolCall.type !== 'function') {
          continue
        }

        let args: FunctionCallParameters = {}
        try {
          args = JSON.parse(toolCall.function.arguments || '{}')
        } catch {
          args = {}
        }

        logger.info('ARIA SMS executing tool', {
          tool: toolCall.function.name,
          args
        })

        const ariaFunction = ariaFunctionRegistry.get(toolCall.function.name)
        let toolResult: { success: boolean; data?: unknown; error?: string }

        if (ariaFunction) {
          try {
            toolResult = await ariaFunction.execute(args, ariaContext)
          } catch (error) {
            toolResult = {
              success: false,
              error: error instanceof Error ? error.message : 'Tool failed',
            }
          }
        } else {
          toolResult = { success: false, error: 'Unknown function' }
        }

        currentMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        })
      }

      // Get final response after tool execution
      const finalCompletion = await openai.chat.completions.create({
        model: getOpenAIModel(),
        messages: currentMessages,
        temperature: 0.7,
        max_tokens: 300,
      })

      responseContent = finalCompletion.choices[0]?.message?.content || responseContent
    }

    // Clean up response for SMS
    responseContent = responseContent
      .replace(/\*\*/g, '')  // Remove markdown bold
      .replace(/\n+/g, ' ')  // Collapse newlines
      .trim()

    // Log the generated response
    logger.info('ARIA SMS response generated', {
      contactId,
      category,
      shouldAutoSend,
      responseLength: responseContent.length,
    })

    return {
      success: true,
      response: responseContent,
      contactId,
      contactName: contact ? `${contact.first_name} ${contact.last_name}`.trim() : undefined,
      shouldAutoSend,
      reason: shouldAutoSend
        ? `Auto-send enabled for ${category} messages`
        : `Requires human review: ${category}`,
    }

  } catch (error) {
    // Girl Friday: Graceful error handling - return a safe fallback response
    // instead of failing the webhook entirely
    return generateFallbackResponse(
      error,
      contact?.first_name || undefined
    )
  }
}

/**
 * Queue an SMS response for human approval
 */
export async function queueSMSForApproval(params: {
  tenantId: string
  from: string
  inboundMessage: string
  suggestedResponse: string
  contactId?: string
  contactName?: string
  category: string
}): Promise<{ success: boolean; queueId?: string; error?: string }> {
  try {
    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('sms_approval_queue')
      .insert({
        tenant_id: params.tenantId,
        phone_number: params.from,
        contact_id: params.contactId,
        inbound_message: params.inboundMessage,
        suggested_response: params.suggestedResponse,
        category: params.category,
        status: 'pending',
        metadata: {
          contact_name: params.contactName,
          generated_at: new Date().toISOString(),
        },
      })
      .select('id')
      .single()

    if (error) {
      // Table might not exist yet - log and continue
      logger.warn('Failed to queue SMS for approval (table may not exist)', { error })
      return { success: false, error: error.message }
    }

    return { success: true, queueId: data?.id }
  } catch (error) {
    logger.error('Error queuing SMS for approval', { error })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Queue failed'
    }
  }
}

// =============================================================================
// Girl Friday Phase 1: Conversation Threading
// =============================================================================

/**
 * Log an SMS message as an activity for conversation tracking
 * This enables ARIA to see the conversation history via context enrichment
 */
export async function logSMSActivity(params: {
  tenantId: string
  contactId?: string
  phone: string
  body: string
  direction: 'inbound' | 'outbound'
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    const supabase = await createAdminClient()

    await supabase.from('activities').insert({
      tenant_id: params.tenantId,
      contact_id: params.contactId,
      type: 'sms',
      subject: params.direction === 'inbound' ? 'SMS Received' : 'SMS Sent',
      content: params.body,
      direction: params.direction,
      metadata: {
        phone: params.phone,
        channel: 'sms',
        aria_generated: params.direction === 'outbound',
        ...params.metadata,
      },
    })

    logger.debug('SMS activity logged', {
      direction: params.direction,
      contactId: params.contactId,
      phone: params.phone,
    })
  } catch (error) {
    // Don't fail the main flow if activity logging fails
    logger.warn('Failed to log SMS activity', { error })
  }
}

/**
 * Get recent conversation context for a phone number
 * Used to maintain conversation continuity
 */
export async function getConversationThread(params: {
  tenantId: string
  phone: string
  limit?: number
}): Promise<Array<{ direction: 'inbound' | 'outbound'; body: string; timestamp: string }>> {
  try {
    const supabase = await createAdminClient()
    const { phone, tenantId, limit = 5 } = params

    // Normalize phone for matching
    const normalizedPhone = phone.replace(/\D/g, '')
    const phoneVariants = [
      normalizedPhone,
      `+1${normalizedPhone}`,
      normalizedPhone.slice(-10),
    ]

    const { data: activities } = await supabase
      .from('activities')
      .select('content, direction, created_at')
      .eq('tenant_id', tenantId)
      .eq('type', 'sms')
      .or(phoneVariants.map((p) => `metadata->>phone.ilike.%${p}%`).join(','))
      .order('created_at', { ascending: false })
      .limit(limit)

    if (!activities) return []

    return activities.map((a) => ({
      direction: (a.direction as 'inbound' | 'outbound') || 'outbound',
      body: a.content || '',
      timestamp: a.created_at,
    })).reverse() // Oldest first for reading order
  } catch (error) {
    logger.warn('Failed to get conversation thread', { error })
    return []
  }
}
