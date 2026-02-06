/**
 * Material Purchases API
 * Track material costs per project
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, createdResponse, errorResponse } from '@/lib/api/response'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    const supabase = await createClient()

    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('project_id')

    let query = supabase
      .from('material_purchases')
      .select(`
        *,
        supplier_contact:contacts(id, first_name, last_name, company)
      `)
      .eq('tenant_id', tenantId)
      .order('purchase_date', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data: purchases, error } = await query

    if (error) {
      logger.error('Failed to fetch material purchases', { error, tenantId })
      throw InternalError('Failed to fetch material purchases')
    }

    return successResponse({ purchases })
  } catch (error) {
    logger.error('Material purchases API error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    const supabase = await createClient()
    const body = await request.json()
    const {
      project_id,
      material_name,
      material_type,
      supplier,
      supplier_id,
      quantity,
      unit,
      unit_cost,
      purchase_order_number,
      invoice_number,
      delivery_date,
      purchase_date,
      notes,
    } = body

    if (!project_id || !material_name || !supplier || !quantity || !unit_cost || !purchase_date) {
      throw ValidationError('Missing required fields: project_id, material_name, supplier, quantity, unit_cost, purchase_date')
    }

    const { data: purchase, error } = await supabase
      .from('material_purchases')
      .insert({
        tenant_id: tenantId,
        project_id,
        material_name,
        material_type,
        supplier,
        supplier_id,
        quantity,
        unit,
        unit_cost,
        purchase_order_number,
        invoice_number,
        delivery_date,
        purchase_date,
        notes,
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create material purchase', { error, tenantId })
      throw InternalError('Failed to create material purchase')
    }

    logger.info('Material purchase created', { purchaseId: purchase.id, tenantId, projectId: project_id })

    return createdResponse({ purchase })
  } catch (error) {
    logger.error('Material purchases API error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    const supabase = await createClient()
    const body = await request.json()
    const { id } = body

    if (!id) {
      throw ValidationError('Missing purchase id')
    }

    // Whitelist updatable fields — prevent mass assignment
    const allowedFields = [
      'project_id', 'material_name', 'material_type', 'supplier', 'supplier_id',
      'quantity', 'unit', 'unit_cost', 'purchase_order_number', 'invoice_number',
      'delivery_date', 'purchase_date', 'notes',
    ] as const
    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    const { data: purchase, error } = await supabase
      .from('material_purchases')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update material purchase', { error, tenantId, purchaseId: id })
      throw InternalError('Failed to update material purchase')
    }

    logger.info('Material purchase updated', { purchaseId: id, tenantId })

    return successResponse({ purchase })
  } catch (error) {
    logger.error('Material purchases API error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      throw ValidationError('Missing purchase id')
    }

    const { error } = await supabase
      .from('material_purchases')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      logger.error('Failed to delete material purchase', { error, tenantId, purchaseId: id })
      throw InternalError('Failed to delete material purchase')
    }

    logger.info('Material purchase deleted', { purchaseId: id, tenantId })

    return successResponse({ deleted: true })
  } catch (error) {
    logger.error('Material purchases API error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
