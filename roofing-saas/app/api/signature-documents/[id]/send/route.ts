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
  { params }: { params: { id: string } }
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

    const { id } = params
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

    // Get document with contact info
    const { data: document, error: fetchError } = await supabase
      .from('signature_documents')
      .select(`
        *,
        contact:contacts(id, first_name, last_name, email),
        project:projects(id, name)
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !document) {
      throw NotFoundError('Signature document not found')
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

    // TODO: Send email notification
    // This would integrate with Resend/SendGrid to send the signature request email
    // Email should include:
    // - Link to signing page: /sign/[document_id]
    // - Document details (title, from company, deadline)
    // - Custom message from sender

    logger.info('Signature document sent', {
      documentId: id,
      recipientEmail: recipient_email,
      expiresAt
    })

    const duration = Date.now() - startTime
    logger.apiResponse('POST', `/api/signature-documents/${id}/send`, 200, duration)

    return successResponse({
      document: updatedDocument,
      message: 'Document sent successfully',
      recipient: {
        email: recipient_email,
        name: recipient_name
      },
      expires_at: expiresAt
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error sending signature document', { error, duration })
    return errorResponse(error as Error)
  }
}
