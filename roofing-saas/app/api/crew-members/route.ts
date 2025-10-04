/**
 * Crew Members API
 * Manage crew members and labor rates
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
      return NextResponse.json({ error: 'Failed to fetch crew members' }, { status: 500 })
    }

    return NextResponse.json({ crewMembers })
  } catch (error) {
    logger.error('Crew members API error', { error })
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
      return NextResponse.json(
        { error: 'Missing required fields: first_name, last_name, role, hourly_rate' },
        { status: 400 }
      )
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
      return NextResponse.json({ error: 'Failed to create crew member' }, { status: 500 })
    }

    logger.info('Crew member created', { crewMemberId: crewMember.id, tenantId })

    return NextResponse.json({ crewMember }, { status: 201 })
  } catch (error) {
    logger.error('Crew members API error', { error })
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
      return NextResponse.json({ error: 'Missing crew member id' }, { status: 400 })
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
      return NextResponse.json({ error: 'Failed to update crew member' }, { status: 500 })
    }

    logger.info('Crew member updated', { crewMemberId: id, tenantId })

    return NextResponse.json({ crewMember })
  } catch (error) {
    logger.error('Crew members API error', { error })
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
      return NextResponse.json({ error: 'Missing crew member id' }, { status: 400 })
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
      return NextResponse.json({ error: 'Failed to deactivate crew member' }, { status: 500 })
    }

    logger.info('Crew member deactivated', { crewMemberId: id, tenantId })

    return NextResponse.json({ crewMember })
  } catch (error) {
    logger.error('Crew members API error', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
