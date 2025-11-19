import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import type { AIConversation, CreateConversationRequest } from '@/lib/ai-assistant/types'

/**
 * GET /api/ai/conversations
 * List user's AI conversations
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 })
    }

    const supabase = await createClient()

    // Query parameters
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('include_inactive') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50', 10)

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

    const { data: conversations, error } = await query

    if (error) {
      console.error('Error fetching conversations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch conversations' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      conversations: conversations as AIConversation[],
      total: conversations?.length || 0,
    })
  } catch (error) {
    console.error('Error in GET /api/ai/conversations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 })
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
        metadata,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating conversation:', error)
      return NextResponse.json(
        { error: 'Failed to create conversation' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      conversation: conversation as AIConversation,
    })
  } catch (error) {
    console.error('Error in POST /api/ai/conversations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
