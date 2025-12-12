import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { logger } from '@/lib/logger'

/**
 * GET /api/claims/[id]/documents
 * Get all documents for a claim
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: claimId } = await context.params
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

    // Fetch documents for this claim
    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .eq('tenant_id', tenantUser.tenant_id)
      .eq('entity_type', 'claim')
      .eq('entity_id', claimId)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Error fetching claim documents:', { error })
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      documents: documents || [],
    })
  } catch (error) {
    logger.error('Error in GET /api/claims/[id]/documents:', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
