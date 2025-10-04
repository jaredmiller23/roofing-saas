import { NextRequest } from 'next/server'
import {
  ValidationError,
  NotFoundError,
  InternalError
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/signature-documents/[id]/sign
 * Submit a signature for a document
 *
 * This endpoint is used by customers (external users) to sign documents.
 * It does NOT require authentication - uses document ID for access.
 *
 * Body:
 * - signer_name: string (required)
 * - signer_email: string (required)
 * - signer_type: 'customer' | 'company' | 'witness' (required)
 * - signature_data: string (base64 encoded signature image, required)
 * - signature_method: 'draw' | 'type' | 'upload' (default: 'draw')
 * - verification_code: string (optional, for additional security)
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
      signer_name,
      signer_email,
      signer_type,
      signature_data,
      signature_method = 'draw',
      verification_code
    } = body

    // Validation
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
      throw NotFoundError('Signature document not found')
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
        verification_code
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
    } else {
      // Just mark as viewed if not fully signed yet
      await supabase
        .from('signature_documents')
        .update({
          status: 'viewed',
          viewed_at: new Date().toISOString()
        })
        .eq('id', id)
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
        project:projects(name),
        signatures(signer_type)
      `)
      .eq('id', id)
      .single()

    if (error || !document) {
      throw NotFoundError('Signature document not found')
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
