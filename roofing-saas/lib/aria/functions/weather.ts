/**
 * ARIA Weather & Storm Intelligence Functions - Phase 8
 *
 * Storm tracking, weather forecasts, and customer impact analysis.
 * Leverages existing storm-intelligence.ts and weather API infrastructure.
 */

import { ariaFunctionRegistry } from '../function-registry'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import {
  enhanceStormEvent,
  findAffectedCustomers,
  analyzeAffectedArea,
  // createStormAlert available for future use
  activateStormResponse,
} from '@/lib/storm/storm-intelligence'
import type { Contact } from '@/lib/types/contact'
import type { StormEventData } from '@/lib/weather/causation-generator'

// -------------------------------------------------------------------
// Helper: Fetch weather data
// -------------------------------------------------------------------

interface WeatherData {
  current: {
    temp: number
    feels_like: number
    humidity: number
    wind_speed: number
    weather: {
      main: string
      description: string
    }
  }
  forecast: Array<{
    date: string
    temp_high: number
    temp_low: number
    weather: {
      main: string
      description: string
    }
    precipitation_chance: number
  }>
  safety: {
    status: 'safe' | 'caution' | 'unsafe'
    message: string
  }
  location: string
}

async function fetchWeather(lat?: number, lng?: number): Promise<WeatherData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const params = new URLSearchParams()
    if (lat !== undefined) params.set('lat', String(lat))
    if (lng !== undefined) params.set('lng', String(lng))

    const url = `${baseUrl}/api/weather${params.toString() ? '?' + params.toString() : ''}`
    const response = await fetch(url)

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch (error) {
    logger.error('Failed to fetch weather', { error })
    return null
  }
}

// -------------------------------------------------------------------
// get_weather_forecast - Check weather conditions for scheduling
// -------------------------------------------------------------------

ariaFunctionRegistry.register({
  name: 'get_weather_forecast',
  category: 'weather',
  description:
    'Get current weather and 3-day forecast with safety assessment for roofing work. Helps determine if conditions are safe for scheduling jobs.',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_weather_forecast',
    description: 'Get weather forecast and safety assessment for roofing work',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'City or address to check weather for',
        },
        latitude: {
          type: 'number',
          description: 'Latitude (optional if location provided)',
        },
        longitude: {
          type: 'number',
          description: 'Longitude (optional if location provided)',
        },
        contact_id: {
          type: 'string',
          description: 'Contact ID to get weather for their location',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const tenantId = context.tenantId
    const contactId = args.contact_id as string | undefined
    let lat = args.latitude as number | undefined
    let lng = args.longitude as number | undefined
    const location = args.location as string | undefined

    try {
      // Get coordinates from contact if provided
      if (contactId && (lat === undefined || lng === undefined)) {
        const supabase = await createClient()
        const { data: contact } = await supabase
          .from('contacts')
          .select('latitude, longitude, address_city, address_state')
          .eq('id', contactId)
          .eq('tenant_id', tenantId)
          .eq('is_deleted', false)
          .single()

        if (contact) {
          lat = contact.latitude ?? undefined
          lng = contact.longitude ?? undefined
        }
      }

      const weather = await fetchWeather(lat, lng)

      if (!weather) {
        return {
          success: false,
          message: 'Unable to fetch weather data. Please try again later.',
        }
      }

      // Build response
      const lines: string[] = ['🌤️ **Weather Report**', '']

      // Location
      lines.push(`**Location:** ${weather.location}${location ? ` (${location})` : ''}`)
      lines.push('')

      // Safety status with emoji
      const safetyEmoji = {
        safe: '✅',
        caution: '⚠️',
        unsafe: '🚫',
      }
      lines.push(`**Safety Status:** ${safetyEmoji[weather.safety.status]} ${weather.safety.status.toUpperCase()}`)
      lines.push(`${weather.safety.message}`)
      lines.push('')

      // Current conditions
      lines.push('**Current Conditions:**')
      lines.push(`• Temperature: ${weather.current.temp}°F (feels like ${weather.current.feels_like}°F)`)
      lines.push(`• ${weather.current.weather.description}`)
      lines.push(`• Wind: ${weather.current.wind_speed} mph`)
      lines.push(`• Humidity: ${weather.current.humidity}%`)
      lines.push('')

      // Forecast
      lines.push('**3-Day Forecast:**')
      for (const day of weather.forecast) {
        const rainIcon = day.precipitation_chance > 50 ? '🌧️' : day.precipitation_chance > 20 ? '🌦️' : '☀️'
        lines.push(
          `${rainIcon} **${day.date}**: ${day.temp_high}°/${day.temp_low}° - ${day.weather.description} (${day.precipitation_chance}% rain)`
        )
      }

      // Scheduling recommendation
      lines.push('')
      if (weather.safety.status === 'safe') {
        lines.push('✅ **Recommendation:** Good day for roofing work!')
      } else if (weather.safety.status === 'caution') {
        lines.push('⚠️ **Recommendation:** Monitor conditions closely before scheduling.')
      } else {
        lines.push('🚫 **Recommendation:** Consider rescheduling to a safer day.')
      }

      return {
        success: true,
        message: lines.join('\n'),
        weather,
        safeForWork: weather.safety.status === 'safe',
      }
    } catch (error) {
      logger.error('get_weather_forecast failed', { error })
      return {
        success: false,
        message: `Weather check failed: ${(error as Error).message}`,
      }
    }
  },
})

// -------------------------------------------------------------------
// get_recent_storms - Get recent storm events in the area
// -------------------------------------------------------------------

ariaFunctionRegistry.register({
  name: 'get_recent_storms',
  category: 'weather',
  description:
    'Get recent storm events (hail, wind, tornado) in the service area. Shows severity, location, and affected customer count.',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_recent_storms',
    description: 'Get recent storm events in the area',
    parameters: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Number of days to look back (default: 7, max: 30)',
        },
        state: {
          type: 'string',
          description: 'Filter by state (e.g., "TN")',
        },
        city: {
          type: 'string',
          description: 'Filter by city',
        },
        event_type: {
          type: 'string',
          enum: ['hail', 'thunderstorm_wind', 'tornado'],
          description: 'Filter by event type',
        },
        min_severity: {
          type: 'string',
          enum: ['minor', 'moderate', 'severe', 'extreme'],
          description: 'Minimum severity level',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const tenantId = context.tenantId
    const days = Math.min((args.days as number) || 7, 30)
    const state = args.state as string | undefined
    const city = args.city as string | undefined
    const eventType = args.event_type as string | undefined
    const minSeverity = args.min_severity as string | undefined

    try {
      const supabase = await createClient()

      // Calculate date range
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Query storm events from database
      let query = supabase
        .from('storm_events')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('event_date', startDate.toISOString())
        .order('event_date', { ascending: false })
        .limit(20)

      if (state) {
        query = query.eq('state', state.toUpperCase())
      }
      if (city) {
        query = query.ilike('city', `%${city}%`)
      }
      if (eventType) {
        query = query.eq('event_type', eventType)
      }

      const { data: storms, error } = await query

      if (error) {
        // Table might not exist - return no storms
        return {
          success: true,
          message: 'No recent storm events found in the database. Storm tracking may not be active for this area.',
          storms: [],
        }
      }

      if (!storms || storms.length === 0) {
        return {
          success: true,
          message: `No storm events found in the last ${days} days. That's good news!`,
          storms: [],
        }
      }

      // Filter by severity if specified
      const severityOrder = { minor: 1, moderate: 2, severe: 3, extreme: 4 }
      let filteredStorms = storms
      if (minSeverity) {
        const minLevel = severityOrder[minSeverity as keyof typeof severityOrder] || 1
        filteredStorms = storms.filter((s) => {
          const stormLevel = severityOrder[s.severity as keyof typeof severityOrder] || 1
          return stormLevel >= minLevel
        })
      }

      // Build response
      const lines: string[] = ['⛈️ **Recent Storm Events**', '']
      lines.push(`Showing ${filteredStorms.length} storm${filteredStorms.length !== 1 ? 's' : ''} in the last ${days} days:`)
      lines.push('')

      const severityEmoji = {
        minor: '🟡',
        moderate: '🟠',
        severe: '🔴',
        extreme: '💀',
      }

      const typeLabel = {
        hail: '🧊 Hail',
        thunderstorm_wind: '💨 Wind',
        tornado: '🌪️ Tornado',
      }

      for (const storm of filteredStorms.slice(0, 10)) {
        const emoji = severityEmoji[storm.severity as keyof typeof severityEmoji] || '🟡'
        const type = typeLabel[storm.event_type as keyof typeof typeLabel] || storm.event_type
        const location = storm.city ? `${storm.city}, ${storm.state}` : storm.state
        const date = new Date(storm.event_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })

        lines.push(`${emoji} **${type}** - ${location} (${date})`)

        if (storm.magnitude) {
          if (storm.event_type === 'hail') {
            lines.push(`   Hail size: ${storm.magnitude}"`)
          } else if (storm.event_type === 'thunderstorm_wind') {
            lines.push(`   Wind speed: ${storm.magnitude} mph`)
          }
        }

        if (storm.affected_customers) {
          lines.push(`   ${storm.affected_customers} customers potentially affected`)
        }
        lines.push('')
      }

      if (filteredStorms.length > 10) {
        lines.push(`...and ${filteredStorms.length - 10} more storms`)
      }

      return {
        success: true,
        message: lines.join('\n'),
        storms: filteredStorms,
        count: filteredStorms.length,
      }
    } catch (error) {
      logger.error('get_recent_storms failed', { error })
      return {
        success: false,
        message: `Storm lookup failed: ${(error as Error).message}`,
      }
    }
  },
})

// -------------------------------------------------------------------
// check_storm_impact - Find customers affected by a storm
// -------------------------------------------------------------------

ariaFunctionRegistry.register({
  name: 'check_storm_impact',
  category: 'weather',
  description:
    'Find customers potentially affected by a specific storm. Shows damage probability, priority, and recommended actions.',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'check_storm_impact',
    description: 'Find customers affected by a storm event',
    parameters: {
      type: 'object',
      properties: {
        storm_id: {
          type: 'string',
          description: 'Storm event ID to check',
        },
        latitude: {
          type: 'number',
          description: 'Storm center latitude',
        },
        longitude: {
          type: 'number',
          description: 'Storm center longitude',
        },
        radius_miles: {
          type: 'number',
          description: 'Search radius in miles (default: 10)',
        },
        min_probability: {
          type: 'number',
          description: 'Minimum damage probability 0-100 (default: 25)',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const tenantId = context.tenantId
    const stormId = args.storm_id as string | undefined
    let lat = args.latitude as number | undefined
    let lng = args.longitude as number | undefined
    const radiusMiles = (args.radius_miles as number) || 10
    const minProbability = (args.min_probability as number) || 25

    try {
      const supabase = await createClient()

      // Get storm data if ID provided
      let stormData: StormEventData | null = null
      if (stormId) {
        const { data: storm } = await supabase
          .from('storm_events')
          .select('*')
          .eq('id', stormId)
          .eq('tenant_id', tenantId)
          .single()

        if (storm) {
          stormData = storm
          lat = storm.latitude ?? lat
          lng = storm.longitude ?? lng
        }
      }

      if (lat === undefined || lng === undefined) {
        return {
          success: false,
          message: 'Please provide storm_id or latitude/longitude coordinates.',
        }
      }

      // Get all contacts with coordinates in the area
      const { data: contacts, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_deleted', false)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)

      if (contactError || !contacts) {
        return {
          success: false,
          message: 'Failed to fetch contacts for impact analysis.',
        }
      }

      // Create a mock storm event if we don't have actual data
      const mockStorm: StormEventData = stormData || {
        id: 'analysis',
        event_type: 'hail',
        state: 'TN',
        city: undefined,
        latitude: lat,
        longitude: lng,
        magnitude: 1.0,
        event_date: new Date().toISOString(),
        event_narrative: undefined,
        property_damage: undefined,
        path_width: undefined,
        path_length: undefined,
      }

      // Enhance storm and find affected customers
      const enhancedStorm = enhanceStormEvent(mockStorm, 'active')
      enhancedStorm.affectedRadius = radiusMiles

      const affectedCustomers = findAffectedCustomers(
        enhancedStorm,
        contacts as Contact[],
        { maxDistance: radiusMiles, minProbability }
      )

      const analysis = analyzeAffectedArea(enhancedStorm, affectedCustomers)

      // Build response
      const lines: string[] = ['🎯 **Storm Impact Analysis**', '']

      if (affectedCustomers.length === 0) {
        lines.push('No customers found in the affected area with significant damage probability.')
        lines.push('')
        lines.push(`Searched within ${radiusMiles} miles of coordinates (${lat?.toFixed(4)}, ${lng?.toFixed(4)})`)
        lines.push(`Minimum probability threshold: ${minProbability}%`)
      } else {
        lines.push(`**${affectedCustomers.length} customers potentially affected**`)
        lines.push('')

        // Summary stats
        lines.push('**Summary:**')
        lines.push(`• High priority: ${analysis.highPriorityCount}`)
        lines.push(`• Estimated damage: $${(analysis.estimatedRevenue / 1000).toFixed(0)}K`)
        lines.push(`• Residential: ${analysis.coverage.residential}`)
        lines.push(`• Commercial: ${analysis.coverage.commercial}`)
        lines.push('')

        // Top affected customers
        lines.push('**Top Affected Customers:**')
        for (const customer of affectedCustomers.slice(0, 5)) {
          const priorityEmoji = {
            urgent: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢',
          }
          const emoji = priorityEmoji[customer.priority]
          const name = `${customer.contact.first_name || ''} ${customer.contact.last_name || ''}`.trim() || 'Unknown'

          lines.push(`${emoji} **${name}** (${customer.priority})`)
          lines.push(`   ${customer.damagePrediction.probability}% damage probability`)
          lines.push(`   Est. damage: $${customer.damagePrediction.estimatedDamage.toLocaleString()}`)
          lines.push(`   ${customer.distance.toFixed(1)} miles from storm center`)
          lines.push('')
        }

        if (affectedCustomers.length > 5) {
          lines.push(`...and ${affectedCustomers.length - 5} more customers`)
        }

        // Recommendations
        lines.push('')
        lines.push('**Recommended Actions:**')
        if (analysis.highPriorityCount > 0) {
          lines.push(`• Contact ${analysis.highPriorityCount} high-priority customers immediately`)
        }
        lines.push('• Review damage predictions and adjust crew scheduling')
        if (analysis.estimatedRevenue >= 50000) {
          lines.push('• Consider activating storm response mode')
        }
      }

      return {
        success: true,
        message: lines.join('\n'),
        affectedCustomers: affectedCustomers.map((c) => ({
          id: c.contact.id,
          name: `${c.contact.first_name} ${c.contact.last_name}`,
          priority: c.priority,
          probability: c.damagePrediction.probability,
          estimatedDamage: c.damagePrediction.estimatedDamage,
          distance: c.distance,
        })),
        analysis,
        totalAffected: affectedCustomers.length,
      }
    } catch (error) {
      logger.error('check_storm_impact failed', { error })
      return {
        success: false,
        message: `Impact analysis failed: ${(error as Error).message}`,
      }
    }
  },
})

// -------------------------------------------------------------------
// activate_storm_mode - Turn on storm response mode
// -------------------------------------------------------------------

ariaFunctionRegistry.register({
  name: 'activate_storm_mode',
  category: 'weather',
  description:
    'Activate storm response mode for the business. Enables auto-notifications, priority routing, and extended hours.',
  riskLevel: 'medium',
  requiresConfirmation: true,
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'activate_storm_mode',
    description: 'Activate storm response mode for urgent storm situations',
    parameters: {
      type: 'object',
      properties: {
        storm_id: {
          type: 'string',
          description: 'Storm event ID triggering the activation',
        },
        auto_notifications: {
          type: 'boolean',
          description: 'Enable automatic customer notifications',
        },
        extended_hours: {
          type: 'boolean',
          description: 'Enable extended business hours',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const userId = context.userId
    const stormId = args.storm_id as string | undefined
    const autoNotifications = (args.auto_notifications as boolean) ?? true
    const extendedHours = (args.extended_hours as boolean) ?? true

    try {
      // Activate storm response mode
      const config = activateStormResponse(stormId || 'manual', userId, {
        autoNotifications,
        extendedHours,
        autoLeadGeneration: true,
        priorityRouting: true,
      })

      const lines: string[] = ['🚨 **Storm Response Mode Activated**', '']

      lines.push('The following features are now enabled:')
      lines.push('')

      if (config.settings.autoNotifications) {
        lines.push('✅ Auto-notifications to affected customers')
      }
      if (config.settings.autoLeadGeneration) {
        lines.push('✅ Automatic lead generation from storm areas')
      }
      if (config.settings.priorityRouting) {
        lines.push('✅ Priority routing for storm-related calls')
      }
      if (config.settings.extendedHours) {
        lines.push('✅ Extended business hours')
      }

      lines.push('')
      lines.push('To deactivate storm mode, say "deactivate storm mode" or wait for automatic deactivation after 24 hours.')

      return {
        success: true,
        message: lines.join('\n'),
        config,
      }
    } catch (error) {
      logger.error('activate_storm_mode failed', { error })
      return {
        success: false,
        message: `Failed to activate storm mode: ${(error as Error).message}`,
      }
    }
  },
})

// -------------------------------------------------------------------
// get_storm_alerts - Get active storm alerts
// -------------------------------------------------------------------

ariaFunctionRegistry.register({
  name: 'get_storm_alerts',
  category: 'weather',
  description:
    'Get active storm alerts and warnings for the service area. Shows priority, affected areas, and recommended actions.',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_storm_alerts',
    description: 'Get active storm alerts for the area',
    parameters: {
      type: 'object',
      properties: {
        include_dismissed: {
          type: 'boolean',
          description: 'Include dismissed alerts (default: false)',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'Filter by minimum priority',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const tenantId = context.tenantId
    const includeDismissed = args.include_dismissed as boolean || false
    const minPriority = args.priority as string | undefined

    try {
      const supabase = await createClient()

      // Query active alerts
      let query = supabase
        .from('storm_alerts')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (!includeDismissed) {
        query = query.eq('dismissed', false)
      }

      const { data: alerts, error } = await query

      if (error) {
        // Table might not exist
        return {
          success: true,
          message: '✅ No active storm alerts at this time.',
          alerts: [],
        }
      }

      if (!alerts || alerts.length === 0) {
        return {
          success: true,
          message: '✅ No active storm alerts at this time. All clear!',
          alerts: [],
        }
      }

      // Filter by priority if specified
      const priorityOrder = { low: 1, medium: 2, high: 3, critical: 4 }
      let filteredAlerts = alerts
      if (minPriority) {
        const minLevel = priorityOrder[minPriority as keyof typeof priorityOrder] || 1
        filteredAlerts = alerts.filter((a) => {
          const alertLevel = priorityOrder[a.priority as keyof typeof priorityOrder] || 1
          return alertLevel >= minLevel
        })
      }

      // Build response
      const lines: string[] = ['🚨 **Active Storm Alerts**', '']

      const priorityEmoji = {
        low: '🟢',
        medium: '🟡',
        high: '🟠',
        critical: '🔴',
      }

      for (const alert of filteredAlerts) {
        const emoji = priorityEmoji[alert.priority as keyof typeof priorityEmoji] || '🟡'
        lines.push(`${emoji} **${alert.type?.replace(/_/g, ' ').toUpperCase()}** (${alert.priority})`)
        lines.push(`${alert.message}`)
        lines.push('')

        if (alert.action_items && Array.isArray(alert.action_items)) {
          lines.push('**Actions:**')
          for (const action of alert.action_items) {
            lines.push(`• ${action}`)
          }
          lines.push('')
        }
      }

      return {
        success: true,
        message: lines.join('\n'),
        alerts: filteredAlerts,
        count: filteredAlerts.length,
      }
    } catch (error) {
      logger.error('get_storm_alerts failed', { error })
      return {
        success: false,
        message: `Failed to get alerts: ${(error as Error).message}`,
      }
    }
  },
})
