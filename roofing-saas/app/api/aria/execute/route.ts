/**
 * POST /api/aria/execute
 * Execute an ARIA function with full context enrichment
 *
 * Used by:
 * - Voice assistant for function calls
 * - Chat assistant for function calls
 * - Any client that needs to execute ARIA functions
 */

import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { logger } from '@/lib/logger'
import {
  ValidationError,
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { buildARIAContext, executeARIAFunction } from '@/lib/aria'
import type { ARIAContext } from '@/lib/aria'
import type { SupportedLanguage } from '@/lib/aria/types'
import { ariaRateLimit, applyRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import { translateResponse } from '@/lib/aria/language'

interface ExecuteRequest {
  function_name: string
  parameters: Record<string, unknown>
  context?: {
    contact_id?: string
    project_id?: string
    channel?: ARIAContext['channel']
    call_sid?: string
    session_id?: string
    language?: SupportedLanguage
  }
}

export const POST = withAuth(async (request, { userId, tenantId }) => {
  const startTime = Date.now()

  try {
    // Apply rate limiting by user ID
    const rateLimitResult = await applyRateLimit(
      request,
      ariaRateLimit,
      getClientIdentifier(request, userId)
    )

    if (rateLimitResult instanceof Response) {
      return rateLimitResult // Rate limit exceeded
    }

    const body: ExecuteRequest = await request.json()
    const { function_name, parameters, context } = body

    if (!function_name) {
      throw ValidationError('function_name is required')
    }

    logger.info('ARIA function execution request', {
      function: function_name,
      tenantId,
      userId,
      channel: context?.channel || 'api',
    })

    const supabase = await createClient()

    // Build ARIA context with enrichment
    const ariaContext: ARIAContext = await buildARIAContext({
      tenantId,
      userId,
      supabase,
      channel: context?.channel || 'chat',
      language: context?.language,
      entityType: context?.contact_id ? 'contact' : context?.project_id ? 'project' : undefined,
      entityId: context?.contact_id || context?.project_id,
      callSid: context?.call_sid,
      sessionId: context?.session_id,
    })

    // Execute the function (cast parameters to match expected type)
    const result = await executeARIAFunction(
      function_name,
      parameters as import('@/lib/voice/providers/types').FunctionCallParameters,
      ariaContext
    )

    // Phase 11: Translate result message if non-English
    const effectiveLanguage = ariaContext.language || 'en'
    if (effectiveLanguage !== 'en' && result.message) {
      result.message = await translateResponse(result.message, effectiveLanguage)
    }

    const duration = Date.now() - startTime
    logger.info('ARIA function execution complete', {
      function: function_name,
      success: result.success,
      duration,
    })

    // Create response with rate limit headers
    const response = successResponse(result)

    // Add rate limit headers if available
    if (rateLimitResult && rateLimitResult.headers) {
      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
    }

    return response
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('ARIA function execution error', { error, duration })
    return errorResponse(error as Error)
  }
})

/**
 * GET /api/aria/execute
 * Returns available ARIA functions (for client discovery)
 */
export const GET = withAuth(async (request, { userId }) => {
  try {
    // Apply rate limiting by user ID
    const rateLimitResult = await applyRateLimit(
      request,
      ariaRateLimit,
      getClientIdentifier(request, userId)
    )

    if (rateLimitResult instanceof Response) {
      return rateLimitResult // Rate limit exceeded
    }

    // Import registry to get available functions
    const { ariaFunctionRegistry } = await import('@/lib/aria')

    // Get voice function definitions (safe to expose)
    const functions = ariaFunctionRegistry.getVoiceFunctions()

    const response = successResponse({
      functions,
      count: functions.length,
      categories: ['crm', 'quickbooks', 'actions', 'weather'],
    })

    // Add rate limit headers if available
    if (rateLimitResult && rateLimitResult.headers) {
      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
    }

    return response
  } catch (error) {
    logger.error('Error getting ARIA functions', { error })
    return errorResponse(error as Error)
  }
})
