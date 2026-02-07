import { NextRequest } from 'next/server'
import { withAuthParams } from '@/lib/auth/with-auth'
import { createAdminClient } from '@/lib/supabase/server'
import { verifySystemAdmin } from '@/lib/auth/system-admin'
import { AuthorizationError, InternalError, NotFoundError, ValidationError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const updateSchema = z.object({
  subscription_tier: z.enum(['starter', 'professional', 'enterprise']).optional(),
  name: z.string().min(1).optional(),
  onboarding_completed: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
})

/**
 * GET /api/admin/tenants/[id]
 * Get single tenant detail with users, subscription, and recent events.
 * Security: Only system admins (owner of Clarity AI tenant) can access.
 */
export const GET = withAuthParams(async (_request: NextRequest, { user }, { params }) => {
  try {
    const isSystemAdmin = await verifySystemAdmin(user)
    if (!isSystemAdmin) {
      throw AuthorizationError('System admin access required')
    }

    const { id } = await params
    const adminClient = await createAdminClient()

    // Fetch tenant
    const { data: tenant, error: tenantError } = await adminClient
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single()

    if (tenantError || !tenant) {
      throw NotFoundError('Tenant')
    }

    // Fetch subscription
    const { data: subscription } = await adminClient
      .from('subscriptions')
      .select('*')
      .eq('tenant_id', id)
      .eq('is_deleted', false)
      .single()

    // Fetch tenant users
    const { data: tenantUsers, error: usersError } = await adminClient
      .from('tenant_users')
      .select('id, user_id, role, status, joined_at, deactivated_at')
      .eq('tenant_id', id)
      .order('joined_at', { ascending: true })

    if (usersError) {
      logger.error('Error fetching tenant users', { error: usersError })
      throw InternalError('Failed to fetch tenant users')
    }

    // Get user details from auth.users
    const userIds = (tenantUsers || []).map(tu => tu.user_id)
    let authUserMap = new Map<string, { email: string; name: string | null; last_sign_in_at: string | null }>()

    if (userIds.length > 0) {
      const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers()
      if (!authError && authUsers) {
        authUserMap = new Map(
          authUsers.users
            .filter(u => userIds.includes(u.id))
            .map(u => [u.id, {
              email: u.email || '',
              name: (u.user_metadata?.name as string) || null,
              last_sign_in_at: u.last_sign_in_at || null,
            }])
        )
      }
    }

    const users = (tenantUsers || []).map(tu => {
      const authUser = authUserMap.get(tu.user_id) || { email: '', name: null, last_sign_in_at: null }
      return {
        id: tu.id,
        user_id: tu.user_id,
        email: authUser.email,
        name: authUser.name,
        role: tu.role ?? 'viewer',
        status: tu.status || 'active',
        joined_at: tu.joined_at,
        last_sign_in_at: authUser.last_sign_in_at,
        deactivated_at: tu.deactivated_at,
      }
    })

    // Fetch recent subscription events
    const { data: events } = await adminClient
      .from('subscription_events')
      .select('id, event_type, new_plan, new_status, previous_plan, previous_status, amount_cents, created_at, stripe_event_type')
      .eq('tenant_id', id)
      .order('created_at', { ascending: false })
      .limit(20)

    return successResponse({
      tenant,
      subscription: subscription || null,
      users,
      events: events || [],
    })
  } catch (error) {
    logger.error('Error in GET /api/admin/tenants/[id]', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

/**
 * PATCH /api/admin/tenants/[id]
 * Update tenant (manual plan override, name, onboarding status).
 * Security: Only system admins (owner of Clarity AI tenant) can access.
 */
export const PATCH = withAuthParams(async (request: NextRequest, { user }, { params }) => {
  try {
    const isSystemAdmin = await verifySystemAdmin(user)
    if (!isSystemAdmin) {
      throw AuthorizationError('System admin access required')
    }

    const { id } = await params
    const body = await request.json()
    const validation = updateSchema.safeParse(body)

    if (!validation.success) {
      throw ValidationError(validation.error.issues[0].message)
    }

    const adminClient = await createAdminClient()

    // Verify tenant exists
    const { data: existing, error: checkError } = await adminClient
      .from('tenants')
      .select('id')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      throw NotFoundError('Tenant')
    }

    const updates: Record<string, unknown> = {}
    if (validation.data.name !== undefined) updates.name = validation.data.name
    if (validation.data.onboarding_completed !== undefined) updates.onboarding_completed = validation.data.onboarding_completed
    if (validation.data.subscription_tier !== undefined) updates.subscription_tier = validation.data.subscription_tier

    const { data: updated, error: updateError } = await adminClient
      .from('tenants')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      logger.error('Error updating tenant', { error: updateError })
      throw InternalError('Failed to update tenant')
    }

    // If subscription_tier was changed, also update the subscriptions table
    if (validation.data.subscription_tier) {
      await adminClient
        .from('subscriptions')
        .update({
          plan_tier: validation.data.subscription_tier,
          plan_name: validation.data.subscription_tier.charAt(0).toUpperCase() + validation.data.subscription_tier.slice(1),
        })
        .eq('tenant_id', id)
        .eq('is_deleted', false)

      // Record the event
      await adminClient
        .from('subscription_events')
        .insert({
          tenant_id: id,
          event_type: 'plan_changed_manual',
          new_plan: validation.data.subscription_tier,
          initiated_by: 'system_admin',
          user_id: user.id,
        })
    }

    return successResponse({ tenant: updated })
  } catch (error) {
    logger.error('Error in PATCH /api/admin/tenants/[id]', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
