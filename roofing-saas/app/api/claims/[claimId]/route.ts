import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import type { ClaimData } from '@/lib/claims/types'

/**
 * GET /api/claims/[claimId]
 * Get a single claim by ID
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ claimId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { claimId } = await context.params
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

    // Fetch claim
    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .eq('id', claimId)
      .eq('tenant_id', tenantUser.tenant_id)
      .single()

    if (error || !data) {
      console.error('Error fetching claim:', error)
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      claim: data as ClaimData,
    })
  } catch (error) {
    console.error('Error in GET /api/claims/[claimId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
