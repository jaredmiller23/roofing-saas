'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from '@/lib/i18n/navigation'
import { MapPin, Home, ThumbsUp, ThumbsDown, Calendar, Phone, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { reverseGeocode } from '@/lib/geocoding'
import { apiFetch } from '@/lib/api/client'
import { toast } from 'sonner'

type Disposition = 'not_home' | 'interested' | 'not_interested' | 'appointment_set' | 'callback_later'

interface KnockLoggerProps {
  onSuccess?: () => void
}

export function KnockLogger({ onSuccess }: KnockLoggerProps) {
  const router = useRouter()
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

  const handleReverseGeocode = useCallback(async (lat: number, lng: number) => {
    const address = await reverseGeocode(lat, lng)
    setAddress(address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`)
  }, [])

  const getLocation = useCallback(() => {
    setGettingLocation(true)

    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      setGettingLocation(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude)
        setLongitude(position.coords.longitude)
        setAccuracy(position.coords.accuracy)
        setGettingLocation(false)

        // Reverse geocode to get address
        handleReverseGeocode(position.coords.latitude, position.coords.longitude)
      },
      (error) => {
        console.error('Error getting location:', error)
        toast.error('Unable to get location. Please enable location services.')
        setGettingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }, [handleReverseGeocode])

  // Auto-get location on mount
  useEffect(() => {
    getLocation()
  }, [getLocation])

  const handleDispositionSelect = (selectedDisposition: Disposition) => {
    setDisposition(selectedDisposition)
  }

  const handleSubmit = async () => {
    if (!latitude || !longitude) {
      toast.error('Location is required. Please enable location services.')
      return
    }

    if (!disposition) {
      toast.warning('Please select a disposition.')
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

      await apiFetch('/api/knocks', {
        method: 'POST',
        body: knockData
      })

      // Show success briefly
      await new Promise(resolve => setTimeout(resolve, 500))

      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/knocks')
      }
    } catch (error) {
      console.error('Error submitting knock:', error)
      toast.error('Failed to log knock. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const dispositions = [
    {
      value: 'not_home' as Disposition,
      label: 'Not Home',
      icon: Home,
      color: 'bg-muted hover:bg-muted/80 text-foreground',
      activeColor: 'bg-muted-foreground text-background'
    },
    {
      value: 'interested' as Disposition,
      label: 'Interested',
      icon: ThumbsUp,
      color: 'bg-green-500/10 hover:bg-green-500/20 text-green-500',
      activeColor: 'bg-green-600 text-white'
    },
    {
      value: 'not_interested' as Disposition,
      label: 'Not Interested',
      icon: ThumbsDown,
      color: 'bg-red-500/10 hover:bg-red-500/20 text-red-500',
      activeColor: 'bg-red-600 text-white'
    },
    {
      value: 'appointment_set' as Disposition,
      label: 'Set Appointment',
      icon: Calendar,
      color: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-500',
      activeColor: 'bg-blue-600 text-white'
    },
    {
      value: 'callback_later' as Disposition,
      label: 'Callback Later',
      icon: Phone,
      color: 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-500',
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
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Getting your location...</span>
            </div>
          ) : latitude && longitude ? (
            <>
              <div className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                <span className="font-medium">Location captured</span>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
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
                      : `${disp.color} border-border`
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
            <Label htmlFor="callback-date">Select Date</Label>
            <Input
              id="callback-date"
              type="date"
              value={callbackDate}
              onChange={(e) => setCallbackDate(e.target.value)}
              className="h-12 mt-2"
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
          <Label htmlFor="knock-notes">Additional Details</Label>
          <Textarea
            id="knock-notes"
            placeholder="Add any notes about this knock..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="resize-none mt-2"
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
