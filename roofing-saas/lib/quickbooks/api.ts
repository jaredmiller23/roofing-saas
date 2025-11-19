import { createClient } from '@/lib/supabase/server'
import { getOAuthClient, getQuickBooksApiUrl } from './oauth-client'
import { withRetry, RetryableError, quickbooksRateLimiter } from './retry'
import { QuickBooksError } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * QuickBooks API wrapper with automatic token refresh, retry logic, and rate limiting
 */

interface QBConnection {
  id: string
  tenant_id: string
  realm_id: string
  access_token: string
  refresh_token: string
  expires_at: string
  token_type: string
  company_name?: string
  country?: string
}

/**
 * Get active QuickBooks connection for tenant
 */
export async function getQuickBooksConnection(tenantId: string): Promise<QBConnection | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('quickbooks_tokens')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  if (error || !data) {
    return null
  }

  return data as QBConnection
}

/**
 * Check if token needs refresh and refresh if necessary
 */
async function ensureValidToken(connection: QBConnection): Promise<string> {
  const expiresAt = new Date(connection.expires_at)
  const bufferTime = 5 * 60 * 1000 // 5 minutes buffer
  const needsRefresh = expiresAt.getTime() - Date.now() < bufferTime

  if (!needsRefresh) {
    return connection.access_token
  }

  // Token is expiring soon, refresh it
  const oauthClient = getOAuthClient()
  oauthClient.setToken({
    access_token: connection.access_token,
    refresh_token: connection.refresh_token,
    token_type: 'bearer',
    expires_in: 3600,
    realmId: connection.realm_id,
  })

  const authResponse = await oauthClient.refresh()
  const newToken = authResponse.getJson()

  // Update database with new tokens
  const supabase = await createClient()
  const tokenExpiresAt = new Date(Date.now() + newToken.expires_in * 1000)

  await supabase
    .from('quickbooks_tokens')
    .update({
      access_token: newToken.access_token,
      refresh_token: newToken.refresh_token,
      expires_at: tokenExpiresAt.toISOString(),
    })
    .eq('tenant_id', connection.tenant_id)

  return newToken.access_token
}

/**
 * Make authenticated QuickBooks API call with retry logic and rate limiting
 */
export async function makeQuickBooksApiCall(
  tenantId: string,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: unknown
): Promise<unknown> {
  // Acquire rate limit token
  await quickbooksRateLimiter.acquire()

  return withRetry(async () => {
    // Get connection
    const connection = await getQuickBooksConnection(tenantId)
    if (!connection) {
      logger.error('QuickBooks connection not found', { tenantId })
      throw QuickBooksError('QuickBooks not connected')
    }

    // Ensure token is valid
    const accessToken = await ensureValidToken(connection)

    // Build URL
    const baseUrl = getQuickBooksApiUrl()
    const url = `${baseUrl}/v3/company/${connection.realm_id}${endpoint}`

    logger.debug('QuickBooks API request', {
      tenantId,
      method,
      endpoint,
      realmId: connection.realm_id,
    })

    // Make API call
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    // Handle errors
    if (!response.ok) {
      const errorText = await response.text()

      logger.error('QuickBooks API error', {
        tenantId,
        endpoint,
        status: response.status,
        error: errorText,
      })

      // Handle 401 - reauth required
      if (response.status === 401) {
        await markConnectionInactive(tenantId, 'Authentication failed - reauth required')
        throw QuickBooksError('QuickBooks authentication expired - reconnection required')
      }

      // Handle 429 - rate limit
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60')
        throw new RetryableError('Rate limit exceeded', 429, retryAfter)
      }

      // Handle 5xx - server errors (retryable)
      if (response.status >= 500) {
        throw new RetryableError(
          `QuickBooks server error: ${response.status}`,
          response.status
        )
      }

      // Non-retryable error
      throw QuickBooksError(`QuickBooks API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    logger.debug('QuickBooks API response', {
      tenantId,
      endpoint,
      status: response.status,
    })

    return data
  })
}

/**
 * Mark connection as inactive by deleting tokens
 * (User will need to re-authorize)
 */
async function markConnectionInactive(tenantId: string, error: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('quickbooks_tokens')
    .delete()
    .eq('tenant_id', tenantId)

  logger.warn('QuickBooks connection removed due to error', { tenantId, error })
}

/**
 * Get company information
 */
export async function getCompanyInfo(tenantId: string) {
  const connection = await getQuickBooksConnection(tenantId)
  if (!connection) throw new Error('QuickBooks not connected')

  return makeQuickBooksApiCall(
    tenantId,
    `/companyinfo/${connection.realm_id}`
  )
}

/**
 * Query QuickBooks using SQL-like syntax
 */
export async function queryQuickBooks(tenantId: string, query: string) {
  return makeQuickBooksApiCall(
    tenantId,
    `/query?query=${encodeURIComponent(query)}`
  )
}

/**
 * Create a customer in QuickBooks
 */
export async function createQuickBooksCustomer(
  tenantId: string,
  customerData: {
    DisplayName: string
    GivenName?: string
    FamilyName?: string
    PrimaryEmailAddr?: { Address: string }
    PrimaryPhone?: { FreeFormNumber: string }
    BillAddr?: {
      Line1?: string
      City?: string
      CountrySubDivisionCode?: string
      PostalCode?: string
    }
  }
) {
  return makeQuickBooksApiCall(tenantId, '/customer', 'POST', customerData)
}

/**
 * Get all customers
 */
export async function getQuickBooksCustomers(tenantId: string, maxResults = 100) {
  return queryQuickBooks(
    tenantId,
    `SELECT * FROM Customer MAXRESULTS ${maxResults}`
  )
}

/**
 * Create an invoice in QuickBooks
 */
export async function createQuickBooksInvoice(
  tenantId: string,
  invoiceData: {
    CustomerRef: { value: string }
    Line: Array<{
      Amount: number
      DetailType: 'SalesItemLineDetail'
      SalesItemLineDetail: {
        ItemRef: { value: string }
        Qty?: number
        UnitPrice?: number
      }
      Description?: string
    }>
  }
) {
  return makeQuickBooksApiCall(tenantId, '/invoice', 'POST', invoiceData)
}

/**
 * Get all invoices
 */
export async function getQuickBooksInvoices(tenantId: string, maxResults = 100) {
  return queryQuickBooks(
    tenantId,
    `SELECT * FROM Invoice MAXRESULTS ${maxResults}`
  )
}
