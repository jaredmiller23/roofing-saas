import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { NextResponse } from 'next/server'

/**
 * GET /api/settings/sms-templates
 * Get all SMS templates for tenant
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    const supabase = await createClient()

    let query = supabase
      .from('sms_templates')
      .select('*')
      .eq('tenant_id', tenantId)

    if (category) {
      query = query.eq('category', category)
    }

    const { data: templates, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ templates: templates || [] })
  } catch (error) {
    console.error('Error fetching SMS templates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/settings/sms-templates
 * Create a new SMS template
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      name,
      description,
      message,
      category,
      available_variables,
      is_active,
      is_default
    } = body

    if (!name || !message) {
      return NextResponse.json(
        { error: 'Name and message are required' },
        { status: 400 }
      )
    }

    if (message.length > 1600) {
      return NextResponse.json(
        { error: 'Message must be 1600 characters or less' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: template, error } = await supabase
      .from('sms_templates')
      .insert({
        tenant_id: tenantId,
        name,
        description,
        message,
        category,
        available_variables,
        is_active,
        is_default,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error('Error creating SMS template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
