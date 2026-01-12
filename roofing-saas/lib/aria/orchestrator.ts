/**
 * ARIA Orchestrator
 * Main controller that coordinates function execution and context management
 */

import { logger } from '@/lib/logger'
import type { FunctionCallParameters } from '@/lib/voice/providers/types'
import type { ARIAContext, ARIAExecutionResult, ARIAOrchestrator } from './types'
import { ariaFunctionRegistry } from './function-registry'
import { buildARIAContext, getContextSummary } from './context-builder'

/**
 * ARIA Orchestrator Implementation
 */
class Orchestrator implements ARIAOrchestrator {
  /**
   * Execute an ARIA function with authorization checks
   */
  async executeFunction(
    name: string,
    args: FunctionCallParameters,
    context: ARIAContext
  ): Promise<ARIAExecutionResult> {
    const fn = ariaFunctionRegistry.get(name)

    if (!fn) {
      logger.warn('Unknown ARIA function called:', { name, args })
      return {
        success: false,
        error: `Unknown function: ${name}`,
      }
    }

    // Check if function requires confirmation and it's not provided
    if (fn.requiresConfirmation && context.requiresConfirmation !== false) {
      return {
        success: false,
        awaitingConfirmation: true,
        confirmationPrompt: `Are you sure you want to ${fn.description.toLowerCase()}?`,
      }
    }

    // Log function execution
    logger.info('ARIA function execution:', {
      function: name,
      category: fn.category,
      riskLevel: fn.riskLevel,
      userId: context.userId,
      channel: context.channel,
    })

    try {
      const result = await fn.execute(args, context)

      // Log result
      if (result.success) {
        logger.debug('ARIA function succeeded:', { function: name })
      } else {
        logger.warn('ARIA function failed:', { function: name, error: result.error })
      }

      return {
        success: result.success,
        data: result.data,
        error: result.error,
        message: result.message,
      }
    } catch (error) {
      logger.error('ARIA function error:', { function: name, error })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Function execution failed',
      }
    }
  }

  /**
   * Enrich context with relevant data
   */
  async enrichContext(baseContext: Partial<ARIAContext>): Promise<ARIAContext> {
    return buildARIAContext(baseContext)
  }

  /**
   * Get system prompt based on context and channel
   */
  getSystemPrompt(context: ARIAContext): string {
    const contextSummary = getContextSummary(context)

    // Base prompt
    let prompt = `You are ARIA, an AI assistant for a Tennessee roofing company. You help with customer service, employee questions, and CRM management.

Your capabilities include:
- Searching contacts, projects, and past activities/notes
- Creating NEW contacts and NEW projects
- Updating contact info (phone, email, address)
- Moving projects between pipeline stages
- Marking projects as WON or LOST
- Booking appointments and scheduling follow-ups
- Checking today's schedule and overdue tasks
- Answering questions about weather for job safety
- Sending SMS and email (with approval)
- Creating tasks and scheduling callbacks

IMPORTANT: When users ask you to do something, USE YOUR FUNCTIONS to actually do it. Don't just explain how - do it for them.

## App Navigation (if users ask how to do things manually)

**Pipeline/Projects**: The pipeline board shows all active projects organized by stage.
- Access: Click "Projects" or "Pipeline" in the left sidebar
- Create new: "New Opportunity" button (top right) → creates a contact first, then project

**Contacts**: Customer database with all contact information.
- Access: Click "Contacts" in the left sidebar
- Create new: "New Contact" button (top right)
- Create project from contact: Open a contact → "Create Project" button

**Key concept**: Every project MUST be linked to a contact. To see someone on the pipeline board, they need a project associated with them.

**To move a contact to the pipeline board**:
1. If they don't have a project yet → create one (I can do this for you with create_project)
2. The project will appear on the pipeline in the stage you select

Be helpful, professional, and concise.`

    // Add channel-specific instructions
    if (context.channel === 'voice_inbound') {
      prompt += `

You are answering an inbound phone call. Be warm and professional.
- Greet the caller appropriately
- Try to identify who is calling (ask for name if needed)
- Understand their needs
- Either help them directly or offer to have someone call them back
- If they want to leave a message, take it carefully`
    } else if (context.channel === 'voice_outbound') {
      prompt += `

You are on an outbound call. The call was initiated by a team member.
- Be professional and to the point
- Help the team member with their task`
    } else if (context.channel === 'sms') {
      prompt += `

You are responding via SMS text message.
- Keep responses brief and to the point
- Use simple language
- If complex, offer to call them instead`
    }

    // Add context summary
    if (contextSummary) {
      prompt += `

Current context:
${contextSummary}`
    }

    // Add authorization notes
    prompt += `

Authorization rules:
- You CAN: Search/create/update contacts, search/create/update projects, move pipeline stages, mark won/lost, add notes, book appointments, check schedule, send SMS/email (with approval), check weather
- You CANNOT: Process payments, issue refunds, DELETE records permanently, or access financial transactions
- If someone asks you to do something you cannot do, politely explain and offer alternatives`

    return prompt
  }

  /**
   * Get available functions for a given context
   */
  getAvailableFunctions(_integrations: string[] = []): typeof ariaFunctionRegistry {
    // Could filter based on integrations, but for now return all
    return ariaFunctionRegistry
  }
}

// Singleton instance
export const ariaOrchestrator = new Orchestrator()

// =============================================================================
// Helper functions
// =============================================================================

/**
 * Quick function execution without building full context
 * Use when context is already built
 */
export async function executeARIAFunction(
  name: string,
  args: FunctionCallParameters,
  context: ARIAContext
): Promise<ARIAExecutionResult> {
  return ariaOrchestrator.executeFunction(name, args, context)
}

/**
 * Get system prompt for a given context
 */
export function getARIASystemPrompt(context: ARIAContext): string {
  return ariaOrchestrator.getSystemPrompt(context)
}

/**
 * Build context and get system prompt in one call
 */
export async function initializeARIA(
  baseContext: Partial<ARIAContext>
): Promise<{ context: ARIAContext; systemPrompt: string }> {
  const context = await buildARIAContext(baseContext)
  const systemPrompt = ariaOrchestrator.getSystemPrompt(context)
  return { context, systemPrompt }
}

export default ariaOrchestrator
