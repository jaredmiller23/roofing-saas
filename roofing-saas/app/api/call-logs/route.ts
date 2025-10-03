import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'

/**
 * GET /api/call-logs
 * List all call logs with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const direction = searchParams.get('direction')
    const outcome = searchParams.get('outcome')
    const disposition = searchParams.get('disposition')
    const contactId = searchParams.get('contact_id')
    const projectId = searchParams.get('project_id')
    const userId = searchParams.get('user_id')
    const search = searchParams.get('search')

    const supabase = await createClient()
    let query = supabase
      .from('call_logs')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)

    if (direction) query = query.eq('direction', direction)
    if (outcome) query = query.eq('outcome', outcome)
    if (disposition) query = query.eq('disposition', disposition)
    if (contactId) query = query.eq('contact_id', contactId)
    if (projectId) query = query.eq('project_id', projectId)
    if (userId) query = query.eq('user_id', userId)
    if (search) {
      query = query.or(`phone_number.ilike.%${search}%,notes.ilike.%${search}%`)
    }

    query = query
      .order('started_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    const { data: calls, error, count } = await query

    if (error) {
      console.error('Error fetching call logs:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      calls: calls || [],
      total: count || 0,
      page,
      limit,
    })
  } catch (error) {
    console.error('Error in GET /api/call-logs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/call-logs
 * Create a new call log
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 })
    }

    const body = await request.json()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('call_logs')
      .insert({
        ...body,
        tenant_id: tenantId,
        user_id: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating call log:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/call-logs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
