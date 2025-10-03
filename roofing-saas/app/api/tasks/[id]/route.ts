import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/tasks/[id]
 * Get a single task by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 })
    }

    const { id } = await params
    const supabase = await createClient()

    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .single()

    if (error || !task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Get task error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/tasks/[id]
 * Update a task
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const supabase = await createClient()

    const { data: task, error } = await supabase
      .from('tasks')
      .update(body)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error || !task) {
      return NextResponse.json(
        { error: 'Failed to update task' },
        { status: 400 }
      )
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Update task error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/tasks/[id]
 * Soft delete a task
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 })
    }

    const { id } = await params
    const supabase = await createClient()

    const { error } = await supabase
      .from('tasks')
      .update({ is_deleted: true })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete task' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete task error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
