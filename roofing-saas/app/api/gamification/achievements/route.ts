import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { logger } from '@/lib/logger'
import { InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export const GET = withAuth(async (_request, { userId }) => {
  try {
    const supabase = await createClient()

    // Get all possible achievements
    const { data: allAchievements, error: achievementsError } = await supabase
      .from('achievements')
      .select('*')
      .order('points_reward', { ascending: true })

    if (achievementsError) {
      logger.error('Error fetching achievements:', { error: achievementsError })
      throw InternalError('Failed to fetch achievements')
    }

    // Get user's unlocked achievements
    const { data: userAchievements, error: userError } = await supabase
      .from('user_achievements')
      .select('achievement_id, earned_at')
      .eq('user_id', userId)

    if (userError) {
      logger.error('Error fetching user achievements:', { error: userError })
      throw InternalError('Failed to fetch user achievements')
    }

    // Combine the data
    const unlockedIds = new Set(userAchievements?.map(ua => ua.achievement_id) || [])
    const achievementsWithStatus = allAchievements?.map(achievement => ({
      ...achievement,
      unlocked: unlockedIds.has(achievement.id),
      earned_at: userAchievements?.find(ua => ua.achievement_id === achievement.id)?.earned_at
    })) || []

    return successResponse({
      achievements: achievementsWithStatus,
      total: allAchievements?.length || 0,
      unlocked: userAchievements?.length || 0
    })
  } catch (error) {
    logger.error('Achievements API error:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
