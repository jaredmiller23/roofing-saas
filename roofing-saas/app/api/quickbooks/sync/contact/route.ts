/**
 * QuickBooks Contact Sync Endpoint
 * Sync a single contact or all contacts to QuickBooks
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getQuickBooksClient } from '@/lib/quickbooks/client'
import { syncContactToCustomer, bulkSyncContacts } from '@/lib/quickbooks/sync'
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
    const { contactId, bulkSync } = body

    if (bulkSync) {
      // Bulk sync all contacts
      logger.info('Starting bulk contact sync', { tenantId: tenantUser.tenant_id })

      const result = await bulkSyncContacts(tenantUser.tenant_id, qbClient)

      return NextResponse.json({
        success: true,
        message: `Synced ${result.synced} of ${result.total} contacts`,
        ...result,
      })
    }

    if (!contactId) {
      return NextResponse.json(
        { error: 'contactId or bulkSync required' },
        { status: 400 }
      )
    }

    // Sync single contact
    const result = await syncContactToCustomer(
      contactId,
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
      qbCustomerId: result.qbId,
    })
  } catch (error) {
    logger.error('QuickBooks contact sync error', { error })
    return NextResponse.json(
      { error: 'Failed to sync contact' },
      { status: 500 }
    )
  }
}
