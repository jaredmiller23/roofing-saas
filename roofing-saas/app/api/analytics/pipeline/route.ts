import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generatePipelineAnalytics, createDefaultFilters } from '@/lib/analytics/pipeline-analytics'
import { generateRevenueForecast } from '@/lib/analytics/forecasting'
import { AnalyticsFilters } from '@/lib/analytics/analytics-types'

/**
 * GET /api/analytics/pipeline
 *
 * Generates comprehensive pipeline analytics including:
 * - Conversion funnel analysis
 * - Pipeline velocity metrics
 * - Win/loss analysis
 * - Revenue forecasting
 * - Team performance
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
    const minValue = searchParams.get('minValue') ? parseFloat(searchParams.get('minValue')!) : undefined
    const maxValue = searchParams.get('maxValue') ? parseFloat(searchParams.get('maxValue')!) : undefined

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
        stages: stages as any,
        leadSources,
        assignedTo,
        minValue,
        maxValue
      }
    } else {
      filters = createDefaultFilters(period)
    }

    // Initialize Supabase client
    const supabase = await createClient()

    // Get current user and tenant
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch projects data
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
      .eq('tenant_id', user.user_metadata?.tenant_id)
      .gte('created_at', filters.dateRange.start.toISOString())
      .lte('created_at', filters.dateRange.end.toISOString())
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching projects:', error)
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
    }

    if (!projects || projects.length === 0) {
      // Return empty analytics for no data
      return NextResponse.json({
        conversionFunnel: {
          stages: [],
          overallConversionRate: 0,
          totalProspects: 0,
          totalWon: 0,
          totalRevenue: 0,
          averageLeadToWin: 0
        },
        velocity: {
          stages: [],
          overallVelocity: 0,
          fastestDeals: [],
          slowestDeals: [],
          bottlenecks: []
        },
        winLossAnalysis: {
          totalDeals: 0,
          wonDeals: 0,
          lostDeals: 0,
          winRate: 0,
          totalWonRevenue: 0,
          totalLostRevenue: 0,
          averageWonValue: 0,
          averageLostValue: 0,
          leadSourcePerformance: [],
          lossReasons: [],
          averageWonTime: 0,
          averageLostTime: 0
        },
        revenueForecast: {
          periods: [],
          totalPipelineValue: 0,
          overallWinRate: 0,
          averageDealSize: 0,
          monthlyRunRate: 0,
          pipelineGrowth: 0,
          dealSizeTrend: 0,
          velocityTrend: 0
        },
        teamPerformance: [],
        filters,
        lastUpdated: new Date().toISOString(),
        dataQuality: {
          missingValues: 0,
          incompleteProjects: 0,
          outliers: 0
        }
      })
    }

    // Generate comprehensive analytics
    const analytics = generatePipelineAnalytics(projects, filters)

    // Generate revenue forecast separately and merge
    const revenueForecast = generateRevenueForecast(projects, filters)
    analytics.revenueForecast = revenueForecast

    return NextResponse.json(analytics)

  } catch (error) {
    console.error('Error generating pipeline analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}