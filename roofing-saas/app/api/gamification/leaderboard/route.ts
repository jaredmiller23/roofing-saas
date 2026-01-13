import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

interface LeaderboardEntry {
  user_id: string
  user_name: string
  knock_count?: number
  sales_count?: number
  total_points?: number
  avatar_url: string | null
}

interface UserInfo {
  name: string
  avatar_url: string | null
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

/**
 * Get user info (name, avatar) from tenant_users joined with auth.users
 * Uses RPC function since PostgREST can't resolve cross-schema relationships
 * Returns a map of user_id -> {name, avatar_url}
 */
async function getUserInfoMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<Map<string, UserInfo>> {
  const { data: users, error } = await supabase.rpc('get_tenant_users_with_info', {
    p_tenant_id: tenantId
  })

  if (error) {
    logger.error('Error fetching user info:', { error })
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

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthenticationError('No tenant found')
    }

    const supabase = await createClient()

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'all'
    const limit = parseInt(searchParams.get('limit') || '10')
    const type = searchParams.get('type') || 'points' // 'points', 'knocks', or 'sales'

    // Get user info map for name lookups
    const userInfoMap = await getUserInfoMap(supabase, tenantId)

    let leaderboard: LeaderboardEntry[] = []
    let userRank: number | null = null
    let userCount = 0

    if (type === 'knocks') {
      // Use RPC for efficient database-side aggregation
      const { data: knockData, error } = await supabase.rpc('get_knock_leaderboard', {
        p_tenant_id: tenantId,
        p_since: getDateByPeriod(period),
        p_limit: limit
      })

      if (error) {
        logger.error('Error fetching knock leaderboard:', { error })
        throw InternalError('Failed to fetch knock leaderboard')
      }

      // Build leaderboard with user info
      leaderboard = (knockData || []).map((row: { user_id: string; knock_count: number }) => {
        const userInfo = userInfoMap.get(row.user_id)
        return {
          user_id: row.user_id,
          user_name: userInfo?.name || 'Unknown',
          knock_count: Number(row.knock_count),
          avatar_url: userInfo?.avatar_url || null
        }
      })

      // Get current user's rank efficiently
      const userEntry = knockData?.find((row: { user_id: string }) => row.user_id === user.id)
      if (userEntry) {
        userCount = Number(userEntry.knock_count)
        userRank = knockData.findIndex((row: { user_id: string }) => row.user_id === user.id) + 1
      }
    } else if (type === 'sales') {
      // Use RPC for efficient database-side aggregation
      const { data: salesData, error } = await supabase.rpc('get_sales_leaderboard', {
        p_tenant_id: tenantId,
        p_since: getDateByPeriod(period),
        p_limit: limit
      })

      if (error) {
        logger.error('Error fetching sales leaderboard:', { error })
        throw InternalError('Failed to fetch sales leaderboard')
      }

      // Build leaderboard with user info
      leaderboard = (salesData || []).map((row: { user_id: string; sales_count: number }) => {
        const userInfo = userInfoMap.get(row.user_id)
        return {
          user_id: row.user_id,
          user_name: userInfo?.name || 'Unknown',
          sales_count: Number(row.sales_count),
          avatar_url: userInfo?.avatar_url || null
        }
      })

      // Get current user's rank efficiently
      const userEntry = salesData?.find((row: { user_id: string }) => row.user_id === user.id)
      if (userEntry) {
        userCount = Number(userEntry.sales_count)
        userRank = salesData.findIndex((row: { user_id: string }) => row.user_id === user.id) + 1
      }
    } else {
      // Default: Get leaderboard from view (points)
      const { data: pointsData, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('total_points', { ascending: false })
        .limit(limit)

      if (error) {
        logger.error('Error fetching leaderboard:', { error })
        throw InternalError('Failed to fetch leaderboard')
      }

      leaderboard = pointsData || []

      // Get user's rank if authenticated
      if (user) {
        const { data: userStats } = await supabase
          .from('leaderboard')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (userStats) {
          const { count } = await supabase
            .from('leaderboard')
            .select('*', { count: 'exact', head: true })
            .gt('total_points', userStats.total_points)

          userRank = (count || 0) + 1
        }
      }
    }

    // Format leaderboard data
    const formattedLeaderboard = leaderboard?.map((entry, index) => {
      const count = (type === 'knocks' ? entry.knock_count :
                    type === 'sales' ? entry.sales_count :
                    entry.total_points) || 0

      return {
        rank: index + 1,
        user_id: entry.user_id,
        name: entry.user_name || 'Unknown User',
        avatar_url: entry.avatar_url || null,
        role: null,
        points: count,
        level: Math.floor(count / 100) + 1,
        isCurrentUser: entry.user_id === user.id
      }
    }) || []

    return successResponse({
      period,
      type,
      leaderboard: formattedLeaderboard,
      currentUserRank: userRank
    }, 200, {
      'Cache-Control': 'private, max-age=30, stale-while-revalidate=60'
    })
  } catch (error) {
    logger.error('Leaderboard API error:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}