'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Home, ThumbsUp, ThumbsDown, Calendar, Phone, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Disposition = 'not_home' | 'interested' | 'not_interested' | 'appointment_set' | 'callback_later'

interface KnockLoggerProps {
  onSuccess?: () => void
}

export function KnockLogger({ onSuccess }: KnockLoggerProps) {
  const router = useRouter()
  // const [loading, setLoading] = useState(false) // TODO: Use for general loading state
  const [gettingLocation, setGettingLocation] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Location state
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [address, setAddress] = useState('')

  // Form state
  const [disposition, setDisposition] = useState<Disposition | null>(null)
  const [notes, setNotes] = useState('')
  const [appointmentDate, setAppointmentDate] = useState('')
  const [appointmentTime, setAppointmentTime] = useState('')
  const [callbackDate, setCallbackDate] = useState('')

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    // Placeholder - will need Google Maps API or similar
    // For now, just show coordinates
    setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`)
  }, [])

  const getLocation = useCallback(() => {
    setGettingLocation(true)

    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser')
      setGettingLocation(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude)
        setLongitude(position.coords.longitude)
        setAccuracy(position.coords.accuracy)
        setGettingLocation(false)

        // Reverse geocode to get address (simplified version)
        reverseGeocode(position.coords.latitude, position.coords.longitude)
      },
      (error) => {
        console.error('Error getting location:', error)
        alert('Unable to get location. Please enable location services.')
        setGettingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }, [reverseGeocode])

  // Auto-get location on mount
  useEffect(() => {
    getLocation()
  }, [getLocation])

  const handleDispositionSelect = (selectedDisposition: Disposition) => {
    setDisposition(selectedDisposition)
  }

  const handleSubmit = async () => {
    if (!latitude || !longitude) {
      alert('Location is required. Please enable location services.')
      return
    }

    if (!disposition) {
      alert('Please select a disposition.')
      return
    }

    setSubmitting(true)

    try {
      const knockData = {
        latitude,
        longitude,
        address,
        disposition,
        notes: notes.trim() || null,
        appointment_date: disposition === 'appointment_set' && appointmentDate && appointmentTime
          ? new Date(`${appointmentDate}T${appointmentTime}`).toISOString()
          : null,
        callback_date: disposition === 'callback_later' && callbackDate
          ? callbackDate
          : null,
        device_location_accuracy: accuracy
      }

      const response = await fetch('/api/knocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(knockData)
      })

      const result = await response.json()

      if (result.success) {
        // Show success briefly
        await new Promise(resolve => setTimeout(resolve, 500))

        if (onSuccess) {
          onSuccess()
        } else {
          router.push('/knocks')
        }
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error submitting knock:', error)
      alert('Failed to log knock. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const dispositions = [
    {
      value: 'not_home' as Disposition,
      label: 'Not Home',
      icon: Home,
      color: 'bg-gray-100 hover:bg-gray-200 text-gray-900',
      activeColor: 'bg-gray-600 text-white'
    },
    {
      value: 'interested' as Disposition,
      label: 'Interested',
      icon: ThumbsUp,
      color: 'bg-green-100 hover:bg-green-200 text-green-900',
      activeColor: 'bg-green-600 text-white'
    },
    {
      value: 'not_interested' as Disposition,
      label: 'Not Interested',
      icon: ThumbsDown,
      color: 'bg-red-100 hover:bg-red-200 text-red-900',
      activeColor: 'bg-red-600 text-white'
    },
    {
      value: 'appointment_set' as Disposition,
      label: 'Set Appointment',
      icon: Calendar,
      color: 'bg-blue-100 hover:bg-blue-200 text-blue-900',
      activeColor: 'bg-blue-600 text-white'
    },
    {
      value: 'callback_later' as Disposition,
      label: 'Callback Later',
      icon: Phone,
      color: 'bg-purple-100 hover:bg-purple-200 text-purple-900',
      activeColor: 'bg-purple-600 text-white'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Location Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {gettingLocation ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Getting your location...</span>
            </div>
          ) : latitude && longitude ? (
            <>
              <div className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                <span className="font-medium">Location captured</span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p className="font-mono">{address}</p>
                {accuracy && (
                  <p className="text-xs">Accuracy: ±{Math.round(accuracy)}m</p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={getLocation}
                disabled={gettingLocation}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Update Location
              </Button>
            </>
          ) : (
            <Button
              onClick={getLocation}
              disabled={gettingLocation}
              className="w-full h-14"
            >
              <MapPin className="h-5 w-5 mr-2" />
              Get My Location
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Disposition Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Disposition</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {dispositions.map((disp) => {
              const Icon = disp.icon
              const isActive = disposition === disp.value

              return (
                <button
                  key={disp.value}
                  onClick={() => handleDispositionSelect(disp.value)}
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all min-h-[88px] ${
                    isActive
                      ? `${disp.activeColor} border-transparent shadow-lg`
                      : `${disp.color} border-gray-200`
                  }`}
                >
                  <Icon className="h-6 w-6 mb-2" />
                  <span className="text-sm font-medium text-center">{disp.label}</span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Conditional Fields */}
      {disposition === 'appointment_set' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Appointment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="appointment-date">Date</Label>
              <Input
                id="appointment-date"
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="h-12"
              />
            </div>
            <div>
              <Label htmlFor="appointment-time">Time</Label>
              <Input
                id="appointment-time"
                type="time"
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                className="h-12"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {disposition === 'callback_later' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Callback Date</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="date"
              value={callbackDate}
              onChange={(e) => setCallbackDate(e.target.value)}
              className="h-12"
            />
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notes (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Add any notes about this knock..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={!latitude || !longitude || !disposition || submitting}
        className="w-full h-14 text-lg font-semibold"
        size="lg"
      >
        {submitting ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Logging Knock...
          </>
        ) : (
          <>
            <Check className="h-5 w-5 mr-2" />
            Log Knock
          </>
        )}
      </Button>
    </div>
  )
}
