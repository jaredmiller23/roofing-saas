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

    // Get current week's start (Monday) and end (Sunday)
    const now = new Date()
    const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // If Sunday, go back 6 days
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() + daysToMonday)
    weekStart.setHours(0, 0, 0, 0)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6) // Sunday
    weekEnd.setHours(23, 59, 59, 999)

    // Query door knock activities for current week (tenant-wide for participant count)
    const { data: allKnockActivities, error: allError } = await supabase
      .from('activities')
      .select('created_by')
      .eq('tenant_id', tenantId)
      .eq('type', 'door_knock')
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString())

    if (allError) {
      console.error('Error fetching knock activities:', allError)
      throw new Error('Failed to fetch weekly challenge data')
    }

    // Query current user's personal knock count
    const { count: userKnockCount, error: userError } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('type', 'door_knock')
      .eq('created_by', user.id)
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString())

    if (userError) {
      console.error('Error fetching user knock count:', userError)
    }

    // Count distinct participants (users who have knocked)
    const uniqueUsers = new Set(allKnockActivities?.map(a => a.created_by).filter(Boolean))
    const participantCount = uniqueUsers.size

    // Target (configurable - default 50 per user)
    const target = 50

    // Calculate time remaining
    const msRemaining = weekEnd.getTime() - now.getTime()
    const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24))
    const timeRemaining = daysRemaining === 1 ? '1 day' : `${daysRemaining} days`

    return NextResponse.json({
      success: true,
      data: {
        challenge: {
          id: 'weekly-knock-challenge',
          title: 'Weekly Knock Challenge',
          description: `Complete ${target} door knocks this week to earn the bonus!`,
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
    })
  } catch (error) {
    console.error('Weekly challenge API error:', error)
    return errorResponse(error as Error)
  }
}
