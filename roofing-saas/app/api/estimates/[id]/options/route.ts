import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { AuthenticationError, AuthorizationError, InternalError, ValidationError } from '@/lib/api/errors'
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
const createQuoteOptionSchema = z.object({
  name: z.string().min(1, 'Option name is required').max(100),
  description: z.string().optional(),
  is_recommended: z.boolean().optional().default(false),
  display_order: z.number().int().min(0).optional().default(0),
  tax_rate: z.number().min(0).max(100).optional().default(0),
  line_items: z.array(z.object({
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().positive('Quantity must be positive'),
    unit: z.string().min(1, 'Unit is required'),
    unit_price: z.number().min(0, 'Unit price must be non-negative'),
    category: z.enum(['materials', 'labor', 'equipment', 'permits', 'other'])
  })).min(1, 'At least one line item is required')
})

const updateQuoteOptionSchema = createQuoteOptionSchema.partial().extend({
  id: z.string().uuid('Invalid option ID')
})

// GET - List quote options for a project/estimate
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

    const resolvedParams = await params
    const projectId = resolvedParams.id
    const supabase = await createClient()

    // First verify the project exists and belongs to the tenant
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, tenant_id')
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Get quote options for this project
    const { data: options, error } = await supabase
      .from('quote_options')
      .select(`
        id,
        project_id,
        name,
        description,
        is_recommended,
        display_order,
        subtotal,
        tax_rate,
        tax_amount,
        total_amount,
        profit_margin,
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
      .order('display_order', { ascending: true })

    if (error) {
      logger.error('Quote options fetch error', { error, projectId })
      throw InternalError('Failed to fetch quote options')
    }

    // Transform the data to match our expected structure
    const transformedOptions = options?.map(option => ({
      ...option,
      line_items: option.quote_line_items || []
    })) || []

    return successResponse({
      options: transformedOptions,
      project_id: projectId
    })

  } catch (error) {
    logger.error('Error in GET /api/estimates/[id]/options', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

// POST - Create new quote option
export async function POST(
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

    const resolvedParams = await params
    const projectId = resolvedParams.id
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
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Calculate totals from line items
    const { subtotal, taxAmount, total } = calculateQuoteOptionTotals(
      data.line_items,
      data.tax_rate || 0
    )

    // Create the quote option
    const { data: quoteOption, error: optionError } = await supabase
      .from('quote_options')
      .insert({
        project_id: projectId,
        name: data.name,
        description: data.description,
        is_recommended: data.is_recommended,
        display_order: data.display_order,
        subtotal,
        tax_rate: data.tax_rate,
        tax_amount: taxAmount,
        total_amount: total
      })
      .select()
      .single()

    if (optionError) {
      logger.error('Quote option creation error', { error: optionError, data })
      throw InternalError('Failed to create quote option')
    }

    // Create line items
    const lineItemsWithTotals = data.line_items.map(item => ({
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
      // Try to clean up the quote option if line items failed
      await supabase
        .from('quote_options')
        .delete()
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
        line_items: completeOption.quote_line_items || []
      }
    })

  } catch (error) {
    logger.error('Error in POST /api/estimates/[id]/options', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

// PATCH - Update quote option
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

    const resolvedParams = await params
    const projectId = resolvedParams.id
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
      return NextResponse.json(
        { error: 'Quote option not found' },
        { status: 404 }
      )
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

    // If line items are being updated, recalculate totals
    let updateData: Record<string, unknown> = {
      name: data.name,
      description: data.description,
      is_recommended: data.is_recommended,
      display_order: data.display_order,
      tax_rate: data.tax_rate
    }

    if (data.line_items) {
      const { subtotal, taxAmount, total } = calculateQuoteOptionTotals(
        data.line_items,
        data.tax_rate || 0
      )

      updateData = {
        ...updateData,
        subtotal,
        tax_amount: taxAmount,
        total_amount: total
      }

      // Update line items - delete old ones and create new ones
      await supabase
        .from('quote_line_items')
        .delete()
        .eq('quote_option_id', data.id)

      const lineItemsWithTotals = data.line_items.map(item => ({
        quote_option_id: data.id,
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
        logger.error('Line items update error', { error: lineItemsError, lineItemsWithTotals })
        throw InternalError('Failed to update line items')
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
        line_items: updatedOption.quote_line_items || []
      }
    })

  } catch (error) {
    logger.error('Error in PATCH /api/estimates/[id]/options', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

// DELETE - Delete quote option
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

    const resolvedParams = await params
    const projectId = resolvedParams.id
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
      return NextResponse.json(
        { error: 'Quote option not found' },
        { status: 404 }
      )
    }

    // Delete line items first (due to foreign key constraint)
    await supabase
      .from('quote_line_items')
      .delete()
      .eq('quote_option_id', optionId)

    // Delete the quote option
    const { error: deleteError } = await supabase
      .from('quote_options')
      .delete()
      .eq('id', optionId)

    if (deleteError) {
      logger.error('Quote option deletion error', { error: deleteError, optionId })
      throw InternalError('Failed to delete quote option')
    }

    return successResponse({ deleted: true, option_id: optionId })

  } catch (error) {
    logger.error('Error in DELETE /api/estimates/[id]/options', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}