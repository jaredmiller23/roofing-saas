import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import type { ClaimData } from '@/lib/claims/types'

/**
 * GET /api/claims
 * Get all claims for current tenant (optionally filtered by project)
 *
 * Query params:
 * - project_id: Filter by project (optional)
 * - status: Filter by status (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('project_id')
    const status = searchParams.get('status')

    const supabase = await createClient()

    // Get user's tenant
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    if (!tenantUser) {
      return NextResponse.json(
        { error: 'User not associated with any tenant' },
        { status: 403 }
      )
    }

    // Build query
    let query = supabase
      .from('claims')
      .select('*')
      .eq('tenant_id', tenantUser.tenant_id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching claims:', error)
      return NextResponse.json(
        { error: 'Failed to fetch claims' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      claims: (data || []) as ClaimData[],
      total: data?.length || 0,
    })
  } catch (error) {
    console.error('Error in GET /api/claims:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
