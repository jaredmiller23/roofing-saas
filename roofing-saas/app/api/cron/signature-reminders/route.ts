/**
 * Cron Job: Signature Document Reminders
 * 
 * Runs daily to send reminder emails for documents approaching expiration.
 * 
 * Reminder schedule (industry standard 3-reminder cadence):
 * - Friendly reminder: 7 days before expiration
 * - Urgent reminder: 3 days before expiration
 * - Final reminder: 1 day before expiration
 * 
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/signature-reminders",
 *     "schedule": "0 9 * * *"
 *   }]
 * }
 */

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { sendEmail } from '@/lib/resend/email'
import { isResendConfigured } from '@/lib/resend/client'
import {
  createSignatureReminderEmail,
  getReminderSubject,
  shouldSendReminder,
  type SignatureReminderData
} from '@/lib/email/signature-reminder-templates'
import { AuthenticationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

// Verify cron secret for security
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // If no secret is configured, only allow in development
  if (!cronSecret) {
    return process.env.NODE_ENV === 'development'
  }

  return authHeader === 'Bearer ' + cronSecret
}

interface SignatureDocument {
  id: string
  title: string
  status: string
  expires_at: string
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
  tenant_id: string
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // Verify authorization
  if (!verifyCronSecret(request)) {
    logger.warn('Unauthorized cron request attempt')
    return errorResponse(AuthenticationError('Unauthorized'))
  }

  logger.info('Starting signature reminder cron job')

  // Check if email is configured
  if (!isResendConfigured()) {
    logger.warn('Resend not configured, skipping signature reminders')
    return successResponse({
      message: 'Email not configured, no reminders sent',
      stats: { processed: 0, sent: 0, skipped: 0, errors: 0 }
    })
  }

  // Use service role client for cross-tenant access
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    logger.error('Supabase service role not configured')
    return errorResponse(InternalError('Server configuration error'))
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Calculate date thresholds
  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  try {
    // Find documents that:
    // 1. Are in 'sent' status (awaiting signature)
    // 2. Expire within 7 days
    // 3. Have not reached max reminders (3)
    const { data: rawDocuments, error: fetchError } = await supabase
      .from('signature_documents')
      .select(`
        id,
        title,
        status,
        expires_at,
        tenant_id,
        contact:contacts(id, first_name, last_name, email),
        project:projects(id, name)
      `)
      .eq('status', 'sent')
      .lte('expires_at', sevenDaysFromNow.toISOString())
      .gt('expires_at', now.toISOString())
      .order('expires_at', { ascending: true })

    if (fetchError) {
      logger.error('Error fetching documents for reminders', { error: fetchError })
      return errorResponse(InternalError('Database error'))
    }

    const documents = (rawDocuments || []) as unknown as SignatureDocument[]

    const stats = {
      processed: 0,
      sent: 0,
      skipped: 0,
      errors: 0
    }

    const results: Array<{ documentId: string; status: string; error?: string }> = []

    // Process each document
    for (const doc of documents) {
      stats.processed++

      // Skip if no contact or no email
      if (!doc.contact || !doc.contact.email) {
        stats.skipped++
        results.push({
          documentId: doc.id,
          status: 'skipped',
          error: 'No contact email'
        })
        continue
      }

      // Check if we should send a reminder
      const expiresAt = new Date(doc.expires_at)
      const { shouldSend, daysRemaining, reminderType } = shouldSendReminder(
        expiresAt,
        0,
        null
      )

      if (!shouldSend) {
        stats.skipped++
        results.push({
          documentId: doc.id,
          status: 'skipped',
          error: 'Not time for reminder'
        })
        continue
      }

      // Build reminder data
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const signingUrl = baseUrl + '/sign/' + doc.id

      const reminderData: SignatureReminderData = {
        recipientName: doc.contact.first_name + ' ' + doc.contact.last_name,
        documentTitle: doc.title,
        projectName: doc.project?.name,
        signingUrl,
        expirationDate: expiresAt.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        daysRemaining,
        reminderType
      }

      try {
        // Generate and send email
        const emailHtml = createSignatureReminderEmail(reminderData)
        const subject = getReminderSubject(reminderData)

        await sendEmail({
          to: doc.contact.email,
          subject,
          html: emailHtml,
          tags: [
            { name: 'type', value: 'signature-reminder' },
            { name: 'document_id', value: doc.id },
            { name: 'reminder_type', value: reminderType },
            { name: 'tenant_id', value: doc.tenant_id }
          ]
        })

        stats.sent++
        results.push({
          documentId: doc.id,
          status: 'sent'
        })

        logger.info('Signature reminder sent', {
          documentId: doc.id,
          recipientEmail: doc.contact.email,
          reminderType,
          daysRemaining
        })

      } catch (emailError) {
        stats.errors++
        const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error'
        results.push({
          documentId: doc.id,
          status: 'error',
          error: errorMessage
        })

        logger.error('Error sending signature reminder', {
          documentId: doc.id,
          error: emailError
        })
      }
    }

    const duration = Date.now() - startTime

    logger.info('Signature reminder cron job completed', {
      duration,
      stats
    })

    return successResponse({
      message: 'Signature reminder cron completed',
      stats,
      results,
      duration
    })

  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Signature reminder cron job failed', { error, duration })
    return errorResponse(error as Error)
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}
