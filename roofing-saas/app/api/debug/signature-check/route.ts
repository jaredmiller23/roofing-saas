import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

/**
 * DEBUG ENDPOINT - REMOVE AFTER FIXING
 * GET /api/debug/signature-check?id=<document-id>
 *
 * This bypasses normal error handling to show exactly what's happening
 */
export async function GET(request: NextRequest) {
  const documentId = request.nextUrl.searchParams.get('id') || '6465e600-9206-41b5-925b-2c69703f34c4'

  const debug: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    documentId,
  }

  try {
    // Step 1: Get current user
    const user = await getCurrentUser()
    debug.step1_user = user ? {
      id: user.id,
      email: user.email,
      role: user.role,
    } : null

    if (!user) {
      debug.error = 'No authenticated user'
      return Response.json(debug, { status: 401 })
    }

    // Step 2: Get user's tenant via JS function
    const jsTenantId = await getUserTenantId(user.id)
    debug.step2_jsTenantId = jsTenantId

    // Step 3: Query tenant_users directly with admin client (bypasses RLS)
    const admin = await createAdminClient()
    const { data: tenantUserData, error: tenantUserError } = await admin
      .from('tenant_users')
      .select('tenant_id, role, status')
      .eq('user_id', user.id)

    debug.step3_tenantUsersAdmin = {
      data: tenantUserData,
      error: tenantUserError?.message || null
    }

    // Step 4: Get the document with admin client (bypasses RLS)
    const { data: docAdmin, error: docAdminError } = await admin
      .from('signature_documents')
      .select('id, tenant_id, status, is_deleted, title, created_at, project_id, contact_id')
      .eq('id', documentId)
      .single()

    debug.step4_documentAdmin = {
      data: docAdmin,
      error: docAdminError?.message || null
    }

    // Step 4b: Check if project exists (if project_id is set)
    if (docAdmin?.project_id) {
      const { data: projectData, error: projectError } = await admin
        .from('projects')
        .select('id, name, tenant_id')
        .eq('id', docAdmin.project_id)
        .single()
      debug.step4b_project = { data: projectData, error: projectError?.message || null }
    }

    // Step 4c: Check if contact exists (if contact_id is set)
    if (docAdmin?.contact_id) {
      const { data: contactData, error: contactError } = await admin
        .from('contacts')
        .select('id, first_name, last_name, tenant_id')
        .eq('id', docAdmin.contact_id)
        .single()
      debug.step4c_contact = { data: contactData, error: contactError?.message || null
      }
    }

    // Step 5: Check if tenants match
    if (docAdmin && jsTenantId) {
      debug.step5_tenantMatch = {
        userTenant: jsTenantId,
        documentTenant: docAdmin.tenant_id,
        match: jsTenantId === docAdmin.tenant_id
      }
    }

    // Step 6: Try query with regular client (WITH RLS) - simple
    const supabase = await createClient()
    const { data: docRLS, error: docRLSError } = await supabase
      .from('signature_documents')
      .select('id, tenant_id, status')
      .eq('id', documentId)
      .single()

    debug.step6_documentWithRLS = {
      data: docRLS,
      error: docRLSError?.message || null,
      code: docRLSError?.code || null
    }

    // Step 6b: Try the EXACT query from the actual route (WITH JOINS)
    const { data: docFullQuery, error: docFullQueryError } = await supabase
      .from('signature_documents')
      .select(`
        *,
        project:projects(id, name, address),
        contact:contacts(id, first_name, last_name, email, phone),
        signatures(*)
      `)
      .eq('id', documentId)
      .eq('tenant_id', jsTenantId)
      .or('is_deleted.eq.false,is_deleted.is.null')
      .single()

    debug.step6b_fullQueryWithJoins = {
      hasData: !!docFullQuery,
      error: docFullQueryError?.message || null,
      code: docFullQueryError?.code || null,
      hint: docFullQueryError?.hint || null,
      details: docFullQueryError?.details || null
    }

    // Step 7: Check what auth.uid() returns via RPC
    const { data: authUid, error: authUidError } = await supabase
      .rpc('get_auth_uid_debug')
      .single()

    debug.step7_authUid = {
      data: authUid,
      error: authUidError?.message || null
    }

    // Step 8: Check what get_user_tenant_id() returns via RPC
    const { data: pgTenantId, error: pgTenantError } = await supabase
      .rpc('get_user_tenant_id')

    debug.step8_pgTenantId = {
      data: pgTenantId,
      error: pgTenantError?.message || null
    }

    // Step 9: List all RLS policies on signature_documents
    const { data: policies, error: policiesError } = await admin
      .from('pg_policies')
      .select('policyname, cmd, qual')
      .eq('tablename', 'signature_documents')

    debug.step9_rlsPolicies = {
      data: policies,
      error: policiesError?.message || null
    }

    return Response.json(debug, { status: 200 })

  } catch (error) {
    debug.uncaughtError = error instanceof Error ? error.message : String(error)
    return Response.json(debug, { status: 500 })
  }
}
