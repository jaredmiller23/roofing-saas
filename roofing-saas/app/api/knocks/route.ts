import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser()

    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

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
        created_by: user.id,
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
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser()

    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const userId = searchParams.get('user_id')

    let query = supabase
      .from('knocks')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (userId) {
      query = query.eq('user_id', userId)
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
}
