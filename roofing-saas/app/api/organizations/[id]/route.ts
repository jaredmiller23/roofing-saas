import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/organizations/[id]
 * Get a single organization by ID
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

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 })
    }

    const { id } = await params
    const supabase = await createClient()

    const { data: organization, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .single()

    if (error || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ organization })
  } catch (error) {
    console.error('Get organization error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/organizations/[id]
 * Update an organization
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

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const supabase = await createClient()

    const { data: organization, error } = await supabase
      .from('organizations')
      .update(body)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error || !organization) {
      return NextResponse.json(
        { error: 'Failed to update organization' },
        { status: 400 }
      )
    }

    return NextResponse.json({ organization })
  } catch (error) {
    console.error('Update organization error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/organizations/[id]
 * Soft delete an organization
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

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 })
    }

    const { id } = await params
    const supabase = await createClient()

    const { error } = await supabase
      .from('organizations')
      .update({ is_deleted: true })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete organization' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete organization error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
