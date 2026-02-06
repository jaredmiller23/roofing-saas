/**
 * Crew Members API
 * Manage crew members and labor rates
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse, createdResponse } from '@/lib/api/response'

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
    const activeOnly = searchParams.get('active_only') === 'true'
    const role = searchParams.get('role')

    let query = supabase
      .from('crew_members')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('first_name', { ascending: true })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    if (role) {
      query = query.eq('role', role)
    }

    const { data: crewMembers, error } = await query

    if (error) {
      logger.error('Failed to fetch crew members', { error, tenantId })
      throw InternalError('Failed to fetch crew members')
    }

    return successResponse({ crewMembers })
  } catch (error) {
    logger.error('Crew members API error', { error })
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
      user_id,
      first_name,
      last_name,
      employee_number,
      email,
      phone,
      role,
      hourly_rate,
      overtime_rate,
      hire_date,
      notes,
    } = body

    if (!first_name || !last_name || !role || !hourly_rate) {
      throw ValidationError('Missing required fields: first_name, last_name, role, hourly_rate')
    }

    const { data: crewMember, error } = await supabase
      .from('crew_members')
      .insert({
        tenant_id: tenantId,
        user_id,
        first_name,
        last_name,
        employee_number,
        email,
        phone,
        role,
        hourly_rate,
        overtime_rate: overtime_rate || hourly_rate * 1.5, // Default to 1.5x
        hire_date,
        notes,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create crew member', { error, tenantId })
      throw InternalError('Failed to create crew member')
    }

    logger.info('Crew member created', { crewMemberId: crewMember.id, tenantId })

    return createdResponse({ crewMember })
  } catch (error) {
    logger.error('Crew members API error', { error })
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
      throw ValidationError('Missing crew member id')
    }

    // Whitelist updatable fields — prevent mass assignment
    const allowedFields = [
      'user_id', 'first_name', 'last_name', 'employee_number', 'email',
      'phone', 'role', 'hourly_rate', 'overtime_rate', 'hire_date',
      'termination_date', 'notes', 'is_active',
    ] as const
    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    const { data: crewMember, error } = await supabase
      .from('crew_members')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update crew member', { error, tenantId, crewMemberId: id })
      throw InternalError('Failed to update crew member')
    }

    logger.info('Crew member updated', { crewMemberId: id, tenantId })

    return successResponse({ crewMember })
  } catch (error) {
    logger.error('Crew members API error', { error })
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
      throw ValidationError('Missing crew member id')
    }

    // Soft delete by marking inactive
    const { data: crewMember, error } = await supabase
      .from('crew_members')
      .update({ is_active: false, termination_date: new Date().toISOString().split('T')[0] })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      logger.error('Failed to deactivate crew member', { error, tenantId, crewMemberId: id })
      throw InternalError('Failed to deactivate crew member')
    }

    logger.info('Crew member deactivated', { crewMemberId: id, tenantId })

    return successResponse({ crewMember })
  } catch (error) {
    logger.error('Crew members API error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
