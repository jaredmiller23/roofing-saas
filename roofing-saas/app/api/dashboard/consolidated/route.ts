/**
 * Consolidated Dashboard API
 *
 * GET /api/dashboard/consolidated
 *
 * Returns all dashboard data in a single request.
 *
 * Uses a single RPC call (get_dashboard_all) to fetch everything from the
 * database in one round trip, replacing 17+ separate HTTP requests.
 *
 * Performance target: <500ms API response (was 10-15s with multi-query approach)
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

    // Start todaysJobs query in parallel with RPC (fast indexed query)
    const todaysJobsPromise = (async () => {
      try {
        const today = new Date().toISOString().split('T')[0]
        const { data: jobs } = await supabase
          .from('jobs')
          .select(`
            id,
            project_id,
            scheduled_start_time,
            status,
            projects (
              name,
              contact:contact_id (
                address_street,
                address_city,
                phone,
                mobile_phone
              )
            )
          `)
          .eq('scheduled_date', today)
          .in('status', ['scheduled', 'in_progress'])
          .eq('is_deleted', false)
          .not('project_id', 'is', null)
          .or(`crew_lead.eq.${userId},crew_members.cs.{${userId}}`)
          .order('scheduled_start_time', { ascending: true })
          .limit(10)

        if (!jobs) return []

        return jobs.map((job) => {
          const project = job.projects as unknown as {
            name: string
            contact: {
              address_street: string | null
              address_city: string | null
              phone: string | null
              mobile_phone: string | null
            } | null
          } | null

          const contact = project?.contact
          const time = job.scheduled_start_time
          let scheduledTime = 'No time set'
          if (time) {
            const parts = time.split(':')
            const h = parseInt(parts[0])
            const m = parts[1]
            scheduledTime = `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m} ${h >= 12 ? 'PM' : 'AM'}`
          }

          return {
            id: job.id,
            projectId: job.project_id ?? '',
            projectName: project?.name || 'Unnamed Project',
            address: contact?.address_street || '',
            city: contact?.address_city ?? undefined,
            scheduledTime,
            status: job.status as 'scheduled' | 'in_progress' | 'completed',
            contactPhone: contact?.phone || contact?.mobile_phone || undefined,
          }
        })
      } catch {
        return []
      }
    })()

    // === PRIMARY PATH: Single RPC call (1 HTTP round trip) ===
    const rpcStart = Date.now()
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_dashboard_all', {
      p_tenant_id: tenantId,
      p_user_id: userId,
      p_scope: scope,
      p_mode: mode,
    })
    const rpcDuration = Date.now() - rpcStart

    // Await todaysJobs (started in parallel with RPC)
    const todaysJobs = await todaysJobsPromise

    if (!rpcError && rpcData) {
      const duration = Date.now() - startTime
      console.log(`[Dashboard Consolidated] Single RPC: ${rpcDuration}ms | Total: ${duration}ms`)

      return successResponse(
        {
          ...rpcData,
          todaysJobs,
          meta: {
            latencyMs: duration,
            tier: mode,
            scope,
          }
        },
        200,
        { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' }
      )
    }

    // === FALLBACK PATH: Multi-query approach (if RPC unavailable) ===
    console.warn(`[Dashboard Consolidated] RPC failed (${rpcDuration}ms), falling back to multi-query:`, rpcError?.message)

    const timings: Record<string, number> = {}
    const timed = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
      const start = Date.now()
      const result = await fn()
      timings[name] = Date.now() - start
      return result
    }

    const [
      userInfoMap,
      metrics,
      challenge,
      points
    ] = await Promise.all([
      timed('userInfoMap', () => fetchUserInfoMap(supabase, tenantId)),
      timed('metrics', () => mode === 'field'
        ? getFieldMetrics(supabase, tenantId, userId)
        : mode === 'manager'
          ? getManagerMetrics(supabase, tenantId, scope, userId)
          : getFullMetrics(supabase, tenantId, scope, userId)),
      timed('challenge', () => fetchWeeklyChallenge(supabase, tenantId, userId)),
      timed('points', () => fetchUserPoints(supabase, userId))
    ])

    const [
      activity,
      knockLeaderboard,
      salesLeaderboard,
    ] = await Promise.all([
      timed('activity', () => fetchActivityFeed(supabase, tenantId, userInfoMap)),
      timed('knockLeaderboard', () => fetchLeaderboard(supabase, tenantId, userId, 'knocks', 'weekly', 10, userInfoMap)),
      timed('salesLeaderboard', () => fetchLeaderboard(supabase, tenantId, userId, 'sales', 'weekly', 10, userInfoMap)),
    ])

    const duration = Date.now() - startTime
    const timingStr = Object.entries(timings)
      .map(([k, v]) => `${k}=${v}ms`)
      .join(', ')
    if (duration > 2000) {
      console.warn(`[Dashboard Consolidated] Slow fallback: ${duration}ms | ${timingStr}`)
    } else {
      console.log(`[Dashboard Consolidated] Fallback: ${duration}ms | ${timingStr}`)
    }

    return successResponse(
      {
        metrics,
        activity,
        challenge,
        knockLeaderboard,
        salesLeaderboard,
        points,
        todaysJobs,
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
