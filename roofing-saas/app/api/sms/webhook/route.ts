import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import twilio from 'twilio'
import { verifyTwilioSignature, parseTwilioFormData } from '@/lib/webhooks/security'

/**
 * POST /api/sms/webhook
 * Twilio webhook for receiving SMS messages
 *
 * Twilio will call this endpoint when someone sends an SMS to your number
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    logger.info('Received SMS webhook from Twilio')

    // Get form data from Twilio
    const formData = await request.formData()
    const messageSid = formData.get('MessageSid') as string
    const from = formData.get('From') as string
    const to = formData.get('To') as string
    const body = formData.get('Body') as string
    const numMedia = parseInt(formData.get('NumMedia') as string || '0')

    logger.info('SMS received', {
      sid: messageSid,
      from,
      to,
      bodyLength: body?.length || 0,
      numMedia,
    })

    // Verify Twilio webhook signature
    const params = parseTwilioFormData(formData)
    const verification = await verifyTwilioSignature(request, params)

    if (!verification.valid) {
      logger.error('Invalid Twilio signature', { error: verification.error })
      return new NextResponse('Unauthorized', { status: 403 })
    }

    logger.info('Twilio signature verified successfully')

    const supabase = await createClient()

    // Look up tenant by the "To" number (the business's Twilio number)
    // This is stored in tenant_settings.integrations->twilio->phone_number
    const { data: tenantConfig } = await supabase
      .from('tenant_settings')
      .select('tenant_id')
      .filter('integrations->twilio->>phone_number', 'eq', to)
      .single()

    if (!tenantConfig?.tenant_id) {
      logger.warn('SMS webhook: Unknown Twilio number, cannot determine tenant', { to, from })
      // Still return 200 to Twilio but don't process
      return new NextResponse('OK', { status: 200 })
    }

    const tenantId = tenantConfig.tenant_id
    logger.info('Resolved tenant from Twilio number', { to, tenantId })

    // Try to find the contact by phone number (filtered by tenant)
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, tenant_id')
      .eq('tenant_id', tenantId)
      .or(`phone.eq.${from},mobile_phone.eq.${from}`)
      .eq('is_deleted', false)
      .limit(1)
      .single()

    // Log the incoming SMS as an activity
    const { error: activityError } = await supabase.from('activities').insert({
      tenant_id: tenantId,
      contact_id: contact?.id || null,
      type: 'sms',
      direction: 'inbound',
      content: body,
      metadata: {
        twilio_sid: messageSid,
        from,
        to,
        num_media: numMedia,
      },
    })

    if (activityError) {
      logger.error('Failed to log incoming SMS activity', { error: activityError })
    }

    // Handle opt-out/opt-in keywords
    const { isOptOutMessage, isOptInMessage, optOutContact, optInContact } = await import('@/lib/twilio/compliance')

    const twiml = new twilio.twiml.MessagingResponse()

    if (isOptOutMessage(body)) {
      // Process opt-out request
      const result = await optOutContact(from, tenantId, `User sent: ${body}`)

      if (result.success) {
        twiml.message('You have been unsubscribed from SMS messages. Reply START to opt back in.')
        logger.info('Contact opted out via SMS', { from, contactId: result.contactId, tenantId })
      } else {
        logger.error('Failed to process opt-out', { from, error: result.error, tenantId })
      }
    } else if (isOptInMessage(body)) {
      // Process opt-in request
      const result = await optInContact(from, tenantId)

      if (result.success) {
        twiml.message('You are now subscribed to receive SMS messages. Reply STOP to opt out.')
        logger.info('Contact opted in via SMS', { from, contactId: result.contactId })
      } else {
        logger.error('Failed to process opt-in', { from, error: result.error })
      }
    }

    // TODO: Trigger automation workflows for other messages
    // TODO: Notify users of new inbound messages

    const duration = Date.now() - startTime
    logger.info('SMS webhook processed', { duration })

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('SMS webhook error', { error, duration })

    // Still return 200 to Twilio to avoid retries
    return new NextResponse('Error processing webhook', { status: 200 })
  }
}

/**
 * GET /api/sms/webhook
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'SMS webhook endpoint is active',
  })
}
