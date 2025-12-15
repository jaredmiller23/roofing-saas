import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { updateOrganizationSchema } from '@/lib/validations/organization'
import { NextRequest } from 'next/server'
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  mapSupabaseError,
  mapZodError,
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'

/**
 * GET /api/organizations/[id]
 * Get a single organization by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const { id: organizationId } = await params

  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('User not authenticated')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User is not associated with a tenant')
    }

    logger.apiRequest('GET', `/api/organizations/${organizationId}`, {
      tenantId,
      userId: user.id,
    })

    const supabase = await createClient()

    const { data: organization, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw NotFoundError('Organization not found')
      }
      throw mapSupabaseError(error)
    }

    const duration = Date.now() - startTime
    logger.apiResponse('GET', `/api/organizations/${organizationId}`, 200, duration)

    return successResponse({ organization })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Get organization error', { error, organizationId, duration })
    return errorResponse(error as Error)
  }
}

/**
 * PATCH /api/organizations/[id]
 * Update an organization
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const { id: organizationId } = await params

  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('User not authenticated')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User is not associated with a tenant')
    }

    logger.apiRequest('PATCH', `/api/organizations/${organizationId}`, {
      tenantId,
      userId: user.id,
    })

    const body = await request.json()

    // Validate input
    const validatedData = updateOrganizationSchema.safeParse({
      id: organizationId,
      ...body,
    })
    if (!validatedData.success) {
      throw mapZodError(validatedData.error)
    }

    const supabase = await createClient()

    // Check organization exists and belongs to tenant
    const { data: _existingOrganization, error: fetchError } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', organizationId)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw NotFoundError('Organization not found')
      }
      throw mapSupabaseError(fetchError)
    }

    // Update organization
    const { id: _id, ...updateData } = validatedData.data
    const { data: organization, error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      throw mapSupabaseError(error)
    }

    const duration = Date.now() - startTime
    logger.apiResponse('PATCH', `/api/organizations/${organizationId}`, 200, duration)
    logger.info('Organization updated', { organizationId, tenantId })

    return successResponse({ organization })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Update organization error', { error, organizationId, duration })
    return errorResponse(error as Error)
  }
}

/**
 * DELETE /api/organizations/[id]
 * Soft delete an organization
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const { id: organizationId } = await params

  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('User not authenticated')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User is not associated with a tenant')
    }

    logger.apiRequest('DELETE', `/api/organizations/${organizationId}`, {
      tenantId,
      userId: user.id,
    })

    const supabase = await createClient()

    // Check organization exists and belongs to tenant
    const { data: _existingOrganization, error: fetchError } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', organizationId)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw NotFoundError('Organization not found')
      }
      throw mapSupabaseError(fetchError)
    }

    // Soft delete organization
    const { error } = await supabase
      .from('organizations')
      .update({ is_deleted: true })
      .eq('id', organizationId)
      .eq('tenant_id', tenantId)

    if (error) {
      throw mapSupabaseError(error)
    }

    const duration = Date.now() - startTime
    logger.apiResponse('DELETE', `/api/organizations/${organizationId}`, 200, duration)
    logger.info('Organization deleted', { organizationId, tenantId })

    return successResponse({ message: 'Organization deleted successfully' })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Delete organization error', { error, organizationId, duration })
    return errorResponse(error as Error)
  }
}