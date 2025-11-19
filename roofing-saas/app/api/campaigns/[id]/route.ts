import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import type {
  Campaign,
  UpdateCampaignRequest,
  UpdateCampaignResponse,
} from '@/lib/campaigns/types'

/**
 * GET /api/campaigns/:id
 * Get single campaign by ID
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

    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching campaign:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to fetch campaign' },
        { status: 500 }
      )
    }

    return NextResponse.json({ campaign: data as Campaign })
  } catch (error) {
    console.error('Error in GET /api/campaigns/:id:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/campaigns/:id
 * Update campaign (admin only)
 *
 * Body: UpdateCampaignRequest
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
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

    const body: UpdateCampaignRequest = await request.json()

    // Build update object
    const updates: Record<string, unknown> = {}

    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.status !== undefined) updates.status = body.status
    if (body.goal_type !== undefined) updates.goal_type = body.goal_type
    if (body.goal_target !== undefined) updates.goal_target = body.goal_target
    if (body.allow_re_enrollment !== undefined)
      updates.allow_re_enrollment = body.allow_re_enrollment
    if (body.re_enrollment_delay_days !== undefined)
      updates.re_enrollment_delay_days = body.re_enrollment_delay_days
    if (body.respect_business_hours !== undefined)
      updates.respect_business_hours = body.respect_business_hours
    if (body.business_hours !== undefined)
      updates.business_hours = body.business_hours
    if (body.enrollment_type !== undefined)
      updates.enrollment_type = body.enrollment_type
    if (body.max_enrollments !== undefined)
      updates.max_enrollments = body.max_enrollments

    // Validate status if provided
    if (body.status !== undefined) {
      const validStatuses = ['draft', 'active', 'paused', 'archived']
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: 'Invalid status value' },
          { status: 400 }
        )
      }
    }

    // Validate goal_target if provided
    if (body.goal_target !== undefined && body.goal_target <= 0) {
      return NextResponse.json(
        { error: 'goal_target must be greater than 0' },
        { status: 400 }
      )
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating campaign:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to update campaign' },
        { status: 500 }
      )
    }

    const response: UpdateCampaignResponse = {
      campaign: data as Campaign,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in PATCH /api/campaigns/:id:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/campaigns/:id
 * Soft delete campaign (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
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

    // Soft delete (set is_deleted = true)
    const { error } = await supabase
      .from('campaigns')
      .update({ is_deleted: true })
      .eq('id', id)

    if (error) {
      console.error('Error deleting campaign:', error)
      return NextResponse.json(
        { error: 'Failed to delete campaign' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/campaigns/:id:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
