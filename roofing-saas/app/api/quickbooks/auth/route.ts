import { NextRequest, NextResponse } from 'next/server'
import { getOAuthClient, QUICKBOOKS_SCOPES } from '@/lib/quickbooks/oauth-client'
import { getCurrentUser } from '@/lib/auth/session'
import { randomBytes } from 'crypto'

/**
 * Initiate QuickBooks OAuth flow
 * GET /api/quickbooks/auth
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Generate CSRF token for security
    const state = randomBytes(32).toString('hex')

    // Store state in cookie for verification in callback
    const response = NextResponse.redirect(
      getOAuthClient().authorizeUri({
        scope: QUICKBOOKS_SCOPES,
        state,
      })
    )

    response.cookies.set('qb_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    })

    return response
  } catch (error) {
    console.error('QuickBooks OAuth initiation error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate QuickBooks connection' },
      { status: 500 }
    )
  }
}
