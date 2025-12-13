import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { getCurrentUser, getUserTenantId, isAdmin } from '@/lib/auth/session'
import { AuthenticationError, AuthorizationError, NotFoundError, ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import type {
  Campaign,
  UpdateCampaignRequest,
  UpdateCampaignResponse,
} from '@/lib/campaigns/types'

/**
 * GET /api/campaigns/:id
 * Get single campaign by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with any tenant')
    }

    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error) {
      logger.error('Error fetching campaign', { error, campaignId: id })
      if (error.code === 'PGRST116') {
        throw NotFoundError('Campaign')
      }
      throw InternalError('Failed to fetch campaign')
    }

    return successResponse({ campaign: data as Campaign })
  } catch (error) {
    logger.error('Error in GET /api/campaigns/:id', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * PATCH /api/campaigns/:id
 * Update campaign (admin only)
 *
 * Body: UpdateCampaignRequest
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with any tenant')
    }

    const userIsAdmin = await isAdmin(user.id)
    if (!userIsAdmin) {
      throw AuthorizationError('Admin access required')
    }

    const { id } = await params
    const body: UpdateCampaignRequest = await request.json()

    // Build update object
    const updates: Record<string, unknown> = {}

    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.status !== undefined) updates.status = body.status
    if (body.goal_type !== undefined) updates.goal_type = body.goal_type
    if (body.goal_target !== undefined) updates.goal_target = body.goal_target
    if (body.allow_re_enrollment !== undefined)
      updates.allow_re_enrollment = body.allow_re_enrollment
    if (body.re_enrollment_delay_days !== undefined)
      updates.re_enrollment_delay_days = body.re_enrollment_delay_days
    if (body.respect_business_hours !== undefined)
      updates.respect_business_hours = body.respect_business_hours
    if (body.business_hours !== undefined)
      updates.business_hours = body.business_hours
    if (body.enrollment_type !== undefined)
      updates.enrollment_type = body.enrollment_type
    if (body.max_enrollments !== undefined)
      updates.max_enrollments = body.max_enrollments

    // Validate status if provided
    if (body.status !== undefined) {
      const validStatuses = ['draft', 'active', 'paused', 'archived']
      if (!validStatuses.includes(body.status)) {
        throw ValidationError('Invalid status value')
      }
    }

    // Validate goal_target if provided
    if (body.goal_target !== undefined && body.goal_target <= 0) {
      throw ValidationError('goal_target must be greater than 0')
    }

    if (Object.keys(updates).length === 0) {
      throw ValidationError('No fields to update')
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('campaigns')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      logger.error('Error updating campaign', { error, campaignId: id })
      if (error.code === 'PGRST116') {
        throw NotFoundError('Campaign')
      }
      throw InternalError('Failed to update campaign')
    }

    const response: UpdateCampaignResponse = {
      campaign: data as Campaign,
    }

    return successResponse(response)
  } catch (error) {
    logger.error('Error in PATCH /api/campaigns/:id', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * DELETE /api/campaigns/:id
 * Soft delete campaign (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with any tenant')
    }

    const userIsAdmin = await isAdmin(user.id)
    if (!userIsAdmin) {
      throw AuthorizationError('Admin access required')
    }

    const { id } = await params
    const supabase = await createClient()

    // Soft delete (set is_deleted = true) - only for this tenant's campaigns
    const { error } = await supabase
      .from('campaigns')
      .update({ is_deleted: true })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      logger.error('Error deleting campaign', { error, campaignId: id })
      throw InternalError('Failed to delete campaign')
    }

    return successResponse({ success: true })
  } catch (error) {
    logger.error('Error in DELETE /api/campaigns/:id', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
