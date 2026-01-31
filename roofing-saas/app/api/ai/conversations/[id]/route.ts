import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

/**
 * GET /api/ai/conversations/[id]
 * Get a specific conversation
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

    const { data: conversation, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .single()

    if (error || !conversation) {
      throw NotFoundError('Conversation not found')
    }

    return successResponse(conversation)
  } catch (error) {
    logger.error('Error in GET /api/ai/conversations/[id]:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * PATCH /api/ai/conversations/[id]
 * Update a conversation (archive, change title, etc.)
 */
export async function PATCH(
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
      .eq('user_id', user.id)
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
}

/**
 * DELETE /api/ai/conversations/[id]
 * Delete a conversation and all its messages
 */
export async function DELETE(
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

    // Delete conversation (CASCADE will delete messages)
    const { error } = await supabase
      .from('ai_conversations')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)

    if (error) {
      logger.error('Error deleting conversation:', { error })
      throw InternalError('Failed to delete conversation')
    }

    return successResponse({ deleted: true, id })
  } catch (error) {
    logger.error('Error in DELETE /api/ai/conversations/[id]:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
