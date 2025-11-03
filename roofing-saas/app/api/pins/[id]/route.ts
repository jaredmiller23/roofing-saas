import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/pins/[id]
 * Update a pin's details
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { disposition, notes, contact_data, create_contact } = body

    // Await params Promise to get the id
    const resolvedParams = await params
    const id = resolvedParams.id

    console.log('[API] PUT /api/pins/[id] - ID:', id, 'Type:', typeof id)

    if (!id) {
      return NextResponse.json(
        { error: 'Pin ID is required' },
        { status: 400 }
      )
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      console.error('[API] Invalid UUID format:', id)
      return NextResponse.json(
        { error: 'Invalid pin ID format' },
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
        notes
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
      const { data: contact, error: contactError } = await supabase
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
    console.error('[API] Error in PUT /api/pins/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
