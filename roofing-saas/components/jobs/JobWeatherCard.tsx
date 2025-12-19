'use client'

import { useState, useEffect } from 'react'
import {
  Cloud,
  CloudRain,
  CloudSnow,
  Sun,
  Wind,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

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

interface JobWeatherCardProps {
  scheduledDate: string
}

function getWeatherIcon(main: string, className: string = 'h-5 w-5') {
  switch (main.toLowerCase()) {
    case 'clear':
      return <Sun className={`${className} text-yellow-500`} />
    case 'clouds':
      return <Cloud className={`${className} text-muted-foreground`} />
    case 'rain':
    case 'drizzle':
      return <CloudRain className={`${className} text-blue-500`} />
    case 'snow':
      return <CloudSnow className={`${className} text-blue-300`} />
    case 'thunderstorm':
      return <CloudRain className={`${className} text-purple-500`} />
    default:
      return <Cloud className={`${className} text-muted-foreground`} />
  }
}

function getSafetyInfo(status: 'safe' | 'caution' | 'unsafe') {
  switch (status) {
    case 'safe':
      return {
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
        bgClass: 'bg-green-500/10 border-green-500/30',
        label: 'Good conditions',
      }
    case 'caution':
      return {
        icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
        bgClass: 'bg-yellow-500/10 border-yellow-500/30',
        label: 'Use caution',
      }
    case 'unsafe':
      return {
        icon: <XCircle className="h-4 w-4 text-red-500" />,
        bgClass: 'bg-red-500/10 border-red-500/30',
        label: 'Poor conditions',
      }
  }
}

function assessDaySafety(
  weather: { main: string },
  precipChance: number
): 'safe' | 'caution' | 'unsafe' {
  const main = weather.main.toLowerCase()

  if (main.includes('thunder') || main.includes('storm')) {
    return 'unsafe'
  }

  if (main.includes('rain') || main.includes('snow')) {
    return 'unsafe'
  }

  if (precipChance > 50) {
    return 'caution'
  }

  if (precipChance > 20) {
    return 'caution'
  }

  return 'safe'
}

export function JobWeatherCard({ scheduledDate }: JobWeatherCardProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/weather')
        if (!res.ok) throw new Error('Failed to fetch weather')
        const data = await res.json()
        setWeather(data)
      } catch (err) {
        setError('Unable to load weather')
        console.error('Weather fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchWeather()
  }, [])

  if (loading) {
    return (
      <div className="bg-muted/30 rounded-lg p-3 animate-pulse">
        <div className="h-4 bg-muted rounded w-3/4" />
      </div>
    )
  }

  if (error || !weather) {
    return (
      <div className="bg-muted/30 rounded-lg p-3">
        <p className="text-sm text-muted-foreground">Weather unavailable</p>
      </div>
    )
  }

  // Find forecast for scheduled date
  const scheduledDateStr = new Date(scheduledDate).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  const dayForecast = weather.forecast.find(
    (day) => day.date === scheduledDateStr
  )

  // If no forecast for this date, it's too far out
  if (!dayForecast) {
    const daysOut = Math.ceil(
      (new Date(scheduledDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )

    if (daysOut > 3) {
      return (
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-sm text-muted-foreground">
            Forecast not yet available ({daysOut} days out)
          </p>
        </div>
      )
    }

    // Use current weather as fallback
    const safetyStatus = weather.safety.status
    const safetyInfo = getSafetyInfo(safetyStatus)

    return (
      <div className={`rounded-lg border p-3 ${safetyInfo.bgClass}`}>
        <div className="flex items-center gap-3">
          {getWeatherIcon(weather.current.weather.main)}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-foreground font-medium">{weather.current.temp}°F</span>
              <span className="text-muted-foreground capitalize text-sm">
                {weather.current.weather.description}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              {safetyInfo.icon}
              <span className="text-sm text-muted-foreground">{safetyInfo.label}</span>
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Wind className="h-3 w-3" />
              <span>{weather.current.wind_speed} mph</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Droplets className="h-3 w-3" />
              <span>{weather.current.humidity}%</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // We have a forecast for this day
  const safetyStatus = assessDaySafety(dayForecast.weather, dayForecast.precipitation_chance)
  const safetyInfo = getSafetyInfo(safetyStatus)

  return (
    <div className={`rounded-lg border p-3 ${safetyInfo.bgClass}`}>
      <div className="flex items-center gap-3">
        {getWeatherIcon(dayForecast.weather.main)}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-foreground font-medium">
              {dayForecast.temp_high}° / {dayForecast.temp_low}°
            </span>
            <span className="text-muted-foreground capitalize text-sm">
              {dayForecast.weather.description}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            {safetyInfo.icon}
            <span className="text-sm text-muted-foreground">{safetyInfo.label}</span>
          </div>
        </div>
        {dayForecast.precipitation_chance > 0 && (
          <div className="text-right">
            <div className="flex items-center gap-1">
              <Droplets className="h-3 w-3 text-blue-500" />
              <span className="text-sm text-blue-500">{dayForecast.precipitation_chance}%</span>
            </div>
            <span className="text-xs text-muted-foreground">rain</span>
          </div>
        )}
      </div>
    </div>
  )
}
