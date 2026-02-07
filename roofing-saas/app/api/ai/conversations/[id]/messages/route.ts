import { createClient } from '@/lib/supabase/server'
import { withAuthParams } from '@/lib/auth/with-auth'
import { logger } from '@/lib/logger'
import { NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import type { AIMessage } from '@/lib/ai-assistant/types'

/**
 * GET /api/ai/conversations/[id]/messages
 * Get messages for a specific conversation
 */
export const GET = withAuthParams(async (request, { userId, tenantId }, { params }) => {
  try {
    const { id } = await params

    const supabase = await createClient()

    // Verify conversation ownership
    const { data: conversation } = await supabase
      .from('ai_conversations')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .single()

    if (!conversation) {
      throw NotFoundError('Conversation not found')
    }

    // Query parameters for pagination
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    const before = searchParams.get('before') // Cursor for loading older messages

    // Fetch messages
    let query = supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (before) {
      query = query.lt('created_at', before)
    }

    const { data: messages, error } = await query

    if (error) {
      logger.error('Error fetching messages:', { error })
      throw InternalError('Failed to fetch messages')
    }

    return successResponse(messages as AIMessage[])
  } catch (error) {
    logger.error('Error in GET /api/ai/conversations/[id]/messages:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
