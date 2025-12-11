import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import type { InspectionState } from '@/lib/claims/inspection-state'
import type { ClaimStatus } from '@/lib/claims/types'

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await context.params
    const inspectionState: InspectionState = await request.json()

    const supabase = await createClient()

    // Get user's tenant
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    if (!tenantUser) {
      return NextResponse.json(
        { error: 'User not associated with any tenant' },
        { status: 403 }
      )
    }

    // Get project details
    const { data: project } = await supabase
      .from('projects')
      .select('*, contact:contacts(*)')
      .eq('id', projectId)
      .eq('tenant_id', tenantUser.tenant_id)
      .single()

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Prepare claim data from inspection
    const claimData = {
      tenant_id: tenantUser.tenant_id,
      project_id: projectId,
      contact_id: inspectionState.contactId,
      status: 'new' as ClaimStatus,
      claim_type: 'roof' as const, // Default to roof, can be updated later
      date_of_loss: new Date().toISOString().split('T')[0], // Today's date
      property_address: project.address_street || '',
      property_city: project.address_city || '',
      property_state: project.address_state || '',
      property_zip: project.address_zip || '',
      created_by: user.id,

      // Store inspection data in custom fields
      inspection_data: {
        location: inspectionState.location,
        overview_photo: inspectionState.overviewPhoto,
        damage_areas: inspectionState.damageAreas,
        completed_at: new Date().toISOString(),
      },
    }

    // Insert or update claim
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .upsert(claimData, {
        onConflict: 'project_id',
      })
      .select()
      .single()

    if (claimError) {
      console.error('Error creating/updating claim:', claimError)
      return NextResponse.json(
        { error: 'Failed to save inspection' },
        { status: 500 }
      )
    }

    // Create activity log
    await supabase.from('activities').insert({
      tenant_id: tenantUser.tenant_id,
      type: 'claim_inspection',
      entity_type: 'project',
      entity_id: projectId,
      subject: 'Property Inspection Completed',
      notes: `Inspection completed with ${inspectionState.damageAreas.filter(a => a.selected).length} areas documented`,
      created_by: user.id,
    })

    return NextResponse.json({
      claimId: claim.id,
      message: 'Inspection submitted successfully',
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/projects/[id]/claims/inspection:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
