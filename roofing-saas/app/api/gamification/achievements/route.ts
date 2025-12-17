import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const supabase = await createClient()

    // Get all possible achievements
    const { data: allAchievements, error: achievementsError } = await supabase
      .from('achievements')
      .select('*')
      .order('points_required', { ascending: true })

    if (achievementsError) {
      logger.error('Error fetching achievements:', { error: achievementsError })
      throw InternalError('Failed to fetch achievements')
    }

    // Get user's unlocked achievements
    const { data: userAchievements, error: userError } = await supabase
      .from('user_achievements')
      .select('achievement_id, unlocked_at')
      .eq('user_id', user.id)

    if (userError) {
      logger.error('Error fetching user achievements:', { error: userError })
      throw InternalError('Failed to fetch user achievements')
    }

    // Combine the data
    const unlockedIds = new Set(userAchievements?.map(ua => ua.achievement_id) || [])
    const achievementsWithStatus = allAchievements?.map(achievement => ({
      ...achievement,
      unlocked: unlockedIds.has(achievement.id),
      unlocked_at: userAchievements?.find(ua => ua.achievement_id === achievement.id)?.unlocked_at
    })) || []

    return successResponse({
      data: {
        achievements: achievementsWithStatus,
        total: allAchievements?.length || 0,
        unlocked: userAchievements?.length || 0
      }
    })
  } catch (error) {
    logger.error('Achievements API error:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}