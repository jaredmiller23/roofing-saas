/**
 * QuickBooks Online API Client
 * Handles OAuth 2.0 authentication and API requests
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// QuickBooks API base URLs
const QB_OAUTH_URL = 'https://appcenter.intuit.com/connect/oauth2'
const QB_API_BASE_URL = 'https://quickbooks.api.intuit.com/v3/company'

// Token response from QuickBooks
interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  x_refresh_token_expires_in: number
}

// QB Customer entity
export interface QBCustomer {
  Id?: string
  SyncToken?: string
  DisplayName: string
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
  }
}

interface QBEntityResponse<T> {
  Customer?: T
  Invoice?: T
  Payment?: T
}

/**
 * QuickBooks Online API Client
 */
export class QuickBooksClient {
  private realmId: string
  private accessToken: string

  constructor(realmId: string, accessToken: string) {
    this.realmId = realmId
    this.accessToken = accessToken
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    method: string,
    endpoint: string,
    data?: unknown
  ): Promise<T> {
    const url = `${QB_API_BASE_URL}/${this.realmId}${endpoint}`

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
      const error = await response.text()
      logger.error('QB API Error', { status: response.status, error })
      throw new Error(`QuickBooks API error: ${response.status} - ${error}`)
    }

    const result = await response.json()
    return result
  }

  /**
   * Get company info
   */
  async getCompanyInfo(): Promise<QBCompanyInfo> {
    const result = await this.request<QBCompanyInfoResponse>('GET', '/companyinfo/' + this.realmId)
    return result.CompanyInfo
  }

  /**
   * Get all customers
   */
  async getCustomers(query?: string): Promise<QBCustomer[]> {
    let endpoint = '/query?query=SELECT * FROM Customer'
    if (query) {
      endpoint += ` WHERE DisplayName LIKE '%${query}%'`
    }
    endpoint += ' MAXRESULTS 1000'

    const result = await this.request<QBQueryResponse<QBCustomer>>('GET', endpoint)
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
   * Get all invoices
   */
  async getInvoices(customerId?: string): Promise<QBInvoice[]> {
    let endpoint = '/query?query=SELECT * FROM Invoice'
    if (customerId) {
      endpoint += ` WHERE CustomerRef = '${customerId}'`
    }
    endpoint += ' MAXRESULTS 1000'

    const result = await this.request<QBQueryResponse<QBInvoice>>('GET', endpoint)
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
   * Get payments
   */
  async getPayments(customerId?: string): Promise<QBPayment[]> {
    let endpoint = '/query?query=SELECT * FROM Payment'
    if (customerId) {
      endpoint += ` WHERE CustomerRef = '${customerId}'`
    }
    endpoint += ' MAXRESULTS 1000'

    const result = await this.request<QBQueryResponse<QBPayment>>('GET', endpoint)
    return result.QueryResponse?.Payment || []
  }

  /**
   * Create payment
   */
  async createPayment(payment: QBPayment): Promise<QBPayment> {
    const result = await this.request<QBEntityResponse<QBPayment>>('POST', '/payment', payment)
    return result.Payment!
  }
}

/**
 * Get QuickBooks client for tenant
 */
export async function getQuickBooksClient(tenantId: string): Promise<QuickBooksClient | null> {
  const supabase = await createClient()

  // Get token from database (encrypted)
  const { data: token, error } = await supabase
    .from('quickbooks_tokens')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  if (error || !token) {
    logger.warn('No QuickBooks token found', { tenantId, error })
    return null
  }

  // Decrypt tokens using PostgreSQL function
  const { data: decryptedAccessTokenData, error: accessTokenError } = await supabase
    .rpc('decrypt_qb_token', { encrypted_data: token.access_token })

  const { data: decryptedRefreshTokenData, error: refreshTokenError } = await supabase
    .rpc('decrypt_qb_token', { encrypted_data: token.refresh_token })

  const decryptedAccessToken = decryptedAccessTokenData as unknown as string | null
  const decryptedRefreshToken = decryptedRefreshTokenData as unknown as string | null

  if (accessTokenError || refreshTokenError || !decryptedAccessToken || !decryptedRefreshToken) {
    logger.error('Failed to decrypt QB tokens', {
      tenantId,
      accessTokenError,
      refreshTokenError
    })
    return null
  }

  // Check if token is expired
  const expiresAt = new Date(token.expires_at)
  const now = new Date()

  if (expiresAt <= now) {
    // Token expired, need to refresh
    logger.info('QuickBooks token expired, refreshing', { tenantId })
    const newToken = await refreshAccessToken(decryptedRefreshToken)

    if (!newToken) {
      logger.error('Failed to refresh QuickBooks token', { tenantId })
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

    // Update token in database with encrypted values
    await supabase
      .from('quickbooks_tokens')
      .update({
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        expires_at: new Date(Date.now() + newToken.expires_in * 1000).toISOString(),
      })
      .eq('tenant_id', tenantId)

    return new QuickBooksClient(token.realm_id, newToken.access_token)
  }

  return new QuickBooksClient(token.realm_id, decryptedAccessToken)
}

/**
 * Refresh access token
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
