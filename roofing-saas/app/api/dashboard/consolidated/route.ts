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

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { AuthenticationError, AuthorizationError } from '@/lib/api/errors'
import { errorResponse } from '@/lib/api/response'
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
    // Single auth check (saves 5 redundant auth checks)
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('Unauthorized')
    }

    const tenantId = await getUserTenantId(user.id)
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
      fetchUserInfoMap(supabase, tenantId),

      // Metrics (tier-appropriate)
      mode === 'field'
        ? getFieldMetrics(supabase, tenantId, user.id)
        : mode === 'manager'
          ? getManagerMetrics(supabase, tenantId, scope, user.id)
          : getFullMetrics(supabase, tenantId, scope, user.id),

      // Weekly challenge
      fetchWeeklyChallenge(supabase, tenantId, user.id),

      // User points
      fetchUserPoints(supabase, user.id)
    ])

    // Second parallel batch: queries that depend on userInfoMap
    const [
      activity,
      knockLeaderboard,
      salesLeaderboard,
    ] = await Promise.all([
      // Activity feed
      fetchActivityFeed(supabase, tenantId, userInfoMap),

      // Knock leaderboard (weekly)
      fetchLeaderboard(supabase, tenantId, user.id, 'knocks', 'weekly', 10, userInfoMap),

      // Sales leaderboard (weekly)
      fetchLeaderboard(supabase, tenantId, user.id, 'sales', 'weekly', 10, userInfoMap),
    ])

    const duration = Date.now() - startTime
    // Log performance
    if (duration > 2000) {
      console.warn(`[Dashboard Consolidated] Slow response: ${duration}ms`)
    } else {
      console.log(`[Dashboard Consolidated] Response time: ${duration}ms`)
    }

    // Return consolidated response
    return NextResponse.json(
      {
        success: true,
        data: {
          metrics,
          activity,
          challenge,
          knockLeaderboard,
          salesLeaderboard,
          points
        },
        meta: {
          latencyMs: duration,
          tier: mode,
          scope
        }
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60'
        }
      }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('Dashboard consolidated error:', error, `(${duration}ms)`)
    return errorResponse(error as Error)
  }
}
