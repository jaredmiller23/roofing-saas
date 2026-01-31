/**
 * GET /api/knowledge/analytics
 * Knowledge base search analytics
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with tenant')
    }

    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30', 10)

    const since = new Date()
    since.setDate(since.getDate() - days)

    // Total searches
    const { count: totalSearches } = await supabase
      .from('knowledge_search_queries')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', since.toISOString())

    // Average relevance score
    const { data: relevanceData } = await supabase
      .from('knowledge_search_queries')
      .select('relevance_score')
      .eq('tenant_id', tenantId)
      .gte('created_at', since.toISOString())
      .not('relevance_score', 'is', null)

    const avgRelevance = relevanceData && relevanceData.length > 0
      ? relevanceData.reduce((sum, r) => sum + (r.relevance_score || 0), 0) / relevanceData.length
      : 0

    // Helpfulness rate
    const { count: helpfulCount } = await supabase
      .from('knowledge_search_queries')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('was_helpful', true)
      .gte('created_at', since.toISOString())

    const { count: ratedCount } = await supabase
      .from('knowledge_search_queries')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .not('was_helpful', 'is', null)
      .gte('created_at', since.toISOString())

    const helpfulnessRate = ratedCount && ratedCount > 0
      ? (helpfulCount || 0) / ratedCount
      : null

    // Top queries (most recent, grouped by query text)
    const { data: recentQueries } = await supabase
      .from('knowledge_search_queries')
      .select('query_text, results_count, relevance_score, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(50)

    // Group by query text, count occurrences
    const queryMap = new Map<string, { count: number; avgResults: number; avgRelevance: number; lastUsed: string }>()
    for (const q of recentQueries || []) {
      const existing = queryMap.get(q.query_text)
      const resultsCount = q.results_count ?? 0
      const createdAt = q.created_at ?? ''
      if (existing) {
        existing.count++
        existing.avgResults += resultsCount
        existing.avgRelevance += q.relevance_score || 0
        if (createdAt > existing.lastUsed) existing.lastUsed = createdAt
      } else {
        queryMap.set(q.query_text, {
          count: 1,
          avgResults: resultsCount,
          avgRelevance: q.relevance_score || 0,
          lastUsed: createdAt,
        })
      }
    }

    const topQueries = Array.from(queryMap.entries())
      .map(([text, stats]) => ({
        query: text,
        count: stats.count,
        avgResults: Math.round(stats.avgResults / stats.count * 10) / 10,
        avgRelevance: Math.round(stats.avgRelevance / stats.count * 1000) / 1000,
        lastUsed: stats.lastUsed,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)

    return successResponse({
      period: { days, since: since.toISOString() },
      summary: {
        totalSearches: totalSearches || 0,
        avgRelevance: Math.round(avgRelevance * 1000) / 1000,
        helpfulnessRate,
        ratedSearches: ratedCount || 0,
      },
      topQueries,
    })
  } catch (error) {
    logger.error('Knowledge analytics error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
