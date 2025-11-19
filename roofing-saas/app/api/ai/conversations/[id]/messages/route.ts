import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 })
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
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
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
      console.error('Error fetching messages:', error)
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      messages: messages as AIMessage[],
      total: messages?.length || 0,
      has_more: (messages?.length || 0) === limit,
    })
  } catch (error) {
    console.error('Error in GET /api/ai/conversations/[id]/messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
