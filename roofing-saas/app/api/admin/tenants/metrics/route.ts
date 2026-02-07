import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { createAdminClient } from '@/lib/supabase/server'
import { verifySystemAdmin } from '@/lib/auth/system-admin'
import { AuthorizationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/tenants/metrics
 * Aggregate business metrics across all tenants.
 * Security: Only system admins (owner of Clarity AI tenant) can access.
 */
export const GET = withAuth(async (_request: NextRequest, { user }) => {
  try {
    const isSystemAdmin = await verifySystemAdmin(user)
    if (!isSystemAdmin) {
      throw AuthorizationError('System admin access required')
    }

    const adminClient = await createAdminClient()

    // Fetch all tenants
    const { data: tenants, error: tenantsError } = await adminClient
      .from('tenants')
      .select('id, subscription_status, subscription_tier, is_active')

    if (tenantsError) {
      logger.error('Error fetching tenants for metrics', { error: tenantsError })
      throw InternalError('Failed to fetch tenant data')
    }

    // Fetch all subscriptions
    const { data: subscriptions, error: subsError } = await adminClient
      .from('subscriptions')
      .select('tenant_id, status, plan_tier, price_cents, billing_interval')
      .eq('is_deleted', false)

    if (subsError) {
      logger.error('Error fetching subscriptions for metrics', { error: subsError })
      throw InternalError('Failed to fetch subscription data')
    }

    // Fetch total users across all tenants
    const { data: allUsers, error: usersError } = await adminClient
      .from('tenant_users')
      .select('id')

    if (usersError) {
      logger.error('Error fetching users for metrics', { error: usersError })
      throw InternalError('Failed to fetch user data')
    }

    const totalTenants = tenants?.length || 0

    // Active tenants: those with an active subscription
    const activeSubs = (subscriptions || []).filter(s => s.status === 'active')
    const activeTenants = activeSubs.length

    // Trials active
    const trialsActive = (subscriptions || []).filter(s => s.status === 'trialing').length

    // MRR: sum of active subscription amounts, normalized to monthly
    // If billing_interval is 'year', divide by 12 for monthly contribution
    const mrrCents = activeSubs.reduce((sum, s) => {
      const monthlyCents = s.billing_interval === 'year'
        ? Math.round(s.price_cents / 12)
        : s.price_cents
      return sum + monthlyCents
    }, 0)

    // Plans breakdown
    const plansBreakdown: Record<string, number> = {
      starter: 0,
      professional: 0,
      enterprise: 0,
    }
    for (const sub of activeSubs) {
      const tier = sub.plan_tier?.toLowerCase()
      if (tier && tier in plansBreakdown) {
        plansBreakdown[tier]++
      }
    }

    return successResponse({
      total_tenants: totalTenants,
      active_tenants: activeTenants,
      total_users: allUsers?.length || 0,
      mrr: mrrCents / 100, // Convert to dollars
      trials_active: trialsActive,
      plans_breakdown: plansBreakdown,
    })
  } catch (error) {
    logger.error('Error in GET /api/admin/tenants/metrics', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
