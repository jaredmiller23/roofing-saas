/**
 * ARIA QuickBooks Functions
 * Financial lookups and queries
 */

import { ariaFunctionRegistry } from '../function-registry'
import { makeQuickBooksApiCall, getQuickBooksConnection, escapeQBQuery } from '@/lib/quickbooks/api'
import { logger } from '@/lib/logger'

// =============================================================================
// QuickBooks Customer Lookup
// =============================================================================

ariaFunctionRegistry.register({
  name: 'qb_lookup_customer',
  category: 'quickbooks',
  description: 'Look up a customer in QuickBooks by name or phone',
  riskLevel: 'low',
  enabledByDefault: true,
  requiredIntegrations: ['quickbooks'],
  voiceDefinition: {
    type: 'function',
    name: 'qb_lookup_customer',
    description: 'Look up a customer in QuickBooks by name or phone',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Customer name, phone, or email to search for',
        },
        search_type: {
          type: 'string',
          enum: ['name', 'phone', 'email', 'all'],
          description: 'Type of search to perform (default: all)',
        },
      },
      required: ['query'],
    },
  },
  execute: async (args, context) => {
    const { query, search_type = 'all' } = args as {
      query: string
      search_type?: 'name' | 'phone' | 'email' | 'all'
    }

    // Check if QuickBooks is connected
    const connection = await getQuickBooksConnection(context.tenantId)
    if (!connection) {
      return { success: false, error: 'QuickBooks not connected' }
    }

    try {
      // Escape user input to prevent QB query injection
      const escapedQuery = escapeQBQuery(query)

      // Build query based on search type
      let sqlQuery = ''
      if (search_type === 'name' || search_type === 'all') {
        sqlQuery = `SELECT * FROM Customer WHERE DisplayName LIKE '%${escapedQuery}%' MAXRESULTS 10`
      } else if (search_type === 'phone') {
        sqlQuery = `SELECT * FROM Customer WHERE PrimaryPhone LIKE '%${escapedQuery}%' MAXRESULTS 10`
      } else if (search_type === 'email') {
        sqlQuery = `SELECT * FROM Customer WHERE PrimaryEmailAddr LIKE '%${escapedQuery}%' MAXRESULTS 10`
      }

      const result = await makeQuickBooksApiCall(
        context.tenantId,
        `/query?query=${encodeURIComponent(sqlQuery)}`
      ) as { QueryResponse?: { Customer?: Array<Record<string, unknown>> } }

      const customers = result?.QueryResponse?.Customer || []

      if (customers.length === 0) {
        return {
          success: true,
          data: [],
          message: `No customers found matching "${query}"`,
        }
      }

      // Format customer data
      const formattedCustomers = customers.map((c: Record<string, unknown>) => ({
        id: c.Id,
        displayName: c.DisplayName,
        companyName: c.CompanyName,
        phone: (c.PrimaryPhone as Record<string, unknown>)?.FreeFormNumber,
        email: (c.PrimaryEmailAddr as Record<string, unknown>)?.Address,
        balance: c.Balance,
        active: c.Active,
      }))

      return {
        success: true,
        data: formattedCustomers,
        message: `Found ${customers.length} customer(s)`,
      }
    } catch (error) {
      logger.error('ARIA qb_lookup_customer error:', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'QuickBooks lookup failed',
      }
    }
  },
})

// =============================================================================
// QuickBooks Get Invoices
// =============================================================================

ariaFunctionRegistry.register({
  name: 'qb_get_invoices',
  category: 'quickbooks',
  description: 'Get invoices for a customer from QuickBooks',
  riskLevel: 'low',
  enabledByDefault: true,
  requiredIntegrations: ['quickbooks'],
  voiceDefinition: {
    type: 'function',
    name: 'qb_get_invoices',
    description: 'Get invoices for a customer from QuickBooks',
    parameters: {
      type: 'object',
      properties: {
        customer_id: {
          type: 'string',
          description: 'QuickBooks Customer ID',
        },
        customer_name: {
          type: 'string',
          description: 'Customer name (if ID not known)',
        },
        status: {
          type: 'string',
          enum: ['open', 'paid', 'all'],
          description: 'Filter by invoice status (default: open)',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const { customer_id, customer_name, status = 'open' } = args as {
      customer_id?: string
      customer_name?: string
      status?: 'open' | 'paid' | 'all'
    }

    // Check if QuickBooks is connected
    const connection = await getQuickBooksConnection(context.tenantId)
    if (!connection) {
      return { success: false, error: 'QuickBooks not connected' }
    }

    try {
      // Build query
      let sqlQuery = 'SELECT * FROM Invoice'
      const conditions: string[] = []

      if (customer_id) {
        conditions.push(`CustomerRef = '${escapeQBQuery(customer_id)}'`)
      } else if (customer_name) {
        // First look up customer
        const escapedName = escapeQBQuery(customer_name)
        const customerResult = await makeQuickBooksApiCall(
          context.tenantId,
          `/query?query=${encodeURIComponent(`SELECT Id FROM Customer WHERE DisplayName LIKE '%${escapedName}%' MAXRESULTS 1`)}`
        ) as { QueryResponse?: { Customer?: Array<{ Id: string }> } }

        const customers = customerResult?.QueryResponse?.Customer || []
        if (customers.length === 0) {
          return { success: false, error: `Customer "${customer_name}" not found in QuickBooks` }
        }
        conditions.push(`CustomerRef = '${escapeQBQuery(customers[0].Id)}'`)
      }

      if (status === 'open') {
        conditions.push('Balance > 0')
      } else if (status === 'paid') {
        conditions.push('Balance = 0')
      }

      if (conditions.length > 0) {
        sqlQuery += ' WHERE ' + conditions.join(' AND ')
      }

      sqlQuery += ' ORDERBY TxnDate DESC MAXRESULTS 20'

      const result = await makeQuickBooksApiCall(
        context.tenantId,
        `/query?query=${encodeURIComponent(sqlQuery)}`
      ) as { QueryResponse?: { Invoice?: Array<Record<string, unknown>> } }

      const invoices = result?.QueryResponse?.Invoice || []

      if (invoices.length === 0) {
        return {
          success: true,
          data: [],
          message: 'No invoices found',
        }
      }

      // Format invoice data
      const formattedInvoices = invoices.map((inv: Record<string, unknown>) => ({
        id: inv.Id,
        docNumber: inv.DocNumber,
        txnDate: inv.TxnDate,
        dueDate: inv.DueDate,
        totalAmount: inv.TotalAmt,
        balance: inv.Balance,
        customerName: (inv.CustomerRef as Record<string, unknown>)?.name,
        status: (inv.Balance as number) > 0 ? 'Open' : 'Paid',
      }))

      // Calculate totals
      const totalOpen = formattedInvoices
        .filter((i) => (i.balance as number) > 0)
        .reduce((sum, i) => sum + ((i.balance as number) || 0), 0)

      return {
        success: true,
        data: formattedInvoices,
        message: `Found ${invoices.length} invoice(s). Total outstanding: $${totalOpen.toLocaleString()}`,
      }
    } catch (error) {
      logger.error('ARIA qb_get_invoices error:', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'QuickBooks invoice lookup failed',
      }
    }
  },
})

// =============================================================================
// QuickBooks Get Payments
// =============================================================================

ariaFunctionRegistry.register({
  name: 'qb_get_payments',
  category: 'quickbooks',
  description: 'Get recent payments from QuickBooks',
  riskLevel: 'low',
  enabledByDefault: true,
  requiredIntegrations: ['quickbooks'],
  voiceDefinition: {
    type: 'function',
    name: 'qb_get_payments',
    description: 'Get recent payments from QuickBooks',
    parameters: {
      type: 'object',
      properties: {
        customer_id: {
          type: 'string',
          description: 'QuickBooks Customer ID to filter by',
        },
        customer_name: {
          type: 'string',
          description: 'Customer name to filter by',
        },
        days: {
          type: 'number',
          description: 'Number of days to look back (default: 30)',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const { customer_id, customer_name, days = 30 } = args as {
      customer_id?: string
      customer_name?: string
      days?: number
    }

    // Check if QuickBooks is connected
    const connection = await getQuickBooksConnection(context.tenantId)
    if (!connection) {
      return { success: false, error: 'QuickBooks not connected' }
    }

    try {
      // Calculate date range
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      const startDateStr = startDate.toISOString().split('T')[0]

      // Build query (date strings are safe - generated server-side)
      let sqlQuery = `SELECT * FROM Payment WHERE TxnDate >= '${startDateStr}'`

      if (customer_id) {
        sqlQuery += ` AND CustomerRef = '${escapeQBQuery(customer_id)}'`
      } else if (customer_name) {
        // Look up customer first
        const escapedName = escapeQBQuery(customer_name)
        const customerResult = await makeQuickBooksApiCall(
          context.tenantId,
          `/query?query=${encodeURIComponent(`SELECT Id FROM Customer WHERE DisplayName LIKE '%${escapedName}%' MAXRESULTS 1`)}`
        ) as { QueryResponse?: { Customer?: Array<{ Id: string }> } }

        const customers = customerResult?.QueryResponse?.Customer || []
        if (customers.length > 0) {
          sqlQuery += ` AND CustomerRef = '${escapeQBQuery(customers[0].Id)}'`
        }
      }

      sqlQuery += ' ORDERBY TxnDate DESC MAXRESULTS 20'

      const result = await makeQuickBooksApiCall(
        context.tenantId,
        `/query?query=${encodeURIComponent(sqlQuery)}`
      ) as { QueryResponse?: { Payment?: Array<Record<string, unknown>> } }

      const payments = result?.QueryResponse?.Payment || []

      if (payments.length === 0) {
        return {
          success: true,
          data: [],
          message: `No payments found in the last ${days} days`,
        }
      }

      // Format payment data
      const formattedPayments = payments.map((pmt: Record<string, unknown>) => ({
        id: pmt.Id,
        txnDate: pmt.TxnDate,
        totalAmount: pmt.TotalAmt,
        customerName: (pmt.CustomerRef as Record<string, unknown>)?.name,
        paymentMethod: (pmt.PaymentMethodRef as Record<string, unknown>)?.name || 'Unknown',
      }))

      // Calculate total
      const totalReceived = formattedPayments.reduce(
        (sum, p) => sum + ((p.totalAmount as number) || 0),
        0
      )

      return {
        success: true,
        data: formattedPayments,
        message: `Found ${payments.length} payment(s) totaling $${totalReceived.toLocaleString()} in the last ${days} days`,
      }
    } catch (error) {
      logger.error('ARIA qb_get_payments error:', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'QuickBooks payment lookup failed',
      }
    }
  },
})

// =============================================================================
// QuickBooks Check Customer Balance
// =============================================================================

ariaFunctionRegistry.register({
  name: 'qb_check_balance',
  category: 'quickbooks',
  description: 'Check the outstanding balance for a customer',
  riskLevel: 'low',
  enabledByDefault: true,
  requiredIntegrations: ['quickbooks'],
  voiceDefinition: {
    type: 'function',
    name: 'qb_check_balance',
    description: 'Check the outstanding balance for a customer',
    parameters: {
      type: 'object',
      properties: {
        customer_name: {
          type: 'string',
          description: 'Customer name to look up',
        },
        customer_id: {
          type: 'string',
          description: 'QuickBooks Customer ID',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const { customer_name, customer_id } = args as {
      customer_name?: string
      customer_id?: string
    }

    // Try to get from context if not provided
    const searchName = customer_name ||
      (context.contact ? `${context.contact.first_name} ${context.contact.last_name}` : undefined)

    if (!customer_id && !searchName) {
      return { success: false, error: 'No customer name or ID provided' }
    }

    // Check if QuickBooks is connected
    const connection = await getQuickBooksConnection(context.tenantId)
    if (!connection) {
      return { success: false, error: 'QuickBooks not connected' }
    }

    try {
      let sqlQuery = ''
      if (customer_id) {
        sqlQuery = `SELECT * FROM Customer WHERE Id = '${escapeQBQuery(customer_id)}'`
      } else {
        sqlQuery = `SELECT * FROM Customer WHERE DisplayName LIKE '%${escapeQBQuery(searchName!)}%' MAXRESULTS 1`
      }

      const result = await makeQuickBooksApiCall(
        context.tenantId,
        `/query?query=${encodeURIComponent(sqlQuery)}`
      ) as { QueryResponse?: { Customer?: Array<Record<string, unknown>> } }

      const customers = result?.QueryResponse?.Customer || []

      if (customers.length === 0) {
        return {
          success: false,
          error: `Customer "${searchName || customer_id}" not found in QuickBooks`,
        }
      }

      const customer = customers[0]
      const balance = (customer.Balance as number) || 0

      return {
        success: true,
        data: {
          customerName: customer.DisplayName,
          balance,
          isActive: customer.Active,
        },
        message: balance > 0
          ? `${customer.DisplayName} has an outstanding balance of $${balance.toLocaleString()}`
          : `${customer.DisplayName} has no outstanding balance`,
      }
    } catch (error) {
      logger.error('ARIA qb_check_balance error:', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Balance check failed',
      }
    }
  },
})
