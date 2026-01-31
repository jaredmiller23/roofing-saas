'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CloudLightning,
  CloudRain,
  Wind,
  AlertTriangle,
  FileDown,
  CheckCircle,
  XCircle,
  MapPin,
  Calendar,
  Loader2,
} from 'lucide-react'
import { apiFetch } from '@/lib/api/client'

interface StormEvent {
  event_date: string
  event_type: 'hail' | 'tornado' | 'thunderstorm_wind' | 'flood' | 'other'
  magnitude?: number
  distance_miles?: number
}

interface CausationData {
  events: StormEvent[]
  causation_narrative: string
  evidence_score: number
}

interface WeatherEvidenceProps {
  projectId: string
  dateOfLoss?: string
  latitude?: number
  longitude?: number
  stormEventId?: string
  onGenerateReport?: () => void
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  hail: <CloudRain className="h-4 w-4" />,
  tornado: <AlertTriangle className="h-4 w-4" />,
  thunderstorm_wind: <Wind className="h-4 w-4" />,
  flood: <CloudRain className="h-4 w-4" />,
  other: <CloudLightning className="h-4 w-4" />,
}

const EVENT_LABELS: Record<string, string> = {
  hail: 'Hail',
  tornado: 'Tornado',
  thunderstorm_wind: 'Damaging Wind',
  flood: 'Flood',
  other: 'Severe Weather',
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'bg-green-500'
  if (score >= 50) return 'bg-yellow-500'
  if (score >= 30) return 'bg-orange-500'
  return 'bg-red-500'
}

function getScoreLabel(score: number): string {
  if (score >= 70) return 'Strong Evidence'
  if (score >= 50) return 'Moderate Evidence'
  if (score >= 30) return 'Limited Evidence'
  return 'Weak Evidence'
}

export function WeatherEvidence({
  projectId,
  dateOfLoss,
  latitude,
  longitude,
  stormEventId,
  onGenerateReport,
}: WeatherEvidenceProps) {
  const [loading, setLoading] = useState(true)
  const [causationData, setCausationData] = useState<CausationData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [generatingReport, setGeneratingReport] = useState(false)

  useEffect(() => {
    async function fetchCausation() {
      setLoading(true)
      setError(null)

      try {
        // First try to get causation from the export package
        try {
          const exportData = await apiFetch<{ storm_causation?: CausationData }>(`/api/projects/${projectId}/claims/export`)
          if (exportData.storm_causation) {
            setCausationData(exportData.storm_causation)
            return
          }
        } catch {
          // Export may not exist yet, continue to query causation API
        }

        // If no export data and we have location + date, query causation API directly
        if (latitude && longitude && dateOfLoss) {
          const params = new URLSearchParams({
            lat: latitude.toString(),
            lng: longitude.toString(),
            date: dateOfLoss,
            radius_miles: '25',
            days_range: '7',
          })

          const causationRes = await fetch(`/api/storm-data/causation?${params}`)
          if (causationRes.ok) {
            const causationResult = await causationRes.json()
            if (causationResult.success && causationResult.data) {
              setCausationData({
                events: causationResult.data.matching_events.map((e: StormEvent) => ({
                  event_date: e.event_date,
                  event_type: e.event_type,
                  magnitude: e.magnitude,
                  distance_miles: e.distance_miles,
                })),
                causation_narrative: causationResult.data.causation_narrative,
                evidence_score: causationResult.data.evidence_score,
              })
              return
            }
          }
        }

        // No causation data available
        setCausationData(null)
      } catch (err) {
        console.error('Error fetching weather evidence:', err)
        setError('Failed to load weather evidence')
      } finally {
        setLoading(false)
      }
    }

    fetchCausation()
  }, [projectId, dateOfLoss, latitude, longitude, stormEventId])

  const handleGenerateReport = async () => {
    setGeneratingReport(true)
    try {
      // Open the weather report PDF in a new tab
      window.open(`/api/projects/${projectId}/claims/weather-report`, '_blank')
      onGenerateReport?.()
    } catch (err) {
      console.error('Error generating report:', err)
    } finally {
      setGeneratingReport(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudLightning className="h-5 w-5" />
            Weather Documentation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudLightning className="h-5 w-5" />
            Weather Documentation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!causationData || causationData.events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudLightning className="h-5 w-5" />
            Weather Documentation
          </CardTitle>
          <CardDescription>
            NOAA storm event documentation for insurance claims
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CloudLightning className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              No matching storm events found near the property.
            </p>
            {!dateOfLoss && (
              <p className="text-sm text-muted-foreground mt-2">
                Set a date of loss on the project to search for storm events.
              </p>
            )}
            {dateOfLoss && !latitude && (
              <p className="text-sm text-muted-foreground mt-2">
                Property coordinates are needed to search for nearby storm events.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CloudLightning className="h-5 w-5" />
              Weather Documentation
            </CardTitle>
            <CardDescription>
              NOAA storm event documentation for insurance claims
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getScoreColor(causationData.evidence_score)}>
              <CheckCircle className="h-3 w-3 mr-1" />
              {causationData.evidence_score}% - {getScoreLabel(causationData.evidence_score)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Storm Events */}
        <div>
          <h4 className="text-sm font-semibold mb-3">
            Matching Storm Events ({causationData.events.length})
          </h4>
          <div className="space-y-2">
            {causationData.events.slice(0, 5).map((event, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    {EVENT_ICONS[event.event_type] || EVENT_ICONS.other}
                  </div>
                  <div>
                    <div className="font-medium">
                      {EVENT_LABELS[event.event_type] || 'Storm Event'}
                      {event.magnitude && (
                        <span className="ml-2 text-muted-foreground">
                          {event.event_type === 'hail'
                            ? `${event.magnitude}" hail`
                            : event.event_type === 'thunderstorm_wind'
                              ? `${event.magnitude} mph`
                              : `Magnitude: ${event.magnitude}`}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      {new Date(event.event_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
                {event.distance_miles !== undefined && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {event.distance_miles.toFixed(1)} mi
                  </div>
                )}
              </div>
            ))}
            {causationData.events.length > 5 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                +{causationData.events.length - 5} more events
              </p>
            )}
          </div>
        </div>

        {/* Causation Narrative */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Causation Narrative</h4>
          <div className="p-4 bg-muted/30 rounded-lg text-sm leading-relaxed">
            {causationData.causation_narrative}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button onClick={handleGenerateReport} disabled={generatingReport}>
            {generatingReport ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4 mr-2" />
            )}
            Export Weather Report
          </Button>
        </div>

        {/* Data Source */}
        <p className="text-xs text-muted-foreground">
          Data sourced from NOAA Storm Events Database and National Weather Service
        </p>
      </CardContent>
    </Card>
  )
}
