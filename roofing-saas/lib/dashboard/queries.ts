/**
 * Consolidated Dashboard Query Functions
 *
 * Extracts reusable query functions from individual API routes.
 * Used by the consolidated dashboard API to fetch all data in one request.
 *
 * Purpose: Reduce 6 serverless invocations to 1 by sharing:
 * - Single Supabase client
 * - Single auth check
 * - Shared user info map for leaderboards
 */

import { SupabaseClient } from '@supabase/supabase-js'

// Re-export metrics functions (already well-structured)
export {
  getFieldMetrics,
  getManagerMetrics,
  getFullMetrics,
  type DashboardScope,
} from './metrics-queries'

// =============================================================================
// Types
// =============================================================================

export interface ActivityItem {
  id: string
  type: 'project_won' | 'project_lost' | 'project_created' | 'contact_added' | 'status_change'
  title: string
  description: string
  timestamp: string
  metadata?: {
    user?: string
    value?: number
    project_name?: string
    contact_name?: string
    old_status?: string
    new_status?: string
  }
}

export interface UserInfo {
  name: string
  avatar_url: string | null
}

export interface LeaderboardEntry {
  rank: number
  user_id: string
  name: string
  avatar_url: string | null
  role: string | null
  points: number
  level: number
  isCurrentUser: boolean
}

export interface LeaderboardResult {
  period: string
  type: string
  leaderboard: LeaderboardEntry[]
  currentUserRank: number | null
}

export interface WeeklyChallengeResult {
  id: string
  title: string
  description: string
  startDate: string
  endDate: string
  target: number
  current: number
  unit: string
  timeRemaining: string
  participants: number
  reward: string
  status: 'active' | 'completed' | 'upcoming'
}

export interface UserPointsResult {
  user_id: string
  total_points: number
  current_level: number
  daily_points: number
  weekly_points: number
  monthly_points: number
  all_time_best_daily: number
  all_time_best_weekly: number
  all_time_best_monthly: number
}

// =============================================================================
// Shared Helpers
// =============================================================================

/**
 * Get user info (name, avatar) from tenant_users joined with auth.users
 * Uses RPC function since PostgREST can't resolve cross-schema relationships
 * Returns a map of user_id -> {name, avatar_url}
 *
 * This is shared across activity feed and leaderboards to avoid duplicate queries.
 */
export async function fetchUserInfoMap(
  supabase: SupabaseClient,
  tenantId: string
): Promise<Map<string, UserInfo>> {
  const { data: users, error } = await supabase.rpc('get_tenant_users_with_info', {
    p_tenant_id: tenantId
  })

  if (error) {
    console.error('Error fetching user info:', error)
  }

  const userMap = new Map<string, UserInfo>()

  users?.forEach((u: { user_id: string; full_name: string; avatar_url: string | null }) => {
    userMap.set(u.user_id, {
      name: u.full_name || 'Unknown',
      avatar_url: u.avatar_url
    })
  })

  return userMap
}

function getDateByPeriod(period: string): string {
  const now = new Date()
  switch (period) {
    case 'daily':
      return new Date(now.setHours(0, 0, 0, 0)).toISOString()
    case 'weekly':
      const weekAgo = new Date(now.setDate(now.getDate() - 7))
      return weekAgo.toISOString()
    case 'monthly':
      const monthAgo = new Date(now.setMonth(now.getMonth() - 1))
      return monthAgo.toISOString()
    default:
      return new Date(0).toISOString() // Beginning of time for 'all'
  }
}

// =============================================================================
// Activity Feed
// =============================================================================

/**
 * Fetch activity feed for dashboard
 * Extracted from /api/dashboard/activity
 */
export async function fetchActivityFeed(
  supabase: SupabaseClient,
  tenantId: string,
  userInfoMap?: Map<string, UserInfo>
): Promise<{ activities: ActivityItem[]; count: number }> {
  const activities: ActivityItem[] = []

  // Get recent projects with status changes (last 7 days)
  const { data: recentProjects } = await supabase
    .from('projects')
    .select(`
      id,
      name,
      status,
      estimated_value,
      approved_value,
      final_value,
      created_at,
      updated_at,
      created_by,
      contact_id,
      contacts:contact_id (
        first_name,
        last_name
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('is_deleted', false)
    .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('updated_at', { ascending: false })
    .limit(20)

  // Get recent contacts (last 7 days)
  const { data: recentContacts } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, created_at, created_by, stage')
    .eq('tenant_id', tenantId)
    .eq('is_deleted', false)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(10)

  // Build user info map if not provided
  let userMap = userInfoMap
  if (!userMap) {
    const userIds = new Set<string>()
    if (recentProjects) {
      for (const project of recentProjects) {
        if (project.created_by) userIds.add(project.created_by)
      }
    }
    if (recentContacts) {
      for (const contact of recentContacts) {
        if (contact.created_by) userIds.add(contact.created_by)
      }
    }

    // Batch lookup user names from tenant_users -> auth.users
    userMap = new Map<string, UserInfo>()
    if (userIds.size > 0) {
      const { data: users } = await supabase
        .from('tenant_users')
        .select(`
          user_id,
          users:user_id (
            email,
            raw_user_meta_data
          )
        `)
        .eq('tenant_id', tenantId)
        .in('user_id', Array.from(userIds))

      if (users) {
        for (const tu of users) {
          const userData = tu.users as {
            email?: string
            raw_user_meta_data?: {
              first_name?: string
              last_name?: string
              name?: string
              full_name?: string
            }
          } | null
          const metadata = userData?.raw_user_meta_data || {}
          const firstName = metadata.first_name || metadata.name?.split(' ')[0] || ''
          const lastName = metadata.last_name || metadata.name?.split(' ').slice(1).join(' ') || ''
          const fullName = metadata.full_name || `${firstName} ${lastName}`.trim() || userData?.email?.split('@')[0] || 'Team Member'
          userMap.set(tu.user_id, { name: fullName, avatar_url: null })
        }
      }
    }
  }

  // Helper to get user name from map
  const getUserName = (userId: string | null | undefined): string => {
    if (!userId) return 'Team Member'
    return userMap?.get(userId)?.name || 'Team Member'
  }

  // Process projects into activity items
  if (recentProjects) {
    for (const project of recentProjects) {
      // Supabase join returns single object for many-to-one, but TypeScript infers array
      const contactData = project.contacts as unknown as { first_name: string; last_name: string } | null
      const contactName = contactData
        ? `${contactData.first_name} ${contactData.last_name}`.trim()
        : project.name
      const userName = getUserName(project.created_by)

      if (project.status === 'won') {
        activities.push({
          id: `project_won_${project.id}`,
          type: 'project_won',
          title: 'Deal Won! 🎉',
          description: `Closed deal with ${contactName}`,
          timestamp: project.updated_at,
          metadata: {
            user: userName,
            project_name: project.name,
            contact_name: contactName,
            value: project.final_value || project.approved_value || project.estimated_value || 0
          }
        })
      } else if (project.status === 'lost') {
        activities.push({
          id: `project_lost_${project.id}`,
          type: 'project_lost',
          title: 'Deal Lost',
          description: `${contactName} - ${project.name}`,
          timestamp: project.updated_at,
          metadata: {
            user: userName,
            project_name: project.name,
            contact_name: contactName
          }
        })
      } else if (project.created_at === project.updated_at) {
        // New project
        activities.push({
          id: `project_created_${project.id}`,
          type: 'project_created',
          title: 'New Project',
          description: `${project.name} added to pipeline`,
          timestamp: project.created_at,
          metadata: {
            user: userName,
            project_name: project.name,
            value: project.estimated_value || 0
          }
        })
      }
    }
  }

  // Process contacts into activity items
  if (recentContacts) {
    for (const contact of recentContacts) {
      const contactName = `${contact.first_name} ${contact.last_name}`.trim()
      const userName = getUserName(contact.created_by)
      activities.push({
        id: `contact_added_${contact.id}`,
        type: 'contact_added',
        title: 'New Contact',
        description: `${contactName} added to ${contact.stage || 'pipeline'}`,
        timestamp: contact.created_at,
        metadata: {
          user: userName,
          contact_name: contactName
        }
      })
    }
  }

  // Sort all activities by timestamp
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // Limit to most recent 15
  const limitedActivities = activities.slice(0, 15)

  return {
    activities: limitedActivities,
    count: limitedActivities.length
  }
}

// =============================================================================
// Weekly Challenge
// =============================================================================

/**
 * Fetch weekly challenge data
 * Extracted from /api/dashboard/weekly-challenge
 */
export async function fetchWeeklyChallenge(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string
): Promise<WeeklyChallengeResult> {
  // Use rolling 7-day window (same as dashboard door knocks metric)
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - 7)
  weekStart.setHours(0, 0, 0, 0)

  const weekEnd = new Date(now)
  weekEnd.setHours(23, 59, 59, 999)

  // Use RPC for efficient database-side aggregation
  const { data: stats, error: statsError } = await supabase.rpc('get_weekly_challenge_stats', {
    p_tenant_id: tenantId,
    p_user_id: userId,
    p_since: weekStart.toISOString()
  })

  if (statsError) {
    console.error('Error fetching weekly challenge stats:', statsError)
    throw new Error('Failed to fetch weekly challenge data')
  }

  const userKnockCount = Number(stats?.[0]?.user_knock_count || 0)
  const participantCount = Number(stats?.[0]?.participant_count || 0)

  // Target (configurable - default 50 per user)
  const target = 50

  return {
    id: 'weekly-knock-challenge',
    title: 'Weekly Knock Challenge',
    description: `Complete ${target} door knocks in 7 days to earn the bonus!`,
    startDate: weekStart.toISOString(),
    endDate: weekEnd.toISOString(),
    target,
    current: userKnockCount || 0,
    unit: 'knocks',
    timeRemaining: 'rolling',
    participants: participantCount,
    reward: '$500 bonus for hitting the target',
    status: 'active'
  }
}

// =============================================================================
// Leaderboard
// =============================================================================

/**
 * Fetch leaderboard data
 * Extracted from /api/gamification/leaderboard
 *
 * @param userInfoMap - Optional pre-fetched user info map (for efficiency when fetching multiple leaderboards)
 */
export async function fetchLeaderboard(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
  type: 'points' | 'knocks' | 'sales' = 'points',
  period: string = 'weekly',
  limit: number = 10,
  userInfoMap?: Map<string, UserInfo>
): Promise<LeaderboardResult> {
  // Get user info map if not provided (for name lookups)
  const infoMap = userInfoMap || await fetchUserInfoMap(supabase, tenantId)

  let leaderboard: LeaderboardEntry[] = []
  let userRank: number | null = null

  if (type === 'knocks') {
    // Use RPC for efficient database-side aggregation
    const { data: knockData, error } = await supabase.rpc('get_knock_leaderboard', {
      p_tenant_id: tenantId,
      p_since: getDateByPeriod(period),
      p_limit: limit
    })

    if (error) {
      console.error('Error fetching knock leaderboard:', error)
      throw new Error('Failed to fetch knock leaderboard')
    }

    // Build leaderboard with user info
    leaderboard = (knockData || []).map((row: { user_id: string; knock_count: number }, index: number) => {
      const userInfo = infoMap.get(row.user_id)
      const count = Number(row.knock_count)
      return {
        rank: index + 1,
        user_id: row.user_id,
        name: userInfo?.name || 'Unknown',
        avatar_url: userInfo?.avatar_url || null,
        role: null,
        points: count,
        level: Math.floor(count / 100) + 1,
        isCurrentUser: row.user_id === userId
      }
    })

    // Get current user's rank
    const userEntry = knockData?.find((row: { user_id: string }) => row.user_id === userId)
    if (userEntry) {
      userRank = knockData.findIndex((row: { user_id: string }) => row.user_id === userId) + 1
    }
  } else if (type === 'sales') {
    // Use RPC for efficient database-side aggregation
    const { data: salesData, error } = await supabase.rpc('get_sales_leaderboard', {
      p_tenant_id: tenantId,
      p_since: getDateByPeriod(period),
      p_limit: limit
    })

    if (error) {
      console.error('Error fetching sales leaderboard:', error)
      throw new Error('Failed to fetch sales leaderboard')
    }

    // Build leaderboard with user info
    leaderboard = (salesData || []).map((row: { user_id: string; sales_count: number }, index: number) => {
      const userInfo = infoMap.get(row.user_id)
      const count = Number(row.sales_count)
      return {
        rank: index + 1,
        user_id: row.user_id,
        name: userInfo?.name || 'Unknown',
        avatar_url: userInfo?.avatar_url || null,
        role: null,
        points: count,
        level: Math.floor(count / 100) + 1,
        isCurrentUser: row.user_id === userId
      }
    })

    // Get current user's rank
    const userEntry = salesData?.find((row: { user_id: string }) => row.user_id === userId)
    if (userEntry) {
      userRank = salesData.findIndex((row: { user_id: string }) => row.user_id === userId) + 1
    }
  } else {
    // Default: Get leaderboard from gamification_scores (points)
    const { data: pointsData, error } = await supabase
      .from('gamification_scores')
      .select('user_id, total_points')
      .eq('tenant_id', tenantId)
      .order('total_points', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching leaderboard:', error)
      throw new Error('Failed to fetch leaderboard')
    }

    leaderboard = (pointsData || []).map((entry: { user_id: string; total_points?: number }, index: number) => {
      const userInfo = infoMap.get(entry.user_id)
      const count = entry.total_points || 0
      return {
        rank: index + 1,
        user_id: entry.user_id,
        name: userInfo?.name || 'Unknown User',
        avatar_url: userInfo?.avatar_url || null,
        role: null,
        points: count,
        level: Math.floor(count / 100) + 1,
        isCurrentUser: entry.user_id === userId
      }
    })

    // Get user's rank if not in top results
    const { data: userStats } = await supabase
      .from('gamification_scores')
      .select('total_points')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .single()

    if (userStats) {
      const { count } = await supabase
        .from('gamification_scores')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gt('total_points', userStats.total_points)

      userRank = (count || 0) + 1
    }
  }

  return {
    period,
    type,
    leaderboard,
    currentUserRank: userRank
  }
}

// =============================================================================
// User Points
// =============================================================================

/**
 * Fetch user points/gamification scores
 * Extracted from /api/gamification/points
 */
export async function fetchUserPoints(
  supabase: SupabaseClient,
  userId: string
): Promise<UserPointsResult> {
  // Get user points and level
  const { data: points, error } = await supabase
    .from('gamification_scores')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    console.error('Error fetching points:', error)
    throw new Error('Failed to fetch points')
  }

  // Return points or default values for new users
  return points || {
    user_id: userId,
    total_points: 0,
    current_level: 1,
    daily_points: 0,
    weekly_points: 0,
    monthly_points: 0,
    all_time_best_daily: 0,
    all_time_best_weekly: 0,
    all_time_best_monthly: 0
  }
}
