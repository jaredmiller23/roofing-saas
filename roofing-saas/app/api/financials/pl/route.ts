/**
 * Profit & Loss API
 * Financial reporting and P&L calculations
 */

import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { logger } from '@/lib/logger'
import { InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export const GET = withAuth(async (request, { tenantId }) => {
  try {
    const supabase = await createClient()

    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('project_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const status = searchParams.get('status')

    let query = supabase
      .from('project_profit_loss')
      .select('*')
      .eq('tenant_id', tenantId)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (status) {
      type PipelineStage = 'prospect' | 'qualified' | 'quote_sent' | 'negotiation' | 'won' | 'production' | 'complete' | 'lost'
      query = query.eq('status', status as PipelineStage)
    }

    if (startDate) {
      query = query.gte('actual_start', startDate)
    }

    if (endDate) {
      query = query.lte('actual_completion', endDate)
    }

    const { data: profitLoss, error } = await query

    if (error) {
      logger.error('Failed to fetch P&L data', { error, tenantId })
      throw InternalError('Failed to fetch P&L data')
    }

    // Calculate summary metrics
    const baseSummary = profitLoss.reduce(
      (acc, item) => {
        acc.total_revenue += Number(item.revenue) || 0
        acc.total_cost += Number(item.total_actual_cost) || 0
        acc.total_profit += Number(item.gross_profit) || 0
        acc.project_count += 1
        return acc
      },
      {
        total_revenue: 0,
        total_cost: 0,
        total_profit: 0,
        project_count: 0,
      }
    )

    const summary = {
      ...baseSummary,
      profit_margin: baseSummary.total_revenue > 0
        ? ((baseSummary.total_profit / baseSummary.total_revenue) * 100).toFixed(2)
        : '0.00',
    }

    return successResponse({ profitLoss, summary })
  } catch (error) {
    logger.error('P&L API error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
