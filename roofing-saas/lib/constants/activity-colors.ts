/**
 * Centralized activity type color definitions
 *
 * Provides consistent styling across all activity-related components:
 * - ContactActivityTimeline
 * - ActivityFeed
 * - Any future activity displays
 *
 * Format: 'text-{color}-600 bg-{color}-100' for icon container styling
 */

export const ACTIVITY_TYPE_COLORS = {
  // Communication
  call: 'text-purple-600 bg-purple-100',
  email: 'text-blue-600 bg-blue-100',
  sms: 'text-green-600 bg-green-100',

  // Notes & Documentation
  note: 'text-orange-600 bg-orange-100',
  photo: 'text-pink-600 bg-pink-100',

  // In-Person
  meeting: 'text-indigo-600 bg-indigo-100',
  door_knock: 'text-teal-600 bg-teal-100',
  knock: 'text-teal-600 bg-teal-100', // Alias for door_knock

  // Tasks & Workflow
  task: 'text-yellow-600 bg-yellow-100',

  // Business Events
  sale: 'text-green-600 bg-green-100',
  achievement: 'text-yellow-600 bg-yellow-100',
  goal: 'text-cyan-600 bg-cyan-100',
} as const

export type ActivityType = keyof typeof ACTIVITY_TYPE_COLORS

/**
 * Get color classes for an activity type with fallback
 */
export function getActivityColor(type: string): string {
  return ACTIVITY_TYPE_COLORS[type as ActivityType] || 'text-muted-foreground bg-muted'
}
