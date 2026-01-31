import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  InternalError,
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import type { Adjuster } from '@/lib/claims/intelligence-types'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/adjusters/[id]
 * Get a single adjuster with their patterns
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with a tenant')
    }

    const { id } = await params
    if (!id) {
      throw ValidationError('Adjuster ID is required')
    }

    const supabase = await createClient()

    // Get adjuster with carrier info
    const { data: adjuster, error } = await supabase
      .from('insurance_personnel')
      .select(
        `
        id,
        tenant_id,
        first_name,
        last_name,
        role,
        carrier_id,
        email,
        phone,
        total_claims_handled,
        avg_response_days,
        avg_claim_approval_rate,
        avg_supplement_approval_rate,
        common_omissions,
        communication_style,
        notes,
        tips,
        created_at,
        updated_at,
        last_interaction_at,
        insurance_carriers!carrier_id (
          id,
          name,
          short_code,
          claims_phone,
          claims_email
        )
      `
      )
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !adjuster) {
      throw NotFoundError('Adjuster not found')
    }

    // Get patterns for this adjuster
    const { data: patterns } = await supabase
      .from('adjuster_patterns')
      .select('*')
      .eq('adjuster_id', id)
      .eq('tenant_id', tenantId)
      .order('occurrence_count', { ascending: false })

    // Get recent claims handled by this adjuster
    const { data: recentClaims } = await supabase
      .from('claims')
      .select(
        `
        id,
        claim_number,
        status,
        date_of_loss,
        approved_amount,
        paid_amount,
        projects!project_id (
          id,
          name,
          contacts!contact_id (
            first_name,
            last_name
          )
        )
      `
      )
      .eq('adjuster_id', id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Transform to include carrier_name
    const carrier = adjuster.insurance_carriers as unknown as {
      id: string
      name: string
      short_code: string
      claims_phone?: string
      claims_email?: string
    } | null

    const result: Adjuster & {
      patterns: unknown[]
      recent_claims: unknown[]
      carrier_details: unknown
    } = {
      ...adjuster,
      carrier_name: carrier?.name || null,
      carrier_details: carrier,
      patterns: patterns || [],
      recent_claims: recentClaims || [],
    } as unknown as Adjuster & {
      patterns: unknown[]
      recent_claims: unknown[]
      carrier_details: unknown
    }

    return successResponse(result)
  } catch (error) {
    logger.error('[API] Error in GET /api/adjusters/[id]:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * PATCH /api/adjusters/[id]
 * Update an adjuster
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with a tenant')
    }

    const { id } = await params
    if (!id) {
      throw ValidationError('Adjuster ID is required')
    }

    const supabase = await createClient()
    const body = await request.json()

    // Check if adjuster exists and belongs to tenant
    const { data: existing, error: fetchError } = await supabase
      .from('insurance_personnel')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !existing) {
      throw NotFoundError('Adjuster not found')
    }

    // Build update object
    const updateData: Record<string, unknown> = {}
    const allowedFields = [
      'first_name',
      'last_name',
      'role',
      'carrier_id',
      'email',
      'phone',
      'notes',
      'tips',
      'common_omissions',
      'communication_style',
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw ValidationError('No valid fields to update')
    }

    updateData.updated_at = new Date().toISOString()

    const { data: updatedAdjuster, error: updateError } = await supabase
      .from('insurance_personnel')
      .update(updateData)
      .eq('id', id)
      .select(
        `
        id,
        tenant_id,
        first_name,
        last_name,
        role,
        carrier_id,
        email,
        phone,
        total_claims_handled,
        avg_response_days,
        avg_claim_approval_rate,
        avg_supplement_approval_rate,
        common_omissions,
        communication_style,
        notes,
        tips,
        created_at,
        updated_at,
        last_interaction_at,
        insurance_carriers!carrier_id (
          id,
          name,
          short_code
        )
      `
      )
      .single()

    if (updateError) {
      logger.error('[API] Error updating adjuster:', { error: updateError })
      throw InternalError(`Failed to update adjuster: ${updateError.message}`)
    }

    // Transform to include carrier_name
    const carrier = updatedAdjuster.insurance_carriers as unknown as {
      id: string
      name: string
      short_code: string
    } | null

    const result: Adjuster = {
      ...updatedAdjuster,
      carrier_name: carrier?.name || null,
    } as unknown as Adjuster

    return successResponse(result)
  } catch (error) {
    logger.error('[API] Error in PATCH /api/adjusters/[id]:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * DELETE /api/adjusters/[id]
 * Delete an adjuster (soft delete if supported, otherwise hard delete)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with a tenant')
    }

    const { id } = await params
    if (!id) {
      throw ValidationError('Adjuster ID is required')
    }

    const supabase = await createClient()

    // Check if adjuster exists and belongs to tenant
    const { data: existing, error: fetchError } = await supabase
      .from('insurance_personnel')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !existing) {
      throw NotFoundError('Adjuster not found')
    }

    // Delete associated patterns first
    await supabase
      .from('adjuster_patterns')
      .delete()
      .eq('adjuster_id', id)
      .eq('tenant_id', tenantId)

    // Delete the adjuster
    const { error: deleteError } = await supabase
      .from('insurance_personnel')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (deleteError) {
      logger.error('[API] Error deleting adjuster:', { error: deleteError })
      throw InternalError(`Failed to delete adjuster: ${deleteError.message}`)
    }

    return successResponse(null)
  } catch (error) {
    logger.error('[API] Error in DELETE /api/adjusters/[id]:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
