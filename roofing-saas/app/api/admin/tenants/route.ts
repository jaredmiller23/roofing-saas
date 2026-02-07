import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { createAdminClient } from '@/lib/supabase/server'
import { verifySystemAdmin } from '@/lib/auth/system-admin'
import { AuthorizationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/tenants
 * List all tenants with subscription info.
 * Security: Only system admins (owner of Clarity AI tenant) can access.
 */
export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    const isSystemAdmin = await verifySystemAdmin(user)
    if (!isSystemAdmin) {
      throw AuthorizationError('System admin access required')
    }

    const adminClient = await createAdminClient()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    // Fetch all tenants
    let tenantsQuery = adminClient
      .from('tenants')
      .select('id, name, subscription_tier, subscription_status, onboarding_completed, created_at, is_active')
      .order('created_at', { ascending: false })

    if (search) {
      tenantsQuery = tenantsQuery.ilike('name', `%${search}%`)
    }

    const { data: tenants, error: tenantsError } = await tenantsQuery

    if (tenantsError) {
      logger.error('Error fetching tenants', { error: tenantsError })
      throw InternalError('Failed to fetch tenants')
    }

    if (!tenants || tenants.length === 0) {
      return successResponse({ tenants: [] })
    }

    // Fetch subscriptions for all tenants
    const tenantIds = tenants.map(t => t.id)
    const { data: subscriptions, error: subError } = await adminClient
      .from('subscriptions')
      .select('tenant_id, plan_tier, status, price_cents, trial_ends_at, billing_interval, stripe_customer_id')
      .in('tenant_id', tenantIds)
      .eq('is_deleted', false)

    if (subError) {
      logger.error('Error fetching subscriptions', { error: subError })
      throw InternalError('Failed to fetch subscription data')
    }

    // Fetch user counts per tenant
    const { data: userCounts, error: userCountError } = await adminClient
      .from('tenant_users')
      .select('tenant_id')
      .in('tenant_id', tenantIds)

    if (userCountError) {
      logger.error('Error fetching user counts', { error: userCountError })
      throw InternalError('Failed to fetch user counts')
    }

    // Build user count map
    const userCountMap = new Map<string, number>()
    for (const tu of userCounts || []) {
      userCountMap.set(tu.tenant_id, (userCountMap.get(tu.tenant_id) || 0) + 1)
    }

    // Build subscription map
    const subMap = new Map(
      (subscriptions || []).map(s => [s.tenant_id, s])
    )

    // Combine
    const tenantsWithInfo = tenants.map(tenant => ({
      id: tenant.id,
      name: tenant.name,
      subscription_tier: tenant.subscription_tier || subMap.get(tenant.id)?.plan_tier || null,
      subscription_status: tenant.subscription_status || subMap.get(tenant.id)?.status || null,
      user_count: userCountMap.get(tenant.id) || 0,
      created_at: tenant.created_at,
      onboarding_completed: tenant.onboarding_completed ?? false,
      is_active: tenant.is_active ?? true,
    }))

    return successResponse({ tenants: tenantsWithInfo })
  } catch (error) {
    logger.error('Error in GET /api/admin/tenants', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
