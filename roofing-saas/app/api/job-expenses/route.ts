/**
 * Job Expenses API
 * Track expenses for projects (labor, materials, equipment, etc.)
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, createdResponse, errorResponse } from '@/lib/api/response'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('project_id')
    const expenseType = searchParams.get('expense_type')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let query = supabase
      .from('job_expenses')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('expense_date', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (expenseType) {
      query = query.eq('expense_type', expenseType)
    }

    if (startDate) {
      query = query.gte('expense_date', startDate)
    }

    if (endDate) {
      query = query.lte('expense_date', endDate)
    }

    const { data: expenses, error } = await query

    if (error) {
      logger.error('Failed to fetch job expenses', { error, tenantId })
      throw InternalError('Failed to fetch expenses')
    }

    return successResponse({ expenses })
  } catch (error) {
    logger.error('Job expenses API error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    const body = await request.json()
    const {
      project_id,
      expense_type,
      category,
      description,
      amount,
      quantity,
      unit_price,
      vendor_name,
      vendor_id,
      invoice_number,
      receipt_url,
      notes,
      expense_date,
      paid_date,
    } = body

    if (!project_id || !expense_type || !description || !amount || !expense_date) {
      throw ValidationError('Missing required fields: project_id, expense_type, description, amount, expense_date')
    }

    const { data: expense, error } = await supabase
      .from('job_expenses')
      .insert({
        tenant_id: tenantId,
        project_id,
        expense_type,
        category,
        description,
        amount,
        quantity,
        unit_price,
        vendor_name,
        vendor_id,
        invoice_number,
        receipt_url,
        notes,
        expense_date,
        paid_date,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create job expense', { error, tenantId })
      throw InternalError('Failed to create expense')
    }

    logger.info('Job expense created', { expenseId: expense.id, projectId: project_id, tenantId })

    return createdResponse({ expense })
  } catch (error) {
    logger.error('Job expenses API error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      throw ValidationError('Missing expense id')
    }

    const { data: expense, error } = await supabase
      .from('job_expenses')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update job expense', { error, tenantId, expenseId: id })
      throw InternalError('Failed to update expense')
    }

    logger.info('Job expense updated', { expenseId: id, tenantId })

    return successResponse({ expense })
  } catch (error) {
    logger.error('Job expenses API error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      throw ValidationError('Missing expense id')
    }

    const { error } = await supabase
      .from('job_expenses')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      logger.error('Failed to delete job expense', { error, tenantId, expenseId: id })
      throw InternalError('Failed to delete expense')
    }

    logger.info('Job expense deleted', { expenseId: id, tenantId })

    return successResponse({ success: true })
  } catch (error) {
    logger.error('Job expenses API error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
