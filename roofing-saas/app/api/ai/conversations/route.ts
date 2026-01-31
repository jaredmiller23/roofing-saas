import { NextRequest } from 'next/server'
import type { Json } from '@/lib/types/database.types'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse, createdResponse } from '@/lib/api/response'
import type { AIConversation, CreateConversationRequest } from '@/lib/ai-assistant/types'

/**
 * GET /api/ai/conversations
 * List user's AI conversations
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    const supabase = await createClient()

    // Query parameters
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('include_inactive') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const search = searchParams.get('search')

    // Fetch conversations
    let query = supabase
      .from('ai_conversations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    // Add search filter if provided
    if (search && search.trim()) {
      query = query.ilike('title', `%${search.trim()}%`)
    }

    const { data: conversations, error } = await query

    if (error) {
      logger.error('Error fetching conversations:', { error })
      throw InternalError('Failed to fetch conversations')
    }

    return successResponse({
      conversations: conversations as AIConversation[],
      total: conversations?.length || 0,
    })
  } catch (error) {
    logger.error('Error in GET /api/ai/conversations:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * POST /api/ai/conversations
 * Create a new AI conversation
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    const body: CreateConversationRequest = await request.json()
    const { title, metadata = {} } = body

    const supabase = await createClient()

    const { data: conversation, error } = await supabase
      .from('ai_conversations')
      .insert({
        tenant_id: tenantId,
        user_id: user.id,
        title: title || null,
        metadata: metadata as Json,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating conversation:', { error })
      throw InternalError('Failed to create conversation')
    }

    return createdResponse({
      conversation: conversation as AIConversation,
    })
  } catch (error) {
    logger.error('Error in POST /api/ai/conversations:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
