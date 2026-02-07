import type { Json } from '@/lib/types/database.types'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { checkPermission } from '@/lib/auth/check-permission'
import { ApiError, ErrorCode, AuthorizationError, InternalError, ConflictError, ValidationError } from '@/lib/api/errors'
import { successResponse, errorResponse, createdResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { requireFeature } from '@/lib/billing/feature-gates'
import type {
  Campaign,
  CreateCampaignRequest,
  CampaignStatus,
  CampaignType,
} from '@/lib/campaigns/types'

/**
 * GET /api/campaigns
 * Get all campaigns for current tenant
 *
 * Query params:
 * - status: 'draft' | 'active' | 'paused' | 'archived' (optional)
 * - campaign_type: 'drip' | 'event' | 'reengagement' | 'retention' | 'nurture' (optional)
 * - include_deleted: boolean (default: false)
 */
export const GET = withAuth(async (request, { tenantId }) => {
  try {
    // Check feature access
    try {
      await requireFeature(tenantId, 'campaigns')
    } catch {
      throw AuthorizationError('Campaigns requires Professional plan or higher')
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') as CampaignStatus | null
    const campaign_type = searchParams.get('campaign_type') as
      | CampaignType
      | null
    const include_deleted = searchParams.get('include_deleted') === 'true'

    const supabase = await createClient()

    // Build query
    let query = supabase
      .from('campaigns')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (campaign_type) {
      query = query.eq('campaign_type', campaign_type)
    }

    if (!include_deleted) {
      query = query.eq('is_deleted', false)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching campaigns', { error })
      throw InternalError('Failed to fetch campaigns')
    }

    return successResponse((data || []) as Campaign[])
  } catch (error) {
    logger.error('Error in GET /api/campaigns', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

/**
 * POST /api/campaigns
 * Create new campaign (admin only)
 *
 * Body: CreateCampaignRequest
 */
export const POST = withAuth(async (request, { userId, tenantId }) => {
  try {
    // Check feature access
    try {
      await requireFeature(tenantId, 'campaigns')
    } catch {
      throw AuthorizationError('Campaigns requires Professional plan or higher')
    }

    const canCreate = await checkPermission(userId, 'campaigns', 'create', tenantId)
    if (!canCreate) {
      return errorResponse(new ApiError(ErrorCode.INSUFFICIENT_PERMISSIONS, 'You do not have permission to create campaigns', 403))
    }

    const body: CreateCampaignRequest = await request.json()

    // Validate required fields
    if (!body.name || !body.campaign_type) {
      throw ValidationError('Missing required fields: name, campaign_type')
    }

    // Validate campaign_type
    const validCampaignTypes = [
      'drip',
      'event',
      'reengagement',
      'retention',
      'nurture',
    ]
    if (!validCampaignTypes.includes(body.campaign_type)) {
      throw ValidationError('Invalid campaign_type')
    }

    // Validate goal_target if provided (allow null/undefined, but reject non-positive numbers)
    if (body.goal_target !== undefined && body.goal_target !== null && body.goal_target <= 0) {
      throw ValidationError('goal_target must be greater than 0')
    }

    const supabase = await createClient()

    // Insert campaign
    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        tenant_id: tenantId,
        name: body.name,
        description: body.description || null,
        campaign_type: body.campaign_type,
        status: 'draft', // Always start as draft
        goal_type: body.goal_type || null,
        goal_target: body.goal_target || null,
        allow_re_enrollment: body.allow_re_enrollment ?? false,
        re_enrollment_delay_days: body.re_enrollment_delay_days || null,
        respect_business_hours: body.respect_business_hours ?? true,
        business_hours: (body.business_hours || null) as Json | null,
        enrollment_type: body.enrollment_type || 'automatic',
        max_enrollments: body.max_enrollments || null,
        created_by: userId,
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating campaign', { error })
      // Check for unique constraint violation
      if (error.code === '23505') {
        throw ConflictError('A campaign with this name already exists')
      }
      throw InternalError('Failed to create campaign')
    }

    return createdResponse(data as Campaign)
  } catch (error) {
    logger.error('Error in POST /api/campaigns', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
