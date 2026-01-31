import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { NextRequest } from 'next/server'
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
  InternalError
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, createEmailHTML } from '@/lib/resend/email'
import { isResendConfigured } from '@/lib/resend/client'

/**
 * POST /api/signature-documents/[id]/send
 * Send a signature document for signing
 *
 * Body:
 * - recipient_email: string (required)
 * - recipient_name: string (required)
 * - message: string (optional custom message)
 * - expiration_days: number (default 30)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const {
      recipient_email,
      recipient_name,
      message = 'Please review and sign this document.',
      expiration_days = 30
    } = body

    // Validation
    if (!recipient_email) {
      throw ValidationError('Recipient email is required')
    }

    if (!recipient_name) {
      throw ValidationError('Recipient name is required')
    }

    logger.apiRequest('POST', `/api/signature-documents/${id}/send`, {
      tenantId,
      id,
      recipient_email
    })

    const supabase = await createClient()

    // Get document
    const { data: document, error: fetchError } = await supabase
      .from('signature_documents')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !document) {
      throw NotFoundError('Signature document')
    }

    // Fetch project name if available
    let projectData: { name: string } | null = null
    if (document.project_id) {
      const { data: project } = await supabase
        .from('projects')
        .select('name')
        .eq('id', document.project_id)
        .single()
      projectData = project
    }

    // Check if document is in valid state to send
    if (document.status === 'signed') {
      throw ValidationError('Document is already signed')
    }

    if (document.status === 'sent') {
      throw ValidationError('Document has already been sent')
    }

    // Calculate expiration date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiration_days)

    // Update document status
    const { data: updatedDocument, error: updateError } = await supabase
      .from('signature_documents')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (updateError) {
      logger.error('Error updating document status', { error: updateError })
      throw InternalError('Failed to update document')
    }

    // Send email notification to recipient
    let emailSent = false
    let emailError: string | null = null

    if (isResendConfigured()) {
      try {
        // Build the signing URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const signingUrl = `${baseUrl}/sign/${id}`

        // Format expiration date
        const formattedExpiration = expiresAt.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })

        // Build email content
        const emailBody = `
          <div class="header">
            <h1 style="margin: 0; color: #1f2937;">Document Signature Request</h1>
          </div>

          <p>Hi ${recipient_name},</p>

          <p>${message}</p>

          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <h3 style="margin: 0 0 12px 0; color: #374151;">Document Details</h3>
            <p style="margin: 4px 0;"><strong>Document:</strong> ${document.title || 'Signature Document'}</p>
            ${projectData?.name ? `<p style="margin: 4px 0;"><strong>Project:</strong> ${projectData.name}</p>` : ''}
            <p style="margin: 4px 0;"><strong>Deadline:</strong> ${formattedExpiration}</p>
          </div>

          <p style="text-align: center;">
            <a href="${signingUrl}" class="button" style="display: inline-block; padding: 14px 28px; background-color: #3b82f6; color: white; border-radius: 6px; text-decoration: none; font-weight: 500;">
              Review & Sign Document
            </a>
          </p>

          <p style="color: #6b7280; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${signingUrl}" style="color: #3b82f6;">${signingUrl}</a>
          </p>

          <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
            This signature request will expire on ${formattedExpiration}. Please sign before then.
          </p>
        `

        const html = createEmailHTML(emailBody, 'Document Signature Request')

        await sendEmail({
          to: recipient_email,
          subject: `Signature requested: ${document.title || 'Document'}`,
          html,
          tags: [
            { name: 'type', value: 'signature-request' },
            { name: 'document_id', value: id }
          ]
        })

        emailSent = true
        logger.info('Signature request email sent', {
          documentId: id,
          recipientEmail: recipient_email
        })
      } catch (error) {
        // Don't fail the request if email fails - document is already marked as sent
        emailError = error instanceof Error ? error.message : 'Unknown error'
        logger.error('Failed to send signature request email', {
          documentId: id,
          recipientEmail: recipient_email,
          error: emailError
        })
      }
    } else {
      logger.warn('Resend not configured, skipping email notification', {
        documentId: id,
        recipientEmail: recipient_email
      })
    }

    logger.info('Signature document sent', {
      documentId: id,
      recipientEmail: recipient_email,
      emailSent,
      expiresAt
    })

    const duration = Date.now() - startTime
    logger.apiResponse('POST', `/api/signature-documents/${id}/send`, 200, duration)

    return successResponse({
      ...updatedDocument,
      message: emailSent
        ? 'Document sent successfully and email notification delivered'
        : 'Document sent successfully (email notification skipped)',
      recipient: {
        email: recipient_email,
        name: recipient_name
      },
      expires_at: expiresAt,
      email_sent: emailSent,
      email_error: emailError
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error sending signature document', { error, duration })
    return errorResponse(error as Error)
  }
}
