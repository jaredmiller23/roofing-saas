/**
 * Decisions API
 *
 * GET /api/dev/decisions - List decisions with optional filters
 * POST /api/dev/decisions - Create a new decision
 */
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, createdResponse, errorResponse } from '@/lib/api/response'
import type { CreateDecisionInput, Decision, DecisionWithTask, DecisionStatus } from '@/lib/types/decision'

export const dynamic = 'force-dynamic'

/**
 * GET /api/dev/decisions
 * Fetch decisions with optional filters
 *
 * Query params:
 * - status: 'active' | 'superseded' | 'reversed'
 * - from_date: ISO date string (YYYY-MM-DD)
 * - to_date: ISO date string (YYYY-MM-DD)
 * - tags: comma-separated list of tags
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with any tenant')
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Parse query params
    const status = searchParams.get('status') as DecisionStatus | null
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')
    const tagsParam = searchParams.get('tags')
    const tags = tagsParam ? tagsParam.split(',').map(t => t.trim()) : null

    // Build query with left join to tasks for related task title
    // Note: Cast needed — decisions table not in generated types yet
    let query = supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('decisions' as any)
      .select(`
        id,
        tenant_id,
        meeting_date,
        decision_text,
        context,
        decided_by,
        tags,
        status,
        related_task_id,
        created_at,
        created_by,
        updated_at,
        tasks:related_task_id (
          title
        )
      `)
      .eq('tenant_id', tenantId)
      .order('meeting_date', { ascending: false })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (fromDate) {
      query = query.gte('meeting_date', fromDate)
    }

    if (toDate) {
      query = query.lte('meeting_date', toDate)
    }

    if (tags && tags.length > 0) {
      // Filter decisions that contain any of the specified tags
      query = query.overlaps('tags', tags)
    }

    const { data: decisions, error: fetchError } = await query

    if (fetchError) {
      logger.error('Error fetching decisions', { error: fetchError })
      throw InternalError('Failed to fetch decisions')
    }

    // Map to expected format, extracting task title from joined data
    // Cast needed: decisions table not yet in generated Supabase types
    type DecisionRow = Decision & { tasks: { title: string } | null }
    const mappedDecisions: DecisionWithTask[] = ((decisions || []) as unknown as DecisionRow[]).map(decision => {
      const taskData = decision.tasks
      return {
        id: decision.id,
        tenant_id: decision.tenant_id,
        meeting_date: decision.meeting_date,
        decision_text: decision.decision_text,
        context: decision.context,
        decided_by: decision.decided_by,
        tags: decision.tags || [],
        status: decision.status as DecisionStatus,
        related_task_id: decision.related_task_id,
        created_at: decision.created_at,
        created_by: decision.created_by,
        updated_at: decision.updated_at,
        task_title: taskData?.title ?? null,
      }
    })

    return successResponse(mappedDecisions)
  } catch (error) {
    logger.error('Error in GET /api/dev/decisions', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * POST /api/dev/decisions
 * Create a new decision
 *
 * Body:
 * - meeting_date: string (required, YYYY-MM-DD)
 * - decision_text: string (required)
 * - context?: string
 * - tags?: string[]
 * - related_task_id?: string (UUID)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with any tenant')
    }

    const body: CreateDecisionInput = await request.json()
    const { meeting_date, decision_text, context, tags, related_task_id } = body

    // Validate required fields
    if (!meeting_date) {
      throw ValidationError('meeting_date is required')
    }

    if (!decision_text || decision_text.trim() === '') {
      throw ValidationError('decision_text is required')
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(meeting_date)) {
      throw ValidationError('meeting_date must be in YYYY-MM-DD format')
    }

    // Validate related_task_id if provided
    if (related_task_id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(related_task_id)) {
        throw ValidationError('related_task_id must be a valid UUID')
      }
    }

    const supabase = await createClient()

    // Note: Cast needed — decisions table not in generated types yet
    const { data: decision, error: insertError } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('decisions' as any)
      .insert({
        tenant_id: tenantId,
        meeting_date,
        decision_text: decision_text.trim(),
        context: context?.trim() || null,
        tags: tags || [],
        related_task_id: related_task_id || null,
        created_by: user.id,
        decided_by: [user.id], // Default to current user as decision maker
      })
      .select(`
        id,
        tenant_id,
        meeting_date,
        decision_text,
        context,
        decided_by,
        tags,
        status,
        related_task_id,
        created_at,
        created_by,
        updated_at
      `)
      .single()

    if (insertError) {
      logger.error('Error creating decision', { error: insertError })
      throw InternalError('Failed to create decision')
    }

    return createdResponse(decision)
  } catch (error) {
    logger.error('Error in POST /api/dev/decisions', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
