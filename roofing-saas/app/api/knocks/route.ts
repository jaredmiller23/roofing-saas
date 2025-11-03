import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant found' },
        { status: 403 }
      )
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
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      )
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
      console.error('Error creating knock:', error)
      return NextResponse.json(
        { error: 'Failed to create knock' },
        { status: 500 }
      )
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

    return NextResponse.json({
      success: true,
      data: knock
    })
  } catch (error) {
    console.error('Knock API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant found' },
        { status: 403 }
      )
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
      console.error('Error fetching knocks:', error)
      return NextResponse.json(
        { error: 'Failed to fetch knocks' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: knocks
    })
  } catch (error) {
    console.error('Knock API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
