import { NextRequest } from 'next/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import {
  AuthenticationError,
  AuthorizationError,
  InternalError
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'

/**
 * POST /api/voice/weather
 * Get weather forecast for location (default: Nashville, TN)
 *
 * Body: { location?: string, days?: number }
 * Returns: { current: {...}, forecast: [...] }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('User not authenticated')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User is not associated with a tenant')
    }

    const body = await request.json().catch(() => ({}))
    const { location = 'Nashville,TN,US', days = 3 } = body

    logger.apiRequest('POST', '/api/voice/weather', { tenantId, location, days })

    // TODO: Add OPENWEATHER_API_KEY to .env.local
    const apiKey = process.env.OPENWEATHER_API_KEY
    if (!apiKey) {
      // For now, return mock data
      logger.warn('OpenWeatherMap API key not configured, returning mock data')

      const mockData = {
        location: location,
        current: {
          temperature: 72,
          feels_like: 70,
          conditions: 'Partly Cloudy',
          humidity: 65,
          wind_speed: 8,
          wind_direction: 'NW'
        },
        forecast: [
          {
            date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            day: 'Tomorrow',
            high: 75,
            low: 58,
            conditions: 'Sunny',
            precipitation: 0,
            wind_speed: 10
          },
          {
            date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
            day: 'Day After',
            high: 78,
            low: 62,
            conditions: 'Partly Cloudy',
            precipitation: 20,
            wind_speed: 12
          }
        ],
        safe_to_work: true,
        notes: 'Good roofing conditions. Wind speeds are safe (under 20 mph).'
      }

      const duration = Date.now() - startTime
      logger.apiResponse('POST', '/api/voice/weather', 200, duration)
      return successResponse(mockData)
    }

    // Real OpenWeatherMap API call (when key is configured)
    const geoResponse = await fetch(
      `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${apiKey}`
    )

    if (!geoResponse.ok) {
      throw InternalError('Failed to geocode location')
    }

    const geoData = await geoResponse.json()
    if (!geoData.length) {
      throw InternalError('Location not found')
    }

    const { lat, lon } = geoData[0]

    // Get current weather + forecast
    const weatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`
    )

    if (!weatherResponse.ok) {
      throw InternalError('Failed to fetch weather data')
    }

    const weatherData = await weatherResponse.json()

    // Parse forecast data
    const current = weatherData.list[0]
    const forecastByDay = weatherData.list
      .filter((_: unknown, i: number) => i % 8 === 0) // Every 8th item (24 hours)
      .slice(0, days)
      .map((item: Record<string, unknown>) => ({
        date: (item.dt_txt as string).split(' ')[0],
        day: new Date((item.dt as number) * 1000).toLocaleDateString('en-US', { weekday: 'long' }),
        high: Math.round((item.main as { temp_max: number }).temp_max),
        low: Math.round((item.main as { temp_min: number }).temp_min),
        conditions: (item.weather as Array<{ main: string }>)[0].main,
        precipitation: Math.round(((item.pop as number) || 0) * 100),
        wind_speed: Math.round((item.wind as { speed: number }).speed)
      }))

    // Safety assessment for roofing work
    const maxWindSpeed = Math.max(...forecastByDay.map((d: { wind_speed: number }) => d.wind_speed))
    const currentWeather = (current.weather as Array<{ main: string; description: string }>)[0]
    const safeToWork = maxWindSpeed < 20 && currentWeather.main !== 'Rain'

    const result = {
      location: (weatherData.city as { name: string }).name,
      current: {
        temperature: Math.round((current.main as { temp: number }).temp),
        feels_like: Math.round((current.main as { feels_like: number }).feels_like),
        conditions: currentWeather.description,
        humidity: (current.main as { humidity: number }).humidity,
        wind_speed: Math.round((current.wind as { speed: number }).speed),
        wind_direction: getWindDirection((current.wind as { deg: number }).deg)
      },
      forecast: forecastByDay,
      safe_to_work: safeToWork,
      notes: safeToWork
        ? 'Good roofing conditions.'
        : maxWindSpeed >= 20
          ? 'Wind speeds unsafe for roofing work (20+ mph).'
          : 'Precipitation expected. Not recommended for roofing.'
    }

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/voice/weather', 200, duration)
    return successResponse(result)
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Weather API error', { error, duration })
    return errorResponse(error as Error)
  }
}

function getWindDirection(degrees: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round(degrees / 45) % 8
  return directions[index]
}
