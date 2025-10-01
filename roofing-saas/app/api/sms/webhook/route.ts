import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import twilio from 'twilio'

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

    // Validate webhook signature (optional but recommended for production)
    // const signature = request.headers.get('x-twilio-signature')
    // const url = request.url
    // const twilioValidator = twilio.validateRequest(authToken, signature, url, formData)
    // if (!twilioValidator) {
    //   logger.error('Invalid Twilio signature')
    //   return new NextResponse('Unauthorized', { status: 401 })
    // }

    const supabase = await createClient()

    // Try to find the contact by phone number
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, tenant_id')
      .or(`phone.eq.${from},mobile_phone.eq.${from}`)
      .eq('is_deleted', false)
      .limit(1)
      .single()

    // Log the incoming SMS as an activity
    const { error: activityError } = await supabase.from('activities').insert({
      tenant_id: contact?.tenant_id || null,
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

    // TODO: Add auto-response logic here
    // - Check for opt-out keywords ("STOP", "UNSUBSCRIBE")
    // - Trigger automation workflows
    // - Notify users of new messages

    const duration = Date.now() - startTime
    logger.info('SMS webhook processed', { duration })

    // Respond to Twilio (empty TwiML response = no reply)
    const twiml = new twilio.twiml.MessagingResponse()

    // Optionally send an auto-response:
    // twiml.message('Thanks for your message! We'll get back to you soon.')

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
