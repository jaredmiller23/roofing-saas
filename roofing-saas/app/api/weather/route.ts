import { NextRequest } from 'next/server'
import { InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

// Default location: Johnson City, TN (Tri-Cities center)
const DEFAULT_LAT = 36.3134
const DEFAULT_LNG = -82.3535

// Cache for 15 minutes
let weatherCache: {
  data: WeatherData | null
  timestamp: number
  key: string // cache key based on lat/lng
} = {
  data: null,
  timestamp: 0,
  key: '',
}
const CACHE_DURATION_MS = 15 * 60 * 1000 // 15 minutes

interface WeatherData {
  current: {
    temp: number
    feels_like: number
    humidity: number
    wind_speed: number
    weather: {
      main: string
      description: string
      icon: string
    }
  }
  forecast: Array<{
    date: string
    temp_high: number
    temp_low: number
    weather: {
      main: string
      description: string
      icon: string
    }
    precipitation_chance: number
  }>
  safety: {
    status: 'safe' | 'caution' | 'unsafe'
    message: string
  }
  location: string
  last_updated: string
}

// One Call 3.0 API response types
interface OneCallResponse {
  lat: number
  lon: number
  timezone: string
  current: {
    dt: number
    temp: number
    feels_like: number
    humidity: number
    wind_speed: number
    weather: Array<{
      id: number
      main: string
      description: string
      icon: string
    }>
  }
  daily: Array<{
    dt: number
    temp: {
      min: number
      max: number
    }
    weather: Array<{
      id: number
      main: string
      description: string
      icon: string
    }>
    pop: number // Probability of precipitation (0-1)
  }>
}

function assessSafety(
  windSpeed: number,
  weatherMain: string,
  precipChance: number
): { status: 'safe' | 'caution' | 'unsafe'; message: string } {
  // Check for dangerous conditions
  if (weatherMain.toLowerCase().includes('thunder') || weatherMain.toLowerCase().includes('storm')) {
    return { status: 'unsafe', message: 'Thunderstorms - not safe to work on roofs' }
  }

  if (windSpeed > 25) {
    return { status: 'unsafe', message: `High winds (${Math.round(windSpeed)} mph) - unsafe for roofing` }
  }

  if (weatherMain.toLowerCase().includes('rain') || weatherMain.toLowerCase().includes('snow')) {
    return { status: 'unsafe', message: 'Precipitation - surfaces are slippery' }
  }

  // Caution conditions
  if (windSpeed > 15) {
    return { status: 'caution', message: `Moderate winds (${Math.round(windSpeed)} mph) - use caution` }
  }

  if (precipChance > 50) {
    return { status: 'caution', message: `${precipChance}% chance of rain - monitor conditions` }
  }

  // Safe conditions
  return { status: 'safe', message: 'Good conditions for roofing work' }
}

async function fetchWeatherFromAPI(lat: number, lng: number): Promise<WeatherData | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY

  if (!apiKey) {
    // Return mock data for development/testing
    console.warn('OPENWEATHER_API_KEY not set - using mock data')
    return getMockWeatherData()
  }

  try {
    // Use One Call API 3.0 - single call gets current + daily forecast
    const response = await fetch(
      `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lng}&units=imperial&exclude=minutely,hourly,alerts&appid=${apiKey}`
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenWeatherMap One Call 3.0 API error:', response.status, errorText)
      return getMockWeatherData()
    }

    const data: OneCallResponse = await response.json()

    // Process daily forecast (next 3 days, skip today)
    const dailyForecasts = data.daily.slice(1, 4).map((day) => ({
      date: new Date(day.dt * 1000).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
      temp_high: Math.round(day.temp.max),
      temp_low: Math.round(day.temp.min),
      weather: {
        main: day.weather[0].main,
        description: day.weather[0].description,
        icon: day.weather[0].icon,
      },
      precipitation_chance: Math.round(day.pop * 100),
    }))

    // Assess safety based on current conditions
    const currentPrecipChance = data.daily[0]?.pop ? Math.round(data.daily[0].pop * 100) : 0
    const safety = assessSafety(
      data.current.wind_speed,
      data.current.weather[0].main,
      currentPrecipChance
    )

    // Reverse geocode to get location name
    const locationName = await getLocationName(lat, lng, apiKey)

    return {
      current: {
        temp: Math.round(data.current.temp),
        feels_like: Math.round(data.current.feels_like),
        humidity: data.current.humidity,
        wind_speed: Math.round(data.current.wind_speed),
        weather: {
          main: data.current.weather[0].main,
          description: data.current.weather[0].description,
          icon: data.current.weather[0].icon,
        },
      },
      forecast: dailyForecasts,
      safety,
      location: locationName,
      last_updated: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Error fetching weather:', error)
    return getMockWeatherData()
  }
}

async function getLocationName(lat: number, lng: number, apiKey: string): Promise<string> {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lng}&limit=1&appid=${apiKey}`
    )
    if (response.ok) {
      const data = await response.json()
      if (data.length > 0) {
        return data[0].name
      }
    }
  } catch {
    // Ignore geocoding errors
  }
  return 'Tri-Cities Area'
}

function getMockWeatherData(): WeatherData {
  const now = new Date()
  return {
    current: {
      temp: 72,
      feels_like: 74,
      humidity: 45,
      wind_speed: 8,
      weather: {
        main: 'Clear',
        description: 'clear sky',
        icon: '01d',
      },
    },
    forecast: [
      {
        date: new Date(now.getTime() + 86400000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        temp_high: 75,
        temp_low: 58,
        weather: { main: 'Clear', description: 'clear sky', icon: '01d' },
        precipitation_chance: 0,
      },
      {
        date: new Date(now.getTime() + 172800000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        temp_high: 78,
        temp_low: 62,
        weather: { main: 'Clouds', description: 'few clouds', icon: '02d' },
        precipitation_chance: 10,
      },
      {
        date: new Date(now.getTime() + 259200000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        temp_high: 68,
        temp_low: 55,
        weather: { main: 'Rain', description: 'light rain', icon: '10d' },
        precipitation_chance: 60,
      },
    ],
    safety: {
      status: 'safe',
      message: 'Good conditions for roofing work (mock data)',
    },
    location: 'Johnson City',
    last_updated: now.toISOString(),
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') || String(DEFAULT_LAT))
  const lng = parseFloat(searchParams.get('lng') || String(DEFAULT_LNG))
  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`

  // Check cache
  const now = Date.now()
  if (
    weatherCache.data &&
    weatherCache.key === cacheKey &&
    now - weatherCache.timestamp < CACHE_DURATION_MS
  ) {
    return successResponse(weatherCache.data)
  }

  // Fetch fresh data
  const data = await fetchWeatherFromAPI(lat, lng)

  if (!data) {
    return errorResponse(InternalError('Failed to fetch weather data'))
  }

  // Update cache
  weatherCache = {
    data,
    timestamp: now,
    key: cacheKey,
  }

  return successResponse(data)
}
