import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import type {
  CampaignStep,
  UpdateCampaignStepRequest,
  UpdateCampaignStepResponse,
} from '@/lib/campaigns/types'

/**
 * PATCH /api/campaigns/:id/steps/:stepId
 * Update campaign step (admin only)
 *
 * Body: UpdateCampaignStepRequest
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { stepId } = await params
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

    const body: UpdateCampaignStepRequest = await request.json()

    // Build update object
    const updates: Record<string, unknown> = {}

    if (body.step_order !== undefined) updates.step_order = body.step_order
    if (body.step_type !== undefined) updates.step_type = body.step_type
    if (body.step_config !== undefined) updates.step_config = body.step_config
    if (body.delay_value !== undefined) updates.delay_value = body.delay_value
    if (body.delay_unit !== undefined) updates.delay_unit = body.delay_unit
    if (body.conditions !== undefined) updates.conditions = body.conditions
    if (body.true_path_step_id !== undefined)
      updates.true_path_step_id = body.true_path_step_id
    if (body.false_path_step_id !== undefined)
      updates.false_path_step_id = body.false_path_step_id

    // Validate step_type if provided
    if (body.step_type !== undefined) {
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

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('campaign_steps')
      .update(updates)
      .eq('id', stepId)
      .select()
      .single()

    if (error) {
      console.error('Error updating campaign step:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Step not found' }, { status: 404 })
      }
      return NextResponse.json(
        { error: 'Failed to update step' },
        { status: 500 }
      )
    }

    const response: UpdateCampaignStepResponse = {
      step: data as CampaignStep,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in PATCH /api/campaigns/:id/steps/:stepId:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/campaigns/:id/steps/:stepId
 * Delete campaign step (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { stepId } = await params
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

    // Hard delete (cascades to executions)
    const { error } = await supabase
      .from('campaign_steps')
      .delete()
      .eq('id', stepId)

    if (error) {
      console.error('Error deleting campaign step:', error)
      return NextResponse.json(
        { error: 'Failed to delete step' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/campaigns/:id/steps/:stepId:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
