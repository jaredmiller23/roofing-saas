import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
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
export const GET = withAuth(async (request, { userId, tenantId }) => {
  const startTime = Date.now()

  try {
    logger.apiRequest('GET', '/api/messages/conversations', { tenantId, userId })

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

    return successResponse(conversationList)
  } catch (error) {
    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/messages/conversations', 500, duration)
    logger.error('Failed to load conversations', { error: (error as Error).message })
    return errorResponse(error as Error)
  }
})
