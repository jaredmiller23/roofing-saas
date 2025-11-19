import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import type {
  CampaignEnrollment,
  EnrollContactRequest,
  EnrollContactResponse,
  GetCampaignEnrollmentsResponse,
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: campaign_id } = await params
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') as EnrollmentStatus | null
    const contact_id = searchParams.get('contact_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = await createClient()

    // Build query
    let query = supabase
      .from('campaign_enrollments')
      .select('*')
      .eq('campaign_id', campaign_id)
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
      console.error('Error fetching campaign enrollments:', error)
      return NextResponse.json(
        { error: 'Failed to fetch enrollments' },
        { status: 500 }
      )
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('campaign_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaign_id)

    if (status) {
      countQuery = countQuery.eq('status', status)
    }

    if (contact_id) {
      countQuery = countQuery.eq('contact_id', contact_id)
    }

    const { count } = await countQuery

    const response: GetCampaignEnrollmentsResponse = {
      enrollments: (data || []) as CampaignEnrollment[],
      total: count || 0,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in GET /api/campaigns/:id/enrollments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: campaign_id } = await params
    const supabase = await createClient()

    // Get user's tenant
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    if (!tenantUser) {
      return NextResponse.json(
        { error: 'User not associated with any tenant' },
        { status: 403 }
      )
    }

    const body: EnrollContactRequest = await request.json()

    // Validate required fields
    if (!body.contact_id) {
      return NextResponse.json(
        { error: 'Missing required field: contact_id' },
        { status: 400 }
      )
    }

    // Check if campaign exists and is active
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('status, max_enrollments, total_enrolled, allow_re_enrollment')
      .eq('id', campaign_id)
      .eq('tenant_id', tenantUser.tenant_id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    if (campaign.status !== 'active') {
      return NextResponse.json(
        { error: 'Campaign is not active' },
        { status: 400 }
      )
    }

    // Check max enrollments
    if (
      campaign.max_enrollments &&
      campaign.total_enrolled >= campaign.max_enrollments
    ) {
      return NextResponse.json(
        { error: 'Campaign has reached maximum enrollments' },
        { status: 400 }
      )
    }

    // Check if contact exists
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id')
      .eq('id', body.contact_id)
      .eq('tenant_id', tenantUser.tenant_id)
      .single()

    if (contactError || !contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
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
        return NextResponse.json(
          { error: 'Contact is already enrolled in this campaign' },
          { status: 409 }
        )
      }

      if (!campaign.allow_re_enrollment) {
        return NextResponse.json(
          { error: 'Re-enrollment is not allowed for this campaign' },
          { status: 400 }
        )
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
        tenant_id: tenantUser.tenant_id,
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
      console.error('Error creating enrollment:', error)
      // Check for unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Contact is already enrolled in this campaign' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to enroll contact' },
        { status: 500 }
      )
    }

    const response: EnrollContactResponse = {
      enrollment: data as CampaignEnrollment,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/campaigns/:id/enrollments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
