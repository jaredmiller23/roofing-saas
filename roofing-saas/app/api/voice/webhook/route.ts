import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { verifyTwilioSignature, parseTwilioFormData } from '@/lib/webhooks/security'

/**
 * POST /api/voice/webhook
 * Twilio webhook for call status updates
 *
 * Twilio will call this endpoint when call status changes:
 * - initiated, ringing, answered, completed, busy, no-answer, canceled, failed
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    logger.info('Received voice webhook from Twilio')

    // Get form data from Twilio
    const formData = await request.formData()
    const callSid = formData.get('CallSid') as string
    const from = formData.get('From') as string
    const to = formData.get('To') as string
    const callStatus = formData.get('CallStatus') as string
    const direction = formData.get('Direction') as string
    const duration = formData.get('CallDuration') as string

    logger.info('Call status update', {
      sid: callSid,
      from,
      to,
      status: callStatus,
      direction,
      duration: duration ? parseInt(duration) : null,
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

    // Try to find existing activity for this call
    const { data: activity } = await supabase
      .from('activities')
      .select('id, tenant_id, contact_id')
      .eq('type', 'call')
      .eq('external_id', callSid)
      .limit(1)
      .single()

    if (activity) {
      // Update existing activity with call status
      const { error: updateError } = await supabase
        .from('activities')
        .update({
          outcome: callStatus,
          duration_seconds: duration ? parseInt(duration) : null,
        })
        .eq('id', activity.id)

      if (updateError) {
        logger.error('Failed to update call activity', {
          error: updateError,
          activityId: activity.id,
        })
      } else {
        logger.info('Call activity updated', {
          activityId: activity.id,
          status: callStatus,
          duration: duration ? parseInt(duration) : null,
        })
      }
    } else if (direction === 'inbound') {
      // This is an inbound call, create new activity
      // Try to find contact by phone number
      const { data: contact } = await supabase
        .from('contacts')
        .select('id, tenant_id')
        .or(`phone.eq.${from},mobile_phone.eq.${from}`)
        .eq('is_deleted', false)
        .limit(1)
        .single()

      // Only log activity if we found the contact (need tenant_id)
      if (contact?.tenant_id) {
        const { error: activityError } = await supabase.from('activities').insert({
          tenant_id: contact.tenant_id,
          contact_id: contact.id,
          type: 'call',
          direction: 'inbound',
          content: 'Inbound call',
          external_id: callSid,
          from_address: from,
          to_address: to,
          outcome: callStatus,
          duration_seconds: duration ? parseInt(duration) : null,
        })

        if (activityError) {
          logger.error('Failed to log inbound call activity', { error: activityError })
        } else {
          logger.info('Inbound call logged', {
            from,
            contactId: contact.id,
          })
        }
      }
    } else {
      logger.warn('Call activity not found for status update', {
        callSid,
        status: callStatus,
      })
    }

    const duration_ms = Date.now() - startTime
    logger.info('Voice webhook processed', { duration: duration_ms })

    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Voice webhook error', { error, duration })

    // Still return 200 to Twilio to avoid retries
    return new NextResponse('Error processing webhook', { status: 200 })
  }
}

/**
 * GET /api/voice/webhook
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Voice webhook endpoint is active',
  })
}
