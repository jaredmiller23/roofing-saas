// =============================================
// Digital Cards API - Main Routes
// =============================================
// Endpoints: GET /api/digital-cards, POST /api/digital-cards
// Purpose: List and create digital business cards
// Author: Claude Code
// Date: 2025-11-18
// =============================================

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, ValidationError, ConflictError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse, createdResponse } from '@/lib/api/response'
import type {
  DigitalBusinessCard,
  GetDigitalCardsResponse,
  CreateDigitalCardRequest,
  CreateDigitalCardResponse,
} from '@/lib/digital-cards/types'

// =============================================
// GET /api/digital-cards
// =============================================
// List all digital cards for the user's tenant
// Query params:
//   - user_id: Filter by specific user
//   - is_active: Filter by active status

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('user_id')
    const isActive = searchParams.get('is_active')

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

    // Build query
    let query = supabase
      .from('digital_business_cards')
      .select('*')
      .eq('tenant_id', tenantUser.tenant_id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (userId) {
      // Handle special "current" value to mean the authenticated user
      const targetUserId = userId === 'current' ? user.id : userId
      query = query.eq('user_id', targetUserId)
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching digital cards:', { error })
      throw InternalError('Failed to fetch digital cards')
    }

    const response: GetDigitalCardsResponse = {
      cards: (data || []) as DigitalBusinessCard[],
      total: data?.length || 0,
    }

    return successResponse(response)
  } catch (error) {
    logger.error('Unexpected error in GET /api/digital-cards:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

// =============================================
// POST /api/digital-cards
// =============================================
// Create a new digital business card
// Admin-only or users can create their own card

export async function POST(request: NextRequest) {
  try {
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

    const body: CreateDigitalCardRequest = await request.json()

    // Validate required fields
    if (!body.full_name) {
      throw ValidationError('Missing required field: full_name')
    }

    // Check if user already has a card (one card per user)
    const { data: existingCard } = await supabase
      .from('digital_business_cards')
      .select('id')
      .eq('tenant_id', tenantUser.tenant_id)
      .eq('user_id', user.id)
      .single()

    if (existingCard) {
      throw ConflictError('User already has a digital business card. Use PATCH to update.')
    }

    // Create the card
    const { data, error } = await supabase
      .from('digital_business_cards')
      .insert({
        tenant_id: tenantUser.tenant_id,
        user_id: user.id,
        full_name: body.full_name,
        job_title: body.job_title || null,
        phone: body.phone || null,
        email: body.email || user.email || null,

        company_name: body.company_name || null,
        company_address: body.company_address || null,
        company_phone: body.company_phone || null,
        company_email: body.company_email || null,
        company_website: body.company_website || null,

        linkedin_url: body.linkedin_url || null,
        facebook_url: body.facebook_url || null,
        instagram_url: body.instagram_url || null,
        twitter_url: body.twitter_url || null,

        tagline: body.tagline || null,
        bio: body.bio || null,
        services: body.services || null,

        brand_color: body.brand_color || '#3b82f6',
        slug: body.slug || null, // Will be auto-generated by trigger if null
        enable_contact_form: body.enable_contact_form ?? true,
        enable_appointment_booking: body.enable_appointment_booking ?? false,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating digital card:', { error })

      if (error.code === '23505') {
        throw ConflictError('A card with this slug already exists')
      }

      throw InternalError('Failed to create digital card')
    }

    const response: CreateDigitalCardResponse = {
      card: data as DigitalBusinessCard,
    }

    return createdResponse(response)
  } catch (error) {
    logger.error('Unexpected error in POST /api/digital-cards:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
