import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import type {
  Campaign,
  GetCampaignsResponse,
  CreateCampaignRequest,
  CreateCampaignResponse,
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
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') as CampaignStatus | null
    const campaign_type = searchParams.get('campaign_type') as
      | CampaignType
      | null
    const include_deleted = searchParams.get('include_deleted') === 'true'

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

    // Build query
    let query = supabase
      .from('campaigns')
      .select('*')
      .eq('tenant_id', tenantUser.tenant_id)
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
      console.error('Error fetching campaigns:', error)
      return NextResponse.json(
        { error: 'Failed to fetch campaigns' },
        { status: 500 }
      )
    }

    const response: GetCampaignsResponse = {
      campaigns: (data || []) as Campaign[],
      total: data?.length || 0,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in GET /api/campaigns:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/campaigns
 * Create new campaign (admin only)
 *
 * Body: CreateCampaignRequest
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Check if user is admin
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('role, tenant_id')
      .eq('user_id', user.id)
      .single()

    if (!tenantUser || tenantUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body: CreateCampaignRequest = await request.json()

    // Validate required fields
    if (!body.name || !body.campaign_type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, campaign_type' },
        { status: 400 }
      )
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
      return NextResponse.json(
        { error: 'Invalid campaign_type' },
        { status: 400 }
      )
    }

    // Validate goal_target if provided
    if (body.goal_target !== undefined && body.goal_target <= 0) {
      return NextResponse.json(
        { error: 'goal_target must be greater than 0' },
        { status: 400 }
      )
    }

    // Insert campaign
    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        tenant_id: tenantUser.tenant_id,
        name: body.name,
        description: body.description || null,
        campaign_type: body.campaign_type,
        status: 'draft', // Always start as draft
        goal_type: body.goal_type || null,
        goal_target: body.goal_target || null,
        allow_re_enrollment: body.allow_re_enrollment ?? false,
        re_enrollment_delay_days: body.re_enrollment_delay_days || null,
        respect_business_hours: body.respect_business_hours ?? true,
        business_hours: body.business_hours || null,
        enrollment_type: body.enrollment_type || 'automatic',
        max_enrollments: body.max_enrollments || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating campaign:', error)
      // Check for unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A campaign with this name already exists' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to create campaign' },
        { status: 500 }
      )
    }

    const response: CreateCampaignResponse = {
      campaign: data as Campaign,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/campaigns:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
