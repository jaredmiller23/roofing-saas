/**
 * QuickBooks OAuth Authorization Endpoint
 * Redirects user to QuickBooks to authorize the app
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizationUrl } from '@/lib/quickbooks/client'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
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

    // Generate state token for CSRF protection
    const state = Buffer.from(JSON.stringify({
      tenant_id: tenantUser.tenant_id,
      user_id: user.id,
      timestamp: Date.now(),
    })).toString('base64')

    // Get redirect URI (should match QuickBooks app config)
    const redirectUri = `${request.nextUrl.origin}/api/quickbooks/callback`

    // Get authorization URL
    const authUrl = getAuthorizationUrl(redirectUri, state)

    logger.info('Redirecting to QuickBooks OAuth', {
      userId: user.id,
      tenantId: tenantUser.tenant_id,
    })

    // Redirect to QuickBooks authorization page
    return NextResponse.redirect(authUrl)
  } catch (error) {
    logger.error('QuickBooks auth error', { error })
    return NextResponse.json(
      { error: 'Failed to initiate QuickBooks authorization' },
      { status: 500 }
    )
  }
}
