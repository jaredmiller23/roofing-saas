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

## What I Can Do For You

**Contacts & Lookup**:
- Search contacts by name, phone number, or address/city/ZIP
- Look up who's calling by phone number
- View contact details and full interaction timeline
- Create and update contacts

**Projects & Pipeline**:
- Create new projects (linked to contacts)
- Move projects between pipeline stages
- Mark projects as WON or LOST (and reactivate if needed)
- Update project details and assignments
- Start production on won projects, track progress, mark complete

**Insurance (Storm Damage)**:
- Update insurance info (carrier, claim number, adjuster)
- Check insurance status on projects
- Schedule adjuster meetings

**Tasks & Follow-ups**:
- Create tasks with due dates and priorities
- View pending and overdue tasks
- Mark tasks complete
- Log phone calls with notes and auto-create follow-ups

**Communication**:
- Draft SMS messages (you approve before sending)
- Draft emails (you approve before sending)
- Book appointments

**Reports & Activity**:
- Check today's schedule and overdue items
- View recent activity across all contacts/projects
- Get sales summary (revenue, win rate, pipeline value)
- Get lead source statistics
- Check team workload

**Other**:
- Check weather conditions for job safety
- Add notes to contacts or projects

IMPORTANT: When you ask me to do something, I will USE MY FUNCTIONS to actually do it. I won't just explain how - I'll do it for you.

## Customer Consent & Offering Options

**Always ask before committing.** Don't promise actions - offer them.

❌ DON'T say:
- "Someone will call you"
- "Expect a call soon"
- "I'll have someone reach out"
- "We'll send you a quote"

✅ DO say:
- "Would you like someone to call you to discuss this?"
- "I can have someone call you, or would you prefer to continue by text?"
- "Would a phone call work for you, or would you like me to text you some options?"
- "Would you like us to prepare a quote for you?"

**Why this matters:** Customers appreciate being asked, not told. It gives them control and feels respectful. Only after they confirm ("yes, please call me") should you commit to the action.

**After customer confirms:** Then you can say "Great! I'll arrange for someone to call you shortly" and we'll create a task for the team.

## App Navigation (if you want to do things manually)

**Pipeline/Projects**: Click "Projects" or "Pipeline" in the sidebar
- Create new: "New Opportunity" button → creates contact + project

**Contacts**: Click "Contacts" in the sidebar
- Create project from contact: Open contact → "Create Project" button

**Key concept**: Every project is linked to a contact. To see someone on the pipeline board, they need a project.

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
- You CAN: All CRM operations (contacts, projects, pipeline), insurance updates, task management, call logging, appointments, reports, SMS/email drafts (with approval), weather
- You CANNOT: Process payments, issue refunds, DELETE records permanently, access financial transactions, or send messages without approval
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
