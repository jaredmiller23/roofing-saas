import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import type {
  CampaignStep,
  GetCampaignStepsResponse,
  CreateCampaignStepRequest,
  CreateCampaignStepResponse,
} from '@/lib/campaigns/types'

/**
 * GET /api/campaigns/:id/steps
 * Get all steps for a campaign
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
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('campaign_steps')
      .select('*')
      .eq('campaign_id', campaign_id)
      .order('step_order', { ascending: true })

    if (error) {
      console.error('Error fetching campaign steps:', error)
      return NextResponse.json(
        { error: 'Failed to fetch steps' },
        { status: 500 }
      )
    }

    const response: GetCampaignStepsResponse = {
      steps: (data || []) as CampaignStep[],
      total: data?.length || 0,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in GET /api/campaigns/:id/steps:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/campaigns/:id/steps
 * Create new step in campaign (admin only)
 *
 * Body: CreateCampaignStepRequest
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

    // Check if user is admin
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!tenantUser || tenantUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body: CreateCampaignStepRequest = await request.json()

    // Validate required fields
    if (
      body.step_order === undefined ||
      !body.step_type ||
      !body.step_config
    ) {
      return NextResponse.json(
        { error: 'Missing required fields: step_order, step_type, step_config' },
        { status: 400 }
      )
    }

    // Validate step_type
    const validStepTypes = [
      'send_email',
      'send_sms',
      'create_task',
      'wait',
      'update_field',
      'manage_tags',
      'notify',
      'webhook',
      'conditional',
      'exit_campaign',
    ]
    if (!validStepTypes.includes(body.step_type)) {
      return NextResponse.json(
        { error: 'Invalid step_type' },
        { status: 400 }
      )
    }

    // Validate delay_value if provided
    if (body.delay_value !== undefined && body.delay_value < 0) {
      return NextResponse.json(
        { error: 'delay_value must be >= 0' },
        { status: 400 }
      )
    }

    // Validate delay_unit if provided
    if (body.delay_unit !== undefined) {
      const validDelayUnits = ['hours', 'days', 'weeks']
      if (!validDelayUnits.includes(body.delay_unit)) {
        return NextResponse.json(
          { error: 'Invalid delay_unit' },
          { status: 400 }
        )
      }
    }

    // Check if campaign exists
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaign_id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Insert step
    const { data, error } = await supabase
      .from('campaign_steps')
      .insert({
        campaign_id,
        parent_step_id: body.parent_step_id || null,
        step_order: body.step_order,
        step_type: body.step_type,
        step_config: body.step_config,
        delay_value: body.delay_value ?? 0,
        delay_unit: body.delay_unit || 'days',
        conditions: body.conditions || null,
        true_path_step_id: body.true_path_step_id || null,
        false_path_step_id: body.false_path_step_id || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating campaign step:', error)
      return NextResponse.json(
        { error: 'Failed to create step' },
        { status: 500 }
      )
    }

    const response: CreateCampaignStepResponse = {
      step: data as CampaignStep,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/campaigns/:id/steps:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
