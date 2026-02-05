import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import twilio from 'twilio'
import { verifyTwilioSignature, parseTwilioFormData } from '@/lib/webhooks/security'
import { handleInboundSMS, queueSMSForApproval } from '@/lib/aria/sms-handler'
import { detectCommitment } from '@/lib/aria/commitment-detector'
import { createCommitmentTask } from '@/lib/aria/commitment-actions'

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

    // Use admin client for webhooks - no user session means RLS would block queries
    const supabase = await createAdminClient()

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
      outcome_details: {
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
    } else {
      // Process with ARIA for intelligent response
      logger.info('Processing message with ARIA', { from, tenantId })

      const ariaResult = await handleInboundSMS({
        from,
        to,
        body,
        tenantId,
        contactId: contact?.id,
      })

      if (ariaResult.success && ariaResult.response) {
        if (ariaResult.shouldAutoSend) {
          // Auto-send response via TwiML
          twiml.message(ariaResult.response)
          logger.info('ARIA auto-response added to TwiML', {
            from,
            contactName: ariaResult.contactName,
            reason: ariaResult.reason,
          })

          // Check if ARIA made a commitment that needs follow-up
          const commitment = detectCommitment(ariaResult.response)
          if (commitment.hasCommitment) {
            logger.info('ARIA commitment detected', {
              type: commitment.type,
              urgency: commitment.urgency,
              pattern: commitment.matchedPattern,
            })

            // Create a task and notify the team
            const taskResult = await createCommitmentTask({
              tenantId,
              contactId: ariaResult.contactId,
              contactName: ariaResult.contactName,
              phone: from,
              commitment,
              originalMessage: body,
              ariaResponse: ariaResult.response,
            })

            if (taskResult.success) {
              logger.info('Commitment task created', {
                taskId: taskResult.taskId,
                type: commitment.type,
              })
            } else {
              logger.warn('Failed to create commitment task', {
                error: taskResult.error,
              })
            }
          }
        } else {
          // Queue for human approval - don't respond yet
          const queueResult = await queueSMSForApproval({
            tenantId,
            from,
            inboundMessage: body,
            suggestedResponse: ariaResult.response,
            contactId: ariaResult.contactId,
            contactName: ariaResult.contactName,
            category: ariaResult.reason?.split(':')[1]?.trim() || 'complex',
          })

          if (queueResult.success) {
            logger.info('SMS queued for human approval', {
              from,
              queueId: queueResult.queueId,
              reason: ariaResult.reason,
            })
          } else {
            logger.warn('Failed to queue SMS for approval', {
              from,
              error: queueResult.error,
            })
          }

          // Optionally send an acknowledgment (can be removed if silent queue preferred)
          // twiml.message("Thanks for your message! We'll get back to you shortly.")
        }
      } else if (!ariaResult.success) {
        logger.error('ARIA failed to process message', {
          from,
          error: ariaResult.error,
        })
        // Don't respond if ARIA failed - let humans handle it
      }
    }

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
