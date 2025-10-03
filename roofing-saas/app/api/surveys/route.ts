import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'

/**
 * GET /api/surveys
 * List all surveys with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const surveyType = searchParams.get('survey_type')
    const deliveryStatus = searchParams.get('delivery_status')
    const contactId = searchParams.get('contact_id')
    const projectId = searchParams.get('project_id')
    const jobId = searchParams.get('job_id')
    const rating = searchParams.get('rating')
    const search = searchParams.get('search')

    const supabase = await createClient()
    let query = supabase
      .from('surveys')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)

    if (surveyType) query = query.eq('survey_type', surveyType)
    if (deliveryStatus) query = query.eq('delivery_status', deliveryStatus)
    if (contactId) query = query.eq('contact_id', contactId)
    if (projectId) query = query.eq('project_id', projectId)
    if (jobId) query = query.eq('job_id', jobId)
    if (rating) query = query.eq('rating', parseInt(rating))
    if (search) {
      query = query.or(`feedback.ilike.%${search}%`)
    }

    query = query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    const { data: surveys, error, count } = await query

    if (error) {
      console.error('Error fetching surveys:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      surveys: surveys || [],
      total: count || 0,
      page,
      limit,
    })
  } catch (error) {
    console.error('Error in GET /api/surveys:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/surveys
 * Create a new survey
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 })
    }

    const body = await request.json()
    const supabase = await createClient()

    // Generate a unique survey token
    const surveyToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

    const { data, error } = await supabase
      .from('surveys')
      .insert({
        ...body,
        tenant_id: tenantId,
        created_by: user.id,
        user_id: user.id,
        survey_token: surveyToken,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating survey:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/surveys:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
