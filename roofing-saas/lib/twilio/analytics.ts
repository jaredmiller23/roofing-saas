/**
 * Call and SMS Analytics
 * Provides analytics and reporting for communication activities
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// Time period for analytics
export type AnalyticsPeriod = 'day' | 'week' | 'month' | 'year' | 'all'

// Call analytics data structure
export interface CallAnalytics {
  totalCalls: number
  inboundCalls: number
  outboundCalls: number
  answeredCalls: number
  missedCalls: number
  averageDuration: number
  totalDuration: number
  answerRate: number
  recordedCalls: number
}

// SMS analytics data structure
export interface SMSAnalytics {
  totalSMS: number
  inboundSMS: number
  outboundSMS: number
  averageMessageLength: number
}

// Communication activity summary
export interface ActivitySummary {
  totalActivities: number
  calls: CallAnalytics
  sms: SMSAnalytics
  emails: {
    totalEmails: number
    outboundEmails: number
    openRate: number
    clickRate: number
  }
}

/**
 * Get date range for analytics period
 */
function getDateRange(period: AnalyticsPeriod): { from: Date; to: Date } {
  const now = new Date()
  let from: Date

  switch (period) {
    case 'day':
      from = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      break
    case 'week':
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'month':
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case 'year':
      from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      break
    case 'all':
      from = new Date(0) // Beginning of time
      break
  }

  return { from, to: now }
}

/**
 * Get call analytics for a tenant
 */
export async function getCallAnalytics(
  tenantId: string,
  period: AnalyticsPeriod = 'month',
  dateFrom?: Date,
  dateTo?: Date
): Promise<CallAnalytics> {
  const supabase = await createClient()

  // Use provided dates or calculate from period
  const { from, to } = dateFrom && dateTo ? { from: dateFrom, to: dateTo } : getDateRange(period)

  // Get all call activities
  const { data: calls } = await supabase
    .from('activities')
    .select('direction, metadata')
    .eq('tenant_id', tenantId)
    .eq('type', 'call')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString())

  if (!calls || calls.length === 0) {
    return {
      totalCalls: 0,
      inboundCalls: 0,
      outboundCalls: 0,
      answeredCalls: 0,
      missedCalls: 0,
      averageDuration: 0,
      totalDuration: 0,
      answerRate: 0,
      recordedCalls: 0,
    }
  }

  let inboundCalls = 0
  let outboundCalls = 0
  let answeredCalls = 0
  let missedCalls = 0
  let totalDuration = 0
  let recordedCalls = 0

  for (const call of calls) {
    const metadata = call.metadata as Record<string, any>

    if (call.direction === 'inbound') {
      inboundCalls++
    } else {
      outboundCalls++
    }

    // Check if call was answered
    const status = metadata.status
    if (status === 'completed' || status === 'in-progress') {
      answeredCalls++
    } else if (status === 'no-answer' || status === 'busy' || status === 'failed') {
      missedCalls++
    }

    // Add duration if available
    if (metadata.duration) {
      totalDuration += parseInt(metadata.duration)
    }

    // Check if call was recorded
    if (metadata.recording_sid || metadata.recording_url) {
      recordedCalls++
    }
  }

  const totalCalls = calls.length
  const averageDuration = answeredCalls > 0 ? Math.round(totalDuration / answeredCalls) : 0
  const answerRate = totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0

  return {
    totalCalls,
    inboundCalls,
    outboundCalls,
    answeredCalls,
    missedCalls,
    averageDuration,
    totalDuration,
    answerRate: Math.round(answerRate * 100) / 100,
    recordedCalls,
  }
}

/**
 * Get SMS analytics for a tenant
 */
export async function getSMSAnalytics(
  tenantId: string,
  period: AnalyticsPeriod = 'month',
  dateFrom?: Date,
  dateTo?: Date
): Promise<SMSAnalytics> {
  const supabase = await createClient()

  const { from, to } = dateFrom && dateTo ? { from: dateFrom, to: dateTo } : getDateRange(period)

  const { data: messages } = await supabase
    .from('activities')
    .select('direction, content')
    .eq('tenant_id', tenantId)
    .eq('type', 'sms')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString())

  if (!messages || messages.length === 0) {
    return {
      totalSMS: 0,
      inboundSMS: 0,
      outboundSMS: 0,
      averageMessageLength: 0,
    }
  }

  let inboundSMS = 0
  let outboundSMS = 0
  let totalLength = 0

  for (const message of messages) {
    if (message.direction === 'inbound') {
      inboundSMS++
    } else {
      outboundSMS++
    }

    if (message.content) {
      totalLength += message.content.length
    }
  }

  return {
    totalSMS: messages.length,
    inboundSMS,
    outboundSMS,
    averageMessageLength: messages.length > 0 ? Math.round(totalLength / messages.length) : 0,
  }
}

/**
 * Get email analytics summary
 */
export async function getEmailAnalyticsSummary(
  tenantId: string,
  period: AnalyticsPeriod = 'month',
  dateFrom?: Date,
  dateTo?: Date
): Promise<{
  totalEmails: number
  outboundEmails: number
  openRate: number
  clickRate: number
}> {
  const supabase = await createClient()

  const { from, to } = dateFrom && dateTo ? { from: dateFrom, to: dateTo } : getDateRange(period)

  const { data: emails } = await supabase
    .from('activities')
    .select('direction, metadata')
    .eq('tenant_id', tenantId)
    .eq('type', 'email')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString())

  if (!emails || emails.length === 0) {
    return {
      totalEmails: 0,
      outboundEmails: 0,
      openRate: 0,
      clickRate: 0,
    }
  }

  let outboundEmails = 0
  let openedEmails = 0
  let clickedEmails = 0

  for (const email of emails) {
    if (email.direction === 'outbound') {
      outboundEmails++
      const metadata = email.metadata as Record<string, any>
      if (metadata.opened) openedEmails++
      if (metadata.clicked) clickedEmails++
    }
  }

  return {
    totalEmails: emails.length,
    outboundEmails,
    openRate: outboundEmails > 0 ? Math.round((openedEmails / outboundEmails) * 100 * 100) / 100 : 0,
    clickRate: outboundEmails > 0 ? Math.round((clickedEmails / outboundEmails) * 100 * 100) / 100 : 0,
  }
}

/**
 * Get complete activity summary for a tenant
 */
export async function getActivitySummary(
  tenantId: string,
  period: AnalyticsPeriod = 'month',
  dateFrom?: Date,
  dateTo?: Date
): Promise<ActivitySummary> {
  try {
    const [calls, sms, emails] = await Promise.all([
      getCallAnalytics(tenantId, period, dateFrom, dateTo),
      getSMSAnalytics(tenantId, period, dateFrom, dateTo),
      getEmailAnalyticsSummary(tenantId, period, dateFrom, dateTo),
    ])

    return {
      totalActivities: calls.totalCalls + sms.totalSMS + emails.totalEmails,
      calls,
      sms,
      emails,
    }
  } catch (error) {
    logger.error('Failed to get activity summary', { error, tenantId })
    throw error
  }
}

/**
 * Get call volume by day for charting
 */
export async function getCallVolumeByDay(
  tenantId: string,
  days: number = 30
): Promise<Array<{ date: string; inbound: number; outbound: number }>> {
  const supabase = await createClient()

  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const { data: calls } = await supabase
    .from('activities')
    .select('created_at, direction')
    .eq('tenant_id', tenantId)
    .eq('type', 'call')
    .gte('created_at', from.toISOString())
    .order('created_at', { ascending: true })

  if (!calls || calls.length === 0) {
    return []
  }

  // Group by day
  const volumeByDay: Record<string, { inbound: number; outbound: number }> = {}

  for (const call of calls) {
    const date = new Date(call.created_at).toISOString().split('T')[0]
    if (!volumeByDay[date]) {
      volumeByDay[date] = { inbound: 0, outbound: 0 }
    }

    if (call.direction === 'inbound') {
      volumeByDay[date].inbound++
    } else {
      volumeByDay[date].outbound++
    }
  }

  // Convert to array
  return Object.entries(volumeByDay).map(([date, counts]) => ({
    date,
    ...counts,
  }))
}
