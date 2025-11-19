import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import type {
  SubstatusConfig,
  UpdateSubstatusConfigRequest,
  UpdateSubstatusConfigResponse,
} from '@/lib/substatus/types'

/**
 * PATCH /api/substatus/configs/:id
 * Update substatus configuration (admin only)
 *
 * Body: UpdateSubstatusConfigRequest
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
      .select('role, tenant_id')
      .eq('user_id', user.id)
      .single()

    if (!tenantUser || tenantUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body: UpdateSubstatusConfigRequest = await request.json()

    // Get existing config to check for default flag change
    const { data: existing } = await supabase
      .from('status_substatus_configs')
      .select('entity_type, status_field_name, status_value, tenant_id')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Substatus configuration not found' },
        { status: 404 }
      )
    }

    // Build update object
    const updates: Record<string, unknown> = {}
    if (body.substatus_label !== undefined)
      updates.substatus_label = body.substatus_label
    if (body.substatus_description !== undefined)
      updates.substatus_description = body.substatus_description
    if (body.display_order !== undefined)
      updates.display_order = body.display_order
    if (body.color !== undefined) updates.color = body.color
    if (body.icon !== undefined) updates.icon = body.icon
    if (body.is_active !== undefined) updates.is_active = body.is_active
    if (body.is_terminal !== undefined) updates.is_terminal = body.is_terminal
    if (body.auto_transition_to !== undefined)
      updates.auto_transition_to = body.auto_transition_to
    if (body.auto_transition_delay_hours !== undefined)
      updates.auto_transition_delay_hours = body.auto_transition_delay_hours

    // Handle is_default specially (unset other defaults)
    if (body.is_default !== undefined) {
      if (body.is_default) {
        // Unset other defaults for this status
        await supabase
          .from('status_substatus_configs')
          .update({ is_default: false })
          .eq('tenant_id', existing.tenant_id)
          .eq('entity_type', existing.entity_type)
          .eq('status_field_name', existing.status_field_name)
          .eq('status_value', existing.status_value)
          .neq('id', id)
      }
      updates.is_default = body.is_default
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('status_substatus_configs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating substatus config:', error)
      return NextResponse.json(
        { error: 'Failed to update substatus configuration' },
        { status: 500 }
      )
    }

    const response: UpdateSubstatusConfigResponse = {
      config: data as SubstatusConfig,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in PATCH /api/substatus/configs/:id:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/substatus/configs/:id
 * Delete substatus configuration (admin only)
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

    const { error } = await supabase
      .from('status_substatus_configs')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting substatus config:', error)
      return NextResponse.json(
        { error: 'Failed to delete substatus configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/substatus/configs/:id:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
