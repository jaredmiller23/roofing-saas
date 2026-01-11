import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, ValidationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/pins
 * Fetch pins for a territory
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const supabase = await createClient()

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const territoryId = searchParams.get('territory_id')
    const orphaned = searchParams.get('orphaned') === 'true'
    const limit = searchParams.get('limit') || '100'

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
        contact_id,
        territory_id
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))

    // Filter by territory OR get orphaned pins
    if (territoryId) {
      query = query.eq('territory_id', territoryId)
    } else if (orphaned) {
      query = query.is('territory_id', null)
    }

    const { data: pins, error } = await query

    if (error) {
      logger.error('[API] Error fetching pins:', { error })
      throw InternalError('Failed to fetch pins')
    }

    // Format pins with basic user info
    // Note: We're not fetching full user details to avoid auth.users access issues
    // This can be enhanced later with a proper user profiles table
    const pinsWithUsers = pins?.map(pin => ({
      ...pin,
      user_name: 'User' // Simplified for now
    })) || []

    return successResponse(pinsWithUsers)
  } catch (error) {
    logger.error('[API] Error in GET /api/pins:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * POST /api/pins
 * Create a new pin
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
      territory_id,
      disposition,
      notes,
      pin_type,
      contact_data,
      create_contact
    } = body

    logger.debug('[API] POST /api/pins - Creating pin:', {
      latitude,
      longitude,
      territory_id,
      disposition,
      pin_type
    })

    // Validate required fields (territory_id is now optional for orphaned pins)
    if (!latitude || !longitude) {
      throw ValidationError('latitude and longitude are required')
    }

    logger.debug('[API] Creating pin for tenant:', { tenant_id: tenantId })

    // Create the pin (territory_id can be null for orphaned pins)
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
        territory_id: territory_id || null,  // Allow null for orphaned pins
        disposition: disposition || 'not_home',
        notes,
        pin_type: pin_type || 'knock',
        user_id: user.id,
        tenant_id: tenantId,
        is_deleted: false
      })
      .select()
      .single()

    if (insertError) {
      logger.error('[API] Error creating pin:', { error: insertError })
      throw InternalError(`Failed to create pin: ${insertError.message}`)
    }

    logger.debug('[API] Pin created successfully:', { pin_id: newPin.id })

    let createdContactId: string | null = null
    let createdProjectId: string | null = null
    let projectCreationError: string | null = null

    // If creating contact (lead)
    if (create_contact && contact_data) {
      logger.debug('[API] Creating contact from pin...')
      const { data: contact, error: contactError } = await supabase
        .rpc('create_contact_from_pin', {
          p_knock_id: newPin.id,
          p_first_name: contact_data.first_name,
          p_last_name: contact_data.last_name,
          p_email: contact_data.email,
          p_phone: contact_data.phone
        })

      if (contactError) {
        logger.error('[API] Error creating contact:', { error: contactError })
      } else {
        logger.debug('[API] Contact created successfully:', { contact_id: contact })
        createdContactId = contact

        // Verify contact was actually created and update pin
        const { data: verifyContact } = await supabase
          .from('contacts')
          .select('id, first_name, last_name')
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

          // Create a project for this lead so it appears in the pipeline
          const contactName = [verifyContact.first_name, verifyContact.last_name]
            .filter(Boolean)
            .join(' ') || 'Unknown'
          const projectName = address_street
            ? `${contactName} - ${address_street}`
            : address
              ? `${contactName} - ${address}`
              : contactName

          const { data: newProject, error: projectError } = await supabase
            .from('projects')
            .insert({
              tenant_id: tenantId,
              contact_id: contact,
              name: projectName,
              status: 'lead',
              pipeline_stage: 'new_lead',
              type: 'residential',
              lead_source: 'door_knock',
              created_by: user.id,
              description: notes || `Lead from door knock at ${address_street || address || 'unknown address'}`,
              custom_fields: {
                proline_pipeline: 'SALES',
                proline_stage: 'New Lead',
                source_knock_id: newPin.id,
                source_disposition: disposition
              }
            })
            .select('id')
            .single()

          if (projectError) {
            logger.error('[API] Error creating project for lead:', {
              error: projectError,
              code: projectError.code,
              message: projectError.message,
              details: projectError.details,
              hint: projectError.hint
            })
            projectCreationError = `${projectError.code}: ${projectError.message}`
          } else {
            logger.debug('[API] Project created for lead:', { project_id: newProject?.id })
            createdProjectId = newProject?.id || null
          }
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
        tenant_id: tenantId,
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
      logger.error('[API] Error creating activity:', { error: activityError })
      // Continue even if activity creation fails
    }

    return successResponse({
      ...newPin,
      contact_id: createdContactId,
      project_id: createdProjectId,
      project_creation_error: projectCreationError
    })
  } catch (error) {
    logger.error('[API] Error in POST /api/pins:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * PUT /api/pins/[id]
 * Update a pin's details
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const supabase = await createClient()
    const body = await request.json()
    const { id, disposition, notes, contact_data, create_contact } = body

    if (!id) {
      throw ValidationError('Pin ID is required')
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
        notes,
        updated_at: new Date().toISOString()
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

    return successResponse(updatedPin)
  } catch (error) {
    logger.error('[API] Error in PUT /api/pins:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * DELETE /api/pins/[id]
 * Delete a pin (soft delete)
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const supabase = await createClient()
    const { searchParams } = request.nextUrl
    const id = searchParams.get('id')

    if (!id) {
      throw ValidationError('Pin ID is required')
    }

    // Check if the pin exists
    const { data: existingPin, error: fetchError } = await supabase
      .from('knocks')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingPin) {
      throw NotFoundError('Pin not found')
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
      logger.error('[API] Error deleting pin:', { error: deleteError })
      throw InternalError('Failed to delete pin')
    }

    return successResponse({
      success: true,
      message: 'Pin deleted successfully'
    })
  } catch (error) {
    logger.error('[API] Error in DELETE /api/pins:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}