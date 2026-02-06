import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { successResponse, errorResponse } from '@/lib/api/response'
import {
  getFieldMetrics,
  getManagerMetrics,
  getFullMetrics,
  type DashboardScope,
} from '@/lib/dashboard/metrics-queries'
import {
  type MetricsTier,
  TIER_CONFIGS,
  getCacheHeaders,
} from '@/lib/dashboard/metrics-types'

/**
 * Dashboard Metrics API
 * GET /api/dashboard/metrics
 *
 * Tier-aware metrics endpoint that delivers appropriate data based on UI mode:
 * - field: Personal stats only (mobile, <100ms)
 * - manager: Team overview + pipeline (tablet, <200ms)
 * - full: Complete analytics (desktop, <500ms)
 *
 * Query Parameters:
 * - mode: 'field' | 'manager' | 'full' (default: 'full')
 * - scope: 'company' | 'team' | 'personal' (default: 'company')
 */
export const GET = withAuth(async (request: NextRequest, { user, tenantId }) => {
  const startTime = Date.now()

  try {
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

    // Execute tier-appropriate queries
    let metrics
    switch (mode) {
      case 'field':
        metrics = await getFieldMetrics(supabase, tenantId, user.id)
        break
      case 'manager':
        metrics = await getManagerMetrics(supabase, tenantId, scope, user.id)
        break
      case 'full':
      default:
        metrics = await getFullMetrics(supabase, tenantId, scope, user.id)
    }

    const duration = Date.now() - startTime
    const tierConfig = TIER_CONFIGS[mode]

    // Log performance warning if exceeding target
    if (duration > tierConfig.targetLatencyMs) {
      console.warn(
        `[Dashboard Metrics] ${mode} tier exceeded target: ${duration}ms > ${tierConfig.targetLatencyMs}ms`
      )
    }

    // Return response with tier-appropriate cache headers
    return successResponse(
      {
        metrics,
        tier: mode,
        latencyMs: duration,
      },
      200,
      getCacheHeaders(mode)
    )
  } catch (error) {
    console.error('Dashboard metrics error:', error)
    return errorResponse(error as Error)
  }
})
