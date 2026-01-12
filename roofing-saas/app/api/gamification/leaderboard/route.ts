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
 * Returns a map of user_id -> {name, avatar_url}
 */
async function getUserInfoMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<Map<string, UserInfo>> {
  const { data: tenantUsers } = await supabase
    .from('tenant_users')
    .select(`
      user_id,
      users:user_id (
        email,
        raw_user_meta_data
      )
    `)
    .eq('tenant_id', tenantId)

  const userMap = new Map<string, UserInfo>()

  tenantUsers?.forEach((tu) => {
    const userData = tu.users as {
      email?: string
      raw_user_meta_data?: {
        first_name?: string
        last_name?: string
        full_name?: string
        name?: string
        avatar_url?: string
      }
    } | null

    const metadata = userData?.raw_user_meta_data || {}
    const firstName = metadata.first_name || ''
    const lastName = metadata.last_name || ''
    const fullName = metadata.full_name ||
                     metadata.name ||
                     `${firstName} ${lastName}`.trim() ||
                     userData?.email ||
                     'Unknown'

    userMap.set(tu.user_id, {
      name: fullName,
      avatar_url: metadata.avatar_url || null
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
      // Count door knock activities by user within tenant
      const { data: knockCounts, error } = await supabase
        .from('activities')
        .select('created_by')
        .eq('tenant_id', tenantId)
        .eq('type', 'door_knock')
        .gte('created_at', getDateByPeriod(period))

      if (error) {
        logger.error('Error fetching knock activities:', { error })
        throw InternalError('Failed to fetch knock leaderboard')
      }

      // Aggregate counts by user
      const countsByUser = new Map<string, number>()
      knockCounts?.forEach((activity) => {
        const userId = activity.created_by
        if (userId) {
          countsByUser.set(userId, (countsByUser.get(userId) || 0) + 1)
        }
      })

      // Build leaderboard using userInfoMap
      leaderboard = Array.from(countsByUser.entries())
        .map(([user_id, count]) => {
          const userInfo = userInfoMap.get(user_id)
          return {
            user_id,
            user_name: userInfo?.name || 'Unknown',
            knock_count: count,
            avatar_url: userInfo?.avatar_url || null
          }
        })
        .sort((a, b) => (b.knock_count || 0) - (a.knock_count || 0))
        .slice(0, limit)

      userCount = countsByUser.get(user.id) || 0
      if (userCount > 0) {
        const usersWithMoreKnocks = Array.from(countsByUser.values()).filter(count => count > userCount).length
        userRank = usersWithMoreKnocks + 1
      }
    } else if (type === 'sales') {
      // Count won projects by user within tenant
      const { data: salesCounts, error } = await supabase
        .from('projects')
        .select('created_by')
        .eq('tenant_id', tenantId)
        .eq('status', 'won')
        .gte('updated_at', getDateByPeriod(period))

      if (error) {
        logger.error('Error fetching sales:', { error })
        throw InternalError('Failed to fetch sales leaderboard')
      }

      // Aggregate counts by user
      const countsByUser = new Map<string, number>()
      salesCounts?.forEach((project) => {
        const userId = project.created_by
        if (userId) {
          countsByUser.set(userId, (countsByUser.get(userId) || 0) + 1)
        }
      })

      // Build leaderboard using userInfoMap
      leaderboard = Array.from(countsByUser.entries())
        .map(([user_id, count]) => {
          const userInfo = userInfoMap.get(user_id)
          return {
            user_id,
            user_name: userInfo?.name || 'Unknown',
            sales_count: count,
            avatar_url: userInfo?.avatar_url || null
          }
        })
        .sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0))
        .slice(0, limit)

      userCount = countsByUser.get(user.id) || 0
      if (userCount > 0) {
        const usersWithMoreSales = Array.from(countsByUser.values()).filter(count => count > userCount).length
        userRank = usersWithMoreSales + 1
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
    })
  } catch (error) {
    logger.error('Leaderboard API error:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}