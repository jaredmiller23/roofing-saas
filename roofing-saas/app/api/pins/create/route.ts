import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, ValidationError, ConflictError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

/**
 * POST /api/pins/create
 * Create a new pin (knock) on the map and optionally create a contact
 *
 * Request body:
 * {
 *   latitude: number
 *   longitude: number
 *   address: string (formatted address)
 *   address_street?: string
 *   address_city?: string
 *   address_state?: string
 *   address_zip?: string
 *   disposition: string
 *   notes?: string
 *   pin_type?: 'quick_pin' | 'lead_pin' | 'interested_pin' | 'knock'
 *   territory_id?: string
 *   create_contact?: boolean (if true, creates contact from pin)
 *   contact_data?: {
 *     first_name?: string
 *     last_name?: string
 *     phone?: string
 *     email?: string
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with a tenant')
    }

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
      disposition,
      notes,
      pin_type = 'quick_pin',
      territory_id,
      create_contact = false,
      contact_data,
    } = body

    // Validate required fields
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw ValidationError('Invalid coordinates')
    }

    if (!disposition) {
      throw ValidationError('Disposition is required')
    }

    // Check for duplicate pins within 25 meters
    const { data: duplicateCheck } = await supabase
      .rpc('check_duplicate_pin', {
        p_latitude: latitude,
        p_longitude: longitude,
        p_radius_meters: 25,
        p_tenant_id: tenantId,
      })

    const dupResults = duplicateCheck as { exists: boolean; distance_meters: number }[] | null
    if (dupResults && dupResults.length > 0 && dupResults[0].exists) {
      const duplicate = dupResults[0]
      throw ConflictError(`Duplicate pin detected at ${duplicate.distance_meters}m`)
    }

    // Create the pin
    const { data: pin, error: pinError } = await supabase
      .from('knocks')
      .insert({
        tenant_id: tenantId,
        user_id: user.id,
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
        territory_id,
        sync_status: 'synced', // Created online, already synced
        knocked_from: 'web', // Desktop web interface
      })
      .select()
      .single()

    if (pinError) {
      logger.error('Pin creation error', { error: pinError })
      throw InternalError('Failed to create pin')
    }

    // If create_contact is true, create a contact from the pin
    let contact = null
    if (create_contact && pin) {
      try {
        const { data: newContact, error: contactError } = await supabase
          .rpc('create_contact_from_pin', {
            p_knock_id: pin.id,
            p_first_name: contact_data?.first_name || null,
            p_last_name: contact_data?.last_name || null,
            p_phone: contact_data?.phone || null,
            p_email: contact_data?.email || null,
          })

        if (contactError) {
          logger.error('Contact creation from pin error', { error: contactError })
          // Don't fail the whole request, just log the error
          // Pin was created successfully
        } else {
          contact = { id: newContact }
        }
      } catch (error) {
        logger.error('Contact creation error', { error })
        // Continue - pin was still created
      }
    }

    return successResponse({
      success: true,
      pin: {
        id: pin.id,
        latitude: pin.latitude,
        longitude: pin.longitude,
        address: pin.address,
        disposition: pin.disposition,
        pin_type: pin.pin_type,
        created_at: pin.created_at,
      },
      contact: contact ? { id: contact.id } : null,
    })
  } catch (error) {
    logger.error('Pin creation error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
