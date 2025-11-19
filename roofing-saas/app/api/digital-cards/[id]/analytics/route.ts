// =============================================
// Digital Cards API - Analytics Route
// =============================================
// Endpoint: GET /api/digital-cards/:id/analytics
// Purpose: Get comprehensive analytics for a digital business card
// Author: Claude Code
// Date: 2025-11-18
// =============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type {
  GetCardAnalyticsResponse,
  CardAnalyticsSummary,
  InteractionTypeSummary,
  PerformanceMetrics,
  ChartData,
  TimeSeriesDataPoint,
  BusinessCardInteraction,
} from '@/lib/digital-cards/types'

// Helper to get current user
async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

// =============================================
// GET /api/digital-cards/:id/analytics
// =============================================
// Returns comprehensive analytics for a card
// Query params:
//   - days: Number of days to analyze (default: 30)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '30')

    const supabase = await createClient()

    // Get user's tenant
    const { data: tenantUser, error: tenantError } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    if (tenantError || !tenantUser) {
      return NextResponse.json(
        { error: 'User not associated with any tenant' },
        { status: 403 }
      )
    }

    // Fetch card and verify access
    const { data: card, error: cardError } = await supabase
      .from('digital_business_cards')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantUser.tenant_id)
      .single()

    if (cardError || !card) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      )
    }

    // Calculate date range
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // 1. Analytics Summary (from card table)
    const summary: CardAnalyticsSummary = {
      total_views: card.total_views,
      total_vcard_downloads: card.total_vcard_downloads,
      total_phone_clicks: card.total_phone_clicks,
      total_email_clicks: card.total_email_clicks,
      total_contact_form_submissions: card.total_contact_form_submissions,
      total_interactions:
        card.total_views +
        card.total_vcard_downloads +
        card.total_phone_clicks +
        card.total_email_clicks +
        card.total_contact_form_submissions,
      unique_visitors: 0, // Will calculate from interactions
      last_viewed_at: card.last_viewed_at || null,
    }

    // 2. Fetch interactions for date range
    const { data: interactions, error: interactionsError } = await supabase
      .from('business_card_interactions')
      .select('*')
      .eq('card_id', id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (interactionsError) {
      console.error('Error fetching interactions:', interactionsError)
    }

    const interactionsList = (interactions || []) as BusinessCardInteraction[]

    // Calculate unique visitors
    const uniqueIPs = new Set(
      interactionsList
        .filter((i) => i.ip_address)
        .map((i) => i.ip_address)
    )
    summary.unique_visitors = uniqueIPs.size

    // 3. Interactions by Type
    const interactionsByType: Record<string, { count: number; unique_ips: Set<string> }> = {}

    interactionsList.forEach((interaction) => {
      const type = interaction.interaction_type
      if (!interactionsByType[type]) {
        interactionsByType[type] = { count: 0, unique_ips: new Set() }
      }
      interactionsByType[type].count++
      if (interaction.ip_address) {
        interactionsByType[type].unique_ips.add(interaction.ip_address)
      }
    })

    const interactions_by_type: InteractionTypeSummary[] = Object.entries(interactionsByType).map(
      ([type, data]) => {
        const typeInteractions = interactionsList.filter((i) => i.interaction_type === type)
        const latest = typeInteractions.length > 0 ? typeInteractions[0].created_at : null

        return {
          interaction_type: type as 'view' | 'vcard_download' | 'phone_click' | 'email_click' | 'website_click' | 'linkedin_click' | 'facebook_click' | 'instagram_click' | 'twitter_click' | 'contact_form_submit' | 'appointment_booked',
          count: data.count,
          unique_ips: data.unique_ips.size,
          latest_interaction: latest,
        }
      }
    )

    // Sort by count descending
    interactions_by_type.sort((a, b) => b.count - a.count)

    // 4. Performance Metrics
    const views = interactionsList.filter((i) => i.interaction_type === 'view').length
    const conversions = interactionsList.filter(
      (i) => i.interaction_type === 'contact_form_submit' || i.interaction_type === 'appointment_booked'
    ).length
    const conversionRate = views > 0 ? Math.round((conversions / views) * 100 * 100) / 100 : 0
    const avgDailyViews = views > 0 ? Math.round((views / days) * 100) / 100 : 0

    // Top referrer
    const referrers: Record<string, number> = {}
    interactionsList.forEach((i) => {
      if (i.referrer) {
        referrers[i.referrer] = (referrers[i.referrer] || 0) + 1
      }
    })
    const topReferrer = Object.entries(referrers).sort((a, b) => b[1] - a[1])[0]?.[0] || null

    // Top country
    const countries: Record<string, number> = {}
    interactionsList.forEach((i) => {
      if (i.country) {
        countries[i.country] = (countries[i.country] || 0) + 1
      }
    })
    const topCountry = Object.entries(countries).sort((a, b) => b[1] - a[1])[0]?.[0] || null

    // Top device
    const devices: Record<string, number> = {}
    interactionsList.forEach((i) => {
      if (i.device_type) {
        devices[i.device_type] = (devices[i.device_type] || 0) + 1
      }
    })
    const topDevice = Object.entries(devices).sort((a, b) => b[1] - a[1])[0]?.[0] || null

    const performance_metrics: PerformanceMetrics = {
      total_views: views,
      unique_visitors: summary.unique_visitors,
      conversion_rate: conversionRate,
      avg_daily_views: avgDailyViews,
      top_referrer: topReferrer,
      top_country: topCountry,
      top_device: topDevice,
    }

    // 5. Chart Data

    // Views over time (daily buckets)
    const viewsByDate: Record<string, { views: number; interactions: number }> = {}
    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      viewsByDate[dateStr] = { views: 0, interactions: 0 }
    }

    interactionsList.forEach((interaction) => {
      const dateStr = interaction.created_at.split('T')[0]
      if (viewsByDate[dateStr]) {
        if (interaction.interaction_type === 'view') {
          viewsByDate[dateStr].views++
        }
        viewsByDate[dateStr].interactions++
      }
    })

    const views_over_time: TimeSeriesDataPoint[] = Object.entries(viewsByDate)
      .map(([date, data]) => ({
        date,
        views: data.views,
        interactions: data.interactions,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Interactions by type (for pie chart)
    const interactionsByTypeChart = interactions_by_type.map((item) => ({
      type: item.interaction_type,
      count: item.count,
    }))

    // Devices (for pie chart)
    const devicesChart = Object.entries(devices).map(([device, count]) => ({
      device,
      count,
    }))

    // Countries (for bar chart)
    const countriesChart = Object.entries(countries)
      .map(([country, count]) => ({
        country,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) // Top 10 countries

    const chart_data: ChartData = {
      views_over_time,
      interactions_by_type: interactionsByTypeChart,
      devices: devicesChart,
      countries: countriesChart,
    }

    // 6. Recent Interactions (last 20)
    const recent_interactions = interactionsList.slice(0, 20)

    const response: GetCardAnalyticsResponse = {
      summary,
      interactions_by_type,
      recent_interactions,
      performance_metrics,
      chart_data,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Unexpected error in GET /api/digital-cards/:id/analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
