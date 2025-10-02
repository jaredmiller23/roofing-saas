import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { NextRequest } from 'next/server'
import {
  AuthenticationError,
  AuthorizationError,
  mapZodError,
} from '@/lib/api/errors'
import { successResponse, paginatedResponse, createdResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const createWorkflowSchema = z.object({
  name: z.string().min(1, 'Workflow name is required').max(200),
  description: z.string().optional(),
  trigger_type: z.string(),
  trigger_config: z.record(z.string(), z.any()).optional().default({}),
  is_active: z.boolean().optional().default(true),
  steps: z
    .array(
      z.object({
        step_order: z.number(),
        step_type: z.string(),
        step_config: z.record(z.string(), z.any()),
        delay_minutes: z.number().optional().default(0),
      })
    )
    .optional(),
})

/**
 * GET /api/workflows
 * List workflows with filtering
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

    logger.apiRequest('GET', '/api/workflows', { tenantId, userId: user.id })

    const searchParams = request.nextUrl.searchParams
    const triggerType = searchParams.get('trigger_type')
    const isActive = searchParams.get('is_active')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const supabase = await createClient()

    let query = supabase
      .from('workflows')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (triggerType) {
      query = query.eq('trigger_type', triggerType)
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: workflows, error, count } = await query

    if (error) {
      throw new Error(error.message)
    }

    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/workflows', 200, duration)

    return paginatedResponse(
      { workflows: workflows || [], total: count || 0, page, limit },
      { page, limit, total: count || 0 }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Workflows API error', { error, duration })
    return errorResponse(error as Error)
  }
}

/**
 * POST /api/workflows
 * Create a new workflow
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

    logger.apiRequest('POST', '/api/workflows', { tenantId, userId: user.id })

    const body = await request.json()

    // Validate input
    const validatedData = createWorkflowSchema.safeParse(body)
    if (!validatedData.success) {
      throw mapZodError(validatedData.error)
    }

    const { steps, ...workflowData } = validatedData.data
    const supabase = await createClient()

    // Create workflow
    const { data: workflow, error } = await supabase
      .from('workflows')
      .insert({
        ...workflowData,
        tenant_id: tenantId,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    // Create workflow steps if provided
    if (steps && steps.length > 0) {
      const stepsToInsert = steps.map((step) => ({
        ...step,
        workflow_id: workflow.id,
      }))

      const { error: stepsError } = await supabase
        .from('workflow_steps')
        .insert(stepsToInsert)

      if (stepsError) {
        // Rollback workflow creation
        await supabase.from('workflows').delete().eq('id', workflow.id)
        throw new Error(`Failed to create workflow steps: ${stepsError.message}`)
      }
    }

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/workflows', 201, duration)
    logger.info('Workflow created', { workflowId: workflow.id, name: workflow.name })

    return createdResponse({ workflow })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Create workflow error', { error, duration })
    return errorResponse(error as Error)
  }
}
