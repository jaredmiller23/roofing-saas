/**
 * QuickBooks Online API Client (Unified)
 *
 * Single source of truth for all QuickBooks API interactions.
 * Handles:
 * - OAuth 2.0 token management (encrypted via Supabase Vault)
 * - Token refresh with encrypted storage
 * - Rate limiting (token bucket, 500 req/min)
 * - Retry with exponential backoff
 * - Sentry instrumentation
 *
 * IMPORTANT: Production table is `quickbooks_connections` (NOT `quickbooks_tokens`).
 * Column `token_expires_at` (NOT `expires_at`).
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { quickbooksSpan } from '@/lib/instrumentation'
import { withRetry, RetryableError, quickbooksRateLimiter } from './retry'

// QuickBooks API base URLs
const QB_OAUTH_URL = 'https://appcenter.intuit.com/connect/oauth2'
const QB_API_BASE_URL = 'https://quickbooks.api.intuit.com/v3/company'
const QB_SANDBOX_API_BASE_URL = 'https://sandbox-quickbooks.api.intuit.com/v3/company'

// Token response from QuickBooks
interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  x_refresh_token_expires_in: number
}

// Connection record from quickbooks_connections table
// Matches the production schema in database.types.ts
interface QBConnectionRecord {
  id: string
  tenant_id: string
  realm_id: string
  access_token: string
  refresh_token: string
  token_expires_at: string
  refresh_token_expires_at: string
  company_name: string | null
  is_active: boolean | null
  last_sync_at: string | null
  sync_error: string | null
  environment: string | null
  created_at: string | null
  created_by: string | null
  updated_at: string | null
}

// QB Customer entity
export interface QBCustomer {
  Id?: string
  SyncToken?: string
  DisplayName: string
  CompanyName?: string
  PrimaryEmailAddr?: {
    Address: string
  }
  PrimaryPhone?: {
    FreeFormNumber: string
  }
  BillAddr?: {
    Line1?: string
    City?: string
    CountrySubDivisionCode?: string
    PostalCode?: string
  }
  GivenName?: string
  FamilyName?: string
  Balance?: number
  Active?: boolean
}

// QB Invoice entity
export interface QBInvoice {
  Id?: string
  CustomerRef: {
    value: string
    name?: string
  }
  Line: Array<{
    Amount: number
    DetailType: 'SalesItemLineDetail' | 'SubTotalLineDetail'
    SalesItemLineDetail?: {
      ItemRef: {
        value: string
        name?: string
      }
      Qty?: number
      UnitPrice?: number
    }
    Description?: string
  }>
  TxnDate?: string
  DueDate?: string
  DocNumber?: string
}

// QB Payment entity
export interface QBPayment {
  Id?: string
  CustomerRef: {
    value: string
  }
  TotalAmt: number
  TxnDate?: string
  PaymentRefNum?: string
  Line?: Array<{
    Amount: number
    LinkedTxn: Array<{
      TxnId: string
      TxnType: string
    }>
  }>
}

// QB Item entity (for configurable ItemRef)
export interface QBItem {
  Id: string
  Name: string
  Type: string
  Active: boolean
}

// QB Company Info entity
export interface QBCompanyInfo {
  CompanyName?: string
  LegalName?: string
  CompanyAddr?: {
    Line1?: string
    City?: string
    CountrySubDivisionCode?: string
    PostalCode?: string
  }
  CustomerCommunicationAddr?: {
    Line1?: string
    City?: string
    CountrySubDivisionCode?: string
    PostalCode?: string
  }
  PrimaryPhone?: {
    FreeFormNumber?: string
  }
  CompanyStartDate?: string
  FiscalYearStartMonth?: string
  Country?: string
  Email?: {
    Address?: string
  }
  WebAddr?: {
    URI?: string
  }
  SupportedLanguages?: string
  NameValue?: Array<{
    Name: string
    Value: string
  }>
}

// QB API Response Types
interface QBCompanyInfoResponse {
  CompanyInfo: QBCompanyInfo
}

interface QBQueryResponse<T> {
  QueryResponse?: {
    Customer?: T[]
    Invoice?: T[]
    Payment?: T[]
    Item?: T[]
  }
}

interface QBEntityResponse<T> {
  Customer?: T
  Invoice?: T
  Payment?: T
}

/**
 * Escape user-provided values for QuickBooks query language.
 * QB uses single-quote delimited strings. Unescaped quotes allow injection.
 */
export function escapeQBQuery(value: string): string {
  // QB query language escapes single quotes by doubling them
  return value.replace(/'/g, "''")
}

/**
 * QuickBooks Online API Client
 *
 * Wraps all QB API calls with rate limiting, retry, and Sentry instrumentation.
 */
export class QuickBooksClient {
  private realmId: string
  private accessToken: string
  private apiBaseUrl: string

  constructor(realmId: string, accessToken: string, environment?: string) {
    this.realmId = realmId
    this.accessToken = accessToken
    this.apiBaseUrl = environment === 'sandbox' ? QB_SANDBOX_API_BASE_URL : QB_API_BASE_URL
  }

  /**
   * Make authenticated API request with rate limiting, retry, and Sentry span.
   */
  private async request<T>(
    method: string,
    endpoint: string,
    data?: unknown
  ): Promise<T> {
    // Rate limit before making request
    await quickbooksRateLimiter.acquire()

    return withRetry(async () => {
      return quickbooksSpan(
        `${method} ${endpoint.split('?')[0]}`,
        async () => {
          const url = `${this.apiBaseUrl}/${this.realmId}${endpoint}`

          const options: RequestInit = {
            method,
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          }

          if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data)
          }

          logger.debug('QB API Request', { method, endpoint })

          const response = await fetch(url, options)

          if (!response.ok) {
            const errorText = await response.text()
            logger.error('QB API Error', { status: response.status, error: errorText })

            // 429 - Rate limit exceeded (retryable)
            if (response.status === 429) {
              const retryAfter = parseInt(response.headers.get('Retry-After') || '60')
              throw new RetryableError('Rate limit exceeded', 429, retryAfter)
            }

            // 5xx - Server errors (retryable)
            if (response.status >= 500) {
              throw new RetryableError(
                `QuickBooks server error: ${response.status}`,
                response.status
              )
            }

            throw new Error(`QuickBooks API error: ${response.status} - ${errorText}`)
          }

          return await response.json()
        },
        {
          'quickbooks.method': method,
          'quickbooks.endpoint': endpoint.split('?')[0],
        }
      )
    })
  }

  /**
   * Execute a QB query (SQL-like syntax).
   * Callers MUST escape user-provided values with escapeQBQuery().
   */
  async query(queryString: string): Promise<unknown> {
    return this.request('GET', `/query?query=${encodeURIComponent(queryString)}`)
  }

  /**
   * Get company info
   */
  async getCompanyInfo(): Promise<QBCompanyInfo> {
    const result = await this.request<QBCompanyInfoResponse>('GET', '/companyinfo/' + this.realmId)
    return result.CompanyInfo
  }

  /**
   * Get all customers (optionally filtered by display name)
   */
  async getCustomers(query?: string): Promise<QBCustomer[]> {
    let ql = 'SELECT * FROM Customer'
    if (query) {
      ql += ` WHERE DisplayName LIKE '%${escapeQBQuery(query)}%'`
    }
    ql += ' MAXRESULTS 1000'

    const result = await this.request<QBQueryResponse<QBCustomer>>('GET', `/query?query=${encodeURIComponent(ql)}`)
    return result.QueryResponse?.Customer || []
  }

  /**
   * Get customer by ID
   */
  async getCustomer(customerId: string): Promise<QBCustomer> {
    const result = await this.request<QBEntityResponse<QBCustomer>>('GET', `/customer/${customerId}`)
    return result.Customer!
  }

  /**
   * Create customer
   */
  async createCustomer(customer: QBCustomer): Promise<QBCustomer> {
    const result = await this.request<QBEntityResponse<QBCustomer>>('POST', '/customer', customer)
    return result.Customer!
  }

  /**
   * Update customer
   */
  async updateCustomer(customer: QBCustomer & { Id: string; SyncToken: string }): Promise<QBCustomer> {
    const result = await this.request<QBEntityResponse<QBCustomer>>('POST', '/customer', customer)
    return result.Customer!
  }

  /**
   * Get all invoices (optionally filtered by customer)
   */
  async getInvoices(customerId?: string): Promise<QBInvoice[]> {
    let ql = 'SELECT * FROM Invoice'
    if (customerId) {
      ql += ` WHERE CustomerRef = '${escapeQBQuery(customerId)}'`
    }
    ql += ' MAXRESULTS 1000'

    const result = await this.request<QBQueryResponse<QBInvoice>>('GET', `/query?query=${encodeURIComponent(ql)}`)
    return result.QueryResponse?.Invoice || []
  }

  /**
   * Create invoice
   */
  async createInvoice(invoice: QBInvoice): Promise<QBInvoice> {
    const result = await this.request<QBEntityResponse<QBInvoice>>('POST', '/invoice', invoice)
    return result.Invoice!
  }

  /**
   * Get payments (optionally filtered by customer)
   */
  async getPayments(customerId?: string): Promise<QBPayment[]> {
    let ql = 'SELECT * FROM Payment'
    if (customerId) {
      ql += ` WHERE CustomerRef = '${escapeQBQuery(customerId)}'`
    }
    ql += ' MAXRESULTS 1000'

    const result = await this.request<QBQueryResponse<QBPayment>>('GET', `/query?query=${encodeURIComponent(ql)}`)
    return result.QueryResponse?.Payment || []
  }

  /**
   * Create payment
   */
  async createPayment(payment: QBPayment): Promise<QBPayment> {
    const result = await this.request<QBEntityResponse<QBPayment>>('POST', '/payment', payment)
    return result.Payment!
  }

  /**
   * Get items (for configurable ItemRef)
   */
  async getItems(type?: string): Promise<QBItem[]> {
    let ql = 'SELECT * FROM Item WHERE Active = true'
    if (type) {
      ql += ` AND Type = '${escapeQBQuery(type)}'`
    }
    ql += ' MAXRESULTS 100'

    const result = await this.request<QBQueryResponse<QBItem>>('GET', `/query?query=${encodeURIComponent(ql)}`)
    return result.QueryResponse?.Item || []
  }
}

/**
 * Get the raw QuickBooks connection record for a tenant.
 * Returns the connection row (tokens still encrypted).
 */
export async function getQuickBooksConnection(tenantId: string): Promise<QBConnectionRecord | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('quickbooks_connections')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return null
  }

  return data as unknown as QBConnectionRecord
}

/**
 * Get QuickBooks client for tenant.
 * Handles token decryption, expiry check, and automatic refresh.
 */
export async function getQuickBooksClient(tenantId: string): Promise<QuickBooksClient | null> {
  const supabase = await createClient()

  // Get connection from database (encrypted tokens)
  const { data: connection, error } = await supabase
    .from('quickbooks_connections')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .single()

  if (error || !connection) {
    logger.warn('No active QuickBooks connection found', { tenantId, error })
    return null
  }

  // Check if refresh token has expired (QB refresh tokens last 100 days)
  if (connection.refresh_token_expires_at) {
    const refreshExpires = new Date(connection.refresh_token_expires_at)
    if (refreshExpires <= new Date()) {
      logger.warn('QuickBooks refresh token expired - reauthorization required', { tenantId })
      // Soft-disable connection
      await supabase
        .from('quickbooks_connections')
        .update({ is_active: false, sync_error: 'Refresh token expired - please reconnect' })
        .eq('tenant_id', tenantId)
      return null
    }
  }

  // Decrypt tokens using Vault functions
  const { data: rawDecryptedAccessToken, error: accessTokenError } = await supabase
    .rpc('decrypt_qb_token', { encrypted_data: connection.access_token })

  const { data: rawDecryptedRefreshToken, error: refreshTokenError } = await supabase
    .rpc('decrypt_qb_token', { encrypted_data: connection.refresh_token })

  const decryptedAccessToken = rawDecryptedAccessToken as unknown as string | null
  const decryptedRefreshToken = rawDecryptedRefreshToken as unknown as string | null

  if (accessTokenError || refreshTokenError || !decryptedAccessToken || !decryptedRefreshToken) {
    logger.error('Failed to decrypt QB tokens', {
      tenantId,
      accessTokenError,
      refreshTokenError
    })
    return null
  }

  // Check if access token is expired
  const expiresAt = new Date(connection.token_expires_at)
  const now = new Date()

  if (expiresAt <= now) {
    // Token expired, need to refresh
    logger.info('QuickBooks access token expired, refreshing', { tenantId })
    const newToken = await refreshAccessToken(decryptedRefreshToken)

    if (!newToken) {
      logger.error('Failed to refresh QuickBooks token', { tenantId })
      // Soft-disable connection
      await supabase
        .from('quickbooks_connections')
        .update({ is_active: false, sync_error: 'Token refresh failed' })
        .eq('tenant_id', tenantId)
      return null
    }

    // Encrypt new tokens before storing
    const { data: encryptedAccessTokenData } = await supabase
      .rpc('encrypt_qb_token', { plaintext: newToken.access_token })

    const { data: encryptedRefreshTokenData } = await supabase
      .rpc('encrypt_qb_token', { plaintext: newToken.refresh_token })

    const encryptedAccessToken = encryptedAccessTokenData as unknown as string | null
    const encryptedRefreshToken = encryptedRefreshTokenData as unknown as string | null

    if (!encryptedAccessToken || !encryptedRefreshToken) {
      logger.error('Failed to encrypt new QB tokens', { tenantId })
      return null
    }

    // Calculate new expiration times
    const tokenExpiresAt = new Date(Date.now() + newToken.expires_in * 1000)
    const refreshTokenExpiresAt = new Date(Date.now() + newToken.x_refresh_token_expires_in * 1000)

    // Update tokens in database
    await supabase
      .from('quickbooks_connections')
      .update({
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: tokenExpiresAt.toISOString(),
        refresh_token_expires_at: refreshTokenExpiresAt.toISOString(),
        sync_error: null,
      })
      .eq('tenant_id', tenantId)

    return new QuickBooksClient(connection.realm_id, newToken.access_token, connection.environment ?? undefined)
  }

  return new QuickBooksClient(connection.realm_id, decryptedAccessToken, connection.environment ?? undefined)
}

/**
 * Get the default Item for invoice line items.
 * Reads from quickbooks_connections.default_item_id/default_item_name first.
 * Falls back to querying QB for the first Service item.
 */
export async function getDefaultItem(
  tenantId: string,
  client: QuickBooksClient
): Promise<{ value: string; name: string }> {
  const supabase = await createClient()

  // Check stored default first.
  // NOTE: default_item_id/default_item_name columns are added by the
  // 20260204100000_quickbooks_schema_reconciliation migration.
  // We use a raw select('*') and cast to avoid TS errors if the columns
  // haven't been added to the generated types yet.
  const { data: connection } = await supabase
    .from('quickbooks_connections')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  const connRecord = connection as unknown as { default_item_id?: string; default_item_name?: string } | null
  if (connRecord?.default_item_id && connRecord?.default_item_name) {
    return { value: connRecord.default_item_id, name: connRecord.default_item_name }
  }

  // Query QB for first Service item
  try {
    const items = await client.getItems('Service')
    if (items.length > 0) {
      const item = items[0]

      // Attempt to cache the default item in the connection record.
      // The default_item_id/default_item_name columns are added by our migration.
      // If the migration hasn't run yet, this update silently fails (no harm).
      const updatePayload = { default_item_id: item.Id, default_item_name: item.Name } as Record<string, string>
      await supabase
        .from('quickbooks_connections')
        .update(updatePayload as never)
        .eq('tenant_id', tenantId)

      return { value: item.Id, name: item.Name }
    }
  } catch (err) {
    logger.warn('Failed to query QB items for default', { tenantId, error: err })
  }

  // Final fallback: hardcoded default (should rarely hit this)
  logger.warn('Using hardcoded default ItemRef - configure default_item_id in quickbooks_connections', { tenantId })
  return { value: '1', name: 'Services' }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse | null> {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('QuickBooks credentials not configured')
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })

  const response = await fetch(`${QB_OAUTH_URL}/v1/tokens/bearer`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: params,
  })

  if (!response.ok) {
    const error = await response.text()
    logger.error('Failed to refresh QB token', { error })
    return null
  }

  return await response.json()
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeAuthCode(
  code: string,
  realmId: string,
  redirectUri: string
): Promise<TokenResponse> {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('QuickBooks credentials not configured')
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  })

  const response = await fetch(`${QB_OAUTH_URL}/v1/tokens/bearer`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: params,
  })

  if (!response.ok) {
    const error = await response.text()
    logger.error('Failed to exchange auth code', { error })
    throw new Error(`Token exchange failed: ${error}`)
  }

  return await response.json()
}

/**
 * Get authorization URL for OAuth flow
 */
export function getAuthorizationUrl(redirectUri: string, state: string): string {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID

  if (!clientId) {
    throw new Error('QuickBooks Client ID not configured')
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'com.intuit.quickbooks.accounting',
    state,
  })

  return `${QB_OAUTH_URL}/v1/authorize?${params.toString()}`
}
