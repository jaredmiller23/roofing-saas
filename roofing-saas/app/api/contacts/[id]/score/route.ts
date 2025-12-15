import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { calculateLeadScore } from '@/lib/scoring/lead-scorer'
import type { Contact } from '@/lib/types/contact'

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
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    const contactId = params.id
    if (!contactId) {
      return NextResponse.json(
        { success: false, error: { message: 'Contact ID is required' } },
        { status: 400 }
      )
    }

    // Fetch contact from database
    const supabase = await createClient()
    const { data: contact, error: fetchError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .eq('tenant_id', (user as { tenant_id?: string }).tenant_id)
      .single()

    if (fetchError || !contact) {
      return NextResponse.json(
        { success: false, error: { message: 'Contact not found' } },
        { status: 404 }
      )
    }

    // Calculate lead score
    const leadScore = calculateLeadScore(contact as Contact)

    // Update the contact's lead_score in the database
    const { error: updateError } = await supabase
      .from('contacts')
      .update({
        lead_score: leadScore.total,
        updated_at: new Date().toISOString()
      })
      .eq('id', contactId)
      .eq('tenant_id', (user as { tenant_id?: string }).tenant_id)

    if (updateError) {
      console.error('Failed to update lead score in database:', updateError)
      // Continue anyway - we can still return the calculated score
    }

    return NextResponse.json({
      success: true,
      data: {
        contactId,
        leadScore,
        updatedInDatabase: !updateError,
      },
    })
  } catch (error) {
    console.error('Error calculating lead score:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          message: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      { status: 500 }
    )
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
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    const contactId = params.id
    if (!contactId) {
      return NextResponse.json(
        { success: false, error: { message: 'Contact ID is required' } },
        { status: 400 }
      )
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
      .eq('tenant_id', (user as { tenant_id?: string }).tenant_id)
      .single()

    if (fetchError || !contact) {
      return NextResponse.json(
        { success: false, error: { message: 'Contact not found' } },
        { status: 404 }
      )
    }

    // Calculate new lead score
    const leadScore = calculateLeadScore(contact as Contact)
    const previousScore = contact.lead_score || 0

    // Update the contact's lead_score in the database
    const { error: updateError } = await supabase
      .from('contacts')
      .update({
        lead_score: leadScore.total,
        updated_at: new Date().toISOString()
      })
      .eq('id', contactId)
      .eq('tenant_id', (user as { tenant_id?: string }).tenant_id)

    if (updateError) {
      console.error('Failed to update lead score in database:', updateError)
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'Failed to update lead score',
            details: updateError.message 
          } 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        contactId,
        leadScore,
        previousScore,
        scoreChange: leadScore.total - previousScore,
        forceRecalculated: forceRecalculate,
        updatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Error recalculating lead score:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          message: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      { status: 500 }
    )
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
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    const contactId = params.id
    if (!contactId) {
      return NextResponse.json(
        { success: false, error: { message: 'Contact ID is required' } },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { score, reason } = body

    if (typeof score !== 'number' || score < 0 || score > 100) {
      return NextResponse.json(
        { success: false, error: { message: 'Score must be a number between 0 and 100' } },
        { status: 400 }
      )
    }

    // Verify contact exists and belongs to user's tenant
    const supabase = await createClient()
    const { data: contact, error: fetchError } = await supabase
      .from('contacts')
      .select('id, lead_score')
      .eq('id', contactId)
      .eq('tenant_id', (user as { tenant_id?: string }).tenant_id)
      .single()

    if (fetchError || !contact) {
      return NextResponse.json(
        { success: false, error: { message: 'Contact not found' } },
        { status: 404 }
      )
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
      .eq('tenant_id', (user as { tenant_id?: string }).tenant_id)

    if (updateError) {
      console.error('Failed to update lead score in database:', updateError)
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'Failed to update lead score',
            details: updateError.message 
          } 
        },
        { status: 500 }
      )
    }

    // TODO: Log manual override in audit trail
    // This would typically create an audit entry showing who manually changed the score

    return NextResponse.json({
      success: true,
      data: {
        contactId,
        newScore: score,
        previousScore,
        scoreChange: score - previousScore,
        manualOverride: true,
        reason: reason || 'Manual override',
        updatedBy: (user as { id?: string }).id,
        updatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Error updating lead score:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          message: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      { status: 500 }
    )
  }
}
