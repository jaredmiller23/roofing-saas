import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { NextRequest } from 'next/server'
import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  mapZodError,
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { sendSMS, replaceTemplateVariables } from '@/lib/twilio/sms'
import { canSendSMS } from '@/lib/twilio/compliance'
import { z } from 'zod'

// Phone number validation - at least 10 digits
const phoneSchema = z.string().min(10, 'Phone number must be at least 10 digits')

const sendSMSSchema = z.object({
  // Support single phone number or array of phone numbers
  to: z.union([phoneSchema, z.array(phoneSchema).min(1, 'At least one recipient required')]),
  body: z.string().min(1, 'Message body is required').max(1600, 'SMS body too long'),
  contactId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  templateVariables: z.record(z.string(), z.string()).optional(),
})

// Rate limiting delay between bulk messages (ms)
const BULK_SMS_DELAY_MS = 100

interface SMSResult {
  to: string
  sid?: string
  status: 'sent' | 'failed' | 'skipped'
  error?: string
}

/**
 * POST /api/sms/send
 * Send SMS message(s) - supports single or bulk recipients
 *
 * Single: { to: "+1234567890", body: "Hello" }
 * Bulk: { to: ["+1234567890", "+0987654321"], body: "Hello" }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('User not authenticated')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User is not associated with a tenant')
    }

    logger.apiRequest('POST', '/api/sms/send', { tenantId, userId: user.id })

    const body = await request.json()

    // Validate input
    const validatedData = sendSMSSchema.safeParse(body)
    if (!validatedData.success) {
      throw mapZodError(validatedData.error)
    }

    const { to, body: messageBody, contactId, templateId, templateVariables } = validatedData.data
    const supabase = await createClient()

    // Normalize to array for consistent processing
    const recipients = Array.isArray(to) ? to : [to]
    const isBulk = recipients.length > 1

    logger.info('Processing SMS send request', {
      recipientCount: recipients.length,
      isBulk,
      hasTemplate: !!templateId,
    })

    // If using a template, fetch and process it
    let finalBody = messageBody
    if (templateId) {
      const { data: template, error: templateError } = await supabase
        .from('templates')
        .select('content')
        .eq('id', templateId)
        .eq('tenant_id', tenantId)
        .eq('type', 'sms')
        .single()

      if (templateError || !template) {
        throw ValidationError('Template not found', { templateId })
      }

      finalBody = templateVariables
        ? replaceTemplateVariables(template.content, templateVariables)
        : template.content
    }

    // Process each recipient
    const results: SMSResult[] = []

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i]

      // Check SMS compliance before sending
      const permission = await canSendSMS(recipient, tenantId)

      if (!permission.allowed) {
        results.push({
          to: recipient,
          status: 'skipped',
          error: permission.reason,
        })
        logger.warn('SMS skipped due to compliance', {
          to: recipient,
          reason: permission.reason,
        })
        continue
      }

      try {
        // Send SMS via Twilio
        const smsResponse = await sendSMS({
          to: recipient,
          body: finalBody,
        })

        results.push({
          to: recipient,
          sid: smsResponse.sid,
          status: 'sent',
        })

        // Try to find contact by phone number for activity logging
        const { data: contact } = await supabase
          .from('contacts')
          .select('id')
          .eq('tenant_id', tenantId)
          .or(`phone.eq.${recipient},mobile_phone.eq.${recipient}`)
          .eq('is_deleted', false)
          .limit(1)
          .single()

        // Log activity for this recipient
        const { error: activityError } = await supabase.from('activities').insert({
          tenant_id: tenantId,
          contact_id: contactId || contact?.id || null,
          user_id: user.id,
          type: 'sms',
          direction: 'outbound',
          content: finalBody,
          metadata: {
            twilio_sid: smsResponse.sid,
            to: smsResponse.to,
            from: smsResponse.from,
            status: smsResponse.status,
          },
        })

        if (activityError) {
          logger.error('Failed to log SMS activity', { error: activityError, to: recipient })
        }

        // Rate limiting for bulk sends - wait between messages
        if (isBulk && i < recipients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, BULK_SMS_DELAY_MS))
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.push({
          to: recipient,
          status: 'failed',
          error: errorMessage,
        })
        logger.error('Failed to send SMS to recipient', { to: recipient, error })
      }
    }

    const duration = Date.now() - startTime
    const sentCount = results.filter(r => r.status === 'sent').length
    const failedCount = results.filter(r => r.status === 'failed').length
    const skippedCount = results.filter(r => r.status === 'skipped').length

    logger.apiResponse('POST', '/api/sms/send', 200, duration)
    logger.info('SMS batch results', {
      sent: sentCount,
      failed: failedCount,
      skipped: skippedCount,
    })

    // For single recipient, return simple response (backwards compatible)
    if (!isBulk) {
      const result = results[0]
      if (result.status === 'sent') {
        return successResponse({
          message: 'SMS sent successfully',
          sms: {
            sid: result.sid,
            to: result.to,
            status: result.status,
          },
        })
      } else {
        throw ValidationError(result.error || 'Failed to send SMS', { to: result.to })
      }
    }

    // For bulk, return detailed results
    return successResponse({
      message: `SMS batch complete: ${sentCount} sent, ${failedCount} failed, ${skippedCount} skipped`,
      summary: {
        total: recipients.length,
        sent: sentCount,
        failed: failedCount,
        skipped: skippedCount,
      },
      results,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('SMS send error', { error, duration })
    return errorResponse(error as Error)
  }
}
