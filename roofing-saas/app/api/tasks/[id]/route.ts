import type { Json } from '@/lib/types/database.types'
import { createClient } from '@/lib/supabase/server'
import { withAuthParams } from '@/lib/auth/with-auth'
import { checkPermission } from '@/lib/auth/check-permission'
import { NextRequest } from 'next/server'
import { ApiError, ErrorCode, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'

/**
 * GET /api/tasks/[id]
 * Get a single task by ID
 */
export const GET = withAuthParams(async (
  request: NextRequest,
  { tenantId },
  { params }
) => {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: task, error } = await supabase
      .from('tasks')
      .select(`
        *,
        project:projects(id, name),
        contact:contacts(id, first_name, last_name, phone, email),
        parent_task:tasks!parent_task_id(id, title, status),
        subtasks:tasks!parent_task_id(id, title, status, priority),
        comments:task_comments(id, comment, user_id, created_at, is_edited),
        attachments:task_attachments(id, file_name, file_url, file_type, file_size, uploaded_at),
        activity:task_activity(id, action, changes, created_at)
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .single()

    if (error || !task) {
      throw NotFoundError('Task')
    }

    return successResponse(task)
  } catch (error) {
    logger.error('Error in GET /api/tasks/:id', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

/**
 * PATCH /api/tasks/[id]
 * Update a task
 */
export const PATCH = withAuthParams(async (
  request: NextRequest,
  { user, tenantId },
  { params }
) => {
  try {
    const { id } = await params
    const body = await request.json()

    // Field allowlisting — only permit known mutable fields
    const ALLOWED_FIELDS = [
      'title', 'description', 'status', 'priority',
      'due_date', 'start_date', 'completed_at',
      'assigned_to', 'project_id', 'contact_id', 'parent_task_id',
      'estimated_hours', 'actual_hours', 'progress',
      'tags', 'notes',
    ]
    const updateData: Record<string, unknown> = {}
    for (const key of ALLOWED_FIELDS) {
      if (key in body) {
        updateData[key] = body[key]
      }
    }
    updateData.updated_at = new Date().toISOString()

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
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error || !task) {
      logger.error('Error updating task', { error })
      throw InternalError('Failed to update task')
    }

    // Log activity
    const changes: Record<string, { from: unknown; to: unknown }> = {}
    if (currentTask) {
      const taskRecord = currentTask as Record<string, unknown>
      Object.keys(body).forEach(key => {
        if (taskRecord[key] !== body[key]) {
          changes[key] = {
            from: taskRecord[key],
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
          changes: changes as Json
        })
    }

    return successResponse(task)
  } catch (error) {
    logger.error('Error in PATCH /api/tasks/:id', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

/**
 * DELETE /api/tasks/[id]
 * Soft delete a task
 */
export const DELETE = withAuthParams(async (
  _request: NextRequest,
  { userId, tenantId },
  { params }
) => {
  try {
    const canDelete = await checkPermission(userId, 'tasks', 'delete', tenantId)
    if (!canDelete) {
      return errorResponse(new ApiError(ErrorCode.INSUFFICIENT_PERMISSIONS, 'You do not have permission to delete tasks', 403))
    }

    const { id } = await params
    const supabase = await createClient()

    const { error } = await supabase
      .from('tasks')
      .update({ is_deleted: true })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      logger.error('Error deleting task', { error })
      throw InternalError('Failed to delete task')
    }

    return successResponse({ success: true })
  } catch (error) {
    logger.error('Error in DELETE /api/tasks/:id', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
