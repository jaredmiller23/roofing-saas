import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NotFoundError, ValidationError, ConflictError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { sendEmail, createEmailHTML } from '@/lib/resend/email'

/**
 * POST /api/estimates/[id]/decline
 * Public endpoint for customer to decline an estimate proposal.
 *
 * No authentication required — the proposal UUID acts as the access token
 * (same pattern as the /view and /accept endpoints).
 *
 * Body: { reason?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const proposalId = resolvedParams.id

    const body = await request.json().catch(() => ({}))
    const { reason } = body as { reason?: string }

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

    // Cannot decline a draft
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
      throw ValidationError('This proposal has expired.')
    }

    // Update proposal status
    const { error: updateError } = await supabase
      .from('quote_proposals')
      .update({
        status: 'rejected',
        responded_at: new Date().toISOString(),
        decline_reason: reason || null,
      })
      .eq('id', proposalId)

    if (updateError) {
      logger.error('Failed to update proposal status', { error: updateError, proposalId })
      throw InternalError('Failed to decline proposal')
    }

    logger.info('Proposal declined', {
      proposalId,
      hasReason: !!reason,
    })

    // Send notification to contractor (best-effort)
    sendContractorNotification(supabase, proposal, reason).catch(err => {
      logger.error('Failed to send decline notification', { error: err, proposalId })
    })

    return successResponse({
      status: 'declined',
      proposal_number: proposal.proposal_number,
    })
  } catch (error) {
    logger.error('Error in POST /api/estimates/[id]/decline', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * Send notification email to the contractor when a customer declines.
 * Best-effort — failures are logged but don't block the customer response.
 */
async function sendContractorNotification(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  proposal: { tenant_id: string; title: string; project_id: string; proposal_number: string },
  reason: string | undefined
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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000')

  const reasonSection = reason
    ? `<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; font-size: 14px; color: #991b1b;">
          <strong>Reason:</strong> &ldquo;${reason}&rdquo;
        </p>
      </div>`
    : ''

  const emailBody = `
    <div class="header">
      <h1 style="margin: 0; font-size: 24px; color: #1a1a1a;">Estimate Declined</h1>
    </div>

    <p>Your estimate <strong>${proposal.proposal_number}</strong> for <strong>${proposal.title}</strong> has been declined by the customer.</p>

    ${reasonSection}

    <p>Consider following up to discuss alternative options or address their concerns.</p>

    <p style="margin-top: 24px;">
      <a href="${baseUrl}/projects/${proposal.project_id}" style="display: inline-block; padding: 12px 24px; background-color: #FF8243; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">
        View Project
      </a>
    </p>
  `

  const html = createEmailHTML(emailBody, `Estimate Declined - ${settings?.company_name || 'JobClarity'}`)

  await sendEmail({
    to: ownerEmail,
    subject: `Estimate Declined: ${proposal.title}`,
    html,
    tags: [
      { name: 'type', value: 'estimate-declined' },
      { name: 'proposal_number', value: proposal.proposal_number },
    ],
  })
}
