import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { NextResponse } from 'next/server'

/**
 * GET /api/settings/pipeline-stages
 * Get all pipeline stages for tenant
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
    }

    const supabase = await createClient()

    const { data: stages, error } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('stage_order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ stages: stages || [] })
  } catch (error) {
    console.error('Error fetching pipeline stages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/settings/pipeline-stages
 * Create a new pipeline stage
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      name,
      description,
      color,
      icon,
      stage_order,
      stage_type,
      win_probability,
      auto_actions,
      is_active,
      is_default
    } = body

    if (!name || stage_order === undefined) {
      return NextResponse.json(
        { error: 'Name and stage_order are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: stage, error } = await supabase
      .from('pipeline_stages')
      .insert({
        tenant_id: tenantId,
        name,
        description,
        color,
        icon,
        stage_order,
        stage_type,
        win_probability,
        auto_actions,
        is_active,
        is_default,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ stage }, { status: 201 })
  } catch (error) {
    console.error('Error creating pipeline stage:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
