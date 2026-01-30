/**
 * ARIA Orchestrator
 * Main controller that coordinates function execution and context management
 */

import { logger } from '@/lib/logger'
import type { FunctionCallParameters } from '@/lib/voice/providers/types'
import type { ARIAContext, ARIAExecutionResult, ARIAOrchestrator } from './types'
import { ariaFunctionRegistry } from './function-registry'
import { buildARIAContext, getContextSummary } from './context-builder'
import { getLocalizedSystemPrompt } from './system-prompts'

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
    const language = context.language || 'en'

    // Use pre-translated system prompt (includes base + channel + authorization)
    let prompt = getLocalizedSystemPrompt(language, context.channel)

    // Add context summary (stays English — internal data labels, LLM handles mixed-language fine)
    if (contextSummary) {
      prompt += `\n\nCurrent context:\n${contextSummary}`
    }

    // For non-English: instruct the model to respond in the target language
    if (language !== 'en') {
      const languageNames: Record<string, string> = {
        es: 'Spanish',
        fr: 'French',
      }
      prompt += `\n\nIMPORTANT: You MUST respond in ${languageNames[language] || language}. All responses to the customer must be in ${languageNames[language] || language}.`
    }

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
