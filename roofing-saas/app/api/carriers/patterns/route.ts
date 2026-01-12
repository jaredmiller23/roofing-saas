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
import type { CarrierPattern, CarrierPatternType, PatternFrequency } from '@/lib/claims/intelligence-types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/carriers/patterns
 * Get all carrier patterns for the tenant
 * Optional filters: carrier_id, carrier_name, pattern_type
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
    const carrierName = searchParams.get('carrier_name')
    const patternType = searchParams.get('pattern_type')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('carrier_patterns')
      .select(
        `
        *,
        insurance_carriers!carrier_id (
          id,
          name,
          short_code
        )
      `,
        { count: 'exact' }
      )
      .eq('tenant_id', tenantId)
      .order('occurrence_count', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (carrierId) {
      query = query.eq('carrier_id', carrierId)
    }
    if (carrierName) {
      query = query.ilike('carrier_name', `%${carrierName}%`)
    }
    if (patternType) {
      query = query.eq('pattern_type', patternType)
    }

    const { data: patterns, error, count } = await query

    if (error) {
      logger.error('[API] Error fetching carrier patterns:', { error })
      throw InternalError('Failed to fetch carrier patterns')
    }

    // Transform to include resolved carrier name
    const transformedPatterns = (patterns || []).map((pattern) => {
      const carrier = pattern.insurance_carriers as unknown as {
        id: string
        name: string
        short_code: string
      } | null

      return {
        ...pattern,
        resolved_carrier_name: carrier?.name || pattern.carrier_name || 'Unknown',
        insurance_carriers: undefined,
      }
    })

    return successResponse({
      patterns: transformedPatterns,
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    logger.error('[API] Error in GET /api/carriers/patterns:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * POST /api/carriers/patterns
 * Create or increment a carrier pattern
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
      carrier_id,
      carrier_name,
      pattern_type,
      pattern_detail,
      frequency,
      successful_counter,
      notes,
    } = body

    // Validate required fields
    if (!pattern_type) {
      throw ValidationError('pattern_type is required')
    }
    if (!carrier_id && !carrier_name) {
      throw ValidationError('Either carrier_id or carrier_name is required')
    }

    // If carrier_name provided but not carrier_id, try to resolve
    let resolvedCarrierId = carrier_id
    let resolvedCarrierName = carrier_name

    if (!resolvedCarrierId && carrier_name) {
      const { data: existingCarrier } = await supabase
        .from('insurance_carriers')
        .select('id, name')
        .ilike('name', carrier_name)
        .single()

      if (existingCarrier) {
        resolvedCarrierId = existingCarrier.id
        resolvedCarrierName = existingCarrier.name
      }
    } else if (resolvedCarrierId && !resolvedCarrierName) {
      const { data: existingCarrier } = await supabase
        .from('insurance_carriers')
        .select('name')
        .eq('id', resolvedCarrierId)
        .single()

      resolvedCarrierName = existingCarrier?.name || null
    }

    // Check if this pattern already exists
    let existingQuery = supabase
      .from('carrier_patterns')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('pattern_type', pattern_type)

    if (resolvedCarrierId) {
      existingQuery = existingQuery.eq('carrier_id', resolvedCarrierId)
    } else {
      existingQuery = existingQuery.is('carrier_id', null)
      if (resolvedCarrierName) {
        existingQuery = existingQuery.ilike('carrier_name', resolvedCarrierName)
      }
    }

    if (pattern_detail) {
      existingQuery = existingQuery.eq('pattern_detail', pattern_detail)
    } else {
      existingQuery = existingQuery.is('pattern_detail', null)
    }

    const { data: existingPattern } = await existingQuery.single()

    let result: CarrierPattern

    if (existingPattern) {
      // Increment occurrence count and update fields
      const updateData: Record<string, unknown> = {
        occurrence_count: (existingPattern.occurrence_count || 1) + 1,
        updated_at: new Date().toISOString(),
      }

      // Update frequency if provided and different
      if (frequency && frequency !== existingPattern.frequency) {
        updateData.frequency = frequency
      }

      // Update successful_counter if provided
      if (successful_counter) {
        updateData.successful_counter = successful_counter
        // Increment success count if counter is being recorded
        updateData.counter_success_count =
          (existingPattern.counter_success_count || 0) + 1
      }

      // Append to notes if provided
      if (notes) {
        updateData.notes = existingPattern.notes
          ? `${existingPattern.notes}\n---\n${notes}`
          : notes
      }

      const { data: updated, error: updateError } = await supabase
        .from('carrier_patterns')
        .update(updateData)
        .eq('id', existingPattern.id)
        .select()
        .single()

      if (updateError) {
        logger.error('[API] Error updating carrier pattern:', {
          error: updateError,
        })
        throw InternalError(
          `Failed to update carrier pattern: ${updateError.message}`
        )
      }

      result = updated as CarrierPattern
      logger.debug('[API] Carrier pattern incremented:', {
        id: result.id,
        count: result.occurrence_count,
      })
    } else {
      // Create new pattern
      const { data: newPattern, error: insertError } = await supabase
        .from('carrier_patterns')
        .insert({
          tenant_id: tenantId,
          carrier_id: resolvedCarrierId || null,
          carrier_name: resolvedCarrierName || null,
          pattern_type: pattern_type as CarrierPatternType,
          pattern_detail: pattern_detail || null,
          frequency: (frequency as PatternFrequency) || 'sometimes',
          successful_counter: successful_counter || null,
          notes: notes || null,
          occurrence_count: 1,
          counter_success_count: 0,
        })
        .select()
        .single()

      if (insertError) {
        logger.error('[API] Error creating carrier pattern:', {
          error: insertError,
        })
        throw InternalError(
          `Failed to create carrier pattern: ${insertError.message}`
        )
      }

      result = newPattern as CarrierPattern
      logger.debug('[API] Carrier pattern created:', { id: result.id })
    }

    // Update carrier's known_issues if this is a coverage denial pattern
    if (
      resolvedCarrierId &&
      (pattern_type === 'denies_coverage' ||
        pattern_type === 'disputes_line_item') &&
      pattern_detail
    ) {
      const { data: carrierData } = await supabase
        .from('insurance_carriers')
        .select('known_issues')
        .eq('id', resolvedCarrierId)
        .single()

      const currentIssues = (carrierData?.known_issues as string[]) || []
      if (!currentIssues.includes(pattern_detail)) {
        await supabase
          .from('insurance_carriers')
          .update({
            known_issues: [...currentIssues, pattern_detail],
            last_updated: new Date().toISOString(),
          })
          .eq('id', resolvedCarrierId)
      }
    }

    return successResponse(result)
  } catch (error) {
    logger.error('[API] Error in POST /api/carriers/patterns:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * DELETE /api/carriers/patterns
 * Delete a specific carrier pattern (pattern_id in query params)
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with a tenant')
    }

    const patternId = request.nextUrl.searchParams.get('pattern_id')
    if (!patternId) {
      throw ValidationError('pattern_id query parameter is required')
    }

    const supabase = await createClient()

    // Delete the pattern
    const { error: deleteError } = await supabase
      .from('carrier_patterns')
      .delete()
      .eq('id', patternId)
      .eq('tenant_id', tenantId)

    if (deleteError) {
      logger.error('[API] Error deleting carrier pattern:', {
        error: deleteError,
      })
      throw InternalError(
        `Failed to delete carrier pattern: ${deleteError.message}`
      )
    }

    return successResponse({
      success: true,
      message: 'Carrier pattern deleted successfully',
    })
  } catch (error) {
    logger.error('[API] Error in DELETE /api/carriers/patterns:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
