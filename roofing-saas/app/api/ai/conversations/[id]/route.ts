import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 })
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
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ conversation })
  } catch (error) {
    console.error('Error in GET /api/ai/conversations/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 })
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
      return NextResponse.json(
        { error: 'Failed to update conversation' },
        { status: 500 }
      )
    }

    return NextResponse.json({ conversation })
  } catch (error) {
    console.error('Error in PATCH /api/ai/conversations/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 })
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
      console.error('Error deleting conversation:', error)
      return NextResponse.json(
        { error: 'Failed to delete conversation' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/ai/conversations/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
