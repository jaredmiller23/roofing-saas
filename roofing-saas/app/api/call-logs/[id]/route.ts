import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'

/**
 * GET /api/call-logs/[id]
 * Get a single call log by ID
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

    const { data, error } = await supabase
      .from('call_logs')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .single()

    if (error) {
      console.error('Error fetching call log:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Call log not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in GET /api/call-logs/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/call-logs/[id]
 * Update a call log
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

    const { data, error } = await supabase
      .from('call_logs')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .select()
      .single()

    if (error) {
      console.error('Error updating call log:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Call log not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in PATCH /api/call-logs/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/call-logs/[id]
 * Soft delete a call log
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

    const { data, error } = await supabase
      .from('call_logs')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .select()
      .single()

    if (error) {
      console.error('Error deleting call log:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Call log not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/call-logs/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
