/**
 * QuickBooks Disconnect Endpoint
 * Removes QuickBooks integration for tenant
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function POST(_request: NextRequest) {
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

    // Delete QuickBooks tokens (hard delete for security)
    const { error: deleteError } = await supabase
      .from('quickbooks_tokens')
      .delete()
      .eq('tenant_id', tenantUser.tenant_id)

    if (deleteError) {
      logger.error('Failed to disconnect QuickBooks', { error: deleteError })
      return NextResponse.json(
        { error: 'Failed to disconnect QuickBooks' },
        { status: 500 }
      )
    }

    logger.info('QuickBooks disconnected successfully', {
      tenantId: tenantUser.tenant_id,
      userId: user.id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('QuickBooks disconnect error', { error })
    return NextResponse.json(
      { error: 'Failed to disconnect QuickBooks' },
      { status: 500 }
    )
  }
}
