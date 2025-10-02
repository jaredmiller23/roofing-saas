import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'all' // all, daily, weekly, monthly
    const limit = parseInt(searchParams.get('limit') || '10')

    // Get current user for comparison
    const { data: { user } } = await supabase.auth.getUser()

    let orderColumn = 'total_points'
    if (period === 'daily') orderColumn = 'daily_points'
    if (period === 'weekly') orderColumn = 'weekly_points'
    if (period === 'monthly') orderColumn = 'monthly_points'

    // Get leaderboard
    const { data: leaderboard, error } = await supabase
      .from('gamification_points')
      .select(`
        user_id,
        total_points,
        current_level,
        daily_points,
        weekly_points,
        monthly_points,
        profiles!inner(
          full_name,
          avatar_url,
          role
        )
      `)
      .order(orderColumn, { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching leaderboard:', error)
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard' },
        { status: 500 }
      )
    }

    // Get user's rank if authenticated
    let userRank = null
    if (user) {
      const { data: userStats } = await supabase
        .from('gamification_points')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (userStats) {
        // Count how many users have more points
        const { count } = await supabase
          .from('gamification_points')
          .select('*', { count: 'exact', head: true })
          .gt(orderColumn, userStats[orderColumn])

        userRank = (count || 0) + 1
      }
    }

    // Format leaderboard data
    const formattedLeaderboard = leaderboard?.map((entry, index) => {
      const profile = Array.isArray(entry.profiles) ? entry.profiles[0] : entry.profiles
      const points = (entry as Record<string, unknown>)[orderColumn] as number
      return {
        rank: index + 1,
        user_id: entry.user_id,
        name: profile?.full_name || 'Unknown User',
        avatar_url: profile?.avatar_url,
        role: profile?.role,
        points,
        level: entry.current_level,
        isCurrentUser: entry.user_id === user?.id
      }
    }) || []

    return NextResponse.json({
      success: true,
      data: {
        period,
        leaderboard: formattedLeaderboard,
        currentUserRank: userRank
      }
    })
  } catch (error) {
    console.error('Leaderboard API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}