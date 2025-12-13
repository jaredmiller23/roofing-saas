/**
 * Time Restrictions for Call Compliance
 * TCPA/TSR requires calls between 9am-8pm in contact's local timezone
 *
 * CRITICAL: CALLING HOURS ARE 9am-8pm (different from SMS quiet hours)
 */

import { logger } from '@/lib/logger'
import type { TimeRestrictionResult } from './types'

/**
 * TCPA/TSR Calling Hours
 * Calls MUST be made between 9am and 8pm local time
 *
 * start: 9 = 9:00 AM
 * end: 20 = 8:00 PM (hour < 9 OR hour >= 20 = blocked)
 */
export const CALLING_HOURS = {
  start: 9, // 9am
  end: 20, // 8pm (20:00 in 24-hour format)
} as const

/**
 * Check if current time is within calling hours
 * Validates against TCPA/TSR time restrictions (9am-8pm local time)
 *
 * @param timezone - Contact's timezone (e.g., 'America/New_York', 'America/Chicago')
 * @returns TimeRestrictionResult indicating if call is allowed
 *
 * @example
 * const result = isWithinCallingHours('America/New_York');
 * if (!result.allowed) {
 *   console.log(result.reason); // "Outside calling hours (9am-8pm)"
 * }
 */
export function isWithinCallingHours(timezone: string = 'America/New_York'): TimeRestrictionResult {
  try {
    const now = new Date()

    // Get local time in contact's timezone
    const localTime = new Date(
      now.toLocaleString('en-US', { timeZone: timezone })
    )
    const hour = localTime.getHours()

    logger.debug('Checking calling hours', {
      timezone,
      hour,
      localTime: localTime.toLocaleTimeString(),
      callingHours: CALLING_HOURS,
    })

    // Check if within calling hours (9am-8pm)
    if (hour < CALLING_HOURS.start || hour >= CALLING_HOURS.end) {
      return {
        allowed: false,
        reason: `Outside calling hours (${CALLING_HOURS.start}am-${CALLING_HOURS.end - 12}pm local time)`,
        localTime: localTime.toLocaleTimeString(),
        timezone,
        localHour: hour,
      }
    }

    return {
      allowed: true,
      localTime: localTime.toLocaleTimeString(),
      timezone,
      localHour: hour,
    }
  } catch (error) {
    logger.error('Error checking calling hours', { error, timezone })
    return {
      allowed: false,
      reason: 'Invalid timezone or error checking time restrictions',
      timezone,
    }
  }
}

/**
 * Format calling hours for display
 * @returns Human-readable calling hours string
 */
export function getCallingHoursDisplay(): string {
  return `${CALLING_HOURS.start}am-${CALLING_HOURS.end - 12}pm`
}

/**
 * Check if a specific date/time is within calling hours
 * Useful for scheduling calls in advance
 *
 * @param date - Date to check
 * @param timezone - Contact's timezone
 * @returns TimeRestrictionResult
 */
export function isDateWithinCallingHours(
  date: Date,
  timezone: string = 'America/New_York'
): TimeRestrictionResult {
  try {
    const localTime = new Date(
      date.toLocaleString('en-US', { timeZone: timezone })
    )
    const hour = localTime.getHours()

    if (hour < CALLING_HOURS.start || hour >= CALLING_HOURS.end) {
      return {
        allowed: false,
        reason: `Outside calling hours (${CALLING_HOURS.start}am-${CALLING_HOURS.end - 12}pm local time)`,
        localTime: localTime.toLocaleTimeString(),
        timezone,
        localHour: hour,
      }
    }

    return {
      allowed: true,
      localTime: localTime.toLocaleTimeString(),
      timezone,
      localHour: hour,
    }
  } catch (error) {
    logger.error('Error checking date calling hours', { error, date, timezone })
    return {
      allowed: false,
      reason: 'Invalid timezone or error checking time restrictions',
      timezone,
    }
  }
}
