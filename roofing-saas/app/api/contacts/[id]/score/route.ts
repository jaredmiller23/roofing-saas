import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { calculateLeadScore } from '@/lib/scoring/lead-scorer'
import type { Contact } from '@/lib/types/contact'
import { AuthenticationError, ValidationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'

/**
 * GET /api/contacts/[id]/score
 * Calculate and return lead score for a specific contact
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params

    // Authenticate user
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const contactId = params.id
    if (!contactId) {
      throw ValidationError('Contact ID is required')
    }

    // Fetch contact from database
    const supabase = await createClient()
    const { data: contact, error: fetchError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .eq('tenant_id', (user as unknown as { tenant_id?: string }).tenant_id ?? '')
      .single()

    if (fetchError || !contact) {
      throw NotFoundError('Contact')
    }

    // Calculate lead score
    const leadScore = calculateLeadScore(contact as unknown as Contact)

    // Update the contact's lead_score in the database
    const { error: updateError } = await supabase
      .from('contacts')
      .update({
        lead_score: leadScore.total,
        updated_at: new Date().toISOString()
      })
      .eq('id', contactId)
      .eq('tenant_id', (user as unknown as { tenant_id?: string }).tenant_id ?? '')

    if (updateError) {
      logger.error('Failed to update lead score in database:', { error: updateError })
      // Continue anyway - we can still return the calculated score
    }

    return successResponse({
      contactId,
      leadScore,
      updatedInDatabase: !updateError,
    })
  } catch (error) {
    logger.error('Error calculating lead score:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * POST /api/contacts/[id]/score
 * Recalculate and update lead score for a specific contact
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params

    // Authenticate user
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const contactId = params.id
    if (!contactId) {
      throw ValidationError('Contact ID is required')
    }

    // Get force recalculation flag from request body
    const body = await request.json().catch(() => ({}))
    const forceRecalculate = body.force === true

    // Fetch contact from database
    const supabase = await createClient()
    const { data: contact, error: fetchError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .eq('tenant_id', (user as unknown as { tenant_id?: string }).tenant_id ?? '')
      .single()

    if (fetchError || !contact) {
      throw NotFoundError('Contact')
    }

    // Calculate new lead score
    const leadScore = calculateLeadScore(contact as unknown as Contact)
    const previousScore = contact.lead_score || 0

    // Update the contact's lead_score in the database
    const { error: updateError } = await supabase
      .from('contacts')
      .update({
        lead_score: leadScore.total,
        updated_at: new Date().toISOString()
      })
      .eq('id', contactId)
      .eq('tenant_id', (user as unknown as { tenant_id?: string }).tenant_id ?? '')

    if (updateError) {
      logger.error('Failed to update lead score in database:', { error: updateError })
      throw InternalError('Failed to update lead score')
    }

    return successResponse({
      contactId,
      leadScore,
      previousScore,
      scoreChange: leadScore.total - previousScore,
      forceRecalculated: forceRecalculate,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error recalculating lead score:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * PATCH /api/contacts/[id]/score
 * Manually override lead score for a specific contact
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params

    // Authenticate user
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const contactId = params.id
    if (!contactId) {
      throw ValidationError('Contact ID is required')
    }

    // Parse request body
    const body = await request.json()
    const { score, reason } = body

    if (typeof score !== 'number' || score < 0 || score > 100) {
      throw ValidationError('Score must be a number between 0 and 100')
    }

    // Verify contact exists and belongs to user's tenant
    const supabase = await createClient()
    const { data: contact, error: fetchError } = await supabase
      .from('contacts')
      .select('id, lead_score')
      .eq('id', contactId)
      .eq('tenant_id', (user as unknown as { tenant_id?: string }).tenant_id ?? '')
      .single()

    if (fetchError || !contact) {
      throw NotFoundError('Contact')
    }

    const previousScore = contact.lead_score || 0

    // Update the contact's lead_score in the database
    const { error: updateError } = await supabase
      .from('contacts')
      .update({
        lead_score: score,
        updated_at: new Date().toISOString()
      })
      .eq('id', contactId)
      .eq('tenant_id', (user as unknown as { tenant_id?: string }).tenant_id ?? '')

    if (updateError) {
      logger.error('Failed to update lead score in database:', { error: updateError })
      throw InternalError('Failed to update lead score')
    }

    // TODO: Log manual override in audit trail
    // This would typically create an audit entry showing who manually changed the score

    return successResponse({
      contactId,
      newScore: score,
      previousScore,
      scoreChange: score - previousScore,
      manualOverride: true,
      reason: reason || 'Manual override',
      updatedBy: (user as unknown as { id?: string }).id,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error updating lead score:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
