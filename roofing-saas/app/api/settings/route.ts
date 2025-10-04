import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { NextResponse } from 'next/server'

/**
 * GET /api/settings
 * Get tenant settings
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
    }

    const supabase = await createClient()

    // Get tenant settings
    const { data: settings, error } = await supabase
      .from('tenant_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If no settings exist, return defaults
    if (!settings) {
      return NextResponse.json({
        settings: {
          tenant_id: tenantId,
          company_name: null,
          company_tagline: null,
          logo_url: null,
          primary_color: '#3B82F6',
          secondary_color: '#10B981',
          accent_color: '#8B5CF6',
          email_header_logo_url: null,
          email_footer_text: null,
          email_signature: null,
          timezone: 'America/New_York',
          locale: 'en-US',
          date_format: 'MM/DD/YYYY',
          time_format: '12h',
          currency: 'USD',
          business_hours: {
            monday: { open: '09:00', close: '17:00', enabled: true },
            tuesday: { open: '09:00', close: '17:00', enabled: true },
            wednesday: { open: '09:00', close: '17:00', enabled: true },
            thursday: { open: '09:00', close: '17:00', enabled: true },
            friday: { open: '09:00', close: '17:00', enabled: true },
            saturday: { open: '09:00', close: '13:00', enabled: false },
            sunday: { open: '09:00', close: '13:00', enabled: false }
          },
          email_notifications_enabled: true,
          sms_notifications_enabled: true,
          push_notifications_enabled: true,
          integrations: {
            quickbooks: { enabled: false, company_id: null, realm_id: null },
            twilio: { enabled: false, account_sid: null, auth_token: null, phone_number: null },
            google_maps: { enabled: false, api_key: null },
            stripe: { enabled: false, publishable_key: null, secret_key: null }
          },
          default_lead_assignee: null,
          auto_assign_leads: false,
          round_robin_assignment: false,
          custom_settings: {}
        }
      })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/settings
 * Update tenant settings
 */
export async function PUT(request: Request) {
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
    const supabase = await createClient()

    // Check if settings exist
    const { data: existing } = await supabase
      .from('tenant_settings')
      .select('id')
      .eq('tenant_id', tenantId)
      .single()

    let result

    if (existing) {
      // Update existing settings
      const { data, error } = await supabase
        .from('tenant_settings')
        .update({
          company_name: body.company_name,
          company_tagline: body.company_tagline,
          logo_url: body.logo_url,
          primary_color: body.primary_color,
          secondary_color: body.secondary_color,
          accent_color: body.accent_color,
          email_header_logo_url: body.email_header_logo_url,
          email_footer_text: body.email_footer_text,
          email_signature: body.email_signature,
          timezone: body.timezone,
          locale: body.locale,
          date_format: body.date_format,
          time_format: body.time_format,
          currency: body.currency,
          business_hours: body.business_hours,
          email_notifications_enabled: body.email_notifications_enabled,
          sms_notifications_enabled: body.sms_notifications_enabled,
          push_notifications_enabled: body.push_notifications_enabled,
          integrations: body.integrations,
          default_lead_assignee: body.default_lead_assignee,
          auto_assign_leads: body.auto_assign_leads,
          round_robin_assignment: body.round_robin_assignment,
          custom_settings: body.custom_settings
        })
        .eq('tenant_id', tenantId)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      result = data
    } else {
      // Create new settings
      const { data, error } = await supabase
        .from('tenant_settings')
        .insert({
          tenant_id: tenantId,
          company_name: body.company_name,
          company_tagline: body.company_tagline,
          logo_url: body.logo_url,
          primary_color: body.primary_color,
          secondary_color: body.secondary_color,
          accent_color: body.accent_color,
          email_header_logo_url: body.email_header_logo_url,
          email_footer_text: body.email_footer_text,
          email_signature: body.email_signature,
          timezone: body.timezone,
          locale: body.locale,
          date_format: body.date_format,
          time_format: body.time_format,
          currency: body.currency,
          business_hours: body.business_hours,
          email_notifications_enabled: body.email_notifications_enabled,
          sms_notifications_enabled: body.sms_notifications_enabled,
          push_notifications_enabled: body.push_notifications_enabled,
          integrations: body.integrations,
          default_lead_assignee: body.default_lead_assignee,
          auto_assign_leads: body.auto_assign_leads,
          round_robin_assignment: body.round_robin_assignment,
          custom_settings: body.custom_settings
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      result = data
    }

    return NextResponse.json({ settings: result })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
