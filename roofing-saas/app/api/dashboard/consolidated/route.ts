/**
 * Consolidated Dashboard API
 *
 * GET /api/dashboard/consolidated
 *
 * Returns all dashboard data in a single request to eliminate
 * the cold start overhead of 6 separate serverless invocations.
 *
 * Performance target: <2 seconds (down from 5-10 seconds)
 *
 * Query Parameters:
 * - mode: 'field' | 'manager' | 'full' (default: 'full') - metrics tier
 * - scope: 'company' | 'team' | 'personal' (default: 'company') - data scope
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { AuthenticationError, AuthorizationError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import {
  getFieldMetrics,
  getManagerMetrics,
  getFullMetrics,
  fetchUserInfoMap,
  fetchActivityFeed,
  fetchWeeklyChallenge,
  fetchLeaderboard,
  fetchUserPoints,
  type DashboardScope,
} from '@/lib/dashboard/queries'
import { type MetricsTier } from '@/lib/dashboard/metrics-types'

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('Unauthorized')
    }
    const userId = user.id
    const tenantId = await getUserTenantId(userId)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    // Single Supabase client (saves 5 redundant client instantiations)
    const supabase = await createClient()

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const modeParam = searchParams.get('mode') || 'full'
    const scopeParam = searchParams.get('scope') || 'company'

    // Validate mode
    const validModes: MetricsTier[] = ['field', 'manager', 'full']
    const mode: MetricsTier = validModes.includes(modeParam as MetricsTier)
      ? (modeParam as MetricsTier)
      : 'full'

    // Validate scope
    const validScopes: DashboardScope[] = ['company', 'team', 'personal']
    const scope: DashboardScope = validScopes.includes(scopeParam as DashboardScope)
      ? (scopeParam as DashboardScope)
      : 'company'

    // Per-query timing for performance diagnosis
    const timings: Record<string, number> = {}
    const timed = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
      const start = Date.now()
      const result = await fn()
      timings[name] = Date.now() - start
      return result
    }

    // Execute user info map and metrics/data queries in parallel
    // userInfoMap is needed by activity feed and leaderboards, so fetch it
    // concurrently with metrics (which don't need it), then pass to dependents
    const [
      userInfoMap,
      metrics,
      challenge,
      points
    ] = await Promise.all([
      // User info map (shared across activity feed and leaderboards)
      timed('userInfoMap', () => fetchUserInfoMap(supabase, tenantId)),

      // Metrics (tier-appropriate)
      timed('metrics', () => mode === 'field'
        ? getFieldMetrics(supabase, tenantId, userId)
        : mode === 'manager'
          ? getManagerMetrics(supabase, tenantId, scope, userId)
          : getFullMetrics(supabase, tenantId, scope, userId)),

      // Weekly challenge
      timed('challenge', () => fetchWeeklyChallenge(supabase, tenantId, userId)),

      // User points
      timed('points', () => fetchUserPoints(supabase, userId))
    ])

    // Second parallel batch: queries that depend on userInfoMap
    const [
      activity,
      knockLeaderboard,
      salesLeaderboard,
    ] = await Promise.all([
      // Activity feed
      timed('activity', () => fetchActivityFeed(supabase, tenantId, userInfoMap)),

      // Knock leaderboard (weekly)
      timed('knockLeaderboard', () => fetchLeaderboard(supabase, tenantId, userId, 'knocks', 'weekly', 10, userInfoMap)),

      // Sales leaderboard (weekly)
      timed('salesLeaderboard', () => fetchLeaderboard(supabase, tenantId, userId, 'sales', 'weekly', 10, userInfoMap)),
    ])

    const duration = Date.now() - startTime
    // Log performance with per-query breakdown
    const timingStr = Object.entries(timings)
      .map(([k, v]) => `${k}=${v}ms`)
      .join(', ')
    if (duration > 2000) {
      console.warn(`[Dashboard Consolidated] Slow response: ${duration}ms | ${timingStr}`)
    } else {
      console.log(`[Dashboard Consolidated] Response time: ${duration}ms | ${timingStr}`)
    }

    // Return consolidated response (meta folded into data payload)
    return successResponse(
      {
        metrics,
        activity,
        challenge,
        knockLeaderboard,
        salesLeaderboard,
        points,
        meta: {
          latencyMs: duration,
          tier: mode,
          scope
        }
      },
      200,
      { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('Dashboard consolidated error:', error, `(${duration}ms)`)
    return errorResponse(error as Error)
  }
}
