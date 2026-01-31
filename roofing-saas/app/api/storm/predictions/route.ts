/**
 * Storm Predictions API Route
 *
 * Generate storm event predictions and affected customer analysis
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  enhanceStormEvent,
  findAffectedCustomers,
  analyzeAffectedArea,
  createStormAlert,
} from '@/lib/storm/storm-intelligence'
import type { StormEventData } from '@/lib/weather/causation-generator'
import type { Contact } from '@/lib/types/contact'
import type { StormPredictionResponse } from '@/lib/storm/storm-types'
import { AuthenticationError, ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw AuthenticationError()
    }

    // Parse request body
    const body = await request.json()
    const { noaaEvent, maxDistance, minProbability } = body as {
      noaaEvent: StormEventData
      maxDistance?: number
      minProbability?: number
    }

    if (!noaaEvent) {
      throw ValidationError('Missing required field: noaaEvent')
    }

    // Enhance storm event with intelligence
    const stormEvent = enhanceStormEvent(noaaEvent, 'active')

    // Get all contacts with coordinates
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .eq('is_deleted', false)

    if (contactsError) {
      console.error('Error fetching contacts:', contactsError)
      throw InternalError('Failed to fetch contacts')
    }

    // Find affected customers
    const affectedCustomers = findAffectedCustomers(
      stormEvent,
      (contacts ?? []) as unknown as Contact[],
      { maxDistance, minProbability }
    )

    // Analyze affected area
    const analysis = analyzeAffectedArea(stormEvent, affectedCustomers)

    // Create alert
    createStormAlert(stormEvent, analysis)

    // Generate recommendations
    const recommendations: string[] = []

    if (analysis.highPriorityCount > 0) {
      recommendations.push(
        `Contact ${analysis.highPriorityCount} high-priority customers immediately`
      )
    }

    if (analysis.affectedCustomers >= 10) {
      recommendations.push('Consider activating Storm Response Mode')
    }

    if (analysis.estimatedRevenue >= 100000) {
      recommendations.push(
        `Pre-position crews - potential revenue: $${(analysis.estimatedRevenue / 1000).toFixed(0)}K`
      )
    }

    if (affectedCustomers.length > 0) {
      recommendations.push(
        `Monitor storm path and update predictions every 30 minutes`
      )
    }

    const response: StormPredictionResponse = {
      success: true,
      stormEvent,
      affectedCustomers,
      analysis,
      recommendations,
    }

    return successResponse(response)
  } catch (error) {
    console.error('Storm prediction error:', error)
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw AuthenticationError()
    }

    // Get recent storm events (last 14 days)
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const { data: events, error: eventsError } = await supabase
      .from('storm_events')
      .select('*')
      .gte('event_date', fourteenDaysAgo.toISOString().split('T')[0])
      .order('event_date', { ascending: false })
      .limit(20)

    if (eventsError) {
      console.error('Error fetching storm events:', eventsError)
      throw InternalError('Failed to fetch storm events')
    }

    // Enhance each event with intelligence metadata
    const predictions = (events || []).map(event => {
      const stormEventData: StormEventData = {
        id: event.id,
        event_date: event.event_date,
        event_type: event.event_type as StormEventData['event_type'],
        magnitude: event.magnitude,
        state: event.state,
        county: event.county ?? undefined,
        city: event.city ?? undefined,
        latitude: event.latitude ?? undefined,
        longitude: event.longitude ?? undefined,
        path_length: event.path_length ?? undefined,
        path_width: event.path_width ?? undefined,
        property_damage: event.property_damage ?? undefined,
        event_narrative: event.event_narrative ?? undefined,
      }

      // Determine status based on event date
      const eventDate = new Date(event.event_date)
      const now = new Date()
      const daysDiff = Math.floor((now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24))
      const status = daysDiff <= 1 ? 'active' : daysDiff <= 3 ? 'passed' : 'dissipated'

      return enhanceStormEvent(stormEventData, status as 'approaching' | 'active' | 'passed' | 'dissipated')
    })

    return successResponse({
      predictions,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Get predictions error:', error)
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
