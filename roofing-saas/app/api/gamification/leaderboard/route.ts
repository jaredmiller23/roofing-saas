import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'all'
    const limit = parseInt(searchParams.get('limit') || '10')

    // Get current user for comparison
    const { data: { user } } = await supabase.auth.getUser()

    // Get leaderboard from view
    const { data: leaderboard, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('total_points', { ascending: false })
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
        .from('leaderboard')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (userStats) {
        // Count how many users have more points
        const { count } = await supabase
          .from('leaderboard')
          .select('*', { count: 'exact', head: true })
          .gt('total_points', userStats.total_points)

        userRank = (count || 0) + 1
      }
    }

    // Format leaderboard data
    const formattedLeaderboard = leaderboard?.map((entry, index) => {
      return {
        rank: index + 1,
        user_id: entry.user_id,
        name: entry.user_name || 'Unknown User',
        avatar_url: entry.avatar_url,
        role: null,
        points: entry.total_points || 0,
        level: Math.floor((entry.total_points || 0) / 100) + 1, // Calculate level from points
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