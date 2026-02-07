/**
 * System Admin Verification
 *
 * Verifies that the requesting user is an owner of the Clarity AI Development
 * tenant, which is the SaaS operator tenant. Only these users can access
 * cross-tenant admin functionality like the Operator Dashboard.
 */

import { createAdminClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

/** The Clarity AI Development (operator) tenant ID */
const OPERATOR_TENANT_ID = '478d279b-5b8a-4040-a805-75d595d59702'

/**
 * Check if a user is a system admin (owner of the operator tenant).
 *
 * Uses createAdminClient to bypass RLS — this query crosses tenant boundaries
 * by design, since we need to check the user's role in a specific tenant
 * regardless of which tenant they are currently operating in.
 */
export async function verifySystemAdmin(user: User): Promise<boolean> {
  const adminClient = await createAdminClient()

  const { data } = await adminClient
    .from('tenant_users')
    .select('role')
    .eq('user_id', user.id)
    .eq('tenant_id', OPERATOR_TENANT_ID)
    .eq('role', 'owner')
    .single()

  return !!data
}
