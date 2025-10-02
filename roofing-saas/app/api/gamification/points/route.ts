import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user points and level
    const { data: points, error } = await supabase
      .from('gamification_scores')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching points:', error)
      return NextResponse.json(
        { error: 'Failed to fetch points' },
        { status: 500 }
      )
    }

    // Return points or default values for new users
    return NextResponse.json({
      success: true,
      data: points || {
        user_id: user.id,
        total_points: 0,
        current_level: 1,
        daily_points: 0,
        weekly_points: 0,
        monthly_points: 0,
        all_time_best_daily: 0,
        all_time_best_weekly: 0,
        all_time_best_monthly: 0
      }
    })
  } catch (error) {
    console.error('Points API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { points, reason, activity_id } = body

    if (!points || !reason) {
      return NextResponse.json(
        { error: 'Points and reason are required' },
        { status: 400 }
      )
    }

    // Award points using database function
    const { error } = await supabase
      .rpc('award_points', {
        p_user_id: user.id,
        p_points: points,
        p_reason: reason,
        p_activity_id: activity_id || null
      })

    if (error) {
      console.error('Error awarding points:', error)
      return NextResponse.json(
        { error: 'Failed to award points' },
        { status: 500 }
      )
    }

    // Check for new achievements
    const { data: achievements } = await supabase
      .rpc('check_achievements', { p_user_id: user.id })

    return NextResponse.json({
      success: true,
      data: {
        points_awarded: points,
        new_achievements: achievements || []
      }
    })
  } catch (error) {
    console.error('Award points API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}