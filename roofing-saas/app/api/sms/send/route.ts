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
import { z } from 'zod'

const sendSMSSchema = z.object({
  to: z.string().min(10, 'Phone number must be at least 10 digits'),
  body: z.string().min(1, 'Message body is required').max(1600, 'SMS body too long'),
  contactId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  templateVariables: z.record(z.string(), z.string()).optional(),
})

/**
 * POST /api/sms/send
 * Send an SMS message
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

    // Check SMS compliance before sending
    const { canSendSMS } = await import('@/lib/twilio/compliance')
    const permission = await canSendSMS(to, tenantId)

    if (!permission.allowed) {
      throw ValidationError('Cannot send SMS', {
        reason: permission.reason,
        to,
      })
    }

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

    // Send SMS via Twilio
    const smsResponse = await sendSMS({
      to,
      body: finalBody,
    })

    // Log activity
    const { error: activityError } = await supabase.from('activities').insert({
      tenant_id: tenantId,
      contact_id: contactId || null,
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
      logger.error('Failed to log SMS activity', { error: activityError })
    }

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/sms/send', 200, duration)

    return successResponse({
      message: 'SMS sent successfully',
      sms: {
        sid: smsResponse.sid,
        to: smsResponse.to,
        status: smsResponse.status,
      },
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('SMS send error', { error, duration })
    return errorResponse(error as Error)
  }
}
