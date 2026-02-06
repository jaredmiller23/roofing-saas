import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NotFoundError, ValidationError, ConflictError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { sendEmail, createEmailHTML } from '@/lib/resend/email'
import { formatCurrency } from '@/lib/types/quote-option'

/**
 * POST /api/estimates/[id]/accept
 * Public endpoint for customer to accept an estimate proposal.
 *
 * No authentication required — the proposal UUID acts as the access token
 * (same pattern as the /view endpoint).
 *
 * Body: { selected_option_id: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const proposalId = resolvedParams.id

    const body = await request.json().catch(() => ({}))
    const { selected_option_id } = body

    if (!selected_option_id) {
      throw ValidationError('selected_option_id is required')
    }

    const supabase = await createAdminClient()

    // Fetch proposal
    const { data: proposal, error: proposalError } = await supabase
      .from('quote_proposals')
      .select('id, status, project_id, tenant_id, valid_until, title, proposal_number')
      .eq('id', proposalId)
      .single()

    if (proposalError || !proposal) {
      throw NotFoundError('Proposal')
    }

    // Cannot accept a draft
    if (proposal.status === 'draft') {
      throw NotFoundError('Proposal')
    }

    // Already responded
    if (['accepted', 'rejected'].includes(proposal.status)) {
      throw ConflictError(
        proposal.status === 'accepted'
          ? 'This proposal has already been accepted'
          : 'This proposal has already been declined'
      )
    }

    // Check expiration
    if (proposal.valid_until && new Date(proposal.valid_until) < new Date()) {
      throw ValidationError('This proposal has expired. Please contact the contractor for an updated estimate.')
    }

    // Validate the selected option belongs to this project
    const { data: option, error: optionError } = await supabase
      .from('quote_options')
      .select('id, name, total_amount, subtotal')
      .eq('id', selected_option_id)
      .eq('project_id', proposal.project_id)
      .eq('is_deleted', false)
      .single()

    if (optionError || !option) {
      throw ValidationError('Invalid option selected')
    }

    // Update proposal status
    const { error: updateError } = await supabase
      .from('quote_proposals')
      .update({
        status: 'accepted',
        selected_option_id,
        responded_at: new Date().toISOString(),
      })
      .eq('id', proposalId)

    if (updateError) {
      logger.error('Failed to update proposal status', { error: updateError, proposalId })
      throw InternalError('Failed to accept proposal')
    }

    logger.info('Proposal accepted', {
      proposalId,
      optionId: selected_option_id,
      optionName: option.name,
      amount: option.total_amount || option.subtotal,
    })

    // Send notification to contractor (best-effort, don't block response)
    sendContractorNotification(supabase, proposal, option, 'accepted').catch(err => {
      logger.error('Failed to send acceptance notification', { error: err, proposalId })
    })

    return successResponse({
      status: 'accepted',
      proposal_number: proposal.proposal_number,
      selected_option: {
        name: option.name,
        amount: option.total_amount || option.subtotal,
      },
    })
  } catch (error) {
    logger.error('Error in POST /api/estimates/[id]/accept', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * Send notification email to the contractor when a customer responds.
 * Best-effort — failures are logged but don't block the customer response.
 */
async function sendContractorNotification(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  proposal: { tenant_id: string; title: string; project_id: string; proposal_number: string },
  option: { name: string; total_amount: number | null; subtotal: number | null },
  _action: 'accepted'
) {
  // Get tenant owner's email
  const { data: ownerRecord } = await supabase
    .from('tenant_users')
    .select('user_id')
    .eq('tenant_id', proposal.tenant_id)
    .eq('role', 'owner')
    .single()

  if (!ownerRecord) return

  const { data: userData } = await supabase.auth.admin.getUserById(ownerRecord.user_id)
  const ownerEmail = userData?.user?.email
  if (!ownerEmail) return

  // Get company name
  const { data: settings } = await supabase
    .from('tenant_settings')
    .select('company_name')
    .eq('tenant_id', proposal.tenant_id)
    .single()

  const amount = option.total_amount || option.subtotal || 0
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000')

  const emailBody = `
    <div class="header">
      <h1 style="margin: 0; font-size: 24px; color: #1a1a1a;">Estimate Accepted</h1>
    </div>

    <p>Your estimate <strong>${proposal.proposal_number}</strong> for <strong>${proposal.title}</strong> has been accepted.</p>

    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: #166534;">
        Customer selected: ${option.name} &mdash; ${formatCurrency(amount)}
      </p>
    </div>

    <p>The customer is expecting you to follow up to schedule the project.</p>

    <p style="margin-top: 24px;">
      <a href="${baseUrl}/projects/${proposal.project_id}" style="display: inline-block; padding: 12px 24px; background-color: #FF8243; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">
        View Project
      </a>
    </p>
  `

  const html = createEmailHTML(emailBody, `Estimate Accepted - ${settings?.company_name || 'JobClarity'}`)

  await sendEmail({
    to: ownerEmail,
    subject: `Estimate Accepted: ${proposal.title}`,
    html,
    tags: [
      { name: 'type', value: 'estimate-accepted' },
      { name: 'proposal_number', value: proposal.proposal_number },
    ],
  })
}
