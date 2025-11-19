// =============================================
// Digital Cards API - Interactions Route
// =============================================
// Endpoint: POST /api/digital-cards/:id/interactions (PUBLIC)
// Purpose: Track interactions with digital business cards
// Author: Claude Code
// Date: 2025-11-18
// =============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type {
  CreateInteractionRequest,
  CreateInteractionResponse,
  BusinessCardInteraction,
} from '@/lib/digital-cards/types'
import { isValidInteractionType } from '@/lib/digital-cards/types'

// =============================================
// Helper: Extract device info from user agent
// =============================================
function getDeviceInfo(userAgent: string): {
  device_type: string
  browser: string
  os: string
} {
  const ua = userAgent.toLowerCase()

  // Device type
  let device_type = 'desktop'
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    device_type = 'tablet'
  } else if (
    /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
      userAgent
    )
  ) {
    device_type = 'mobile'
  }

  // Browser
  let browser = 'Unknown'
  if (ua.includes('firefox')) browser = 'Firefox'
  else if (ua.includes('samsungbrowser')) browser = 'Samsung Browser'
  else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera'
  else if (ua.includes('trident')) browser = 'Internet Explorer'
  else if (ua.includes('edge')) browser = 'Edge'
  else if (ua.includes('chrome')) browser = 'Chrome'
  else if (ua.includes('safari')) browser = 'Safari'

  // OS
  let os = 'Unknown'
  if (ua.includes('windows')) os = 'Windows'
  else if (ua.includes('mac')) os = 'macOS'
  else if (ua.includes('linux')) os = 'Linux'
  else if (ua.includes('android')) os = 'Android'
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS'

  return { device_type, browser, os }
}

// =============================================
// Helper: Get client IP address
// =============================================
function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  const real = request.headers.get('x-real-ip')
  const cfConnecting = request.headers.get('cf-connecting-ip')

  if (cfConnecting) return cfConnecting
  if (forwarded) return forwarded.split(',')[0].trim()
  if (real) return real

  return null
}

// =============================================
// POST /api/digital-cards/:id/interactions
// =============================================
// Public endpoint - no authentication required
// Tracks any interaction with a card (view, click, download, etc.)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      )
    }

    const body: CreateInteractionRequest = await request.json()

    // Validate interaction type
    if (!body.interaction_type || !isValidInteractionType(body.interaction_type)) {
      return NextResponse.json(
        { error: 'Invalid or missing interaction_type' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify card exists
    const { data: card, error: cardError } = await supabase
      .from('digital_business_cards')
      .select('id')
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (cardError || !card) {
      return NextResponse.json(
        { error: 'Card not found or inactive' },
        { status: 404 }
      )
    }

    // Extract tracking data
    const userAgent = request.headers.get('user-agent') || ''
    const referrer = request.headers.get('referer') || request.headers.get('referrer') || null
    const ipAddress = getClientIp(request)
    const deviceInfo = getDeviceInfo(userAgent)

    // Create interaction
    const { data, error } = await supabase
      .from('business_card_interactions')
      .insert({
        card_id: id,
        interaction_type: body.interaction_type,

        // Prospect information (for contact form submissions)
        prospect_name: body.prospect_name || null,
        prospect_email: body.prospect_email || null,
        prospect_phone: body.prospect_phone || null,
        prospect_company: body.prospect_company || null,
        prospect_message: body.prospect_message || null,

        // Tracking data
        ip_address: ipAddress,
        user_agent: userAgent,
        referrer: body.referrer || referrer,
        device_type: body.device_type || deviceInfo.device_type,
        browser: deviceInfo.browser,
        os: deviceInfo.os,

        // Geolocation would require external API (like ipapi.co)
        // For now, we'll leave country and city as null
        country: null,
        city: null,

        interaction_metadata: {
          timestamp: new Date().toISOString(),
        },
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating interaction:', error)
      return NextResponse.json(
        { error: 'Failed to track interaction' },
        { status: 500 }
      )
    }

    const response: CreateInteractionResponse = {
      interaction: data as BusinessCardInteraction,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/digital-cards/:id/interactions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
