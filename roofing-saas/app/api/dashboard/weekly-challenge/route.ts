import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'

/**
 * GET /api/dashboard/weekly-challenge
 * Returns weekly challenge data based on real door knock activities
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 })
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

    // Query door knock activities for current week
    const { data: knockActivities, error } = await supabase
      .from('activities')
      .select('created_by')
      .eq('tenant_id', tenantId)
      .eq('type', 'door_knock')
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString())

    if (error) {
      console.error('Error fetching knock activities:', error)
      return NextResponse.json(
        { error: 'Failed to fetch weekly challenge data' },
        { status: 500 }
      )
    }

    // Count total knocks
    const totalKnocks = knockActivities?.length || 0

    // Count distinct participants (users who have knocked)
    const uniqueUsers = new Set(knockActivities?.map(a => a.created_by).filter(Boolean))
    const participantCount = uniqueUsers.size

    // Target (configurable - default 50)
    const target = 50

    return NextResponse.json({
      success: true,
      data: {
        challenge: {
          id: '1',
          title: 'Door Knock Challenge',
          description: 'Complete 50 door knocks this week',
          startDate: weekStart.toISOString(),
          endDate: weekEnd.toISOString(),
          target,
          current: totalKnocks,
          participants: participantCount,
          prize: '$500 bonus',
          status: 'active',
        },
      },
    })
  } catch (error) {
    console.error('Weekly challenge API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch weekly challenge data' },
      { status: 500 }
    )
  }
}
