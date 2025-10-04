/**
 * QuickBooks Status Endpoint
 * Check if QuickBooks is connected for the current tenant
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function GET(_request: NextRequest) {
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

    // Check if QB is connected
    const { data: token, error: tokenError } = await supabase
      .from('quickbooks_tokens')
      .select('realm_id, company_name, country, expires_at, created_at')
      .eq('tenant_id', tenantUser.tenant_id)
      .single()

    if (tokenError || !token) {
      return NextResponse.json({
        connected: false,
        message: 'QuickBooks not connected',
      })
    }

    // Check if token is expired
    const expiresAt = new Date(token.expires_at)
    const isExpired = expiresAt <= new Date()

    return NextResponse.json({
      connected: true,
      realm_id: token.realm_id,
      company_name: token.company_name,
      country: token.country,
      expires_at: token.expires_at,
      is_expired: isExpired,
      connected_at: token.created_at,
    })
  } catch (error) {
    logger.error('QuickBooks status error', { error })
    return NextResponse.json(
      { error: 'Failed to check QuickBooks status' },
      { status: 500 }
    )
  }
}
