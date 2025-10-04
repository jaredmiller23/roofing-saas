/**
 * QuickBooks Project Sync Endpoint
 * Sync a project to QuickBooks as an invoice
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getQuickBooksClient } from '@/lib/quickbooks/client'
import { syncProjectToInvoice } from '@/lib/quickbooks/sync'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user and tenant
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's tenant
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    if (!tenantUser) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
    }

    // Get QB client
    const qbClient = await getQuickBooksClient(tenantUser.tenant_id)

    if (!qbClient) {
      return NextResponse.json(
        { error: 'QuickBooks not connected' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { projectId } = body

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId required' },
        { status: 400 }
      )
    }

    // Sync project to invoice
    const result = await syncProjectToInvoice(
      projectId,
      tenantUser.tenant_id,
      qbClient
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      qbInvoiceId: result.qbId,
    })
  } catch (error) {
    logger.error('QuickBooks project sync error', { error })
    return NextResponse.json(
      { error: 'Failed to sync project' },
      { status: 500 }
    )
  }
}
