import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { AuthenticationError, AuthorizationError } from '@/lib/api/errors'
import { errorResponse } from '@/lib/api/response'

/**
 * GET /api/dashboard/weekly-challenge
 * Returns weekly challenge data based on real door knock activities
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('Unauthorized')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    const supabase = await createClient()

    // Use rolling 7-day window (same as dashboard door knocks metric)
    // This provides consistency - if top shows 7 knocks, challenge should match
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - 7)
    weekStart.setHours(0, 0, 0, 0)

    const weekEnd = new Date(now)
    weekEnd.setHours(23, 59, 59, 999)

    // Use RPC for efficient database-side aggregation (single query instead of 2 unbounded queries)
    const { data: stats, error: statsError } = await supabase.rpc('get_weekly_challenge_stats', {
      p_tenant_id: tenantId,
      p_user_id: user.id,
      p_since: weekStart.toISOString()
    })

    if (statsError) {
      console.error('Error fetching weekly challenge stats:', statsError)
      throw new Error('Failed to fetch weekly challenge data')
    }

    const statsArray = stats as { user_knock_count: number; participant_count: number }[] | null
    const userKnockCount = Number(statsArray?.[0]?.user_knock_count || 0)
    const participantCount = Number(statsArray?.[0]?.participant_count || 0)

    // Target (configurable - default 50 per user)
    const target = 50

    // Rolling window - always show "rolling 7 days"
    const timeRemaining = 'rolling'

    return NextResponse.json({
      success: true,
      data: {
        challenge: {
          id: 'weekly-knock-challenge',
          title: 'Weekly Knock Challenge',
          description: `Complete ${target} door knocks in 7 days to earn the bonus!`,
          startDate: weekStart.toISOString(),
          endDate: weekEnd.toISOString(),
          target,
          current: userKnockCount || 0,
          unit: 'knocks',
          timeRemaining,
          participants: participantCount,
          reward: '$500 bonus for hitting the target',
          status: 'active',
        },
      },
    }, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60'
      }
    })
  } catch (error) {
    console.error('Weekly challenge API error:', error)
    return errorResponse(error as Error)
  }
}
