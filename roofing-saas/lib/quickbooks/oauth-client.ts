import OAuthClient from 'intuit-oauth'

/**
 * Create and configure QuickBooks OAuth client
 * Used for OAuth flow and token management
 */
export function getOAuthClient() {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET
  const environment = process.env.QUICKBOOKS_ENVIRONMENT as 'sandbox' | 'production'
  const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI

  if (!clientId || !clientSecret || !environment || !redirectUri) {
    throw new Error('Missing QuickBooks OAuth configuration. Check environment variables.')
  }

  return new OAuthClient({
    clientId,
    clientSecret,
    environment,
    redirectUri,
  })
}

/**
 * Get QuickBooks API base URL based on environment
 */
export function getQuickBooksApiUrl(): string {
  const environment = process.env.QUICKBOOKS_ENVIRONMENT
  return environment === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com'
}

/**
 * OAuth scopes required for the application
 */
export const QUICKBOOKS_SCOPES = [
  OAuthClient.scopes.Accounting, // com.intuit.quickbooks.accounting
  OAuthClient.scopes.OpenId,     // openid
  OAuthClient.scopes.Profile,    // profile
  OAuthClient.scopes.Email,      // email
]
