import { NextRequest } from 'next/server'
import {
  ValidationError,
  NotFoundError,
  InternalError
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend/email'
import {
  createDeclineNotificationEmail,
  getDeclineNotificationSubject,
  createSignedNotificationEmail,
  getSignedNotificationSubject,
  createCompanyTurnEmail,
  getCompanyTurnSubject,
  type CompanyTurnNotificationData
} from '@/lib/email/signature-reminder-templates'

/**
 * POST /api/signature-documents/[id]/sign
 * Submit a signature for a document OR decline the document
 *
 * This endpoint is used by customers (external users) to sign or decline documents.
 * It does NOT require authentication - uses document ID for access.
 *
 * For signing:
 * - signer_name: string (required)
 * - signer_email: string (required)
 * - signer_type: 'customer' | 'company' | 'witness' (required)
 * - signature_data: string (base64 encoded signature image, required)
 * - signature_method: 'draw' | 'type' | 'upload' (default: 'draw')
 * - verification_code: string (optional, for additional security)
 *
 * For declining:
 * - action: 'decline' (required to trigger decline flow)
 * - decline_reason: string (required)
 * - signer_name: string (optional)
 * - signer_email: string (optional)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()

  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const {
      action,
      signer_name,
      signer_email,
      signer_type,
      signature_data,
      signature_method = 'draw',
      verification_code,
      decline_reason,
      completed_fields = []
    } = body

    // Handle decline action
    if (action === 'decline') {
      if (!decline_reason || decline_reason.trim() === '') {
        throw ValidationError('Decline reason is required')
      }

      const supabase = await createClient()

      // Get document
      const { data: document, error: fetchError } = await supabase
        .from('signature_documents')
        .select('*, contact:contacts(email, first_name, last_name), created_by')
        .eq('id', id)
        .single()

      if (fetchError || !document) {
        throw NotFoundError('Signature document')
      }

      // Check document status
      if (document.status === 'signed') {
        throw ValidationError('Document has already been signed')
      }

      if (document.status === 'declined') {
        throw ValidationError('Document has already been declined')
      }

      // Update document status to declined
      const { data: declinedDoc, error: updateError } = await supabase
        .from('signature_documents')
        .update({
          status: 'declined',
          decline_reason: decline_reason.trim(),
          declined_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        logger.error('Error declining document', { error: updateError })
        throw InternalError('Failed to decline document')
      }

      logger.info('Document declined', { 
        documentId: id, 
        reason: decline_reason.trim(),
        declinedBy: signer_name || 'Anonymous'
      })

      // Send decline notification email to document owner
      try {
        // Get the document owner's email from users table
        const { data: owner } = await supabase
          .from('users')
          .select('email, raw_user_meta_data')
          .eq('id', document.created_by)
          .single()

        const ownerEmail = owner?.email
        const ownerName = (owner?.raw_user_meta_data as { full_name?: string })?.full_name || 'there'

        if (ownerEmail) {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          const emailData = {
            ownerName,
            documentTitle: document.title,
            projectName: document.project?.name,
            declinedBy: signer_name || 'Anonymous',
            declinedByEmail: signer_email,
            declineReason: decline_reason.trim(),
            documentUrl: `${baseUrl}/signatures/${id}`,
            declinedAt: new Date().toLocaleString()
          }

          const emailHtml = createDeclineNotificationEmail(emailData)
          const subject = getDeclineNotificationSubject(emailData)

          await sendEmail({
            to: ownerEmail,
            subject,
            html: emailHtml
          })

          logger.info('Decline notification email sent', {
            documentId: id,
            to: ownerEmail
          })
        }
      } catch (emailError) {
        // Log but don't fail the decline if email fails
        logger.error('Failed to send decline notification email', { 
          error: emailError, 
          documentId: id 
        })
      }

      const duration = Date.now() - startTime
      logger.apiResponse('POST', `/api/signature-documents/${id}/sign`, 200, duration)

      return successResponse({
        document: declinedDoc,
        message: 'Document has been declined. The document owner will be notified.'
      })
    }

    // Validation for signing
    if (!signer_name) {
      throw ValidationError('Signer name is required')
    }

    if (!signer_email) {
      throw ValidationError('Signer email is required')
    }

    if (!signer_type) {
      throw ValidationError('Signer type is required')
    }

    const validSignerTypes = ['customer', 'company', 'witness']
    if (!validSignerTypes.includes(signer_type)) {
      throw ValidationError(`Invalid signer type. Must be one of: ${validSignerTypes.join(', ')}`)
    }

    if (!signature_data) {
      throw ValidationError('Signature data is required')
    }

    // Get client IP and user agent for audit trail
    const clientIp = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    logger.apiRequest('POST', `/api/signature-documents/${id}/sign`, {
      id,
      signer_email,
      signer_type,
      clientIp
    })

    const supabase = await createClient()

    // Get document
    const { data: document, error: fetchError } = await supabase
      .from('signature_documents')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !document) {
      throw NotFoundError('Signature document')
    }

    // Check document status
    if (document.status === 'signed') {
      throw ValidationError('Document has already been signed')
    }

    if (document.status === 'expired') {
      throw ValidationError('Document has expired')
    }

    if (document.status === 'declined') {
      throw ValidationError('Document has been declined')
    }

    // Check expiration
    if (document.expires_at && new Date(document.expires_at) < new Date()) {
      // Update status to expired
      await supabase
        .from('signature_documents')
        .update({ status: 'expired' })
        .eq('id', id)

      throw ValidationError('Document has expired')
    }

    // Transform completed_fields to include timestamps
    const completedFieldsWithTimestamps = Array.isArray(completed_fields)
      ? completed_fields.map((fieldId: string) => ({
          field_id: fieldId,
          completed_at: new Date().toISOString()
        }))
      : []

    // Check for existing signature from same signer (prevent duplicates)
    const { data: existingSignature } = await supabase
      .from('signatures')
      .select('id')
      .eq('document_id', id)
      .eq('signer_email', signer_email)
      .eq('signer_type', signer_type)
      .single()

    if (existingSignature) {
      throw ValidationError('You have already signed this document')
    }

    // Create signature record
    const { data: signature, error: signError } = await supabase
      .from('signatures')
      .insert({
        document_id: id,
        signer_type,
        signer_name,
        signer_email,
        signer_ip_address: clientIp,
        signature_data,
        signature_method,
        user_agent: userAgent,
        verification_code,
        completed_fields: completedFieldsWithTimestamps
      })
      .select()
      .single()

    if (signError) {
      logger.error('Error creating signature', { error: signError })
      throw InternalError('Failed to save signature')
    }

    // Check if all required signatures are complete
    const { data: signatures } = await supabase
      .from('signatures')
      .select('signer_type')
      .eq('document_id', id)

    const signerTypes = new Set(signatures?.map(s => s.signer_type) || [])

    let allSignaturesComplete = true
    if (document.requires_customer_signature && !signerTypes.has('customer')) {
      allSignaturesComplete = false
    }
    if (document.requires_company_signature && !signerTypes.has('company')) {
      allSignaturesComplete = false
    }

    // Update document status if all signatures are complete
    let updatedDocument = document
    if (allSignaturesComplete) {
      const { data: signed, error: updateError } = await supabase
        .from('signature_documents')
        .update({
          status: 'signed',
          signed_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        logger.error('Error updating document status', { error: updateError })
      } else {
        updatedDocument = signed
      }

      logger.info('Signature document completed', { documentId: id })

      // Send signed notification email to document owner
      try {
        const { data: owner } = await supabase
          .from('users')
          .select('email, raw_user_meta_data')
          .eq('id', document.created_by)
          .single()

        const ownerEmail = owner?.email
        const ownerName = (owner?.raw_user_meta_data as { full_name?: string })?.full_name || 'there'

        if (ownerEmail) {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

          // Get all signatures for the document
          const { data: allSignatures } = await supabase
            .from('signatures')
            .select('signer_name, signer_email, signer_type, created_at')
            .eq('document_id', id)

          const emailData = {
            ownerName,
            documentTitle: document.title,
            projectName: document.project?.name,
            signers: allSignatures || [],
            documentUrl: `${baseUrl}/signatures/${id}`,
            downloadUrl: `${baseUrl}/api/signature-documents/${id}/download`,
            signedAt: new Date().toLocaleString()
          }

          const emailHtml = createSignedNotificationEmail(emailData)
          const subject = getSignedNotificationSubject(emailData)

          await sendEmail({
            to: ownerEmail,
            subject,
            html: emailHtml
          })

          logger.info('Signed notification email sent', {
            documentId: id,
            to: ownerEmail
          })

          // Notify other signers if notify_signers_on_complete is enabled
          if (document.notify_signers_on_complete !== false && allSignatures) {
            const otherSignerEmails = allSignatures
              .filter(s => s.signer_email && s.signer_email !== ownerEmail)
              .map(s => s.signer_email)

            for (const signerEmail of otherSignerEmails) {
              try {
                await sendEmail({
                  to: signerEmail,
                  subject,
                  html: emailHtml
                })
                logger.info('Signed notification email sent to signer', {
                  documentId: id,
                  to: signerEmail
                })
              } catch (signerEmailError) {
                logger.error('Failed to send signed notification to signer', {
                  error: signerEmailError,
                  to: signerEmail
                })
              }
            }
          }
        }
      } catch (emailError) {
        // Log but don't fail the signing if email fails
        logger.error('Failed to send signed notification email', {
          error: emailError,
          documentId: id
        })
      }
    } else {
      // Just mark as viewed if not fully signed yet
      await supabase
        .from('signature_documents')
        .update({
          status: 'viewed',
          viewed_at: new Date().toISOString()
        })
        .eq('id', id)

      // Send "company turn" notification if customer just signed and company signature required
      if (signer_type === 'customer' && document.requires_company_signature) {
        try {
          const { data: owner } = await supabase
            .from('users')
            .select('email, raw_user_meta_data')
            .eq('id', document.created_by)
            .single()

          const ownerEmail = owner?.email
          const ownerName = (owner?.raw_user_meta_data as { full_name?: string })?.full_name || 'there'

          if (ownerEmail) {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

            const companyTurnData: CompanyTurnNotificationData = {
              ownerName,
              documentTitle: document.title,
              projectName: document.project?.name,
              customerName: signer_name,
              customerEmail: signer_email,
              signedAt: new Date().toLocaleString(),
              signingUrl: `${baseUrl}/sign/${id}?as=company`,
              documentUrl: `${baseUrl}/signatures/${id}`
            }

            const emailHtml = createCompanyTurnEmail(companyTurnData)
            const subject = getCompanyTurnSubject(companyTurnData)

            await sendEmail({
              to: ownerEmail,
              subject,
              html: emailHtml
            })

            logger.info('Company turn notification sent', {
              documentId: id,
              to: ownerEmail,
              customerName: signer_name
            })
          }
        } catch (emailError) {
          // Log but don't fail the signing if email fails
          logger.error('Failed to send company turn notification', {
            error: emailError,
            documentId: id
          })
        }
      }
    }

    const duration = Date.now() - startTime
    logger.apiResponse('POST', `/api/signature-documents/${id}/sign`, 200, duration)

    return successResponse({
      signature,
      document: updatedDocument,
      all_signatures_complete: allSignaturesComplete,
      message: allSignaturesComplete
        ? 'Document signed successfully!'
        : 'Your signature has been recorded. Waiting for additional signatures.'
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error signing document', { error, duration })
    return errorResponse(error as Error)
  }
}

/**
 * GET /api/signature-documents/[id]/sign
 * Get document details for signing page (public access)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()

  try {
    const { id } = await params

    logger.apiRequest('GET', `/api/signature-documents/${id}/sign`, { id })

    const supabase = await createClient()

    const { data: document, error } = await supabase
      .from('signature_documents')
      .select(`
        id,
        title,
        description,
        document_type,
        file_url,
        status,
        expires_at,
        requires_customer_signature,
        requires_company_signature,
        signature_fields,
        project:projects(name),
        signatures(signer_type)
      `)
      .eq('id', id)
      .single()

    if (error || !document) {
      throw NotFoundError('Signature document')
    }

    // Check expiration
    if (document.expires_at && new Date(document.expires_at) < new Date()) {
      await supabase
        .from('signature_documents')
        .update({ status: 'expired' })
        .eq('id', id)

      document.status = 'expired'
    }

    const duration = Date.now() - startTime
    logger.apiResponse('GET', `/api/signature-documents/${id}/sign`, 200, duration)

    return successResponse({ document })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error fetching document for signing', { error, duration })
    return errorResponse(error as Error)
  }
}
