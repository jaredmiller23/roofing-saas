import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { AuthenticationError, AuthorizationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'

/**
 * GET /api/campaigns/executions
 * Get recent campaign step executions for current tenant
 *
 * Query params:
 * - limit: number (default: 20, max: 100)
 * - status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' (optional)
 * - campaign_id: string (optional)
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

    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const status = searchParams.get('status')
    const campaignId = searchParams.get('campaign_id')

    const supabase = await createClient()

    // Build query with joins to get campaign and contact info
    let query = supabase
      .from('campaign_step_executions')
      .select(`
        id,
        enrollment_id,
        step_id,
        status,
        scheduled_at,
        started_at,
        completed_at,
        error_message,
        result_data,
        campaign_enrollments!inner(
          id,
          campaign_id,
          contact_id,
          tenant_id,
          campaigns!inner(
            id,
            name
          ),
          contacts(
            id,
            first_name,
            last_name
          )
        ),
        campaign_steps!inner(
          id,
          step_type,
          step_name
        )
      `)
      .eq('campaign_enrollments.tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (campaignId) {
      query = query.eq('campaign_enrollments.campaign_id', campaignId)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching campaign executions', { error })
      throw InternalError('Failed to fetch executions')
    }

    // Transform data to flat structure
    // Note: Supabase returns nested data, but structure varies
    interface ExecutionData {
      id: string
      enrollment_id: string
      step_id: string
      status: string
      scheduled_at: string | null
      started_at: string | null
      completed_at: string | null
      error_message: string | null
      result_data: Record<string, unknown> | null
      campaign_enrollments: {
        id: string
        campaign_id: string
        contact_id: string
        tenant_id: string
        campaigns: {
          id: string
          name: string
        }
        contacts: {
          id: string
          first_name: string | null
          last_name: string | null
        } | null
      }
      campaign_steps: {
        id: string
        step_type: string
        step_name: string | null
      }
    }

    const executions = (data || []).map((rawExecution: unknown) => {
      const execution = rawExecution as ExecutionData
      const enrollment = execution.campaign_enrollments
      const step = execution.campaign_steps
      const contact = enrollment?.contacts

      return {
        id: execution.id,
        enrollment_id: execution.enrollment_id,
        status: execution.status,
        scheduled_at: execution.scheduled_at,
        started_at: execution.started_at,
        completed_at: execution.completed_at,
        error_message: execution.error_message,
        campaign_name: enrollment?.campaigns?.name || 'Unknown',
        contact_name: contact
          ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || null
          : null,
        step_type: step?.step_type || 'unknown',
        step_name: step?.step_name || null,
      }
    })

    return successResponse({ executions, total: executions.length })
  } catch (error) {
    logger.error('Error in GET /api/campaigns/executions', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
