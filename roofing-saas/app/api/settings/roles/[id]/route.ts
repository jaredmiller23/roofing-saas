import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { NextResponse } from 'next/server'

/**
 * PATCH /api/settings/roles/[id]
 * Update a role
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

    // Check if role is system role
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('is_system')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (existingRole?.is_system && body.name) {
      return NextResponse.json(
        { error: 'Cannot modify system role name' },
        { status: 400 }
      )
    }

    const { data: role, error } = await supabase
      .from('user_roles')
      .update({
        name: body.name,
        description: body.description,
        permissions: body.permissions
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    return NextResponse.json({ role })
  } catch (error) {
    console.error('Error updating role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/settings/roles/[id]
 * Delete a role
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

    // Check if role is system role
    const { data: role } = await supabase
      .from('user_roles')
      .select('is_system')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (role?.is_system) {
      return NextResponse.json(
        { error: 'Cannot delete system role' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
