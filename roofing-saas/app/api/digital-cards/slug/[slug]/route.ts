// =============================================
// Digital Cards API - Public Slug Route
// =============================================
// Endpoint: GET /api/digital-cards/slug/:slug (PUBLIC)
// Purpose: Fetch card by slug for public card page
// Author: Claude Code
// Date: 2025-11-18
// =============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { GetCardBySlugResponse, PublicCardData } from '@/lib/digital-cards/types'

// =============================================
// GET /api/digital-cards/slug/:slug
// =============================================
// Public endpoint - no authentication required
// Returns only public-facing card data (excludes analytics)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    if (!slug) {
      return NextResponse.json(
        { error: 'Missing required parameter: slug' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Fetch card by slug (only active cards)
    const { data, error } = await supabase
      .from('digital_business_cards')
      .select(`
        id,
        full_name,
        job_title,
        phone,
        email,
        company_name,
        company_address,
        company_phone,
        company_email,
        company_website,
        linkedin_url,
        facebook_url,
        instagram_url,
        twitter_url,
        tagline,
        bio,
        services,
        brand_color,
        logo_url,
        profile_photo_url,
        background_image_url,
        enable_contact_form,
        enable_appointment_booking
      `)
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Card not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching card by slug:', error)
      return NextResponse.json(
        { error: 'Failed to fetch card' },
        { status: 500 }
      )
    }

    const response: GetCardBySlugResponse = {
      card: data as PublicCardData,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Unexpected error in GET /api/digital-cards/slug/:slug:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
