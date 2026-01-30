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

    // Get project with its contact (address lives on contacts table)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, contact_id, contact:contacts(address_street, address_city, address_state, address_zip)')
      .eq('id', projectId)
      .eq('tenant_id', tenantUser.tenant_id)
      .single()

    if (projectError || !project) {
      logger.error('Project lookup failed:', { error: projectError, projectId })
      throw NotFoundError('Project')
    }

    // Extract contact address (contact is embedded as an object from the foreign key join)
    const contact = project.contact as { address_street?: string; address_city?: string; address_state?: string; address_zip?: string } | null

    // Build claim data using only columns that exist in the claims table
    const claimData = {
      tenant_id: tenantUser.tenant_id,
      project_id: projectId,
      contact_id: inspectionState.contactId || project.contact_id,
      status: 'new',
      date_of_loss: new Date().toISOString().split('T')[0],
      created_by: user.id,
      inspection_completed_at: new Date().toISOString(),
      // Store inspection data and address in custom_fields JSONB
      custom_fields: {
        claim_type: 'roof',
        property_address: contact?.address_street || '',
        property_city: contact?.address_city || '',
        property_state: contact?.address_state || '',
        property_zip: contact?.address_zip || '',
        inspection: {
          location: inspectionState.location,
          overview_photo: inspectionState.overviewPhoto,
          damage_areas: inspectionState.damageAreas,
          completed_at: new Date().toISOString(),
        },
      },
    }

    // Insert claim (no unique constraint on project_id, so use insert)
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
      type: 'claim_inspection',
      entity_type: 'project',
      entity_id: projectId,
      subject: 'Property Inspection Completed',
      notes: `Inspection completed with ${selectedCount} areas documented`,
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
