import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuthParams } from '@/lib/auth/with-auth'
import { InternalError, NotFoundError, ValidationError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { sendEmail, createEmailHTML } from '@/lib/resend/email'
import { generateProposalNumber, formatCurrency } from '@/lib/types/quote-option'

/**
 * POST /api/estimates/[id]/send
 * Send an estimate/proposal via email to a customer.
 *
 * Creates a quote_proposal record, generates a shareable link,
 * and sends the estimate via Resend.
 *
 * Body:
 *   recipient_email: string (required)
 *   recipient_name: string (required)
 *   message?: string (optional personal message)
 */

const sendEstimateSchema = z.object({
  recipient_email: z.string().email('Invalid email address'),
  recipient_name: z.string().min(1, 'Recipient name is required'),
  message: z.string().optional(),
})

export const POST = withAuthParams(async (
  request: NextRequest,
  { tenantId },
  { params }
) => {
  try {
    const { id: projectId } = await params
    const body = await request.json()

    // Validate input
    const validationResult = sendEstimateSchema.safeParse(body)
    if (!validationResult.success) {
      throw ValidationError('Invalid input', validationResult.error.issues)
    }

    const { recipient_email, recipient_name, message } = validationResult.data
    const supabase = await createClient()

    // Verify project exists and belongs to tenant
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, tenant_id')
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .single()

    if (projectError || !project) {
      throw NotFoundError('Project')
    }

    // Verify quote options exist
    const { data: options, error: optionsError } = await supabase
      .from('quote_options')
      .select('id, name, subtotal')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (optionsError || !options || options.length === 0) {
      throw ValidationError('No quote options exist for this project. Create options before sending.')
    }

    // Get company settings for branding
    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('company_name, company_tagline')
      .eq('tenant_id', tenantId)
      .single()

    const companyName = settings?.company_name || 'Your Roofing Contractor'

    // Generate proposal number
    const proposalNumber = generateProposalNumber()

    // Create the quote_proposal record
    const { data: proposal, error: proposalError } = await supabase
      .from('quote_proposals')
      .insert({
        tenant_id: tenantId,
        project_id: projectId,
        proposal_number: proposalNumber,
        title: `Estimate for ${project.name}`,
        description: message || null,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (proposalError) {
      logger.error('Failed to create proposal record', { error: proposalError })
      throw InternalError('Failed to create proposal')
    }

    // Build the shareable view URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
    const viewUrl = `${baseUrl}/view/estimate/${proposal.id}`

    // Build email content
    const optionsList = options
      .map((opt) => {
        const subtotal = typeof opt.subtotal === 'number' ? opt.subtotal : 0
        const formatted = formatCurrency(subtotal)
        return `<li><strong>${opt.name}</strong> - ${formatted}</li>`
      })
      .join('')

    const personalMessage = message
      ? `<p style="margin: 16px 0; padding: 12px; background: #f3f4f6; border-radius: 6px; font-style: italic;">${message}</p>`
      : ''

    const emailBody = `
      <div class="header">
        <h1 style="margin: 0; font-size: 24px; color: #1a1a1a;">${companyName}</h1>
        ${settings?.company_tagline ? `<p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">${settings.company_tagline}</p>` : ''}
      </div>

      <p>Hi ${recipient_name},</p>

      <p>We&apos;ve prepared an estimate for <strong>${project.name}</strong>. Please review the pricing options below and let us know which works best for you.</p>

      ${personalMessage}

      <h3 style="margin-top: 24px;">Pricing Options:</h3>
      <ul style="padding-left: 20px;">
        ${optionsList}
      </ul>

      <p style="margin-top: 24px;">
        <a href="${viewUrl}" class="button" style="display: inline-block; padding: 14px 28px; background-color: #FF8243; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">
          View Full Estimate
        </a>
      </p>

      <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">
        Proposal #${proposalNumber}
      </p>
    `

    const html = createEmailHTML(emailBody, `Estimate from ${companyName}`)

    // Send the email
    try {
      await sendEmail({
        to: recipient_email,
        subject: `Estimate for ${project.name} - ${companyName}`,
        html,
        tags: [
          { name: 'type', value: 'estimate' },
          { name: 'project_id', value: projectId },
          { name: 'proposal_id', value: proposal.id },
        ],
      })
    } catch (emailError) {
      logger.error('Failed to send estimate email', { error: emailError, recipient_email })
      // Update proposal status to draft since email failed
      await supabase
        .from('quote_proposals')
        .update({ status: 'draft', sent_at: null })
        .eq('id', proposal.id)

      throw InternalError('Failed to send email. The proposal has been saved as a draft.')
    }

    logger.info('Estimate sent successfully', {
      proposalId: proposal.id,
      projectId,
      recipientEmail: recipient_email,
    })

    return successResponse({
      proposal_id: proposal.id,
      proposal_number: proposalNumber,
      view_url: viewUrl,
      sent_to: recipient_email,
    })
  } catch (error) {
    logger.error('Error in POST /api/estimates/[id]/send', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
