/**
 * Gamification Points Helper
 * Reusable function to award points for user actions
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

/**
 * Point values for different actions
 */
export const POINT_VALUES = {
  // Contact Actions
  CONTACT_CREATED: 10,
  CONTACT_QUALIFIED: 20,
  CONTACT_CONVERTED: 50,

  // Photo Actions
  PHOTO_UPLOADED: 5,
  PHOTO_SET_COMPLETED: 25, // Upload 5+ photos for a property

  // Territory Actions
  TERRITORY_CREATED: 10,
  TERRITORY_COMPLETED: 30, // Mark territory as fully canvassed

  // Project Actions
  PROJECT_CREATED: 15,
  PROJECT_WON: 100,
  PROJECT_MILESTONE: 25,

  // Communication Actions
  CALL_COMPLETED: 5,
  SMS_SENT: 2,
  EMAIL_SENT: 3,
  APPOINTMENT_SET: 20,

  // Door Knocking
  DOOR_KNOCK_LOGGED: 3,
  DOOR_KNOCK_STREAK_BONUS: 10, // Bonus for 10+ doors in a day

  // Daily Bonuses
  FIRST_ACTIVITY_OF_DAY: 5,
  EARLY_BIRD_BONUS: 10, // Log activity before 9 AM
} as const

/**
 * Award points to a user
 *
 * @param userId - User to award points to
 * @param points - Number of points to award
 * @param reason - Reason for awarding points
 * @param activityId - Optional activity ID to link points to
 * @returns Object with awarded points and any new achievements unlocked
 */
export async function awardPoints(
  userId: string,
  points: number,
  reason: string,
  activityId?: string
): Promise<{
  success: boolean
  pointsAwarded: number
  newAchievements?: Array<{ id: string; name: string; description: string }>
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Award points using database function
    const { error: awardError } = await supabase.rpc('award_points', {
      p_user_id: userId,
      p_points: points,
      p_reason: reason,
      p_activity_id: activityId || null,
    })

    if (awardError) {
      logger.error('Failed to award points', {
        error: awardError,
        userId,
        points,
        reason,
      })
      return {
        success: false,
        pointsAwarded: 0,
        error: awardError.message,
      }
    }

    // Check for new achievements
    const { data: achievements, error: achievementError } = await supabase.rpc(
      'check_achievements',
      { p_user_id: userId }
    )

    if (achievementError) {
      logger.warn('Failed to check achievements', {
        error: achievementError,
        userId,
      })
    }

    logger.info('Points awarded', {
      userId,
      points,
      reason,
      newAchievements: achievements?.length || 0,
    })

    return {
      success: true,
      pointsAwarded: points,
      newAchievements: achievements || [],
    }
  } catch (error) {
    logger.error('Award points error', { error, userId, points, reason })
    return {
      success: false,
      pointsAwarded: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Award points without throwing errors
 * Use this in API routes where you don't want points to block the main operation
 */
export async function awardPointsSafe(
  userId: string,
  points: number,
  reason: string,
  activityId?: string
): Promise<void> {
  try {
    await awardPoints(userId, points, reason, activityId)
  } catch (error) {
    // Log but don't throw - gamification shouldn't break core functionality
    logger.warn('Points award failed (non-blocking)', { error, userId, points, reason })
  }
}
