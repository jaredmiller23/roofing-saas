import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { NextRequest } from 'next/server'
import {
  ValidationError,
  mapZodError,
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { sendEmail, replaceEmailVariables, createEmailHTML } from '@/lib/resend/email'
import { canSendEmail } from '@/lib/resend/compliance'
import { z } from 'zod'

const sendEmailSchema = z.object({
  to: z.union([
    z.string().email('Invalid email address'),
    z.array(z.string().email('Invalid email address')),
  ]),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  html: z.string().optional(),
  text: z.string().optional(),
  contactId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  templateVariables: z.record(z.string(), z.string()).optional(),
  replyTo: z.string().email().optional(),
  cc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  bcc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
}).refine((data) => data.html || data.text || data.templateId, {
  message: 'Email must have either html, text, or templateId',
})

/**
 * POST /api/email/send
 * Send an email message
 */
export const POST = withAuth(async (request: NextRequest, { userId, tenantId }) => {
  const startTime = Date.now()

  try {
    logger.apiRequest('POST', '/api/email/send', { tenantId, userId })

    const body = await request.json()

    // Validate input
    const validatedData = sendEmailSchema.safeParse(body)
    if (!validatedData.success) {
      throw mapZodError(validatedData.error)
    }

    const {
      to,
      subject,
      html,
      text,
      contactId,
      templateId,
      templateVariables,
      replyTo,
      cc,
      bcc,
    } = validatedData.data

    const supabase = await createClient()

    // If using a template, fetch and process it
    let finalHtml = html
    const finalText = text
    let finalSubject = subject

    if (templateId) {
      const { data: template, error: templateError } = await supabase
        .from('templates')
        .select('content, name')
        .eq('id', templateId)
        .eq('tenant_id', tenantId)
        .eq('type', 'email')
        .single()

      if (templateError || !template) {
        throw ValidationError('Email template not found', { templateId })
      }

      // Replace variables in template
      const processedContent = templateVariables
        ? replaceEmailVariables(template.content, templateVariables)
        : template.content

      // If template content is HTML, use it as HTML, otherwise wrap it
      if (processedContent.toLowerCase().includes('<html')) {
        finalHtml = processedContent
      } else {
        finalHtml = createEmailHTML(processedContent, template.name)
      }

      // Use template name as subject if not provided
      if (!subject && template.name) {
        finalSubject = template.name
      }
    } else if (html && !html.toLowerCase().includes('<html')) {
      // Wrap plain HTML in email template
      finalHtml = createEmailHTML(html)
    }

    // Check email compliance before sending
    const recipientList = Array.isArray(to) ? to : [to]
    for (const recipient of recipientList) {
      const permission = await canSendEmail(recipient)
      if (!permission.allowed) {
        throw ValidationError('Cannot send email', {
          reason: permission.reason,
          to: recipient,
        })
      }
    }

    // Send email via Resend
    const emailResponse = await sendEmail({
      to,
      subject: finalSubject,
      html: finalHtml,
      text: finalText,
      replyTo,
      cc,
      bcc,
      tags: [
        { name: 'tenant_id', value: tenantId },
        { name: 'user_id', value: userId },
      ],
    })

    // Log activity
    for (const recipient of recipientList) {
      // Try to find contact by email
      const { data: contact } = await supabase
        .from('contacts')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('email', recipient)
        .eq('is_deleted', false)
        .limit(1)
        .single()

      const { error: activityError } = await supabase.from('activities').insert({
        tenant_id: tenantId,
        contact_id: contactId || contact?.id || null,
        user_id: userId,
        type: 'email',
        direction: 'outbound',
        content: finalText || (finalHtml ? 'HTML email' : ''),
        metadata: {
          email_id: emailResponse.id,
          to: recipient,
          subject: finalSubject,
          has_html: !!finalHtml,
          has_text: !!finalText,
        },
      })

      if (activityError) {
        logger.error('Failed to log email activity', {
          error: activityError,
          recipient,
        })
      }
    }

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/email/send', 200, duration)

    return successResponse({
      message: 'Email sent successfully',
      email: {
        id: emailResponse.id,
        to: emailResponse.to,
        subject: emailResponse.subject,
      },
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Email send error', { error, duration })
    return errorResponse(error as Error)
  }
})
