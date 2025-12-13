import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import type { AIMessage } from '@/lib/ai-assistant/types'

/**
 * GET /api/ai/conversations/[id]/messages
 * Get messages for a specific conversation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    const supabase = await createClient()

    // Verify conversation ownership
    const { data: conversation } = await supabase
      .from('ai_conversations')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
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

    return successResponse({
      messages: messages as AIMessage[],
      total: messages?.length || 0,
      has_more: (messages?.length || 0) === limit,
    })
  } catch (error) {
    logger.error('Error in GET /api/ai/conversations/[id]/messages:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
