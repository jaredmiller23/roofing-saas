import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { createdResponse, errorResponse } from '@/lib/api/response'
import type { InspectionState } from '@/lib/claims/inspection-state'

/**
 * POST /api/projects/[id]/claims/inspection
 * Submit a completed inspection and create/update claim
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const { id: projectId } = await context.params
    const inspectionState: InspectionState = await request.json()

    const supabase = await createClient()

    // Get user's tenant
    const { data: tenantUser, error: tenantError } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    if (tenantError || !tenantUser) {
      logger.error('Tenant lookup failed:', { error: tenantError })
      throw AuthorizationError('User not associated with any tenant')
    }

    // Get project (no embedded select — projects has two FKs to contacts
    // which causes PostgREST ambiguity)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, contact_id')
      .eq('id', projectId)
      .eq('tenant_id', tenantUser.tenant_id)
      .single()

    if (projectError || !project) {
      logger.error('Project lookup failed:', { error: projectError, projectId })
      throw NotFoundError('Project')
    }

    // Fetch contact address separately to avoid PostgREST FK ambiguity
    let contactAddress = { street: '', city: '', state: '', zip: '' }
    const contactId = inspectionState.contactId || project.contact_id
    if (contactId) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('address_street, address_city, address_state, address_zip')
        .eq('id', contactId)
        .single()

      if (contact) {
        contactAddress = {
          street: contact.address_street || '',
          city: contact.address_city || '',
          state: contact.address_state || '',
          zip: contact.address_zip || '',
        }
      }
    }

    // Build claim data using only columns that exist in the claims table
    const claimData = {
      tenant_id: tenantUser.tenant_id,
      project_id: projectId,
      contact_id: contactId,
      status: 'new',
      date_of_loss: new Date().toISOString().split('T')[0],
      created_by: user.id,
      inspection_completed_at: new Date().toISOString(),
      // Store inspection data and address in custom_fields JSONB
      custom_fields: {
        claim_type: 'roof',
        property_address: contactAddress.street,
        property_city: contactAddress.city,
        property_state: contactAddress.state,
        property_zip: contactAddress.zip,
        inspection: {
          location: inspectionState.location,
          overview_photo: inspectionState.overviewPhoto,
          damage_areas: inspectionState.damageAreas,
          completed_at: new Date().toISOString(),
        },
      },
    }

    // Insert claim
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .insert(claimData)
      .select('id')
      .single()

    if (claimError) {
      logger.error('Error creating claim:', { error: claimError })
      throw InternalError('Failed to save inspection')
    }

    // Link claim to project
    await supabase
      .from('projects')
      .update({ claim_id: claim.id })
      .eq('id', projectId)
      .eq('tenant_id', tenantUser.tenant_id)

    // Create activity log
    const selectedCount = inspectionState.damageAreas.filter(a => a.selected).length
    await supabase.from('activities').insert({
      tenant_id: tenantUser.tenant_id,
      project_id: projectId,
      contact_id: contactId,
      type: 'claim_inspection',
      subject: 'Property Inspection Completed',
      content: `Inspection completed with ${selectedCount} areas documented`,
      created_by: user.id,
    })

    return createdResponse({
      claimId: claim.id,
      message: 'Inspection submitted successfully',
    })
  } catch (error) {
    logger.error('Error in POST /api/projects/[id]/claims/inspection:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
