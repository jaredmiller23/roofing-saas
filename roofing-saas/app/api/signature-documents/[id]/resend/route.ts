/**
 * POST /api/signature-documents/[id]/resend
 * Manually resend a signature reminder email
 */

import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { NextRequest } from 'next/server'
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend/email'
import { isResendConfigured } from '@/lib/resend/client'
import {
  createSignatureReminderEmail,
  getReminderSubject,
  determineReminderType,
  type SignatureReminderData
} from '@/lib/email/signature-reminder-templates'

interface DocumentRecord {
  id: string
  title: string
  status: string
  expires_at: string | null
  reminder_sent_at: string | null
  reminder_count: number | null
  tenant_id: string
  contact: {
    id: string
    first_name: string
    last_name: string
    email: string | null
  } | null
  project: {
    id: string
    name: string
  } | null
}

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

    logger.apiRequest('POST', '/api/signature-documents/' + id + '/resend', {
      tenantId,
      id
    })

    // Check if email is configured
    if (!isResendConfigured()) {
      throw ValidationError('Email is not configured. Please configure Resend to send reminders.')
    }

    const supabase = await createClient()

    // Get document with contact info
    const { data: rawDocument, error: fetchError } = await supabase
      .from('signature_documents')
      .select(`
        id,
        title,
        status,
        expires_at,
        reminder_sent_at,
        reminder_count,
        tenant_id,
        contact:contacts(id, first_name, last_name, email),
        project:projects(id, name)
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !rawDocument) {
      throw NotFoundError('Signature document')
    }

    const document = rawDocument as unknown as DocumentRecord

    // Check if document is in valid state to resend
    if (document.status === 'signed') {
      throw ValidationError('Document is already signed')
    }

    if (document.status === 'draft') {
      throw ValidationError('Document has not been sent yet. Please send it first.')
    }

    if (document.status === 'expired') {
      throw ValidationError('Document has expired. Please create a new document.')
    }

    if (document.status === 'declined') {
      throw ValidationError('Document has been declined. Please create a new document.')
    }

    // Check if contact has email
    if (!document.contact || !document.contact.email) {
      throw ValidationError('Contact does not have an email address')
    }

    // Extract email early so TypeScript knows it's definitely a string
    const recipientEmail = document.contact.email
    const recipientName = document.contact.first_name + ' ' + document.contact.last_name

    // Calculate days remaining
    const expiresAt = document.expires_at ? new Date(document.expires_at) : null
    const now = new Date()
    let daysRemaining = 7 // Default if no expiration
    
    if (expiresAt) {
      const msPerDay = 24 * 60 * 60 * 1000
      daysRemaining = Math.max(1, Math.ceil((expiresAt.getTime() - now.getTime()) / msPerDay))
    }

    const reminderType = determineReminderType(daysRemaining)

    // Build reminder data
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const signingUrl = baseUrl + '/sign/' + id

    const reminderData: SignatureReminderData = {
      recipientName,
      documentTitle: document.title,
      projectName: document.project?.name,
      signingUrl,
      expirationDate: expiresAt ? expiresAt.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : 'No expiration',
      daysRemaining,
      reminderType
    }

    // Generate and send email
    const emailHtml = createSignatureReminderEmail(reminderData)
    const subject = getReminderSubject(reminderData)

    await sendEmail({
      to: recipientEmail,
      subject,
      html: emailHtml,
      tags: [
        { name: 'type', value: 'signature-reminder-manual' },
        { name: 'document_id', value: id },
        { name: 'reminder_type', value: reminderType },
        { name: 'tenant_id', value: tenantId }
      ]
    })

    // Update document reminder tracking
    const currentReminderCount = document.reminder_count || 0
    const { error: updateError } = await supabase
      .from('signature_documents')
      .update({
        reminder_sent_at: new Date().toISOString(),
        reminder_count: currentReminderCount + 1
      })
      .eq('id', id)

    if (updateError) {
      logger.error('Error updating reminder tracking after manual resend', {
        documentId: id,
        error: updateError
      })
    }

    logger.info('Manual signature reminder sent', {
      documentId: id,
      recipientEmail,
      reminderType,
      daysRemaining,
      reminderCount: currentReminderCount + 1
    })

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/signature-documents/' + id + '/resend', 200, duration)

    return successResponse({
      message: 'Reminder sent successfully',
      recipient: {
        email: recipientEmail,
        name: recipientName
      },
      reminderType,
      reminderCount: currentReminderCount + 1
    })

  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error resending signature reminder', { error, duration })
    return errorResponse(error as Error)
  }
}
