import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { generateRevenueForecast } from '@/lib/analytics/forecasting'
import { createDefaultFilters } from '@/lib/analytics/pipeline-analytics'
import { AnalyticsFilters } from '@/lib/analytics/analytics-types'
import { PipelineStage } from '@/lib/types/api'
import { AuthenticationError, AuthorizationError } from '@/lib/api/errors'
import { errorResponse } from '@/lib/api/response'

/**
 * GET /api/analytics/forecast
 *
 * Generates detailed revenue forecasting including:
 * - 30/60/90 day projections
 * - Pipeline-based forecasts
 * - Historical trend analysis
 * - Expected closures by period
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')
    const period = searchParams.get('period') as '30_day' | '90_day' | '6_month' | '1_year' || '90_day'
    const stages = searchParams.get('stages')?.split(',')
    const leadSources = searchParams.get('leadSources')?.split(',')
    const assignedTo = searchParams.get('assignedTo')?.split(',')

    // Create analytics filters
    let filters: AnalyticsFilters
    if (startDate && endDate) {
      filters = {
        dateRange: {
          start: new Date(startDate),
          end: new Date(endDate),
          period: period === '30_day' ? 'last_30_days' :
                  period === '90_day' ? 'last_90_days' :
                  period === '6_month' ? 'last_6_months' : 'last_year'
        },
        stages: stages as PipelineStage[],
        leadSources,
        assignedTo
      }
    } else {
      filters = createDefaultFilters(period)
    }

    // Initialize Supabase client
    const supabase = await createClient()

    // Get current user and tenant
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('Unauthorized')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with tenant')
    }

    // Fetch projects data including historical data for forecasting
    // We need a longer lookback period for historical analysis
    const historicalStart = new Date(filters.dateRange.start)
    historicalStart.setFullYear(historicalStart.getFullYear() - 2) // 2 years of history

    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        *,
        contact:contacts(
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .eq('tenant_id', tenantId)
      .gte('created_at', historicalStart.toISOString())
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching projects for forecast:', error)
      throw new Error('Failed to fetch projects')
    }

    if (!projects || projects.length === 0) {
      // Return empty forecast for no data
      return NextResponse.json({
        periods: [],
        totalPipelineValue: 0,
        overallWinRate: 0,
        averageDealSize: 0,
        monthlyRunRate: 0,
        pipelineGrowth: 0,
        dealSizeTrend: 0,
        velocityTrend: 0
      })
    }

    // Generate revenue forecast
    const forecast = generateRevenueForecast(projects, filters)

    return NextResponse.json(forecast)

  } catch (error) {
    console.error('Error generating revenue forecast:', error)
    return errorResponse(error as Error)
  }
}