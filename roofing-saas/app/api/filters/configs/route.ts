import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import type {
  FilterConfig,
  GetFilterConfigsResponse,
  CreateFilterConfigRequest,
  CreateFilterConfigResponse,
} from '@/lib/filters/types'

/**
 * GET /api/filters/configs
 * Get all filter configurations for an entity type
 *
 * Query params:
 * - entity_type: 'contacts' | 'projects' | 'pipeline' | 'activities'
 * - include_inactive: boolean (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const entity_type = searchParams.get('entity_type')
    const include_inactive = searchParams.get('include_inactive') === 'true'

    if (!entity_type) {
      return NextResponse.json(
        { error: 'entity_type query parameter required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Build query
    let query = supabase
      .from('filter_configs')
      .select('*')
      .eq('entity_type', entity_type)
      .order('display_order', { ascending: true })

    // Filter by active status unless explicitly including inactive
    if (!include_inactive) {
      query = query.eq('is_active', true)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching filter configs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch filter configurations' },
        { status: 500 }
      )
    }

    const response: GetFilterConfigsResponse = {
      configs: (data || []) as FilterConfig[],
      total: count || data?.length || 0,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in GET /api/filters/configs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/filters/configs
 * Create new filter configuration (admin only)
 *
 * Body: CreateFilterConfigRequest
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    const body: CreateFilterConfigRequest = await request.json()

    // Validate required fields
    if (
      !body.entity_type ||
      !body.field_name ||
      !body.field_label ||
      !body.field_type ||
      !body.filter_operator
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get tenant_id
    const { data: tenant } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Insert filter config
    const { data, error } = await supabase
      .from('filter_configs')
      .insert({
        tenant_id: tenant.tenant_id,
        entity_type: body.entity_type,
        field_name: body.field_name,
        field_label: body.field_label,
        field_type: body.field_type,
        filter_operator: body.filter_operator,
        filter_options: body.filter_options || [],
        is_quick_filter: body.is_quick_filter ?? false,
        is_advanced_filter: body.is_advanced_filter ?? true,
        display_order: body.display_order ?? 99,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating filter config:', error)
      return NextResponse.json(
        { error: 'Failed to create filter configuration' },
        { status: 500 }
      )
    }

    const response: CreateFilterConfigResponse = {
      config: data as FilterConfig,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/filters/configs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
