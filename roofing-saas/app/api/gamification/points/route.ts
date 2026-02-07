import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { logger } from '@/lib/logger'
import { ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export const GET = withAuth(async (_request, { userId }) => {
  try {
    const supabase = await createClient()

    // Get user points and level
    const { data: points, error } = await supabase
      .from('gamification_scores')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      logger.error('Error fetching points:', { error })
      throw InternalError('Failed to fetch points')
    }

    // Return points or default values for new users
    return successResponse(
      points || {
        user_id: userId,
        total_points: 0,
        current_level: 1,
        daily_points: 0,
        weekly_points: 0,
        monthly_points: 0,
        all_time_best_daily: 0,
        all_time_best_weekly: 0,
        all_time_best_monthly: 0
      },
      200,
      {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60'
      }
    )
  } catch (error) {
    logger.error('Points API error:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

export const POST = withAuth(async (request, { userId }) => {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { points, reason, activity_id } = body

    if (!points || !reason) {
      throw ValidationError('Points and reason are required')
    }

    // Award points using database function
    const { error } = await supabase
      .rpc('award_points', {
        p_user_id: userId,
        p_points: points,
        p_reason: reason,
        p_activity_id: activity_id || null
      })

    if (error) {
      logger.error('Error awarding points:', { error })
      throw InternalError('Failed to award points')
    }

    // Check for new achievements
    const { data: achievements } = await supabase
      .rpc('check_achievements', { p_user_id: userId })

    return successResponse({
      points_awarded: points,
      new_achievements: achievements || []
    })
  } catch (error) {
    logger.error('Award points API error:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
