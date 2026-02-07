import { createClient } from '@/lib/supabase/server'
import { withAuthParams } from '@/lib/auth/with-auth'
import { logger } from '@/lib/logger'
import { NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

/**
 * GET /api/ai/conversations/[id]
 * Get a specific conversation
 */
export const GET = withAuthParams(async (request, { userId, tenantId }, { params }) => {
  try {
    const { id } = await params

    const supabase = await createClient()

    const { data: conversation, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .single()

    if (error || !conversation) {
      throw NotFoundError('Conversation not found')
    }

    return successResponse(conversation)
  } catch (error) {
    logger.error('Error in GET /api/ai/conversations/[id]:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

/**
 * PATCH /api/ai/conversations/[id]
 * Update a conversation (archive, change title, etc.)
 */
export const PATCH = withAuthParams(async (request, { userId, tenantId }, { params }) => {
  try {
    const { id } = await params

    const body = await request.json()
    const { title, is_active, metadata } = body

    const supabase = await createClient()

    // Build update object (only include provided fields)
    const updates: Record<string, unknown> = {}
    if (title !== undefined) updates.title = title
    if (is_active !== undefined) updates.is_active = is_active
    if (metadata !== undefined) updates.metadata = metadata

    const { data: conversation, error } = await supabase
      .from('ai_conversations')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error || !conversation) {
      throw InternalError('Failed to update conversation')
    }

    return successResponse(conversation)
  } catch (error) {
    logger.error('Error in PATCH /api/ai/conversations/[id]:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

/**
 * DELETE /api/ai/conversations/[id]
 * Delete a conversation and all its messages
 */
export const DELETE = withAuthParams(async (request, { userId, tenantId }, { params }) => {
  try {
    const { id } = await params

    const supabase = await createClient()

    // Delete conversation (CASCADE will delete messages)
    const { error } = await supabase
      .from('ai_conversations')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)

    if (error) {
      logger.error('Error deleting conversation:', { error })
      throw InternalError('Failed to delete conversation')
    }

    return successResponse({ deleted: true, id })
  } catch (error) {
    logger.error('Error in DELETE /api/ai/conversations/[id]:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
