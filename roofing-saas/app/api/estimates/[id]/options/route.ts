import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuthParams } from '@/lib/auth/with-auth'
import { AuthorizationError, InternalError, NotFoundError, ValidationError } from '@/lib/api/errors'
import { successResponse, errorResponse, createdResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import {
  calculateQuoteOptionTotals
} from '@/lib/types/quote-option'

/**
 * Quote Options API for Estimates (Projects)
 * GET /api/estimates/[id]/options - List quote options for an estimate
 * POST /api/estimates/[id]/options - Create new quote option
 * PATCH /api/estimates/[id]/options - Update quote option
 * DELETE /api/estimates/[id]/options - Delete quote option
 */

// Validation schemas
// Accept both `is_selected` (DB column) and `is_recommended` (app layer)
const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  unit_price: z.number().min(0, 'Unit price must be non-negative'),
  category: z.enum(['materials', 'labor', 'equipment', 'permits', 'other'])
})

const createQuoteOptionSchema = z.object({
  name: z.string().min(1, 'Option name is required').max(100),
  description: z.string().optional(),
  is_selected: z.boolean().optional().default(false),
  is_recommended: z.boolean().optional(),
  line_items: z.array(lineItemSchema).min(1, 'At least one line item is required')
})

const updateQuoteOptionSchema = z.object({
  id: z.string().uuid('Invalid option ID'),
  name: z.string().min(1, 'Option name is required').max(100).optional(),
  description: z.string().optional(),
  is_selected: z.boolean().optional(),
  is_recommended: z.boolean().optional(),
  line_items: z.array(lineItemSchema).min(1).optional()
})

/**
 * Resolve is_recommended (app) -> is_selected (DB).
 * If is_recommended is provided, use it; otherwise fall back to is_selected.
 */
function resolveIsSelected(data: { is_recommended?: boolean; is_selected?: boolean }): boolean {
  return data.is_recommended ?? data.is_selected ?? false
}

// GET - List quote options for a project/estimate
export const GET = withAuthParams(async (
  _request: NextRequest,
  { tenantId },
  { params }
) => {
  try {
    const { id: projectId } = await params
    const supabase = await createClient()

    // First verify the project exists and belongs to the tenant
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, tenant_id')
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .single()

    if (projectError || !project) {
      throw NotFoundError('Project')
    }

    // Get quote options for this project
    // Cast needed: generated types don't declare the quote_options → quote_line_items FK relationship
    const { data: options, error } = await supabase
      .from('quote_options')
      .select(`
        id,
        project_id,
        name,
        description,
        is_selected,
        subtotal,
        created_at,
        updated_at,
        quote_line_items (
          id,
          description,
          quantity,
          unit,
          unit_price,
          total_price,
          category
        )
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true }) as unknown as { data: Array<{
        id: string
        project_id: string | null
        name: string
        description: string | null
        is_selected: boolean | null
        subtotal: number | null
        created_at: string | null
        updated_at: string | null
        quote_line_items: Array<{
          id: string
          description: string
          quantity: number | null
          unit: string | null
          unit_price: number | null
          total_price: number | null
          category: string | null
          is_deleted?: boolean
        }>
      }> | null; error: { message: string } | null }

    if (error) {
      logger.error('Quote options fetch error', { error, projectId })
      throw InternalError('Failed to fetch quote options')
    }

    // Transform the data to match our expected structure
    // Map DB `is_selected` to app-layer `is_recommended`
    // Filter out soft-deleted line items
    const transformedOptions = options?.map(option => ({
      ...option,
      is_recommended: option.is_selected,
      line_items: (option.quote_line_items || []).filter(
        (li: Record<string, unknown>) => !li.is_deleted
      )
    })) || []

    return successResponse({
      options: transformedOptions,
      project_id: projectId
    })

  } catch (error) {
    logger.error('Error in GET /api/estimates/[id]/options', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

// POST - Create new quote option
export const POST = withAuthParams(async (
  request: NextRequest,
  { tenantId },
  { params }
) => {
  try {
    const { id: projectId } = await params
    const body = await request.json()

    // Validate input
    const validationResult = createQuoteOptionSchema.safeParse(body)
    if (!validationResult.success) {
      throw ValidationError('Invalid input', validationResult.error.issues)
    }

    const data = validationResult.data
    const supabase = await createClient()

    // Verify project exists and belongs to tenant
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, tenant_id')
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .single()

    if (projectError || !project) {
      throw NotFoundError('Project')
    }

    // Calculate totals from line items
    const { subtotal } = calculateQuoteOptionTotals(
      data.line_items,
      0
    )

    // Create the quote option
    const { data: quoteOption, error: optionError } = await supabase
      .from('quote_options')
      .insert({
        tenant_id: tenantId,
        project_id: projectId,
        name: data.name,
        description: data.description,
        is_selected: resolveIsSelected(data),
        subtotal,
      })
      .select()
      .single()

    if (optionError) {
      logger.error('Quote option creation error', { error: optionError, data })
      throw InternalError('Failed to create quote option')
    }

    // Create line items (include tenant_id for RLS)
    const lineItemsWithTotals = data.line_items.map(item => ({
      tenant_id: tenantId,
      quote_option_id: quoteOption.id,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      total_price: item.quantity * item.unit_price,
      category: item.category
    }))

    const { error: lineItemsError } = await supabase
      .from('quote_line_items')
      .insert(lineItemsWithTotals)

    if (lineItemsError) {
      logger.error('Line items creation error', { error: lineItemsError, lineItemsWithTotals })
      // Mark the quote option as deleted if line items failed
      await supabase
        .from('quote_options')
        .update({ is_deleted: true })
        .eq('id', quoteOption.id)

      throw InternalError('Failed to create line items')
    }

    // Fetch the complete quote option with line items
    const { data: completeOption, error: fetchError } = await supabase
      .from('quote_options')
      .select(`
        *,
        quote_line_items (*)
      `)
      .eq('id', quoteOption.id)
      .single()

    if (fetchError) {
      logger.error('Complete option fetch error', { error: fetchError, optionId: quoteOption.id })
      throw InternalError('Failed to fetch created option')
    }

    return createdResponse({
      option: {
        ...completeOption,
        is_recommended: completeOption.is_selected,
        line_items: completeOption.quote_line_items || []
      }
    })

  } catch (error) {
    logger.error('Error in POST /api/estimates/[id]/options', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

// PATCH - Update quote option
export const PATCH = withAuthParams(async (
  request: NextRequest,
  { tenantId },
  { params }
) => {
  try {
    const { id: projectId } = await params
    const body = await request.json()

    // Validate input
    const validationResult = updateQuoteOptionSchema.safeParse(body)
    if (!validationResult.success) {
      throw ValidationError('Invalid input', validationResult.error.issues)
    }

    const data = validationResult.data
    const supabase = await createClient()

    // Verify project and option exist
    const { data: option, error: optionError } = await supabase
      .from('quote_options')
      .select('id, project_id')
      .eq('id', data.id)
      .eq('project_id', projectId)
      .single()

    if (optionError || !option) {
      throw NotFoundError('Quote option')
    }

    // Verify project belongs to tenant
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('tenant_id')
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .single()

    if (projectError || !project) {
      throw AuthorizationError('Project not found or access denied')
    }

    // Map is_recommended (app) to is_selected (DB) if provided
    let updateData: Record<string, unknown> = {
      name: data.name,
      description: data.description,
      is_selected: resolveIsSelected(data),
    }

    if (data.line_items) {
      const { subtotal } = calculateQuoteOptionTotals(
        data.line_items,
        0
      )

      updateData = {
        ...updateData,
        subtotal,
      }

      // Atomic line items update: insert new items first, then delete old ones.
      // This prevents data loss if the insert fails.
      const lineItemsWithTotals = data.line_items.map((item: z.infer<typeof lineItemSchema>) => ({
        tenant_id: tenantId,
        quote_option_id: data.id,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
        category: item.category
      }))

      // Step 1: Capture existing (non-deleted) line item IDs before insert
      const { data: existingItems } = await supabase
        .from('quote_line_items')
        .select('id')
        .eq('quote_option_id', data.id)
        .eq('is_deleted', false)

      const existingIds = (existingItems || []).map(item => item.id)

      // Step 2: Insert new line items
      const { error: lineItemsError } = await supabase
        .from('quote_line_items')
        .insert(lineItemsWithTotals)

      if (lineItemsError) {
        logger.error('Line items insert error during update', { error: lineItemsError, lineItemsWithTotals })
        throw InternalError('Failed to update line items')
      }

      // Step 3: Only after successful insert, soft-delete the old line items
      if (existingIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('quote_line_items')
          .update({ is_deleted: true })
          .in('id', existingIds)

        if (deleteError) {
          logger.error('Failed to soft-delete old line items', { error: deleteError, existingIds })
          // Non-fatal: new items were inserted successfully, old ones will be cleaned up
        }
      }
    }

    // Update the quote option
    const { data: updatedOption, error: updateError } = await supabase
      .from('quote_options')
      .update(updateData)
      .eq('id', data.id)
      .select(`
        *,
        quote_line_items (*)
      `)
      .single()

    if (updateError) {
      logger.error('Quote option update error', { error: updateError, updateData })
      throw InternalError('Failed to update quote option')
    }

    return successResponse({
      option: {
        ...updatedOption,
        is_recommended: updatedOption.is_selected,
        line_items: updatedOption.quote_line_items || []
      }
    })

  } catch (error) {
    logger.error('Error in PATCH /api/estimates/[id]/options', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

// DELETE - Delete quote option
export const DELETE = withAuthParams(async (
  request: NextRequest,
  { tenantId },
  { params }
) => {
  try {
    const { id: projectId } = await params
    const url = new URL(request.url)
    const optionId = url.searchParams.get('option_id')

    if (!optionId) {
      throw ValidationError('Missing option_id parameter')
    }

    const supabase = await createClient()

    // Verify project belongs to tenant and option belongs to project
    const { data: option, error: optionError } = await supabase
      .from('quote_options')
      .select(`
        id,
        project_id,
        projects!inner (
          tenant_id
        )
      `)
      .eq('id', optionId)
      .eq('project_id', projectId)
      .eq('projects.tenant_id', tenantId)
      .single()

    if (optionError || !option) {
      throw NotFoundError('Quote option')
    }

    // Soft-delete line items first
    await supabase
      .from('quote_line_items')
      .update({ is_deleted: true })
      .eq('quote_option_id', optionId)

    // Soft-delete the quote option
    const { error: deleteError } = await supabase
      .from('quote_options')
      .update({ is_deleted: true })
      .eq('id', optionId)

    if (deleteError) {
      logger.error('Quote option deletion error', { error: deleteError, optionId })
      throw InternalError('Failed to delete quote option')
    }

    return successResponse(null)

  } catch (error) {
    logger.error('Error in DELETE /api/estimates/[id]/options', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
