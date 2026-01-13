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

/**
 * Classify the intent of an inbound message
 */
function classifyMessageIntent(message: string): {
  category: string
  shouldAutoSend: boolean
  confidence: number
} {
  const lowerMessage = message.toLowerCase().trim()

  // Simple pattern matching for common intents
  // In production, this could use a classifier model

  // Greetings
  if (/^(hi|hello|hey|good\s*(morning|afternoon|evening))[\s!.]*$/i.test(lowerMessage)) {
    return { category: 'greeting', shouldAutoSend: true, confidence: 0.95 }
  }

  // Confirmations
  if (/^(yes|yeah|yep|ok|okay|sure|sounds?\s*good|perfect|great)[\s!.]*$/i.test(lowerMessage)) {
    return { category: 'confirmation', shouldAutoSend: true, confidence: 0.9 }
  }

  // Thanks
  if (/^(thanks?|thank\s*you|thx|ty)[\s!.]*$/i.test(lowerMessage)) {
    return { category: 'thanks', shouldAutoSend: true, confidence: 0.95 }
  }

  // Reschedule requests
  if (/reschedule|change.*time|different\s*(day|time)|can('t|not)\s*make\s*it|something\s*came\s*up/i.test(lowerMessage)) {
    return { category: 'reschedule', shouldAutoSend: false, confidence: 0.85 }
  }

  // Pricing/payment questions
  if (/how\s*much|price|cost|payment|invoice|bill|pay/i.test(lowerMessage)) {
    return { category: 'pricing', shouldAutoSend: false, confidence: 0.8 }
  }

  // Cancellation
  if (/cancel|don('t|t)\s*want|not\s*interested|stop\s*service/i.test(lowerMessage)) {
    return { category: 'cancel', shouldAutoSend: false, confidence: 0.85 }
  }

  // Complaints (negative sentiment indicators)
  if (/upset|angry|frustrated|terrible|horrible|worst|sue|lawyer|bbb|attorney/i.test(lowerMessage)) {
    return { category: 'complaint', shouldAutoSend: false, confidence: 0.9 }
  }

  // Default: complex/unknown - needs human review
  return { category: 'complex', shouldAutoSend: false, confidence: 0.5 }
}

/**
 * Process an inbound SMS with ARIA and generate a response
 */
export async function handleInboundSMS(params: InboundSMSParams): Promise<SMSHandlerResult> {
  const { from, body, tenantId, contactId: providedContactId } = params

  logger.info('ARIA processing inbound SMS', { from, tenantId, bodyLength: body.length })

  try {
    const supabase = await createAdminClient()

    // Find or use provided contact
    let contactId = providedContactId
    let contact: ARIAContext['contact'] | null = null

    if (!contactId) {
      contact = await findContactByPhone(from, { tenantId, supabase })
      contactId = contact?.id
    }

    // Classify the message intent
    const { category, shouldAutoSend, confidence } = classifyMessageIntent(body)

    logger.info('SMS classified', {
      category,
      shouldAutoSend,
      confidence,
      contactFound: !!contact
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
- If the customer needs something complex, offer to have someone call them
- Never make promises about pricing without checking first
- For appointment changes, acknowledge and say someone will confirm the new time
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
    logger.error('ARIA SMS handler error', { error, from, tenantId })
    return {
      success: false,
      shouldAutoSend: false,
      error: error instanceof Error ? error.message : 'Failed to generate response',
    }
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
