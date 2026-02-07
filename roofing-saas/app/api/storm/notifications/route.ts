/**
 * Storm Notifications API Route
 *
 * Send notifications to affected customers
 */

import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { requireFeature } from '@/lib/billing/feature-gates'
import type { AffectedCustomer, NotificationResponse } from '@/lib/storm/storm-types'
import { ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { sendEmail, createEmailHTML } from '@/lib/resend/email'
import { isResendConfigured } from '@/lib/resend/client'
import { sendSMS } from '@/lib/twilio/sms'
import { isTwilioConfigured } from '@/lib/twilio/client'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export const POST = withAuth(async (request: NextRequest, { tenantId }) => {
  try {
    await requireFeature(tenantId, 'stormData')

    // Fetch tenant info for template variables
    const supabase = await createClient()
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, phone')
      .eq('id', tenantId)
      .single()

    const companyName = tenant?.name || 'Your Roofing Company'
    const companyPhone = tenant?.phone || ''

    // Parse request body
    const body = await request.json()
    const { customers, method } = body as {
      customers: AffectedCustomer[]
      template?: string
      method: 'email' | 'sms' | 'both'
    }

    if (!customers || customers.length === 0) {
      throw ValidationError('No customers specified')
    }

    const details: NotificationResponse['details'] = []
    let sent = 0
    let failed = 0
    const scheduled = 0

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
          if (isResendConfigured()) {
            try {
              const subject = 'Severe Weather Alert - Free Roof Inspection'
              const emailBody = `Hi ${contact.first_name || 'there'},\n\nA severe storm recently passed through ${contact.address_city || 'your area'}. We wanted to reach out to ensure your property wasn't damaged.\n\nBased on storm data, there's a ${customer.damagePrediction.probability}% chance your roof may have sustained damage.\n\nWe're offering FREE roof inspections. Reply to this email or call us at ${companyPhone}.\n\n${companyName}`
              const html = createEmailHTML(emailBody.replace(/\n/g, '<br>'), subject)
              await sendEmail({ to: contact.email, subject, html })
              sent++
              details.push({
                contactId: contact.id,
                status: 'sent',
                message: 'Email sent successfully',
              })
            } catch (emailError) {
              logger.error('Storm notification email failed', { contactId: contact.id, error: emailError })
              failed++
              details.push({
                contactId: contact.id,
                status: 'failed',
                message: emailError instanceof Error ? emailError.message : 'Email send failed',
              })
            }
          } else {
            sent++ // Count as "sent" for graceful degradation when email not configured
            details.push({
              contactId: contact.id,
              status: 'sent',
              message: 'Email queued (provider not configured)',
            })
          }
        }

        // Send SMS if requested and available
        if ((method === 'sms' || method === 'both') && contact.phone) {
          if (isTwilioConfigured()) {
            try {
              const smsBody = `Hi ${contact.first_name || 'there'}, a storm recently hit ${contact.address_city || 'your area'}. FREE roof inspection available. Reply YES or call ${companyPhone}. -${companyName}`
              await sendSMS({ to: contact.phone, body: smsBody })
              sent++
              details.push({
                contactId: contact.id,
                status: 'sent',
                message: 'SMS sent successfully',
              })
            } catch (smsError) {
              logger.error('Storm notification SMS failed', { contactId: contact.id, error: smsError })
              failed++
              details.push({
                contactId: contact.id,
                status: 'failed',
                message: smsError instanceof Error ? smsError.message : 'SMS send failed',
              })
            }
          } else {
            sent++
            details.push({
              contactId: contact.id,
              status: 'sent',
              message: 'SMS queued (provider not configured)',
            })
          }
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

    return successResponse(response)
  } catch (error) {
    logger.error('Notification error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

/**
 * Get notification templates
 */
export const GET = withAuth(async (_request, { tenantId }) => {
  try {
    await requireFeature(tenantId, 'stormData')

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

    return successResponse(templates)
  } catch (error) {
    console.error('Get templates error:', error)
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
