import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { InternalError, NotFoundError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'

/**
 * GET /api/estimates/[id]/view
 * Public API endpoint to fetch estimate/proposal data for the customer view.
 *
 * No authentication required. The [id] parameter is the proposal ID
 * (which acts as the view token since UUIDs are unguessable).
 *
 * Returns proposal details with quote options and line items.
 * Updates `viewed_at` on first view.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const proposalId = resolvedParams.id

    // Use admin client since this is a public endpoint (no auth)
    const supabase = await createAdminClient()

    // Fetch the proposal
    const { data: proposal, error: proposalError } = await supabase
      .from('quote_proposals')
      .select(`
        id,
        proposal_number,
        title,
        description,
        status,
        sent_at,
        viewed_at,
        valid_until,
        selected_option_id,
        project_id,
        tenant_id,
        created_at
      `)
      .eq('id', proposalId)
      .single()

    if (proposalError || !proposal) {
      throw NotFoundError('Estimate')
    }

    // Check if proposal is in a viewable status
    if (proposal.status === 'draft') {
      throw NotFoundError('Estimate')
    }

    // Check expiration
    if (proposal.valid_until && new Date(proposal.valid_until) < new Date()) {
      return successResponse({
        expired: true,
        proposal_number: proposal.proposal_number,
        title: proposal.title,
      })
    }

    // Fetch project details
    const { data: project } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', proposal.project_id)
      .single()

    // Fetch company settings for branding
    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('company_name, company_tagline')
      .eq('tenant_id', proposal.tenant_id)
      .single()

    // Fetch quote options with line items
    const { data: options, error: optionsError } = await supabase
      .from('quote_options')
      .select(`
        id,
        name,
        description,
        is_selected,
        subtotal,
        tax_rate,
        tax_amount,
        total_amount,
        display_order,
        quote_line_items (
          id,
          description,
          quantity,
          unit,
          unit_price,
          total_price,
          category
        )
      `)
      .eq('project_id', proposal.project_id)
      .order('display_order', { ascending: true })

    if (optionsError) {
      logger.error('Error fetching quote options for public view', { error: optionsError })
      throw InternalError('Failed to load estimate options')
    }

    // Transform options: map is_selected to is_recommended for the app layer
    const transformedOptions = (options || []).map(option => ({
      ...option,
      is_recommended: option.is_selected,
      line_items: option.quote_line_items || [],
    }))

    // Update viewed_at on first view
    if (!proposal.viewed_at) {
      const { error: updateError } = await supabase
        .from('quote_proposals')
        .update({
          viewed_at: new Date().toISOString(),
          status: proposal.status === 'sent' ? 'viewed' : proposal.status,
        })
        .eq('id', proposalId)

      if (updateError) {
        logger.error('Failed to update viewed_at', { error: updateError, proposalId })
        // Non-fatal - don't block the response
      }
    }

    return successResponse({
      proposal: {
        id: proposal.id,
        proposal_number: proposal.proposal_number,
        title: proposal.title,
        description: proposal.description,
        status: proposal.status,
        sent_at: proposal.sent_at,
        viewed_at: proposal.viewed_at || new Date().toISOString(),
        valid_until: proposal.valid_until,
        selected_option_id: proposal.selected_option_id,
      },
      project: project ? {
        id: project.id,
        name: project.name,
      } : null,
      company: {
        name: settings?.company_name || 'Roofing Contractor',
        tagline: settings?.company_tagline || null,
      },
      options: transformedOptions,
    })
  } catch (error) {
    logger.error('Error in GET /api/estimates/[id]/view', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
