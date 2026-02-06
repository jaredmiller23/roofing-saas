/**
 * Affected Customers API Route
 *
 * Get list of customers affected by a storm event
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserTenantId } from '@/lib/auth/session'
import { requireFeature } from '@/lib/billing/feature-gates'
import { findAffectedCustomers } from '@/lib/storm/storm-intelligence'
import { AuthenticationError, AuthorizationError, ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import type { Contact } from '@/lib/types/contact'
import type { StormEvent } from '@/lib/storm/storm-types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User is not associated with a tenant')
    }

    await requireFeature(tenantId, 'stormData')

    // Parse request body
    const body = await request.json()
    const { stormEvent, maxDistance, minProbability, priority } = body as {
      stormEvent: StormEvent
      maxDistance?: number
      minProbability?: number
      priority?: string[]
    }

    if (!stormEvent) {
      throw ValidationError('Missing required field: stormEvent')
    }

    // Get all contacts with coordinates for this tenant
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .eq('tenant_id', tenantId)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .eq('is_deleted', false)

    if (contactsError) {
      console.error('Error fetching contacts:', contactsError)
      throw InternalError('Failed to fetch contacts')
    }

    // Find affected customers
    let affectedCustomers = findAffectedCustomers(
      stormEvent,
      contacts as unknown as Contact[],
      { maxDistance, minProbability }
    )

    // Filter by priority if specified
    if (priority && priority.length > 0) {
      affectedCustomers = affectedCustomers.filter(c => 
        priority.includes(c.priority)
      )
    }

    return successResponse({
      customers: affectedCustomers,
      total: affectedCustomers.length,
      filters: {
        maxDistance,
        minProbability,
        priority,
      },
    })
  } catch (error) {
    console.error('Affected customers error:', error)
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
