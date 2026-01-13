import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { NextRequest } from 'next/server'
import {
  AuthenticationError,
  AuthorizationError,
  mapSupabaseError,
} from '@/lib/api/errors'
import { paginatedResponse, createdResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'

/**
 * GET /api/tasks
 * List tasks with filtering and pagination
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('User not authenticated')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User is not associated with a tenant')
    }

    logger.apiRequest('GET', '/api/tasks', { tenantId, userId: user.id })

    // Parse query parameters with validation
    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20'))) // Max 100 per page
    const search = searchParams.get('search') || undefined
    const priority = searchParams.get('priority') || undefined
    const status = searchParams.get('status') || undefined
    const projectId = searchParams.get('project_id') || undefined
    const contactId = searchParams.get('contact_id') || undefined
    const sortBy = searchParams.get('sort_by') || 'created_at'
    const sortOrder = (searchParams.get('sort_order') || 'desc') as 'asc' | 'desc'

    const supabase = await createClient()

    // Build query with related data
    let query = supabase
      .from('tasks')
      .select(`
        *,
        project:projects(id, name),
        contact:contacts(id, first_name, last_name),
        parent_task:tasks!parent_task_id(id, title)
      `, { count: 'exact' })
      .eq('tenant_id', tenantId)
      .is('is_deleted', null)

    // Apply filters
    if (priority) {
      query = query.eq('priority', priority)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (projectId) {
      query = query.eq('project_id', projectId)
    }
    if (contactId) {
      query = query.eq('contact_id', contactId)
    }
    if (search) {
      // Escape SQL wildcards to prevent unexpected matches
      const escapedSearch = search.replace(/[%_\\]/g, '\\$&')
      query = query.ilike('title', `%${escapedSearch}%`)
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    // Sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    const { data: tasks, error, count } = await query

    if (error) {
      throw mapSupabaseError(error)
    }

    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/tasks', 200, duration)

    const response = {
      tasks: tasks || [],
      total: count || 0,
      page,
      limit,
      has_more: count ? from + limit < count : false,
    }

    return paginatedResponse(response, { page, limit, total: count || 0 })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Tasks API error', { error, duration })
    return errorResponse(error as Error)
  }
}

/**
 * POST /api/tasks
 * Create a new task
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('User not authenticated')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User is not associated with a tenant')
    }

    logger.apiRequest('POST', '/api/tasks', { tenantId, userId: user.id })

    const body = await request.json()
    const {
      title,
      description,
      status = 'todo',
      priority = 'medium',
      due_date,
      start_date,
      project_id,
      contact_id,
      assigned_to,
      parent_task_id,
      estimated_hours,
      tags,
      labels,
      reminder_enabled,
      reminder_date
    } = body

    const supabase = await createClient()

    // Create task
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        tenant_id: tenantId,
        title,
        description,
        status,
        priority,
        due_date,
        start_date,
        project_id,
        contact_id,
        assigned_to,
        assigned_by: assigned_to ? user.id : null,
        parent_task_id,
        estimated_hours,
        tags,
        labels,
        reminder_enabled,
        reminder_date,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      throw mapSupabaseError(error)
    }

    // Log activity
    await supabase
      .from('task_activity')
      .insert({
        task_id: task.id,
        user_id: user.id,
        action: 'created',
        changes: { title, status, priority }
      })

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/tasks', 201, duration)
    logger.info('Task created', { taskId: task.id, tenantId })

    return createdResponse({ task })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Create task error', { error, duration })
    return errorResponse(error as Error)
  }
}
