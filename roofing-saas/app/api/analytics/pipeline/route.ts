import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { generatePipelineAnalytics, createDefaultFilters } from '@/lib/analytics/pipeline-analytics'
import { generateRevenueForecast } from '@/lib/analytics/forecasting'
import { AnalyticsFilters } from '@/lib/analytics/analytics-types'
import { Project } from '@/lib/types/api'
import { successResponse, errorResponse } from '@/lib/api/response'

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
export const GET = withAuth(async (request, { tenantId }) => {
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
        stages: stages as AnalyticsFilters['stages'],
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

    // Fetch projects data
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        *,
        contact:contact_id(
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .eq('tenant_id', tenantId)
      .gte('created_at', filters.dateRange.start.toISOString())
      .lte('created_at', filters.dateRange.end.toISOString())
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching projects:', error)
      throw new Error('Failed to fetch projects')
    }

    if (!projects || projects.length === 0) {
      // Return empty analytics for no data
      return successResponse({
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

    // Fetch user names for team performance display
    // Two-step query: tenant_users FK references auth.users, not public.users
    const { data: tenantUsers } = await supabase
      .from('tenant_users')
      .select('user_id')
      .eq('tenant_id', tenantId)

    // Build user name map
    const userNames: Record<string, string> = {}
    if (tenantUsers && tenantUsers.length > 0) {
      const userIds = tenantUsers.map(tu => tu.user_id)
      const { data: usersData } = await supabase
        .from('users')
        .select('id, email, raw_user_meta_data')
        .in('id', userIds)

      if (usersData) {
        for (const userData of usersData) {
          if (!userData.id) continue
          const metadata = (userData.raw_user_meta_data as {
            full_name?: string
            first_name?: string
            last_name?: string
            name?: string
          }) || {}

          // Try to get full name from metadata
          const fullName = metadata.full_name ||
                          (metadata.first_name && metadata.last_name ? `${metadata.first_name} ${metadata.last_name}` : '') ||
                          metadata.name ||
                          userData.email?.split('@')[0] ||
                          'Unknown'

          userNames[userData.id] = fullName
        }
      }
    }

    // Generate comprehensive analytics
    const typedProjects = projects as unknown as Project[]
    const analytics = generatePipelineAnalytics(typedProjects, filters, userNames)

    // Generate revenue forecast separately and merge
    const revenueForecast = generateRevenueForecast(typedProjects, filters)
    analytics.revenueForecast = revenueForecast

    return successResponse(analytics)

  } catch (error) {
    console.error('Error generating pipeline analytics:', error)
    return errorResponse(error as Error)
  }
})
