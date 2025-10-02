import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'

/**
 * Projects API
 * GET /api/projects - List projects with filtering and search
 * POST /api/projects - Create new project
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

    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const pipeline = searchParams.get('pipeline') || ''
    const stage = searchParams.get('stage') || ''
    const assignedTo = searchParams.get('assigned_to') || ''

    // Start building query
    let query = supabase
      .from('projects')
      .select(`
        id,
        name,
        project_number,
        status,
        type,
        estimated_value,
        approved_value,
        final_value,
        created_at,
        updated_at,
        description,
        custom_fields,
        contact:contact_id (
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `, { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (pipeline) {
      query = query.eq('custom_fields->>proline_pipeline', pipeline)
    }

    if (stage) {
      query = query.eq('custom_fields->>proline_stage', stage)
    }

    if (assignedTo) {
      query = query.eq('custom_fields->>assigned_to', assignedTo)
    }

    // Apply search (project name or contact name)
    if (search) {
      query = query.or(`name.ilike.%${search}%,project_number.ilike.%${search}%`)
    }

    // Exclude OLD RECRUITING pipeline (HR data, not sales)
    query = query.neq('custom_fields->>proline_pipeline', 'OLD RECRUITING')

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    // Order by created_at desc
    query = query.order('created_at', { ascending: false })

    const { data: projects, error, count } = await query

    if (error) {
      console.error('Projects fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform projects to include pipeline/stage from custom_fields
    const transformedProjects = projects?.map(project => ({
      ...project,
      pipeline: project.custom_fields?.proline_pipeline || null,
      stage: project.custom_fields?.proline_stage || null,
      assigned_to_name: project.custom_fields?.assigned_to || null,
      tags: project.custom_fields?.tags || [],
      lead_source: project.custom_fields?.lead_source || null,
    })) || []

    return NextResponse.json({
      success: true,
      data: {
        projects: transformedProjects,
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Projects API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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
      .from('projects')
      .insert({
        ...body,
        tenant_id: tenantId,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Project creation error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Projects POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
