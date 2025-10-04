/**
 * Job Expenses API
 * Track expenses for projects (labor, materials, equipment, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
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
      return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
    }

    return NextResponse.json({ expenses })
  } catch (error) {
    logger.error('Job expenses API error', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
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
      return NextResponse.json(
        { error: 'Missing required fields: project_id, expense_type, description, amount, expense_date' },
        { status: 400 }
      )
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
      return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 })
    }

    logger.info('Job expense created', { expenseId: expense.id, projectId: project_id, tenantId })

    return NextResponse.json({ expense }, { status: 201 })
  } catch (error) {
    logger.error('Job expenses API error', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing expense id' }, { status: 400 })
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
      return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 })
    }

    logger.info('Job expense updated', { expenseId: id, tenantId })

    return NextResponse.json({ expense })
  } catch (error) {
    logger.error('Job expenses API error', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing expense id' }, { status: 400 })
    }

    const { error } = await supabase
      .from('job_expenses')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      logger.error('Failed to delete job expense', { error, tenantId, expenseId: id })
      return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 })
    }

    logger.info('Job expense deleted', { expenseId: id, tenantId })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Job expenses API error', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
