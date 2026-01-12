import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  InternalError,
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import type { Adjuster } from '@/lib/claims/intelligence-types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/adjusters
 * List all adjusters (insurance_personnel) for the tenant
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with a tenant')
    }

    const supabase = await createClient()

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const carrierId = searchParams.get('carrier_id')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
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
          short_code
        )
      `,
        { count: 'exact' }
      )
      .eq('tenant_id', tenantId)
      .order('last_name', { ascending: true })
      .range(offset, offset + limit - 1)

    // Filter by carrier if specified
    if (carrierId) {
      query = query.eq('carrier_id', carrierId)
    }

    // Search by name
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%`
      )
    }

    const { data: adjusters, error, count } = await query

    if (error) {
      logger.error('[API] Error fetching adjusters:', { error })
      throw InternalError('Failed to fetch adjusters')
    }

    // Transform to include carrier_name
    const transformedAdjusters = (adjusters || []).map((adj) => {
      const carrier = adj.insurance_carriers as unknown as {
        id: string
        name: string
        short_code: string
      } | null
      return {
        ...adj,
        carrier_name: carrier?.name || null,
        insurance_carriers: undefined,
      }
    })

    return successResponse({
      adjusters: transformedAdjusters,
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    logger.error('[API] Error in GET /api/adjusters:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * POST /api/adjusters
 * Create a new adjuster (insurance_personnel)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with a tenant')
    }

    const supabase = await createClient()
    const body = await request.json()

    const {
      first_name,
      last_name,
      role,
      carrier_id,
      carrier_name,
      email,
      phone,
      notes,
    } = body

    // Validate required fields
    if (!first_name || !last_name) {
      throw ValidationError('first_name and last_name are required')
    }

    // If carrier_name is provided but not carrier_id, try to find or create carrier
    let resolvedCarrierId = carrier_id
    if (!resolvedCarrierId && carrier_name) {
      // Look up carrier by name
      const { data: existingCarrier } = await supabase
        .from('insurance_carriers')
        .select('id')
        .ilike('name', carrier_name)
        .single()

      if (existingCarrier) {
        resolvedCarrierId = existingCarrier.id
      }
      // If not found, we'll leave carrier_id null - carrier must be in master list
    }

    logger.debug('[API] Creating adjuster:', {
      first_name,
      last_name,
      carrier_id: resolvedCarrierId,
    })

    const { data: newAdjuster, error: insertError } = await supabase
      .from('insurance_personnel')
      .insert({
        tenant_id: tenantId,
        first_name,
        last_name,
        role: role || 'field_adjuster',
        carrier_id: resolvedCarrierId,
        email,
        phone,
        notes,
        total_claims_handled: 0,
      })
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

    if (insertError) {
      logger.error('[API] Error creating adjuster:', { error: insertError })
      throw InternalError(`Failed to create adjuster: ${insertError.message}`)
    }

    // Transform to include carrier_name
    const carrier = newAdjuster.insurance_carriers as unknown as {
      id: string
      name: string
      short_code: string
    } | null

    const result: Adjuster = {
      ...newAdjuster,
      carrier_name: carrier?.name || null,
    } as unknown as Adjuster

    logger.debug('[API] Adjuster created:', { id: newAdjuster.id })

    return successResponse(result)
  } catch (error) {
    logger.error('[API] Error in POST /api/adjusters:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
