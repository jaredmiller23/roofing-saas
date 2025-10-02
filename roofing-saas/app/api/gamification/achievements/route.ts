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

    // Get all possible achievements
    const { data: allAchievements, error: achievementsError } = await supabase
      .from('gamification_achievements')
      .select('*')
      .order('points_required', { ascending: true })

    if (achievementsError) {
      console.error('Error fetching achievements:', achievementsError)
      return NextResponse.json(
        { error: 'Failed to fetch achievements' },
        { status: 500 }
      )
    }

    // Get user's unlocked achievements
    const { data: userAchievements, error: userError } = await supabase
      .from('gamification_user_achievements')
      .select('achievement_id, unlocked_at')
      .eq('user_id', user.id)

    if (userError) {
      console.error('Error fetching user achievements:', userError)
      return NextResponse.json(
        { error: 'Failed to fetch user achievements' },
        { status: 500 }
      )
    }

    // Combine the data
    const unlockedIds = new Set(userAchievements?.map(ua => ua.achievement_id) || [])
    const achievementsWithStatus = allAchievements?.map(achievement => ({
      ...achievement,
      unlocked: unlockedIds.has(achievement.id),
      unlocked_at: userAchievements?.find(ua => ua.achievement_id === achievement.id)?.unlocked_at
    })) || []

    return NextResponse.json({
      success: true,
      data: {
        achievements: achievementsWithStatus,
        total: allAchievements?.length || 0,
        unlocked: userAchievements?.length || 0
      }
    })
  } catch (error) {
    console.error('Achievements API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}