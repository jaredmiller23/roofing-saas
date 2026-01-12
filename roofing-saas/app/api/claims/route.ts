import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  InternalError,
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import type { ClaimData } from '@/lib/claims/types'
import type { CreateClaimInput } from '@/lib/claims/intelligence-types'

/**
 * GET /api/claims
 * Get all claims for current tenant (optionally filtered by project)
 *
 * Query params:
 * - project_id: Filter by project (optional)
 * - status: Filter by status (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with any tenant')
    }

    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('project_id')
    const status = searchParams.get('status')

    const supabase = await createClient()

    // Build query with adjuster join
    let query = supabase
      .from('claims')
      .select(`
        *,
        insurance_personnel!adjuster_id (
          id,
          first_name,
          last_name,
          email,
          phone,
          carrier_id
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching claims', { error })
      throw InternalError('Failed to fetch claims')
    }

    // Transform to include adjuster_name
    const claimsWithAdjuster = (data || []).map((claim) => {
      const adjuster = claim.insurance_personnel as unknown as {
        id: string
        first_name: string
        last_name: string
        email?: string
        phone?: string
        carrier_id?: string
      } | null

      return {
        ...claim,
        adjuster_full_name: adjuster
          ? `${adjuster.first_name} ${adjuster.last_name}`
          : null,
        insurance_personnel: undefined,
      }
    })

    return successResponse({
      claims: claimsWithAdjuster as ClaimData[],
      total: data?.length || 0,
    })
  } catch (error) {
    logger.error('Error in GET /api/claims', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * POST /api/claims
 * Create a new claim with optional adjuster linking
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with any tenant')
    }

    const body: CreateClaimInput = await request.json()
    const supabase = await createClient()

    // Validate required fields
    if (!body.date_of_loss) {
      throw ValidationError('date_of_loss is required')
    }

    // If adjuster_id is provided, verify it exists
    if (body.adjuster_id) {
      const { data: adjuster } = await supabase
        .from('insurance_personnel')
        .select('id, first_name, last_name, email, phone')
        .eq('id', body.adjuster_id)
        .eq('tenant_id', tenantId)
        .single()

      if (!adjuster) {
        throw ValidationError('Invalid adjuster_id - adjuster not found')
      }

      // Auto-populate adjuster fields if not provided
      if (!body.adjuster_name) {
        body.adjuster_name = `${adjuster.first_name} ${adjuster.last_name}`
      }
      if (!body.adjuster_email && adjuster.email) {
        body.adjuster_email = adjuster.email
      }
      if (!body.adjuster_phone && adjuster.phone) {
        body.adjuster_phone = adjuster.phone
      }
    }

    // Create the claim
    const { data: newClaim, error: insertError } = await supabase
      .from('claims')
      .insert({
        tenant_id: tenantId,
        project_id: body.project_id || null,
        contact_id: body.contact_id || null,
        claim_number: body.claim_number || null,
        policy_number: body.policy_number || null,
        insurance_carrier: body.insurance_carrier || null,
        carrier_id: body.carrier_id || null,
        adjuster_id: body.adjuster_id || null,
        adjuster_name: body.adjuster_name || null,
        adjuster_email: body.adjuster_email || null,
        adjuster_phone: body.adjuster_phone || null,
        date_of_loss: body.date_of_loss,
        date_filed: body.date_filed || null,
        estimated_damage: body.estimated_damage || null,
        deductible: body.deductible || null,
        notes: body.notes || null,
        status: 'new',
        created_by: user.id,
      })
      .select(`
        *,
        insurance_personnel!adjuster_id (
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .single()

    if (insertError) {
      logger.error('Error creating claim:', { error: insertError })
      throw InternalError(`Failed to create claim: ${insertError.message}`)
    }

    logger.info('Claim created successfully', {
      claimId: newClaim.id,
      projectId: body.project_id,
      adjusterId: body.adjuster_id,
      userId: user.id,
    })

    // Transform response
    const adjuster = newClaim.insurance_personnel as unknown as {
      id: string
      first_name: string
      last_name: string
    } | null

    return successResponse({
      claim: {
        ...newClaim,
        adjuster_full_name: adjuster
          ? `${adjuster.first_name} ${adjuster.last_name}`
          : null,
        insurance_personnel: undefined,
      },
    })
  } catch (error) {
    logger.error('Error in POST /api/claims', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
