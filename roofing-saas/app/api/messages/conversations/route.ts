import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { AuthenticationError, AuthorizationError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'

/**
 * GET /api/messages/conversations
 * Get all SMS conversations for the current user's tenant
 *
 * Returns conversations grouped by contact with:
 * - Latest message preview
 * - Unread message count
 * - Contact information
 *
 * Uses database function `get_sms_conversations()` for efficient querying
 */
export async function GET() {
  const startTime = Date.now()

  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('User not authenticated')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User is not associated with a tenant')
    }

    logger.apiRequest('GET', '/api/messages/conversations', { tenantId, userId: user.id })

    const supabase = await createClient()

    // Call database function to get conversations with unread counts
    const { data: conversations, error } = await supabase.rpc('get_sms_conversations', {
      p_tenant_id: tenantId,
    })

    if (error) {
      logger.error('Failed to load conversations', { error, tenantId })
      throw new Error(`Failed to load conversations: ${error.message}`)
    }

    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/messages/conversations', 200, duration)
    const conversationList = (conversations ?? []) as Record<string, unknown>[]
    logger.info('Conversations loaded', { conversationCount: conversationList.length })

    return successResponse({
      conversations: conversationList,
      count: conversationList.length,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/messages/conversations', 500, duration)
    logger.error('Failed to load conversations', { error: (error as Error).message })
    return errorResponse(error as Error)
  }
}
