import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuthParams, type AuthContext } from '@/lib/auth/with-auth'
import { logger } from '@/lib/logger'
import {
  ValidationError,
  NotFoundError,
  InternalError,
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import type { AdjusterPattern, AdjusterPatternType, PatternFrequency } from '@/lib/claims/intelligence-types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/adjusters/[id]/patterns
 * Get all patterns for an adjuster
 */
export const GET = withAuthParams(async (
  request: NextRequest,
  { tenantId }: AuthContext,
  { params }
) => {
  try {
    const { id } = await params
    if (!id) {
      throw ValidationError('Adjuster ID is required')
    }

    const supabase = await createClient()

    // Verify adjuster exists and belongs to tenant
    const { data: adjuster, error: adjError } = await supabase
      .from('insurance_personnel')
      .select('id, first_name, last_name')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (adjError || !adjuster) {
      throw NotFoundError('Adjuster not found')
    }

    // Get patterns
    const { data: patterns, error } = await supabase
      .from('adjuster_patterns')
      .select('*')
      .eq('adjuster_id', id)
      .eq('tenant_id', tenantId)
      .order('occurrence_count', { ascending: false })

    if (error) {
      logger.error('[API] Error fetching adjuster patterns:', { error })
      throw InternalError('Failed to fetch patterns')
    }

    return successResponse({
      adjuster: {
        id: adjuster.id,
        name: `${adjuster.first_name} ${adjuster.last_name}`,
      },
      patterns: patterns || [],
    })
  } catch (error) {
    logger.error('[API] Error in GET /api/adjusters/[id]/patterns:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

/**
 * POST /api/adjusters/[id]/patterns
 * Create or increment a pattern for an adjuster
 */
export const POST = withAuthParams(async (
  request: NextRequest,
  { tenantId }: AuthContext,
  { params }
) => {
  try {
    const { id } = await params
    if (!id) {
      throw ValidationError('Adjuster ID is required')
    }

    const supabase = await createClient()
    const body = await request.json()

    const {
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

    // Verify adjuster exists and belongs to tenant
    const { data: adjuster, error: adjError } = await supabase
      .from('insurance_personnel')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (adjError || !adjuster) {
      throw NotFoundError('Adjuster not found')
    }

    // Check if this pattern already exists
    let existingQuery = supabase
      .from('adjuster_patterns')
      .select('*')
      .eq('adjuster_id', id)
      .eq('tenant_id', tenantId)
      .eq('pattern_type', pattern_type)

    if (pattern_detail) {
      existingQuery = existingQuery.eq('pattern_detail', pattern_detail)
    } else {
      existingQuery = existingQuery.is('pattern_detail', null)
    }

    const { data: existingPattern } = await existingQuery.single()

    let result: AdjusterPattern

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
      }

      // Append to notes if provided
      if (notes) {
        updateData.notes = existingPattern.notes
          ? `${existingPattern.notes}\n---\n${notes}`
          : notes
      }

      const { data: updated, error: updateError } = await supabase
        .from('adjuster_patterns')
        .update(updateData)
        .eq('id', existingPattern.id)
        .select()
        .single()

      if (updateError) {
        logger.error('[API] Error updating pattern:', { error: updateError })
        throw InternalError(`Failed to update pattern: ${updateError.message}`)
      }

      result = updated as AdjusterPattern
      logger.debug('[API] Pattern incremented:', {
        id: result.id,
        count: result.occurrence_count,
      })
    } else {
      // Create new pattern
      const { data: newPattern, error: insertError } = await supabase
        .from('adjuster_patterns')
        .insert({
          tenant_id: tenantId,
          adjuster_id: id,
          pattern_type: pattern_type as AdjusterPatternType,
          pattern_detail: pattern_detail || null,
          frequency: (frequency as PatternFrequency) || 'sometimes',
          successful_counter: successful_counter || null,
          notes: notes || null,
          occurrence_count: 1,
        })
        .select()
        .single()

      if (insertError) {
        logger.error('[API] Error creating pattern:', { error: insertError })
        throw InternalError(`Failed to create pattern: ${insertError.message}`)
      }

      result = newPattern as AdjusterPattern
      logger.debug('[API] Pattern created:', { id: result.id })
    }

    // Update adjuster's common_omissions if this is an omit pattern
    if (pattern_type === 'omits_line_item' && pattern_detail) {
      const { data: adjData } = await supabase
        .from('insurance_personnel')
        .select('common_omissions')
        .eq('id', id)
        .single()

      const currentOmissions = (adjData?.common_omissions as string[]) || []
      if (!currentOmissions.includes(pattern_detail)) {
        await supabase
          .from('insurance_personnel')
          .update({
            common_omissions: [...currentOmissions, pattern_detail],
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
      }
    }

    return successResponse(result)
  } catch (error) {
    logger.error('[API] Error in POST /api/adjusters/[id]/patterns:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

/**
 * DELETE /api/adjusters/[id]/patterns
 * Delete a specific pattern (pattern_id in query params)
 */
export const DELETE = withAuthParams(async (
  request: NextRequest,
  { tenantId }: AuthContext,
  { params }
) => {
  try {
    const { id } = await params
    const patternId = request.nextUrl.searchParams.get('pattern_id')

    if (!id) {
      throw ValidationError('Adjuster ID is required')
    }
    if (!patternId) {
      throw ValidationError('pattern_id query parameter is required')
    }

    const supabase = await createClient()

    // Delete the pattern
    const { error: deleteError } = await supabase
      .from('adjuster_patterns')
      .delete()
      .eq('id', patternId)
      .eq('adjuster_id', id)
      .eq('tenant_id', tenantId)

    if (deleteError) {
      logger.error('[API] Error deleting pattern:', { error: deleteError })
      throw InternalError(`Failed to delete pattern: ${deleteError.message}`)
    }

    return successResponse({
      success: true,
      message: 'Pattern deleted successfully',
    })
  } catch (error) {
    logger.error('[API] Error in DELETE /api/adjusters/[id]/patterns:', {
      error,
    })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
