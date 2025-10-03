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
      .select(`
        *,
        project:projects(id, name),
        contact:contacts(id, first_name, last_name, phone, email),
        assigned_user:auth.users!assigned_to(id, email, raw_user_meta_data),
        assigned_by_user:auth.users!assigned_by(id, email, raw_user_meta_data),
        parent_task:tasks!parent_task_id(id, title, status),
        subtasks:tasks!parent_task_id(id, title, status, priority),
        comments:task_comments(id, comment, user_id, created_at, is_edited, user:auth.users(email, raw_user_meta_data)),
        attachments:task_attachments(id, file_name, file_url, file_type, file_size, uploaded_at),
        activity:task_activity(id, action, changes, created_at, user:auth.users(email, raw_user_meta_data))
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('is_deleted', null)
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

    // Get current task to track changes
    const { data: currentTask } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    // Update task
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

    // Log activity
    const changes: Record<string, { from: unknown; to: unknown }> = {}
    if (currentTask) {
      Object.keys(body).forEach(key => {
        if (currentTask[key] !== body[key]) {
          changes[key] = {
            from: currentTask[key],
            to: body[key]
          }
        }
      })
    }

    if (Object.keys(changes).length > 0) {
      await supabase
        .from('task_activity')
        .insert({
          task_id: id,
          user_id: user.id,
          action: 'updated',
          changes
        })
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
