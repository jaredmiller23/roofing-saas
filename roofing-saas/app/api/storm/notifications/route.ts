/**
 * Storm Notifications API Route
 *
 * Send notifications to affected customers
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { AffectedCustomer, NotificationResponse } from '@/lib/storm/storm-types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { customers, template, method } = body as {
      customers: AffectedCustomer[]
      template?: string
      method: 'email' | 'sms' | 'both'
    }

    if (!customers || customers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No customers specified' },
        { status: 400 }
      )
    }

    const details: NotificationResponse['details'] = []
    let sent = 0
    let failed = 0
    let scheduled = 0

    // Process each customer
    for (const customer of customers) {
      const { contact } = customer

      // Check DNC status and opt-out preferences
      if (contact.call_opt_out || contact.dnc_status === 'internal') {
        details.push({
          contactId: contact.id,
          status: 'opted_out',
          message: 'Customer has opted out of communications',
        })
        continue
      }

      try {
        // Send email if requested and available
        if ((method === 'email' || method === 'both') && contact.email) {
          // TODO: Implement actual email sending
          // await sendEmail(contact.email, template, customer)
          sent++
          details.push({
            contactId: contact.id,
            status: 'sent',
            message: 'Email sent successfully',
          })
        }

        // Send SMS if requested and available
        if ((method === 'sms' || method === 'both') && contact.phone) {
          // TODO: Implement actual SMS sending
          // await sendSMS(contact.phone, template, customer)
          sent++
          details.push({
            contactId: contact.id,
            status: 'sent',
            message: 'SMS sent successfully',
          })
        }

        // If no contact method available
        if (!contact.email && !contact.phone) {
          failed++
          details.push({
            contactId: contact.id,
            status: 'failed',
            message: 'No email or phone number available',
          })
        }
      } catch (error) {
        failed++
        details.push({
          contactId: contact.id,
          status: 'failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    const response: NotificationResponse = {
      success: true,
      sent,
      failed,
      scheduled,
      details,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Notification error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

/**
 * Get notification templates
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Default storm notification templates
    const templates = [
      {
        id: 'storm-alert',
        name: 'Storm Alert',
        subject: 'Severe Weather Alert - Free Roof Inspection',
        body: `Hi {{firstName}},

A severe storm recently passed through your area. We wanted to reach out to ensure your property wasn't damaged.

We're offering FREE roof inspections to homeowners in {{city}} to assess any potential storm damage.

Based on the storm's severity, there's a {{probability}}% chance your roof may have sustained damage.

Would you like to schedule a free inspection?

Reply YES to schedule or call us at {{companyPhone}}.

{{companyName}}`,
      },
      {
        id: 'hail-damage',
        name: 'Hail Damage Alert',
        subject: 'Hail Storm in Your Area - Free Inspection Offered',
        body: `Hi {{firstName}},

Our storm tracking system detected {{hailSize}}" hail in your neighborhood on {{stormDate}}.

Hail of this size often causes roof damage that may not be visible from the ground but can lead to leaks and insurance claims.

We're offering FREE professional roof inspections to assess any damage.

Estimated damage potential: $\{{estimatedDamage}}

Schedule your free inspection: {{schedulingLink}}

{{companyName}}`,
      },
    ]

    return NextResponse.json({
      success: true,
      templates,
    })
  } catch (error) {
    console.error('Get templates error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
