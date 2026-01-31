/**
 * Storm Alerts API Route
 *
 * Fetch active storm alerts for the current tenant
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AuthenticationError, AuthorizationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { getUserTenantId } from '@/lib/auth/session'
import type { StormAlert } from '@/lib/storm/storm-types'

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw AuthenticationError()
    }

    // Get tenant for multi-tenant isolation
    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User is not associated with a tenant')
    }

    // Fetch active alerts (not dismissed and not expired) for this tenant
    const { data: alerts, error: alertsError } = await supabase
      .from('storm_alerts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('dismissed', false)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('created_at', { ascending: false })

    if (alertsError) {
      console.error('Error fetching alerts:', alertsError)
      throw InternalError('Failed to fetch alerts')
    }

    // Fetch associated storm events for alerts that have storm_event_id
    const stormEventIds = (alerts || [])
      .map(a => a.storm_event_id)
      .filter((id): id is string => id !== null)

    let stormEventsMap: Record<string, {
      id: string; event_date: string; event_type: string; magnitude: number | null;
      state: string; county: string | null; city: string | null;
      latitude: number | null; longitude: number | null;
    }> = {}

    if (stormEventIds.length > 0) {
      const { data: stormEvents } = await supabase
        .from('storm_events')
        .select('id, event_type, magnitude, latitude, longitude, state, county, city, event_date')
        .in('id', stormEventIds)

      if (stormEvents) {
        stormEventsMap = Object.fromEntries(stormEvents.map(e => [e.id, e]))
      }
    }

    // Transform database records to StormAlert type
    // Filter out alerts without storm events since the type requires it
    const transformedAlerts = (alerts || [])
      .filter((alert) => alert.storm_event_id && stormEventsMap[alert.storm_event_id])
      .map((alert) => {
        const se = stormEventsMap[alert.storm_event_id!]
        return {
          id: alert.id,
          type: alert.type,
          priority: alert.priority,
          stormEvent: {
            // Base StormEventData fields
            id: se.id,
            event_date: se.event_date,
            event_type: se.event_type,
            magnitude: se.magnitude,
            state: se.state,
            county: se.county,
            city: se.city,
            latitude: se.latitude,
            longitude: se.longitude,
            // Enhanced StormEvent fields
            severity: 'moderate' as const, // Default, should be calculated
            status: 'active' as const,
            alertLevel: 'warning' as const,
            affectedRadius: 10,
            confidence: 85,
            createdAt: alert.created_at ?? '',
            updatedAt: alert.updated_at ?? '',
          },
          affectedArea: alert.affected_area,
          message: alert.message,
          actionItems: alert.action_items || [],
          createdAt: alert.created_at ?? '',
          expiresAt: alert.expires_at,
          acknowledgedBy: alert.acknowledged_by || [],
          dismissed: alert.dismissed ?? false,
        }
      })

    return successResponse({
      alerts: transformedAlerts as unknown as StormAlert[],
      total: transformedAlerts.length,
    })
  } catch (error) {
    console.error('Get alerts error:', error)
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
