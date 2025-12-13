import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { AuthenticationError, AuthorizationError, NotFoundError, ValidationError, ConflictError, InternalError } from '@/lib/api/errors'
import { errorResponse, createdResponse, paginatedResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import type {
  CampaignEnrollment,
  EnrollContactRequest,
  EnrollContactResponse,
  EnrollmentStatus,
} from '@/lib/campaigns/types'

/**
 * GET /api/campaigns/:id/enrollments
 * Get all enrollments for a campaign
 *
 * Query params:
 * - status: 'active' | 'completed' | 'exited' | 'paused' | 'failed' (optional)
 * - contact_id: UUID (optional - filter by contact)
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with any tenant')
    }

    const { id: campaign_id } = await params
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') as EnrollmentStatus | null
    const contact_id = searchParams.get('contact_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = await createClient()

    // Build query - filter by tenant through campaign relationship
    let query = supabase
      .from('campaign_enrollments')
      .select('*')
      .eq('campaign_id', campaign_id)
      .eq('tenant_id', tenantId)
      .order('enrolled_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (contact_id) {
      query = query.eq('contact_id', contact_id)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching campaign enrollments', { error, campaignId: campaign_id })
      throw InternalError('Failed to fetch enrollments')
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('campaign_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaign_id)
      .eq('tenant_id', tenantId)

    if (status) {
      countQuery = countQuery.eq('status', status)
    }

    if (contact_id) {
      countQuery = countQuery.eq('contact_id', contact_id)
    }

    const { count } = await countQuery

    return paginatedResponse(
      { enrollments: (data || []) as CampaignEnrollment[] },
      { page: Math.floor(offset / limit) + 1, limit, total: count || 0 }
    )
  } catch (error) {
    logger.error('Error in GET /api/campaigns/:id/enrollments', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * POST /api/campaigns/:id/enrollments
 * Enroll a contact into a campaign
 *
 * Body: EnrollContactRequest
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with any tenant')
    }

    const { id: campaign_id } = await params
    const body: EnrollContactRequest = await request.json()

    // Validate required fields
    if (!body.contact_id) {
      throw ValidationError('Missing required field: contact_id')
    }

    const supabase = await createClient()

    // Check if campaign exists and is active
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('status, max_enrollments, total_enrolled, allow_re_enrollment')
      .eq('id', campaign_id)
      .eq('tenant_id', tenantId)
      .single()

    if (campaignError || !campaign) {
      throw NotFoundError('Campaign')
    }

    if (campaign.status !== 'active') {
      throw ValidationError('Campaign is not active')
    }

    // Check max enrollments
    if (
      campaign.max_enrollments &&
      campaign.total_enrolled >= campaign.max_enrollments
    ) {
      throw ValidationError('Campaign has reached maximum enrollments')
    }

    // Check if contact exists
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id')
      .eq('id', body.contact_id)
      .eq('tenant_id', tenantId)
      .single()

    if (contactError || !contact) {
      throw NotFoundError('Contact')
    }

    // Check if already enrolled (unless re-enrollment is allowed)
    const { data: existingEnrollment } = await supabase
      .from('campaign_enrollments')
      .select('id, status')
      .eq('campaign_id', campaign_id)
      .eq('contact_id', body.contact_id)
      .maybeSingle()

    if (existingEnrollment) {
      if (existingEnrollment.status === 'active') {
        throw ConflictError('Contact is already enrolled in this campaign')
      }

      if (!campaign.allow_re_enrollment) {
        throw ValidationError('Re-enrollment is not allowed for this campaign')
      }
    }

    // Get first step in campaign to set as current step
    const { data: firstStep } = await supabase
      .from('campaign_steps')
      .select('id, step_order')
      .eq('campaign_id', campaign_id)
      .order('step_order', { ascending: true })
      .limit(1)
      .maybeSingle()

    // Create enrollment
    const { data, error } = await supabase
      .from('campaign_enrollments')
      .insert({
        campaign_id,
        tenant_id: tenantId,
        contact_id: body.contact_id,
        enrollment_source: body.enrollment_source || 'manual_admin',
        enrolled_by: user.id,
        status: 'active',
        current_step_id: firstStep?.id || null,
        current_step_order: firstStep?.step_order || 0,
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating enrollment', { error, campaignId: campaign_id })
      // Check for unique constraint violation
      if (error.code === '23505') {
        throw ConflictError('Contact is already enrolled in this campaign')
      }
      throw InternalError('Failed to enroll contact')
    }

    const response: EnrollContactResponse = {
      enrollment: data as CampaignEnrollment,
    }

    return createdResponse(response)
  } catch (error) {
    logger.error('Error in POST /api/campaigns/:id/enrollments', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
