// =============================================
// Digital Cards API - Contact Form Route
// =============================================
// Endpoint: POST /api/digital-cards/:id/contact (PUBLIC)
// Purpose: Handle contact form submissions from public card page
// Author: Claude Code
// Date: 2025-11-18
// =============================================

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type {
  SubmitContactFormRequest,
  SubmitContactFormResponse,
} from '@/lib/digital-cards/types'
import { ValidationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { createdResponse, errorResponse } from '@/lib/api/response'

// =============================================
// Helper: Basic email validation
// =============================================
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// =============================================
// POST /api/digital-cards/:id/contact
// =============================================
// Public endpoint - no authentication required
// Submits contact form and creates interaction + activity

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      throw ValidationError('Missing required parameter: id')
    }

    const body: SubmitContactFormRequest = await request.json()

    // Validate required fields
    if (!body.name || !body.email || !body.message) {
      throw ValidationError('Missing required fields: name, email, message')
    }

    // Validate email format
    if (!isValidEmail(body.email)) {
      throw ValidationError('Invalid email format')
    }

    const supabase = await createClient()

    // Fetch card and verify it's active with contact form enabled
    const { data: card, error: cardError } = await supabase
      .from('digital_business_cards')
      .select('id, tenant_id, user_id, full_name, enable_contact_form')
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (cardError || !card) {
      throw NotFoundError('Card not found or inactive')
    }

    if (!card.enable_contact_form) {
      throw ValidationError('Contact form is disabled for this card')
    }

    // Extract tracking data
    const userAgent = request.headers.get('user-agent') || ''
    const referrer = request.headers.get('referer') || request.headers.get('referrer') || null
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                      request.headers.get('x-real-ip') ||
                      request.headers.get('cf-connecting-ip') || null

    // 1. Create interaction for contact form submission
    const { error: interactionError } = await supabase
      .from('business_card_interactions')
      .insert({
        card_id: id,
        interaction_type: 'contact_form_submit',
        prospect_name: body.name,
        prospect_email: body.email,
        prospect_phone: body.phone || null,
        prospect_company: body.company || null,
        prospect_message: body.message,
        ip_address: ipAddress,
        user_agent: userAgent,
        referrer: referrer,
        interaction_metadata: {
          timestamp: new Date().toISOString(),
          form_data: {
            name: body.name,
            email: body.email,
            phone: body.phone,
            company: body.company,
          },
        },
      })

    if (interactionError) {
      console.error('Error creating contact form interaction:', interactionError)
      // Don't fail the request if interaction tracking fails
    }

    // 2. Create or find contact
    let contactId: string | null = null

    // Try to find existing contact by email
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('tenant_id', card.tenant_id)
      .eq('email', body.email)
      .single()

    if (existingContact) {
      contactId = existingContact.id

      // Update existing contact with new info
      await supabase
        .from('contacts')
        .update({
          first_name: body.name.split(' ')[0],
          last_name: body.name.split(' ').slice(1).join(' ') || '',
          phone: body.phone || null,
          company: body.company || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contactId)
    } else {
      // Create new contact
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          tenant_id: card.tenant_id,
          first_name: body.name.split(' ')[0],
          last_name: body.name.split(' ').slice(1).join(' ') || '',
          email: body.email,
          phone: body.phone || null,
          company: body.company || null,
          type: 'lead',
          stage: 'new',
          source: 'Digital Business Card',
          assigned_to: card.user_id ?? null,
        })
        .select('id')
        .single()

      if (contactError) {
        console.error('Error creating contact:', contactError)
      } else if (newContact) {
        contactId = newContact.id
      }
    }

    // 3. Create activity (note) for the contact
    if (contactId) {
      await supabase
        .from('activities')
        .insert({
          tenant_id: card.tenant_id,
          contact_id: contactId,
          type: 'note',
          subtype: 'inbound_message',
          subject: `Contact Form: ${body.name}`,
          content: body.message,
          completed_at: new Date().toISOString(),
          created_by: card.user_id,
          outcome_details: {
            source: 'digital_business_card',
            card_id: id,
            prospect_company: body.company,
            prospect_phone: body.phone,
          },
        })
    }

    // 4. TODO: Send email notification to card owner
    // This would integrate with Resend/SendGrid to notify the rep

    const response: SubmitContactFormResponse = {
      success: true,
      message: `Thank you for your message, ${body.name}! ${card.full_name} will get back to you soon.`,
    }

    return createdResponse(response)
  } catch (error) {
    console.error('Unexpected error in POST /api/digital-cards/:id/contact:', error)
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
