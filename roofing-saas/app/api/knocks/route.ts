import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { logger } from '@/lib/logger'
import { ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export const POST = withAuth(async (request: Request, { userId, tenantId }) => {
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
      disposition,
      notes,
      photos,
      appointment_date,
      callback_date,
      contact_id,
      territory_id,
      device_location_accuracy
    } = body

    // Validate required fields
    if (!latitude || !longitude) {
      throw ValidationError('Latitude and longitude are required')
    }

    // Insert knock record
    const { data: knock, error } = await supabase
      .from('knocks')
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        latitude,
        longitude,
        address,
        address_street,
        address_city,
        address_state,
        address_zip,
        disposition,
        notes,
        photos,
        appointment_date,
        callback_date,
        contact_id,
        territory_id,
        device_location_accuracy,
        knocked_from: 'web_app'
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating knock:', { error })
      throw InternalError('Failed to create knock')
    }

    // Create activity record for gamification
    await supabase
      .from('activities')
      .insert({
        tenant_id: tenantId,
        created_by: userId,
        type: 'door_knock',
        subject: `Door knock at ${address || `${latitude}, ${longitude}`}`,
        content: disposition ? `Disposition: ${disposition}` : null,
        contact_id,
        outcome_details: {
          knock_id: knock.id,
          disposition,
          latitude,
          longitude
        }
      })

    return successResponse({
      success: true,
      data: knock
    })
  } catch (error) {
    logger.error('Knock API error:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

export const GET = withAuth(async (request: Request, { tenantId }) => {
  try {
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const filterUserId = searchParams.get('user_id')

    let query = supabase
      .from('knocks')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (filterUserId) {
      query = query.eq('user_id', filterUserId)
    }

    const { data: knocks, error } = await query

    if (error) {
      logger.error('Error fetching knocks:', { error })
      throw InternalError('Failed to fetch knocks')
    }

    return successResponse({
      success: true,
      data: knocks
    })
  } catch (error) {
    logger.error('Knock API error:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
