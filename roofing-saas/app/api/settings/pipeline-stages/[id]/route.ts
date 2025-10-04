import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { NextResponse } from 'next/server'

/**
 * PATCH /api/settings/pipeline-stages/[id]
 * Update a pipeline stage
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
    }

    const { id } = await params
    const body = await request.json()
    const supabase = await createClient()

    const { data: stage, error } = await supabase
      .from('pipeline_stages')
      .update({
        name: body.name,
        description: body.description,
        color: body.color,
        icon: body.icon,
        stage_order: body.stage_order,
        stage_type: body.stage_type,
        win_probability: body.win_probability,
        auto_actions: body.auto_actions,
        is_active: body.is_active,
        is_default: body.is_default
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!stage) {
      return NextResponse.json({ error: 'Stage not found' }, { status: 404 })
    }

    return NextResponse.json({ stage })
  } catch (error) {
    console.error('Error updating pipeline stage:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/settings/pipeline-stages/[id]
 * Delete a pipeline stage
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
    }

    const { id } = await params
    const supabase = await createClient()

    const { error } = await supabase
      .from('pipeline_stages')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting pipeline stage:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
