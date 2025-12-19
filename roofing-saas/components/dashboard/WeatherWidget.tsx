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
  RefreshCw,
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

function getWeatherIcon(main: string, className: string = 'h-6 w-6') {
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

function getSafetyIcon(status: 'safe' | 'caution' | 'unsafe') {
  switch (status) {
    case 'safe':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />
    case 'caution':
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />
    case 'unsafe':
      return <XCircle className="h-5 w-5 text-red-500" />
  }
}

function getSafetyBg(status: 'safe' | 'caution' | 'unsafe') {
  switch (status) {
    case 'safe':
      return 'bg-green-500/10 border-green-500/30'
    case 'caution':
      return 'bg-yellow-500/10 border-yellow-500/30'
    case 'unsafe':
      return 'bg-red-500/10 border-red-500/30'
  }
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWeather = async () => {
    try {
      setLoading(true)
      setError(null)
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

  useEffect(() => {
    fetchWeather()
    // Auto-refresh every 15 minutes
    const interval = setInterval(fetchWeather, 15 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border p-6 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/2 mb-4" />
        <div className="h-16 bg-muted rounded mb-4" />
        <div className="h-4 bg-muted rounded w-3/4" />
      </div>
    )
  }

  if (error || !weather) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Weather</h3>
          <button
            onClick={fetchWeather}
            className="p-1 hover:bg-muted rounded-full transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <p className="text-muted-foreground text-sm">{error || 'Unable to load weather data'}</p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6">
      {/* Header with location */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">{weather.location}</h3>
        <button
          onClick={fetchWeather}
          className="p-1 hover:bg-muted rounded-full transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Safety indicator */}
      <div
        className={`rounded-lg border p-3 mb-4 ${getSafetyBg(weather.safety.status)}`}
      >
        <div className="flex items-center gap-2">
          {getSafetyIcon(weather.safety.status)}
          <span className="font-medium text-foreground">
            {weather.safety.status === 'safe' ? 'Safe to Work' :
             weather.safety.status === 'caution' ? 'Use Caution' : 'Not Safe'}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{weather.safety.message}</p>
      </div>

      {/* Current conditions */}
      <div className="flex items-center gap-4 mb-4">
        {getWeatherIcon(weather.current.weather.main, 'h-12 w-12')}
        <div>
          <div className="text-3xl font-bold text-foreground">{weather.current.temp}°F</div>
          <div className="text-sm text-muted-foreground capitalize">
            {weather.current.weather.description}
          </div>
        </div>
      </div>

      {/* Weather details */}
      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
        <div className="flex items-center gap-2">
          <Wind className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground">{weather.current.wind_speed} mph</span>
        </div>
        <div className="flex items-center gap-2">
          <Droplets className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground">{weather.current.humidity}%</span>
        </div>
      </div>

      {/* 3-day forecast */}
      <div className="border-t border-border pt-3">
        <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
          3-Day Forecast
        </h4>
        <div className="space-y-2">
          {weather.forecast.map((day) => (
            <div key={day.date} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground w-24 truncate">{day.date}</span>
              <div className="flex items-center gap-1">
                {getWeatherIcon(day.weather.main, 'h-4 w-4')}
                {day.precipitation_chance > 0 && (
                  <span className="text-xs text-blue-500">{day.precipitation_chance}%</span>
                )}
              </div>
              <span className="text-foreground">
                {day.temp_high}° / {day.temp_low}°
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Last updated */}
      <div className="text-xs text-muted-foreground mt-3 text-right">
        Updated {new Date(weather.last_updated).toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        })}
      </div>
    </div>
  )
}
