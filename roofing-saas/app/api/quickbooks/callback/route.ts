import { NextRequest, NextResponse } from 'next/server'
import { getOAuthClient } from '@/lib/quickbooks/oauth-client'
import { getCurrentUser } from '@/lib/auth/session'
import { getUserTenantId } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

/**
 * Handle QuickBooks OAuth callback
 * GET /api/quickbooks/callback
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.redirect(
        new URL('/login?error=unauthorized', request.url)
      )
    }

    // Get user's tenant
    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.redirect(
        new URL('/dashboard?qb=error&message=no_tenant', request.url)
      )
    }

    // Verify CSRF state token
    const state = request.nextUrl.searchParams.get('state')
    const storedState = request.cookies.get('qb_oauth_state')?.value

    if (!state || !storedState || state !== storedState) {
      return NextResponse.redirect(
        new URL('/dashboard?qb=error&message=invalid_state', request.url)
      )
    }

    // Exchange authorization code for tokens
    const oauthClient = getOAuthClient()
    const authResponse = await oauthClient.createToken(request.url)
    const token = authResponse.getJson()

    // Extract token data
    const accessToken = token.access_token
    const refreshToken = token.refresh_token
    const realmId = authResponse.getToken().realmId
    const expiresIn = token.expires_in // seconds (3600 = 1 hour)

    if (!realmId) {
      return NextResponse.redirect(
        new URL('/dashboard?qb=error&message=no_realm_id', request.url)
      )
    }

    // Calculate expiration times
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000)
    const refreshTokenExpiresAt = new Date(Date.now() + 100 * 24 * 60 * 60 * 1000) // 100 days

    // Get company info for display name
    let companyName = 'QuickBooks Company'
    try {
      // Determine base URL based on environment
      const environment = process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox'
      const baseUrl = environment === 'production'
        ? 'https://quickbooks.api.intuit.com'
        : 'https://sandbox-quickbooks.api.intuit.com'

      oauthClient.setToken(token)
      const companyResponse = await oauthClient.makeApiCall({
        url: `${baseUrl}/v3/company/${realmId}/companyinfo/${realmId}`,
      })
      const companyData = JSON.parse(companyResponse.text())
      companyName = companyData.CompanyInfo?.CompanyName || companyName
    } catch (error) {
      console.error('Failed to fetch company info:', error)
    }

    // Store connection in database
    const supabase = await createClient()
    const { error: upsertError } = await supabase
      .from('quickbooks_connections')
      .upsert({
        tenant_id: tenantId,
        created_by: user.id,
        realm_id: realmId,
        company_name: companyName,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: tokenExpiresAt.toISOString(),
        refresh_token_expires_at: refreshTokenExpiresAt.toISOString(),
        is_active: true,
        environment: process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'tenant_id',
      })

    if (upsertError) {
      console.error('Database error:', upsertError)
      return NextResponse.redirect(
        new URL('/dashboard?qb=error&message=database_error', request.url)
      )
    }

    // Clear state cookie and redirect to success page
    const response = NextResponse.redirect(
      new URL('/dashboard?qb=connected', request.url)
    )
    response.cookies.delete('qb_oauth_state')

    return response
  } catch (error) {
    console.error('QuickBooks OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/dashboard?qb=error&message=unknown_error', request.url)
    )
  }
}
