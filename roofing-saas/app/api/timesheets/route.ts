/**
 * Timesheets API
 * Track labor hours and costs per project
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { logger } from '@/lib/logger'
import { ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, createdResponse, errorResponse } from '@/lib/api/response'

export const GET = withAuth(async (request: NextRequest, { tenantId }) => {
  try {
    const supabase = await createClient()

    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('project_id')
    const crewMemberId = searchParams.get('crew_member_id')
    const status = searchParams.get('status')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let query = supabase
      .from('timesheets')
      .select(`
        *,
        crew_member:crew_members(id, first_name, last_name, role),
        project:projects(id, name, project_number)
      `)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .order('work_date', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (crewMemberId) {
      query = query.eq('crew_member_id', crewMemberId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (startDate) {
      query = query.gte('work_date', startDate)
    }

    if (endDate) {
      query = query.lte('work_date', endDate)
    }

    const { data: timesheets, error } = await query

    if (error) {
      logger.error('Failed to fetch timesheets', { error, tenantId })
      throw InternalError('Failed to fetch timesheets')
    }

    return successResponse({ timesheets })
  } catch (error) {
    logger.error('Timesheets API error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

export const POST = withAuth(async (request: NextRequest, { userId, tenantId }) => {
  try {
    const supabase = await createClient()

    const body = await request.json()
    const {
      project_id,
      crew_member_id,
      work_date,
      start_time,
      end_time,
      regular_hours,
      overtime_hours,
      hourly_rate,
      overtime_rate,
      work_description,
      task_completed,
      status = 'draft',
    } = body

    if (!project_id || !crew_member_id || !work_date || !regular_hours || !hourly_rate) {
      throw ValidationError('Missing required fields: project_id, crew_member_id, work_date, regular_hours, hourly_rate')
    }

    const { data: timesheet, error } = await supabase
      .from('timesheets')
      .insert({
        tenant_id: tenantId,
        project_id,
        crew_member_id,
        work_date,
        start_time,
        end_time,
        regular_hours,
        overtime_hours: overtime_hours || 0,
        hourly_rate,
        overtime_rate: overtime_rate || hourly_rate * 1.5,
        work_description,
        task_completed,
        status,
        created_by: userId,
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create timesheet', { error, tenantId })
      throw InternalError('Failed to create timesheet')
    }

    // Create corresponding job expense for labor
    if (status === 'approved') {
      const laborCost = (regular_hours * hourly_rate) + ((overtime_hours || 0) * (overtime_rate || hourly_rate * 1.5))

      await supabase
        .from('job_expenses')
        .insert({
          tenant_id: tenantId,
          project_id,
          expense_type: 'labor',
          description: `Labor: ${work_description || 'Timesheet entry'}`,
          amount: laborCost,
          quantity: regular_hours + (overtime_hours || 0),
          unit_price: hourly_rate,
          expense_date: work_date,
          created_by: userId,
          is_approved: true,
          approved_by: userId,
          approved_at: new Date().toISOString(),
        })
    }

    logger.info('Timesheet created', { timesheetId: timesheet.id, projectId: project_id, tenantId })

    return createdResponse({ timesheet })
  } catch (error) {
    logger.error('Timesheets API error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

export const PATCH = withAuth(async (request: NextRequest, { userId, tenantId }) => {
  try {
    const supabase = await createClient()

    const body = await request.json()
    const { id } = body

    if (!id) {
      throw ValidationError('Missing timesheet id')
    }

    // Whitelist updatable fields — prevent mass assignment
    const allowedFields = [
      'project_id', 'crew_member_id', 'work_date', 'start_time', 'end_time',
      'regular_hours', 'overtime_hours', 'hourly_rate', 'overtime_rate',
      'work_description', 'task_completed', 'status',
    ] as const
    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    // If approving, set approved fields from session (not client)
    if (updates.status === 'approved') {
      updates.approved_by = userId
      updates.approved_at = new Date().toISOString()
    }

    const { data: timesheet, error } = await supabase
      .from('timesheets')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update timesheet', { error, tenantId, timesheetId: id })
      throw InternalError('Failed to update timesheet')
    }

    // If newly approved, create job expense
    if (updates.status === 'approved') {
      const laborCost = (timesheet.regular_hours * timesheet.hourly_rate) +
        ((timesheet.overtime_hours || 0) * (timesheet.overtime_rate || timesheet.hourly_rate * 1.5))

      // Check if expense already exists (exclude soft-deleted)
      const { data: existingExpense } = await supabase
        .from('job_expenses')
        .select('id')
        .eq('project_id', timesheet.project_id)
        .eq('expense_type', 'labor')
        .eq('expense_date', timesheet.work_date)
        .eq('amount', laborCost)
        .eq('is_deleted', false)
        .single()

      if (!existingExpense) {
        await supabase
          .from('job_expenses')
          .insert({
            tenant_id: tenantId,
            project_id: timesheet.project_id,
            expense_type: 'labor',
            description: `Labor: ${timesheet.work_description || 'Timesheet entry'}`,
            amount: laborCost,
            quantity: timesheet.regular_hours + (timesheet.overtime_hours || 0),
            unit_price: timesheet.hourly_rate,
            expense_date: timesheet.work_date,
            created_by: userId,
            is_approved: true,
            approved_by: userId,
            approved_at: new Date().toISOString(),
          })
      }
    }

    logger.info('Timesheet updated', { timesheetId: id, tenantId })

    return successResponse({ timesheet })
  } catch (error) {
    logger.error('Timesheets API error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

export const DELETE = withAuth(async (request: NextRequest, { tenantId }) => {
  try {
    const supabase = await createClient()

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      throw ValidationError('Missing timesheet id')
    }

    const { error } = await supabase
      .from('timesheets')
      .update({ is_deleted: true })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      logger.error('Failed to delete timesheet', { error, tenantId, timesheetId: id })
      throw InternalError('Failed to delete timesheet')
    }

    logger.info('Timesheet soft-deleted', { timesheetId: id, tenantId })

    return successResponse(null)
  } catch (error) {
    logger.error('Timesheets API error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
