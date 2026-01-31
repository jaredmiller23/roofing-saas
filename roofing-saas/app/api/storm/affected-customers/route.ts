/**
 * Affected Customers API Route
 *
 * Get list of customers affected by a storm event
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findAffectedCustomers } from '@/lib/storm/storm-intelligence'
import type { Contact } from '@/lib/types/contact'
import type { StormEvent, AffectedCustomersResponse } from '@/lib/storm/storm-types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { stormEvent, maxDistance, minProbability, priority } = body as {
      stormEvent: StormEvent
      maxDistance?: number
      minProbability?: number
      priority?: string[]
    }

    if (!stormEvent) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: stormEvent' },
        { status: 400 }
      )
    }

    // Get all contacts with coordinates
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .eq('is_deleted', false)

    if (contactsError) {
      console.error('Error fetching contacts:', contactsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch contacts' },
        { status: 500 }
      )
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

    const response: AffectedCustomersResponse = {
      success: true,
      customers: affectedCustomers,
      total: affectedCustomers.length,
      filters: {
        maxDistance,
        minProbability,
        priority,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Affected customers error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
