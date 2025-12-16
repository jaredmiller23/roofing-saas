/**
 * Storm Alerts API Route
 *
 * Fetch active storm alerts for the current tenant
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { StormAlert } from '@/lib/storm/storm-types'

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch active alerts (not dismissed and not expired)
    const { data: alerts, error: alertsError } = await supabase
      .from('storm_alerts')
      .select(`
        *,
        storm_events (
          id,
          event_type,
          magnitude,
          latitude,
          longitude,
          state,
          county,
          city,
          event_date
        )
      `)
      .eq('dismissed', false)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('created_at', { ascending: false })

    if (alertsError) {
      console.error('Error fetching alerts:', alertsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch alerts' },
        { status: 500 }
      )
    }

    // Transform database records to StormAlert type
    // Filter out alerts without storm events since the type requires it
    const transformedAlerts: StormAlert[] = (alerts || [])
      .filter((alert) => alert.storm_events) // Only include alerts with storm events
      .map((alert) => ({
        id: alert.id,
        type: alert.type,
        priority: alert.priority,
        stormEvent: {
          // Base StormEventData fields
          id: alert.storm_events.id,
          event_date: alert.storm_events.event_date,
          event_type: alert.storm_events.event_type,
          magnitude: alert.storm_events.magnitude,
          state: alert.storm_events.state,
          county: alert.storm_events.county,
          city: alert.storm_events.city,
          latitude: alert.storm_events.latitude,
          longitude: alert.storm_events.longitude,
          // Enhanced StormEvent fields
          severity: 'moderate' as const, // Default, should be calculated
          status: 'active' as const,
          alertLevel: 'warning' as const,
          affectedRadius: 10,
          confidence: 85,
          createdAt: alert.created_at,
          updatedAt: alert.updated_at,
        },
        affectedArea: alert.affected_area,
        message: alert.message,
        actionItems: alert.action_items || [],
        createdAt: alert.created_at,
        expiresAt: alert.expires_at,
        acknowledgedBy: alert.acknowledged_by || [],
        dismissed: alert.dismissed,
      }))

    return NextResponse.json({
      success: true,
      alerts: transformedAlerts,
      total: transformedAlerts.length,
    })
  } catch (error) {
    console.error('Get alerts error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
