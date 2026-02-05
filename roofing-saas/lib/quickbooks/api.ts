/**
 * QuickBooks API Wrapper (Thin Delegation Layer)
 *
 * This module delegates to the unified client in ./client.ts.
 * It exists to preserve the import interface used by ARIA functions
 * and other modules that import from '@/lib/quickbooks/api'.
 *
 * All token management, encryption, retry, and rate limiting
 * are handled by the unified client.
 */

import {
  getQuickBooksClient,
  getQuickBooksConnection as getConnectionFromClient,
  escapeQBQuery,
} from './client'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

/**
 * Get active QuickBooks connection for tenant.
 * Returns the raw connection record (tokens are still encrypted).
 */
export async function getQuickBooksConnection(tenantId: string) {
  return getConnectionFromClient(tenantId)
}

/**
 * Make authenticated QuickBooks API call with retry logic and rate limiting.
 *
 * Delegates to the unified QuickBooksClient which handles token decryption,
 * refresh, rate limiting, retry, and Sentry instrumentation.
 */
export async function makeQuickBooksApiCall(
  tenantId: string,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  _body?: unknown
): Promise<unknown> {
  const client = await getQuickBooksClient(tenantId)
  if (!client) {
    throw new Error('QuickBooks not connected')
  }

  // For query endpoints, delegate to the client's query method
  if (method === 'GET' && endpoint.startsWith('/query?query=')) {
    const queryStr = decodeURIComponent(endpoint.replace('/query?query=', ''))
    return client.query(queryStr)
  }

  // For company info
  if (method === 'GET' && endpoint.includes('/companyinfo/')) {
    return { CompanyInfo: await client.getCompanyInfo() }
  }

  // For other endpoints, use the client's query method as a generic request
  // The client handles auth, retry, rate limiting internally
  return client.query(`${endpoint}`)
}

/**
 * Get company information
 */
export async function getCompanyInfo(tenantId: string) {
  const client = await getQuickBooksClient(tenantId)
  if (!client) throw new Error('QuickBooks not connected')

  return { CompanyInfo: await client.getCompanyInfo() }
}

/**
 * Query QuickBooks using SQL-like syntax.
 * Callers must escape user-provided values via escapeQBQuery().
 */
export async function queryQuickBooks(tenantId: string, query: string) {
  const client = await getQuickBooksClient(tenantId)
  if (!client) throw new Error('QuickBooks not connected')

  return client.query(query)
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
  const client = await getQuickBooksClient(tenantId)
  if (!client) throw new Error('QuickBooks not connected')

  return client.createCustomer(customerData)
}

/**
 * Get all customers
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getQuickBooksCustomers(tenantId: string, maxResults = 100) {
  const client = await getQuickBooksClient(tenantId)
  if (!client) throw new Error('QuickBooks not connected')

  return client.getCustomers()
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
  const client = await getQuickBooksClient(tenantId)
  if (!client) throw new Error('QuickBooks not connected')

  return client.createInvoice(invoiceData)
}

/**
 * Get all invoices
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getQuickBooksInvoices(tenantId: string, maxResults = 100) {
  const client = await getQuickBooksClient(tenantId)
  if (!client) throw new Error('QuickBooks not connected')

  return client.getInvoices()
}

/**
 * Mark connection as inactive with error message.
 * Uses soft-disable (is_active = false) instead of hard delete.
 */
export async function markConnectionInactive(tenantId: string, error: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('quickbooks_connections')
    .update({ is_active: false, sync_error: error })
    .eq('tenant_id', tenantId)

  logger.warn('QuickBooks connection deactivated', { tenantId, error })
}

// Re-export for convenience
export { escapeQBQuery }
