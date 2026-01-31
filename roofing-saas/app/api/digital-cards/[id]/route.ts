// =============================================
// Digital Cards API - Individual Card Routes
// =============================================
// Endpoints: GET/PATCH/DELETE /api/digital-cards/:id
// Purpose: Get, update, and delete individual cards
// Author: Claude Code
// Date: 2025-11-18
// =============================================

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, NotFoundError, ConflictError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import type {
  DigitalBusinessCard,
  GetDigitalCardResponse,
  UpdateDigitalCardRequest,
  UpdateDigitalCardResponse,
} from '@/lib/digital-cards/types'

// =============================================
// GET /api/digital-cards/:id
// =============================================
// Get a specific digital card by ID

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()

    if (!user) {
      throw AuthenticationError()
    }

    const supabase = await createClient()

    // Get user's tenant
    const { data: tenantUser, error: tenantError } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    if (tenantError || !tenantUser) {
      throw AuthorizationError('User not associated with any tenant')
    }

    // Fetch card
    const { data, error } = await supabase
      .from('digital_business_cards')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantUser.tenant_id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw NotFoundError('Card not found')
      }
      logger.error('Error fetching card:', { error })
      throw InternalError('Failed to fetch card')
    }

    const response: GetDigitalCardResponse = {
      card: data as DigitalBusinessCard,
    }

    return successResponse(response)
  } catch (error) {
    logger.error('Unexpected error in GET /api/digital-cards/:id:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

// =============================================
// PATCH /api/digital-cards/:id
// =============================================
// Update a digital card
// Users can update their own card, admins can update any card

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()

    if (!user) {
      throw AuthenticationError()
    }

    const supabase = await createClient()

    // Get user's tenant and role
    const { data: tenantUser, error: tenantError } = await supabase
      .from('tenant_users')
      .select('role, tenant_id')
      .eq('user_id', user.id)
      .single()

    if (tenantError || !tenantUser) {
      throw AuthorizationError('User not associated with any tenant')
    }

    // Check if card exists and user has permission
    const { data: existingCard, error: fetchError } = await supabase
      .from('digital_business_cards')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantUser.tenant_id)
      .single()

    if (fetchError || !existingCard) {
      throw NotFoundError('Card not found')
    }

    // Check permissions: own card or admin
    const isOwnCard = existingCard.user_id === user.id
    const isAdmin = tenantUser.role === 'admin'

    if (!isOwnCard && !isAdmin) {
      throw AuthorizationError('You can only update your own card')
    }

    const body: UpdateDigitalCardRequest = await request.json()

    // Build update object (only include provided fields)
    const updates: Partial<DigitalBusinessCard> = {}

    if (body.full_name !== undefined) updates.full_name = body.full_name
    if (body.job_title !== undefined) updates.job_title = body.job_title
    if (body.phone !== undefined) updates.phone = body.phone
    if (body.email !== undefined) updates.email = body.email

    if (body.company_name !== undefined) updates.company_name = body.company_name
    if (body.company_address !== undefined) updates.company_address = body.company_address
    if (body.company_phone !== undefined) updates.company_phone = body.company_phone
    if (body.company_email !== undefined) updates.company_email = body.company_email
    if (body.company_website !== undefined) updates.company_website = body.company_website

    if (body.linkedin_url !== undefined) updates.linkedin_url = body.linkedin_url
    if (body.facebook_url !== undefined) updates.facebook_url = body.facebook_url
    if (body.instagram_url !== undefined) updates.instagram_url = body.instagram_url
    if (body.twitter_url !== undefined) updates.twitter_url = body.twitter_url

    if (body.tagline !== undefined) updates.tagline = body.tagline
    if (body.bio !== undefined) updates.bio = body.bio
    if (body.services !== undefined) updates.services = body.services

    if (body.brand_color !== undefined) updates.brand_color = body.brand_color
    if (body.logo_url !== undefined) updates.logo_url = body.logo_url
    if (body.profile_photo_url !== undefined) updates.profile_photo_url = body.profile_photo_url
    if (body.background_image_url !== undefined) updates.background_image_url = body.background_image_url

    if (body.slug !== undefined) updates.slug = body.slug
    if (body.is_active !== undefined) updates.is_active = body.is_active
    if (body.enable_contact_form !== undefined) updates.enable_contact_form = body.enable_contact_form
    if (body.enable_appointment_booking !== undefined) updates.enable_appointment_booking = body.enable_appointment_booking

    // Perform update
    const { data, error } = await supabase
      .from('digital_business_cards')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('Error updating card:', { error })

      if (error.code === '23505') {
        throw ConflictError('A card with this slug already exists')
      }

      throw InternalError('Failed to update card')
    }

    const response: UpdateDigitalCardResponse = {
      card: data as DigitalBusinessCard,
    }

    return successResponse(response)
  } catch (error) {
    logger.error('Unexpected error in PATCH /api/digital-cards/:id:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

// =============================================
// DELETE /api/digital-cards/:id
// =============================================
// Delete a digital card (admin only)

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()

    if (!user) {
      throw AuthenticationError()
    }

    const supabase = await createClient()

    // Check if user is admin
    const { data: tenantUser, error: tenantError } = await supabase
      .from('tenant_users')
      .select('role, tenant_id')
      .eq('user_id', user.id)
      .single()

    if (tenantError || !tenantUser || tenantUser.role !== 'admin') {
      throw AuthorizationError('Admin access required')
    }

    // Delete the card
    const { error } = await supabase
      .from('digital_business_cards')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantUser.tenant_id)

    if (error) {
      logger.error('Error deleting card:', { error })
      throw InternalError('Failed to delete card')
    }

    return successResponse(null)
  } catch (error) {
    logger.error('Unexpected error in DELETE /api/digital-cards/:id:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
