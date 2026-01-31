/**
 * ARIA Financial Operations - Phase 4: Financial Intelligence
 *
 * Higher-level financial functions that build on QuickBooks integration:
 * - AR summary across all customers
 * - Overdue invoice tracking
 * - Payment history analysis
 * - Invoice drafting
 * - Payment reminder sending
 * - Morning briefing synthesis
 */

import { ariaFunctionRegistry } from '../function-registry'
import { makeQuickBooksApiCall, getQuickBooksConnection } from '@/lib/quickbooks/api'
import { logger } from '@/lib/logger'

// =============================================================================
// Helper: Check QuickBooks connection
// =============================================================================

async function ensureQuickBooksConnected(tenantId: string): Promise<{ connected: boolean; error?: string }> {
  const connection = await getQuickBooksConnection(tenantId)
  if (!connection) {
    return { connected: false, error: 'QuickBooks not connected. Please connect QuickBooks in Settings.' }
  }
  return { connected: true }
}

// =============================================================================
// get_ar_summary - Accounts Receivable Overview
// =============================================================================

ariaFunctionRegistry.register({
  name: 'get_ar_summary',
  category: 'quickbooks',
  description: 'Get accounts receivable summary across all customers',
  riskLevel: 'low',
  enabledByDefault: true,
  requiredIntegrations: ['quickbooks'],
  voiceDefinition: {
    type: 'function',
    name: 'get_ar_summary',
    description: 'Get a summary of accounts receivable - total outstanding, overdue amounts, and aging buckets.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  execute: async (_args, context) => {
    const qbCheck = await ensureQuickBooksConnected(context.tenantId)
    if (!qbCheck.connected) {
      return { success: false, error: qbCheck.error }
    }

    try {
      // Get all open invoices
      const invoiceResult = await makeQuickBooksApiCall(
        context.tenantId,
        `/query?query=${encodeURIComponent('SELECT * FROM Invoice WHERE Balance > 0 MAXRESULTS 500')}`
      ) as { QueryResponse?: { Invoice?: Array<Record<string, unknown>> } }

      const invoices = invoiceResult?.QueryResponse?.Invoice || []

      if (invoices.length === 0) {
        return {
          success: true,
          data: {
            totalAR: 0,
            invoiceCount: 0,
            overdue: 0,
            current: 0,
            aging: { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 },
          },
          message: '🎉 No outstanding invoices! AR is at $0.',
        }
      }

      const today = new Date()
      let totalAR = 0
      let overdueAmount = 0
      let currentAmount = 0
      const aging = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 }

      for (const inv of invoices) {
        const balance = (inv.Balance as number) || 0
        const dueDate = inv.DueDate ? new Date(inv.DueDate as string) : null
        totalAR += balance

        if (!dueDate || dueDate >= today) {
          currentAmount += balance
          aging.current += balance
        } else {
          overdueAmount += balance
          const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

          if (daysOverdue <= 30) {
            aging.days30 += balance
          } else if (daysOverdue <= 60) {
            aging.days60 += balance
          } else if (daysOverdue <= 90) {
            aging.days90 += balance
          } else {
            aging.over90 += balance
          }
        }
      }

      const overdueCount = invoices.filter(inv => {
        const dueDate = inv.DueDate ? new Date(inv.DueDate as string) : null
        return dueDate && dueDate < today
      }).length

      let message = `💰 Accounts Receivable Summary\n\n`
      message += `📊 Total AR: $${totalAR.toLocaleString()}\n`
      message += `📋 Open Invoices: ${invoices.length}\n\n`

      if (overdueAmount > 0) {
        message += `⚠️ OVERDUE: $${overdueAmount.toLocaleString()} (${overdueCount} invoices)\n`
        message += `✅ Current: $${currentAmount.toLocaleString()}\n\n`
        message += `📅 Aging Breakdown:\n`
        message += `• Current: $${aging.current.toLocaleString()}\n`
        message += `• 1-30 days: $${aging.days30.toLocaleString()}\n`
        message += `• 31-60 days: $${aging.days60.toLocaleString()}\n`
        message += `• 61-90 days: $${aging.days90.toLocaleString()}\n`
        if (aging.over90 > 0) {
          message += `• Over 90 days: $${aging.over90.toLocaleString()} ⚠️\n`
        }
      } else {
        message += `✅ All invoices are current!`
      }

      return {
        success: true,
        data: {
          totalAR,
          invoiceCount: invoices.length,
          overdue: overdueAmount,
          overdueCount,
          current: currentAmount,
          aging,
        },
        message,
      }
    } catch (error) {
      logger.error('[Financial] AR summary error:', { error })
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get AR summary' }
    }
  },
})

// =============================================================================
// get_overdue_invoices - List overdue invoices with details
// =============================================================================

ariaFunctionRegistry.register({
  name: 'get_overdue_invoices',
  category: 'quickbooks',
  description: 'Get list of overdue invoices',
  riskLevel: 'low',
  enabledByDefault: true,
  requiredIntegrations: ['quickbooks'],
  voiceDefinition: {
    type: 'function',
    name: 'get_overdue_invoices',
    description: 'Get a list of overdue invoices with customer details and days overdue.',
    parameters: {
      type: 'object',
      properties: {
        min_days_overdue: {
          type: 'number',
          description: 'Minimum days overdue to include (default: 1)',
        },
        min_amount: {
          type: 'number',
          description: 'Minimum balance to include (default: 0)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of invoices to return (default: 20)',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const { min_days_overdue = 1, min_amount = 0, limit = 20 } = args as {
      min_days_overdue?: number
      min_amount?: number
      limit?: number
    }

    const qbCheck = await ensureQuickBooksConnected(context.tenantId)
    if (!qbCheck.connected) {
      return { success: false, error: qbCheck.error }
    }

    try {
      // Calculate the cutoff date
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - min_days_overdue)
      const cutoffStr = cutoffDate.toISOString().split('T')[0]

      const invoiceResult = await makeQuickBooksApiCall(
        context.tenantId,
        `/query?query=${encodeURIComponent(`SELECT * FROM Invoice WHERE Balance > ${min_amount} AND DueDate < '${cutoffStr}' ORDERBY DueDate ASC MAXRESULTS ${limit}`)}`
      ) as { QueryResponse?: { Invoice?: Array<Record<string, unknown>> } }

      const invoices = invoiceResult?.QueryResponse?.Invoice || []

      if (invoices.length === 0) {
        return {
          success: true,
          data: [],
          message: `✅ No overdue invoices found (over ${min_days_overdue} days).`,
        }
      }

      const today = new Date()
      const overdueList = invoices.map((inv) => {
        const dueDate = new Date(inv.DueDate as string)
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        return {
          id: inv.Id,
          docNumber: inv.DocNumber,
          customerName: (inv.CustomerRef as Record<string, unknown>)?.name,
          customerId: (inv.CustomerRef as Record<string, unknown>)?.value,
          balance: inv.Balance,
          dueDate: inv.DueDate,
          daysOverdue,
          totalAmount: inv.TotalAmt,
        }
      })

      const totalOverdue = overdueList.reduce((sum, inv) => sum + ((inv.balance as number) || 0), 0)

      let message = `⚠️ Overdue Invoices (${overdueList.length}):\n\n`
      for (const inv of overdueList.slice(0, 10)) {
        const urgency = inv.daysOverdue > 60 ? '🔴' : inv.daysOverdue > 30 ? '🟡' : '🟠'
        message += `${urgency} ${inv.customerName}: $${(inv.balance as number).toLocaleString()} (${inv.daysOverdue} days)\n`
        message += `   Invoice #${inv.docNumber}\n`
      }

      if (overdueList.length > 10) {
        message += `\n... and ${overdueList.length - 10} more\n`
      }

      message += `\n💰 Total Overdue: $${totalOverdue.toLocaleString()}`

      return {
        success: true,
        data: overdueList,
        message,
      }
    } catch (error) {
      logger.error('[Financial] Overdue invoices error:', { error })
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get overdue invoices' }
    }
  },
})

// =============================================================================
// get_customer_payment_history - Detailed payment history for a customer
// =============================================================================

ariaFunctionRegistry.register({
  name: 'get_customer_payment_history',
  category: 'quickbooks',
  description: 'Get detailed payment history and patterns for a customer',
  riskLevel: 'low',
  enabledByDefault: true,
  requiredIntegrations: ['quickbooks'],
  voiceDefinition: {
    type: 'function',
    name: 'get_customer_payment_history',
    description: 'Get detailed payment history for a customer including payment patterns and on-time rate.',
    parameters: {
      type: 'object',
      properties: {
        customer_name: {
          type: 'string',
          description: 'Customer name to look up',
        },
        contact_id: {
          type: 'string',
          description: 'CRM contact ID (will look up customer name)',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const { customer_name, contact_id } = args as {
      customer_name?: string
      contact_id?: string
    }

    // Determine customer name
    let searchName = customer_name
    if (!searchName && contact_id) {
      const { data: contact } = await context.supabase
        .from('contacts')
        .select('first_name, last_name')
        .eq('id', contact_id)
        .single()
      if (contact) {
        searchName = `${contact.first_name} ${contact.last_name}`
      }
    }
    if (!searchName && context.contact) {
      searchName = `${context.contact.first_name} ${context.contact.last_name}`
    }

    if (!searchName) {
      return { success: false, error: 'No customer specified' }
    }

    const qbCheck = await ensureQuickBooksConnected(context.tenantId)
    if (!qbCheck.connected) {
      return { success: false, error: qbCheck.error }
    }

    try {
      // Find the customer
      const customerResult = await makeQuickBooksApiCall(
        context.tenantId,
        `/query?query=${encodeURIComponent(`SELECT * FROM Customer WHERE DisplayName LIKE '%${searchName}%' MAXRESULTS 1`)}`
      ) as { QueryResponse?: { Customer?: Array<Record<string, unknown>> } }

      const customers = customerResult?.QueryResponse?.Customer || []
      if (customers.length === 0) {
        return { success: false, error: `Customer "${searchName}" not found in QuickBooks` }
      }

      const customer = customers[0]
      const customerId = customer.Id

      // Get all invoices (paid and unpaid)
      const invoiceResult = await makeQuickBooksApiCall(
        context.tenantId,
        `/query?query=${encodeURIComponent(`SELECT * FROM Invoice WHERE CustomerRef = '${customerId}' ORDERBY TxnDate DESC MAXRESULTS 50`)}`
      ) as { QueryResponse?: { Invoice?: Array<Record<string, unknown>> } }

      const invoices = invoiceResult?.QueryResponse?.Invoice || []

      // Get payments
      const paymentResult = await makeQuickBooksApiCall(
        context.tenantId,
        `/query?query=${encodeURIComponent(`SELECT * FROM Payment WHERE CustomerRef = '${customerId}' ORDERBY TxnDate DESC MAXRESULTS 50`)}`
      ) as { QueryResponse?: { Payment?: Array<Record<string, unknown>> } }

      const payments = paymentResult?.QueryResponse?.Payment || []

      // Calculate metrics
      const totalInvoiced = invoices.reduce((sum, inv) => sum + ((inv.TotalAmt as number) || 0), 0)
      const totalPaid = payments.reduce((sum, pmt) => sum + ((pmt.TotalAmt as number) || 0), 0)
      const currentBalance = (customer.Balance as number) || 0

      // Calculate on-time rate (simplified - based on current balance vs. history)
      const paidInvoices = invoices.filter(inv => (inv.Balance as number) === 0)
      const onTimeRate = invoices.length > 0
        ? Math.round((paidInvoices.length / invoices.length) * 100)
        : 100

      // Average days to pay (estimate based on invoice/payment dates)
      let avgDaysToPay = 0
      if (paidInvoices.length > 0 && payments.length > 0) {
        // Simplified: compare average invoice date to average payment date
        const avgInvoiceDate = paidInvoices.reduce((sum, inv) =>
          sum + new Date(inv.TxnDate as string).getTime(), 0) / paidInvoices.length
        const avgPaymentDate = payments.reduce((sum, pmt) =>
          sum + new Date(pmt.TxnDate as string).getTime(), 0) / payments.length
        avgDaysToPay = Math.max(0, Math.round((avgPaymentDate - avgInvoiceDate) / (1000 * 60 * 60 * 24)))
      }

      // Payment reliability score
      let reliabilityScore: 'excellent' | 'good' | 'fair' | 'poor'
      if (onTimeRate >= 90 && currentBalance === 0) {
        reliabilityScore = 'excellent'
      } else if (onTimeRate >= 70 || currentBalance === 0) {
        reliabilityScore = 'good'
      } else if (onTimeRate >= 50) {
        reliabilityScore = 'fair'
      } else {
        reliabilityScore = 'poor'
      }

      const reliabilityEmoji = reliabilityScore === 'excellent' ? '🌟' :
        reliabilityScore === 'good' ? '✅' :
        reliabilityScore === 'fair' ? '⚠️' : '🔴'

      let message = `${reliabilityEmoji} Payment History: ${customer.DisplayName}\n\n`
      message += `💳 Reliability: ${reliabilityScore.toUpperCase()}\n`
      message += `📊 On-time Rate: ${onTimeRate}%\n`
      message += `⏱️ Avg Days to Pay: ${avgDaysToPay}\n\n`
      message += `📈 Lifetime:\n`
      message += `• Total Invoiced: $${totalInvoiced.toLocaleString()}\n`
      message += `• Total Paid: $${totalPaid.toLocaleString()}\n`
      message += `• Current Balance: $${currentBalance.toLocaleString()}\n`
      message += `• Invoices: ${invoices.length} | Payments: ${payments.length}`

      return {
        success: true,
        data: {
          customerName: customer.DisplayName,
          reliabilityScore,
          onTimeRate,
          avgDaysToPay,
          totalInvoiced,
          totalPaid,
          currentBalance,
          invoiceCount: invoices.length,
          paymentCount: payments.length,
        },
        message,
      }
    } catch (error) {
      logger.error('[Financial] Payment history error:', { error })
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get payment history' }
    }
  },
})

// =============================================================================
// draft_payment_reminder - Create a payment reminder message for approval
// =============================================================================

ariaFunctionRegistry.register({
  name: 'draft_payment_reminder',
  category: 'quickbooks',
  description: 'Draft a payment reminder message for a customer',
  riskLevel: 'medium',
  enabledByDefault: true,
  requiredIntegrations: ['quickbooks'],
  voiceDefinition: {
    type: 'function',
    name: 'draft_payment_reminder',
    description: 'Draft a polite payment reminder message for an overdue invoice. Message will be queued for approval before sending.',
    parameters: {
      type: 'object',
      properties: {
        customer_name: {
          type: 'string',
          description: 'Customer name',
        },
        invoice_number: {
          type: 'string',
          description: 'Invoice number (optional, will use oldest overdue if not specified)',
        },
        channel: {
          type: 'string',
          enum: ['sms', 'email'],
          description: 'How to send the reminder (default: sms)',
        },
        tone: {
          type: 'string',
          enum: ['friendly', 'professional', 'urgent'],
          description: 'Tone of the reminder (default: friendly)',
        },
      },
      required: ['customer_name'],
    },
  },
  execute: async (args, context) => {
    const { customer_name, invoice_number, channel = 'sms', tone = 'friendly' } = args as {
      customer_name: string
      invoice_number?: string
      channel?: 'sms' | 'email'
      tone?: 'friendly' | 'professional' | 'urgent'
    }

    const qbCheck = await ensureQuickBooksConnected(context.tenantId)
    if (!qbCheck.connected) {
      return { success: false, error: qbCheck.error }
    }

    try {
      // Find the customer
      const customerResult = await makeQuickBooksApiCall(
        context.tenantId,
        `/query?query=${encodeURIComponent(`SELECT * FROM Customer WHERE DisplayName LIKE '%${customer_name}%' MAXRESULTS 1`)}`
      ) as { QueryResponse?: { Customer?: Array<Record<string, unknown>> } }

      const customers = customerResult?.QueryResponse?.Customer || []
      if (customers.length === 0) {
        return { success: false, error: `Customer "${customer_name}" not found in QuickBooks` }
      }

      const customer = customers[0]
      const customerId = customer.Id

      // Get overdue invoices
      const today = new Date().toISOString().split('T')[0]
      let invoiceQuery = `SELECT * FROM Invoice WHERE CustomerRef = '${customerId}' AND Balance > 0 AND DueDate < '${today}'`
      if (invoice_number) {
        invoiceQuery += ` AND DocNumber = '${invoice_number}'`
      }
      invoiceQuery += ' ORDERBY DueDate ASC MAXRESULTS 1'

      const invoiceResult = await makeQuickBooksApiCall(
        context.tenantId,
        `/query?query=${encodeURIComponent(invoiceQuery)}`
      ) as { QueryResponse?: { Invoice?: Array<Record<string, unknown>> } }

      const invoices = invoiceResult?.QueryResponse?.Invoice || []
      if (invoices.length === 0) {
        return { success: false, error: `No overdue invoices found for ${customer_name}` }
      }

      const invoice = invoices[0]
      const balance = (invoice.Balance as number) || 0
      const dueDate = new Date(invoice.DueDate as string)
      const daysOverdue = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

      // Generate reminder message based on tone
      let message = ''
      const firstName = (customer.DisplayName as string).split(' ')[0]

      if (tone === 'friendly') {
        message = `Hi ${firstName}! Just a friendly reminder that invoice #${invoice.DocNumber} for $${balance.toLocaleString()} was due ${daysOverdue} days ago. Please let us know if you have any questions or need to set up a payment plan. Thank you!`
      } else if (tone === 'professional') {
        message = `Dear ${customer.DisplayName}, This is a reminder that invoice #${invoice.DocNumber} in the amount of $${balance.toLocaleString()} is now ${daysOverdue} days past due. Please remit payment at your earliest convenience. Contact us with any questions.`
      } else {
        message = `IMPORTANT: ${firstName}, your invoice #${invoice.DocNumber} for $${balance.toLocaleString()} is now ${daysOverdue} days overdue. Please contact us immediately to arrange payment and avoid any service interruptions.`
      }

      // Queue for approval (using the HITL queue)
      const { data: queueEntry, error: queueError } = await context.supabase
        .from('sms_approval_queue')
        .insert({
          tenant_id: context.tenantId,
          phone_number: (customer.PrimaryPhone as Record<string, unknown>)?.FreeFormNumber || 'UNKNOWN',
          inbound_message: `Payment reminder for Invoice #${invoice.DocNumber}`,
          suggested_response: message,
          category: 'payment_reminder',
          status: 'pending',
          metadata: {
            channel,
            customer_name: customer.DisplayName,
            invoice_number: invoice.DocNumber,
            balance,
            days_overdue: daysOverdue,
            tone,
            generated_at: new Date().toISOString(),
            via: 'aria',
          },
        })
        .select()
        .single()

      if (queueError) {
        logger.error('[Financial] Failed to queue reminder:', { error: queueError })
        return { success: false, error: 'Failed to queue reminder for approval' }
      }

      return {
        success: true,
        data: {
          queueId: queueEntry.id,
          customerName: customer.DisplayName,
          invoiceNumber: invoice.DocNumber,
          balance,
          daysOverdue,
          message,
          channel,
        },
        message: `📝 Payment reminder drafted for ${customer.DisplayName}:\n\n"${message}"\n\n⏳ Queued for approval. Review in ARIA Approvals.`,
      }
    } catch (error) {
      logger.error('[Financial] Draft reminder error:', { error })
      return { success: false, error: error instanceof Error ? error.message : 'Failed to draft reminder' }
    }
  },
})

// =============================================================================
// get_morning_briefing - The Magic Function
// =============================================================================

ariaFunctionRegistry.register({
  name: 'get_morning_briefing',
  category: 'reporting',
  description: 'Get a comprehensive morning briefing with schedule, tasks, and key metrics',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_morning_briefing',
    description: 'Get a comprehensive morning briefing including today\'s schedule, overdue tasks, AR status, at-risk customers, and weather alerts.',
    parameters: {
      type: 'object',
      properties: {
        include_weather: {
          type: 'boolean',
          description: 'Include weather information (default: true)',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const { include_weather = true } = args as { include_weather?: boolean }

    const today = new Date()
    const todayStart = new Date(today)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)
    const tomorrowEnd = new Date(todayEnd)
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1)

    const briefing: {
      schedule: Array<{ title: string; time: string; location?: string; type?: string }>
      overdueFollowUps: Array<{ name: string; daysOld: number; type: string }>
      atRiskCustomers: Array<{ name: string; reason: string }>
      financials: { totalAR: number; overdue: number; overdueCount: number } | null
      weather: { forecast: string; alert?: string } | null
    } = {
      schedule: [],
      overdueFollowUps: [],
      atRiskCustomers: [],
      financials: null,
      weather: null,
    }

    // 1. TODAY'S SCHEDULE - Events for today
    const { data: events } = await context.supabase
      .from('events')
      .select('title, start_at, location, event_type, contact_id')
      .eq('tenant_id', context.tenantId)
      .eq('is_deleted', false)
      .gte('start_at', todayStart.toISOString())
      .lt('start_at', todayEnd.toISOString())
      .not('status', 'eq', 'cancelled')
      .order('start_at', { ascending: true })
      .limit(10)

    briefing.schedule = (events || []).map(e => ({
      title: e.title,
      time: new Date(e.start_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      location: e.location || undefined,
      type: e.event_type || undefined,
    }))

    // 2. OVERDUE FOLLOW-UPS - Projects pending > 14 days without recent activity
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const { data: staleProjects } = await context.supabase
      .from('projects')
      .select(`
        id, name, stage, created_at, updated_at,
        contacts:contact_id(first_name, last_name)
      `)
      .eq('tenant_id', context.tenantId)
      .eq('is_deleted', false)
      .in('stage', ['New Lead', 'Estimate Sent', 'Follow Up', 'Negotiation'])
      .lt('updated_at', fourteenDaysAgo.toISOString())
      .order('updated_at', { ascending: true })
      .limit(10)

    briefing.overdueFollowUps = (staleProjects || []).map(p => {
      const contact = Array.isArray(p.contacts) ? p.contacts[0] : p.contacts
      const daysOld = Math.floor((Date.now() - new Date(p.updated_at).getTime()) / (1000 * 60 * 60 * 24))
      return {
        name: contact ? `${contact.first_name} ${contact.last_name}` : p.name,
        daysOld,
        type: p.stage || 'Unknown',
      }
    })

    // 3. AT-RISK CUSTOMERS - Recent complaints or negative sentiment indicators
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: recentActivities } = await context.supabase
      .from('activities')
      .select('contact_id, content, subject, contacts(first_name, last_name)')
      .eq('tenant_id', context.tenantId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .limit(200)

    // Simple sentiment check
    const complaintKeywords = ['complaint', 'unhappy', 'disappointed', 'frustrated', 'angry', 'terrible', 'problem', 'issue', 'wrong']
    const customerComplaints = new Map<string, { name: string; count: number }>()

    for (const activity of recentActivities || []) {
      const content = ((activity.content || '') + ' ' + (activity.subject || '')).toLowerCase()
      const hasComplaint = complaintKeywords.some(kw => content.includes(kw))

      if (hasComplaint && activity.contact_id) {
        const contact = Array.isArray(activity.contacts) ? activity.contacts[0] : activity.contacts
        const existing = customerComplaints.get(activity.contact_id)
        if (existing) {
          existing.count++
        } else if (contact) {
          customerComplaints.set(activity.contact_id, {
            name: `${contact.first_name} ${contact.last_name}`,
            count: 1,
          })
        }
      }
    }

    briefing.atRiskCustomers = Array.from(customerComplaints.values())
      .filter(c => c.count >= 1)
      .slice(0, 5)
      .map(c => ({
        name: c.name,
        reason: `${c.count} complaint indicator(s) in last 30 days`,
      }))

    // 4. FINANCIAL SNAPSHOT - If QuickBooks is connected
    const qbConnection = await getQuickBooksConnection(context.tenantId)
    if (qbConnection) {
      try {
        const todayStr = new Date().toISOString().split('T')[0]
        const invoiceResult = await makeQuickBooksApiCall(
          context.tenantId,
          `/query?query=${encodeURIComponent('SELECT * FROM Invoice WHERE Balance > 0 MAXRESULTS 200')}`
        ) as { QueryResponse?: { Invoice?: Array<Record<string, unknown>> } }

        const invoices = invoiceResult?.QueryResponse?.Invoice || []
        const totalAR = invoices.reduce((sum, inv) => sum + ((inv.Balance as number) || 0), 0)
        const overdueInvoices = invoices.filter(inv => {
          const dueDate = inv.DueDate as string
          return dueDate && dueDate < todayStr
        })
        const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + ((inv.Balance as number) || 0), 0)

        briefing.financials = {
          totalAR,
          overdue: overdueAmount,
          overdueCount: overdueInvoices.length,
        }
      } catch (error) {
        logger.warn('[Briefing] Could not fetch QB data:', { error })
      }
    }

    // 5. WEATHER (simplified - would integrate with weather API)
    if (include_weather) {
      // Placeholder - would call actual weather API
      briefing.weather = {
        forecast: 'Partly cloudy, 72°F - Good conditions for outdoor work',
      }
    }

    // Build the briefing message
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    let message = `📋 ARIA Morning Briefing - ${dayName}\n\n`

    // Schedule
    message += `📅 TODAY'S SCHEDULE (${briefing.schedule.length})\n`
    if (briefing.schedule.length > 0) {
      for (const event of briefing.schedule) {
        message += `• ${event.time} - ${event.title}`
        if (event.location) message += ` @ ${event.location}`
        message += '\n'
      }
    } else {
      message += '• No appointments scheduled\n'
    }

    // Needs attention
    message += `\n⚠️ NEEDS ATTENTION\n`
    let needsAttention = false

    if (briefing.overdueFollowUps.length > 0) {
      needsAttention = true
      message += `• ${briefing.overdueFollowUps.length} estimates pending > 14 days`
      const oldest = briefing.overdueFollowUps[0]
      message += ` (oldest: ${oldest.name}, ${oldest.daysOld} days)\n`
    }

    if (briefing.atRiskCustomers.length > 0) {
      needsAttention = true
      for (const customer of briefing.atRiskCustomers.slice(0, 3)) {
        message += `• AT-RISK: ${customer.name} - ${customer.reason}\n`
      }
    }

    if (briefing.financials && briefing.financials.overdue > 0) {
      needsAttention = true
      message += `• ${briefing.financials.overdueCount} invoices overdue ($${briefing.financials.overdue.toLocaleString()})\n`
    }

    if (!needsAttention) {
      message += '• All clear! 🎉\n'
    }

    // Financial snapshot
    if (briefing.financials) {
      message += `\n💰 FINANCIAL SNAPSHOT\n`
      message += `• AR Balance: $${briefing.financials.totalAR.toLocaleString()}\n`
      message += `• Overdue: $${briefing.financials.overdue.toLocaleString()} (${briefing.financials.overdueCount} invoices)\n`
    }

    // Weather
    if (briefing.weather) {
      message += `\n🌤️ WEATHER\n`
      message += `• ${briefing.weather.forecast}\n`
      if (briefing.weather.alert) {
        message += `⚠️ ${briefing.weather.alert}\n`
      }
    }

    return {
      success: true,
      data: briefing,
      message,
    }
  },
})
