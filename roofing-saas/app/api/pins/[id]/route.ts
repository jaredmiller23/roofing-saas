import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuthParams } from '@/lib/auth/with-auth'
import { logger } from '@/lib/logger'
import { ValidationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/pins/[id]
 * Update a pin's details
 */
export const PUT = withAuthParams(async (
  request: NextRequest,
  _authContext,
  { params }
) => {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { disposition, notes, contact_data, create_contact } = body

    // Await params Promise to get the id
    const { id } = await params

    logger.debug('[API] PUT /api/pins/[id] - ID:', { id, type: typeof id })

    if (!id) {
      throw ValidationError('Pin ID is required')
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      logger.error('[API] Invalid UUID format:', { id })
      throw ValidationError('Invalid pin ID format')
    }

    // Check if the pin exists and user has permission to edit
    const { data: existingPin, error: fetchError } = await supabase
      .from('knocks')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingPin) {
      throw NotFoundError('Pin not found')
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
      logger.error('[API] Error updating pin:', { error: updateError })
      throw InternalError('Failed to update pin')
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
        logger.error('[API] Error creating contact:', { error: contactError })
        // Don't fail the whole request if contact creation fails
      }
    }

    return successResponse({
      success: true,
      data: updatedPin
    })
  } catch (error) {
    logger.error('[API] Error in PUT /api/pins/[id]:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
