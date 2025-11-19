import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
// Force recompile

/**
 * GET /api/pins
 * Fetch pins for a territory
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const territoryId = searchParams.get('territory_id')
    const limit = searchParams.get('limit') || '100'

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Build query - territory_id is now optional
    let query = supabase
      .from('knocks')
      .select(`
        id,
        latitude,
        longitude,
        address,
        address_street,
        address_city,
        address_state,
        address_zip,
        disposition,
        notes,
        pin_type,
        created_at,
        user_id,
        contact_id
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))

    // Filter by territory if provided
    if (territoryId) {
      query = query.eq('territory_id', territoryId)
    }

    const { data: pins, error } = await query

    if (error) {
      console.error('[API] Error fetching pins:', error)
      return NextResponse.json(
        { error: 'Failed to fetch pins' },
        { status: 500 }
      )
    }

    // Format pins with basic user info
    // Note: We're not fetching full user details to avoid auth.users access issues
    // This can be enhanced later with a proper user profiles table
    const pinsWithUsers = pins?.map(pin => ({
      ...pin,
      user_name: 'User' // Simplified for now
    })) || []

    return NextResponse.json({
      success: true,
      pins: pinsWithUsers  // Changed from 'data' to 'pins' to match frontend expectation
    })
  } catch (error) {
    console.error('[API] Error in GET /api/pins:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/pins
 * Create a new pin
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const {
      latitude,
      longitude,
      address,
      address_street,
      address_city,
      address_state,
      address_zip,
      territory_id,
      disposition,
      notes,
      pin_type,
      contact_data,
      create_contact
    } = body

    console.log('[API] POST /api/pins - Creating pin:', {
      latitude,
      longitude,
      territory_id,
      disposition,
      pin_type
    })

    // Validate required fields
    if (!latitude || !longitude || !territory_id) {
      return NextResponse.json(
        { error: 'latitude, longitude, and territory_id are required' },
        { status: 400 }
      )
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's tenant_id
    const { data: tenantUser, error: tenantError } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    if (tenantError || !tenantUser) {
      console.error('[API] Error fetching tenant:', tenantError)
      return NextResponse.json(
        { error: 'User not associated with a tenant' },
        { status: 403 }
      )
    }

    console.log('[API] Creating pin for tenant:', tenantUser.tenant_id)

    // Create the pin
    const { data: newPin, error: insertError } = await supabase
      .from('knocks')
      .insert({
        latitude,
        longitude,
        address,
        address_street,
        address_city,
        address_state,
        address_zip,
        territory_id,
        disposition: disposition || 'not_home',
        notes,
        pin_type: pin_type || 'knock',
        user_id: user.id,
        tenant_id: tenantUser.tenant_id,
        is_deleted: false
      })
      .select()
      .single()

    if (insertError) {
      console.error('[API] Error creating pin:', insertError)
      return NextResponse.json(
        { error: 'Failed to create pin', details: insertError.message },
        { status: 500 }
      )
    }

    console.log('[API] Pin created successfully:', newPin.id)

    let createdContactId: string | null = null

    // If creating contact
    if (create_contact && contact_data) {
      console.log('[API] Creating contact from pin...')
      const { data: contact, error: contactError } = await supabase
        .rpc('create_contact_from_pin', {
          p_knock_id: newPin.id,
          p_first_name: contact_data.first_name,
          p_last_name: contact_data.last_name,
          p_email: contact_data.email,
          p_phone: contact_data.phone
        })

      if (contactError) {
        console.error('[API] Error creating contact:', contactError)
      } else {
        console.log('[API] Contact created successfully:', contact)
        createdContactId = contact

        // Verify contact was actually created and update pin
        const { data: verifyContact } = await supabase
          .from('contacts')
          .select('id')
          .eq('id', contact)
          .single()

        if (verifyContact) {
          // Update pin to mark contact as created
          await supabase
            .from('knocks')
            .update({
              contact_created: true,
              contact_id: contact
            })
            .eq('id', newPin.id)
        }
      }
    }

    // Create activity record so pin appears in knocks list
    const activitySubject = address
      ? `Pin dropped at ${address}`
      : address_street
        ? `Pin dropped at ${address_street}`
        : 'Pin dropped'

    const activityContent = []
    if (disposition) activityContent.push(`Disposition: ${disposition}`)
    if (notes) activityContent.push(notes)

    const { error: activityError } = await supabase
      .from('activities')
      .insert({
        tenant_id: tenantUser.tenant_id,
        created_by: user.id,
        type: 'door_knock',
        subject: activitySubject,
        content: activityContent.join('\n') || null,
        contact_id: createdContactId,
        outcome_details: {
          knock_id: newPin.id,
          disposition,
          pin_type: pin_type || 'knock',
          latitude,
          longitude,
          source: 'pin_drop'
        }
      })

    if (activityError) {
      console.error('[API] Error creating activity:', activityError)
      // Continue even if activity creation fails
    }

    return NextResponse.json({
      success: true,
      data: {
        ...newPin,
        contact_id: createdContactId
      }
    })
  } catch (error) {
    console.error('[API] Error in POST /api/pins:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/pins/[id]
 * Update a pin's details
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { id, disposition, notes, contact_data, create_contact } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Pin ID is required' },
        { status: 400 }
      )
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if the pin exists and user has permission to edit
    const { data: existingPin, error: fetchError } = await supabase
      .from('knocks')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingPin) {
      return NextResponse.json(
        { error: 'Pin not found' },
        { status: 404 }
      )
    }

    // Update the pin
    const { data: updatedPin, error: updateError } = await supabase
      .from('knocks')
      .update({
        disposition,
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('[API] Error updating pin:', updateError)
      return NextResponse.json(
        { error: 'Failed to update pin' },
        { status: 500 }
      )
    }

    // If creating/updating contact
    if (create_contact && contact_data && !existingPin.contact_id) {
      // Create contact linked to this pin
      const { error: contactError } = await supabase
        .rpc('create_contact_from_pin', {
          p_knock_id: id,
          p_first_name: contact_data.first_name,
          p_last_name: contact_data.last_name,
          p_email: contact_data.email,
          p_phone: contact_data.phone
        })

      if (contactError) {
        console.error('[API] Error creating contact:', contactError)
        // Don't fail the whole request if contact creation fails
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedPin
    })
  } catch (error) {
    console.error('[API] Error in PUT /api/pins:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/pins/[id]
 * Delete a pin (soft delete)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = request.nextUrl
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Pin ID is required' },
        { status: 400 }
      )
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if the pin exists
    const { data: existingPin, error: fetchError } = await supabase
      .from('knocks')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingPin) {
      return NextResponse.json(
        { error: 'Pin not found' },
        { status: 404 }
      )
    }

    // Soft delete the pin
    const { error: deleteError } = await supabase
      .from('knocks')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (deleteError) {
      console.error('[API] Error deleting pin:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete pin' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Pin deleted successfully'
    })
  } catch (error) {
    console.error('[API] Error in DELETE /api/pins:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}