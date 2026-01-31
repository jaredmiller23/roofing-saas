import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { verifyResendSignature } from '@/lib/webhooks/security'
import { triggerWorkflow } from '@/lib/automation/engine'

/**
 * POST /api/email/webhook
 * Resend webhook for email events (delivery, opens, clicks, bounces)
 *
 * Resend will call this endpoint when email events occur
 * Events: email.sent, email.delivered, email.opened, email.clicked, email.bounced, email.complained
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    logger.info('Received email webhook from Resend')

    // Get raw body for signature verification (Resend requires raw body)
    const rawBody = await request.text()

    // Verify Resend webhook signature
    const verification = await verifyResendSignature(request, rawBody)

    if (!verification.valid) {
      logger.error('Invalid Resend signature', { error: verification.error })
      return new NextResponse('Unauthorized', { status: 403 })
    }

    logger.info('Resend signature verified successfully')

    // Parse webhook payload
    const payload = JSON.parse(rawBody)
    const { type, data } = payload

    logger.info('Email webhook event', {
      type,
      emailId: data.email_id,
      to: data.to,
    })

    const supabase = await createAdminClient()

    // Find the activity by email ID
    const { data: activity } = await supabase
      .from('activities')
      .select('id, tenant_id, contact_id, metadata')
      .eq('type', 'email')
      .eq('direction', 'outbound')
      .eq('metadata->>email_id', data.email_id)
      .limit(1)
      .single()

    if (!activity) {
      logger.warn('Email activity not found for webhook event', {
        emailId: data.email_id,
        type,
      })
      return new NextResponse('OK', { status: 200 })
    }

    // Update activity metadata based on event type
    const updatedMetadata: Record<string, unknown> = {
      ...(activity.metadata as Record<string, unknown>),
      last_event: type,
      last_event_timestamp: new Date().toISOString(),
    }

    switch (type) {
      case 'email.sent':
        updatedMetadata.sent_at = data.created_at
        break

      case 'email.delivered':
        updatedMetadata.delivered_at = data.created_at
        updatedMetadata.status = 'delivered'
        break

      case 'email.opened':
        updatedMetadata.opened_at = data.created_at
        updatedMetadata.opened = true
        updatedMetadata.open_count = ((updatedMetadata.open_count as number) || 0) + 1
        // Store user agent and IP for analytics
        updatedMetadata.last_open_user_agent = data.user_agent
        updatedMetadata.last_open_ip = data.ip_address

        // Trigger email_opened workflows (non-blocking)
        triggerWorkflow(activity.tenant_id, 'email_opened', {
          email_id: data.email_id,
          contact_id: activity.contact_id,
          activity_id: activity.id,
          opened_at: data.created_at,
        }).catch((error) => {
          logger.error('Failed to trigger email_opened workflows', { error, emailId: data.email_id })
        })
        break

      case 'email.clicked':
        updatedMetadata.clicked_at = data.created_at
        updatedMetadata.clicked = true
        updatedMetadata.click_count = ((updatedMetadata.click_count as number) || 0) + 1
        updatedMetadata.last_clicked_link = data.link

        // Trigger email_clicked workflows (non-blocking)
        triggerWorkflow(activity.tenant_id, 'email_clicked', {
          email_id: data.email_id,
          contact_id: activity.contact_id,
          activity_id: activity.id,
          link: data.link,
          clicked_at: data.created_at,
        }).catch((error) => {
          logger.error('Failed to trigger email_clicked workflows', { error, emailId: data.email_id })
        })
        break

      case 'email.bounced':
        updatedMetadata.bounced_at = data.created_at
        updatedMetadata.bounced = true
        updatedMetadata.bounce_type = data.bounce_type // 'hard' or 'soft'
        updatedMetadata.bounce_reason = data.bounce_reason
        updatedMetadata.status = 'bounced'

        // If hard bounce, mark contact's email as invalid
        if (data.bounce_type === 'hard' && activity.contact_id) {
          await supabase
            .from('contacts')
            .update({
              email_invalid: true,
              email_invalid_reason: data.bounce_reason,
              email_invalid_date: new Date().toISOString(),
            })
            .eq('id', activity.contact_id)

          logger.warn('Marked contact email as invalid due to hard bounce', {
            contactId: activity.contact_id,
            email: data.to,
            reason: data.bounce_reason,
          })
        }
        break

      case 'email.complained':
        updatedMetadata.complained_at = data.created_at
        updatedMetadata.complained = true
        updatedMetadata.status = 'complained'

        // Mark contact as opted out of emails
        if (activity.contact_id) {
          await supabase
            .from('contacts')
            .update({
              email_opt_out: true,
              email_opt_out_date: new Date().toISOString(),
              email_opt_out_reason: 'Spam complaint',
            })
            .eq('id', activity.contact_id)

          logger.warn('Contact marked as email opt-out due to spam complaint', {
            contactId: activity.contact_id,
            email: data.to,
          })
        }
        break

      default:
        logger.info('Unknown email event type', { type })
    }

    // Update activity with new metadata
    const { error: updateError } = await supabase
      .from('activities')
      .update({ metadata: updatedMetadata })
      .eq('id', activity.id)

    if (updateError) {
      logger.error('Failed to update email activity', {
        error: updateError,
        activityId: activity.id,
      })
    }

    const duration = Date.now() - startTime
    logger.info('Email webhook processed', { type, duration })

    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Email webhook error', { error, duration })

    // Still return 200 to Resend to avoid retries for parsing errors
    return new NextResponse('Error processing webhook', { status: 200 })
  }
}

/**
 * GET /api/email/webhook
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Email webhook endpoint is active',
  })
}
