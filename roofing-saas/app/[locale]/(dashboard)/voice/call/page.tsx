'use client'

/**
 * Voice Call Page
 *
 * Click-to-call functionality with compliance checks and real-time status.
 * Route: /voice/call?phone=&contactId=
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { apiFetch, ApiClientError } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { CallStatus, useCallDuration, type CallState } from '@/components/voice/CallStatus'
import { ComplianceAlert, type ComplianceReason } from '@/components/voice/ComplianceAlert'
import {
  Phone,
  User,
  MapPin,
  Building,
  ArrowLeft,
  PhoneOff,
  Clock,
  Mic,
  MicOff,
} from 'lucide-react'

interface ContactInfo {
  id: string
  first_name: string
  last_name: string
  company?: string | null
  phone?: string | null
  address_street?: string | null
  address_city?: string | null
  address_state?: string | null
  address_zip?: string | null
}

interface CallResponse {
  message: string
  call: {
    sid: string
    to: string
    status: string
  }
}

interface ComplianceCheckDetails {
  complianceCheck?: {
    canCall: boolean
    reason?: string
    checks: {
      optOut?: { passed: boolean; reason?: string }
      dnc?: { passed: boolean; reason?: string }
      time?: { passed: boolean; reason?: string; timezone?: string }
      consent?: { passed: boolean; reason?: string }
    }
  }
}

/**
 * Map compliance check reason to ComplianceReason type
 */
function mapComplianceReason(
  reason: string | undefined,
  checks: ComplianceCheckDetails['complianceCheck']
): { reason: ComplianceReason; timezone?: string } {
  // Check individual failures
  if (checks?.checks?.optOut && !checks.checks.optOut.passed) {
    return { reason: 'opt_out' }
  }
  if (checks?.checks?.dnc && !checks.checks.dnc.passed) {
    return { reason: 'dnc' }
  }
  if (checks?.checks?.time && !checks.checks.time.passed) {
    return { reason: 'time_restriction', timezone: checks.checks.time.timezone }
  }
  if (checks?.checks?.consent && !checks.checks.consent.passed) {
    return { reason: 'no_consent' }
  }

  // Fallback based on reason string
  if (reason?.includes('opt')) return { reason: 'opt_out' }
  if (reason?.includes('DNC') || reason?.includes('Do Not Call')) return { reason: 'dnc' }
  if (reason?.includes('time') || reason?.includes('hour')) return { reason: 'time_restriction' }
  if (reason?.includes('consent')) return { reason: 'no_consent' }

  return { reason: 'invalid_number' }
}

/**
 * Format phone for display (e.g., (423) 555-1234)
 */
function formatPhoneDisplay(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }
  return phone
}

export default function VoiceCallPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Query params
  const initialPhone = searchParams.get('phone') || ''
  const contactId = searchParams.get('contactId') || undefined

  // State
  const [phoneNumber, setPhoneNumber] = useState(initialPhone)
  const [contact, setContact] = useState<ContactInfo | null>(null)
  const [contactLoading, setContactLoading] = useState(false)
  const [recordingEnabled, setRecordingEnabled] = useState(true)
  const [callState, setCallState] = useState<CallState>('idle')
  const [callSid, setCallSid] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [complianceFailure, setComplianceFailure] = useState<{
    reason: ComplianceReason
    message?: string
    timezone?: string
  } | null>(null)

  // Track call duration
  const duration = useCallDuration(callState === 'in-progress')

  // Fetch contact info if contactId provided
  useEffect(() => {
    if (!contactId) return
    const currentContactId = contactId

    async function fetchContact() {
      setContactLoading(true)
      try {
        const supabase = createClient()
        const { data, error: fetchError } = await supabase
          .from('contacts')
          .select('id, first_name, last_name, company, phone, address_street, address_city, address_state, address_zip')
          .eq('id', currentContactId)
          .single()

        if (fetchError) {
          console.error('Contact fetch error:', fetchError)
          return
        }

        setContact(data)

        // Pre-fill phone if not already set
        if (!phoneNumber && data.phone) {
          setPhoneNumber(data.phone)
        }
      } catch (err) {
        console.error('Error fetching contact:', err)
      } finally {
        setContactLoading(false)
      }
    }

    fetchContact()
  }, [contactId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Poll call status when call is in progress
  useEffect(() => {
    if (!callSid || callState === 'completed' || callState === 'failed') return

    // Simulate call progression for now (actual status would come from webhook)
    // In production, poll /api/voice/status/:sid or use WebSocket
    const progressionTimers: NodeJS.Timeout[] = []

    if (callState === 'initiating') {
      progressionTimers.push(
        setTimeout(() => setCallState('connecting'), 1000)
      )
    }
    if (callState === 'connecting') {
      progressionTimers.push(
        setTimeout(() => setCallState('ringing'), 2000)
      )
    }
    if (callState === 'ringing') {
      // In reality, this would come from Twilio webhook
      progressionTimers.push(
        setTimeout(() => setCallState('in-progress'), 3000)
      )
    }

    return () => progressionTimers.forEach(clearTimeout)
  }, [callSid, callState])

  // Start call
  const handleStartCall = useCallback(async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter a phone number')
      return
    }

    setError(null)
    setComplianceFailure(null)
    setCallState('initiating')

    try {
      const response = await apiFetch<CallResponse>('/api/voice/call', {
        method: 'POST',
        body: {
          to: phoneNumber,
          contactId,
          record: recordingEnabled,
        },
      })

      setCallSid(response.call.sid)
      // Status will progress through polling/webhooks
    } catch (err) {
      console.error('Call initiation error:', err)

      if (err instanceof ApiClientError) {
        // Check for compliance failure
        const details = err.details as ComplianceCheckDetails | undefined
        if (details?.complianceCheck && !details.complianceCheck.canCall) {
          const { reason, timezone } = mapComplianceReason(
            details.complianceCheck.reason,
            details.complianceCheck
          )
          setComplianceFailure({
            reason,
            message: details.complianceCheck.reason,
            timezone,
          })
          setCallState('blocked')
          return
        }

        // Check for invalid phone number
        if (err.message.includes('Invalid phone')) {
          setComplianceFailure({
            reason: 'invalid_number',
            message: err.message,
          })
          setCallState('blocked')
          return
        }

        setError(err.message)
      } else {
        setError('Failed to initiate call. Please try again.')
      }

      setCallState('failed')
    }
  }, [phoneNumber, contactId, recordingEnabled])

  // End call (would hit API in production)
  const handleEndCall = useCallback(() => {
    // In production: apiFetch('/api/voice/call/:sid/end', { method: 'POST' })
    setCallState('completed')
  }, [])

  // Reset to try again
  const handleReset = useCallback(() => {
    setCallState('idle')
    setCallSid(null)
    setError(null)
    setComplianceFailure(null)
  }, [])

  const isCallActive = ['initiating', 'connecting', 'ringing', 'in-progress'].includes(callState)
  const canStartCall = callState === 'idle' && phoneNumber.trim().length > 0

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-11 w-11"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Voice Call</h1>
              {contact && (
                <p className="text-sm text-muted-foreground">
                  {contact.first_name} {contact.last_name}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Contact Info Card */}
        {contact && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium">
                {contact.first_name} {contact.last_name}
              </p>
              {contact.company && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  {contact.company}
                </p>
              )}
              {(contact.address_street || contact.address_city) && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {[contact.address_street, contact.address_city, contact.address_state, contact.address_zip]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
              {contact.phone && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {formatPhoneDisplay(contact.phone)}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Phone Input */}
        {callState === 'idle' && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(423) 555-1234"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="mt-1 text-lg h-12"
                  disabled={isCallActive}
                />
              </div>

              {/* Recording Toggle */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  {recordingEnabled ? (
                    <Mic className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <MicOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Label htmlFor="recording" className="cursor-pointer">
                    Record call
                  </Label>
                </div>
                <Switch
                  id="recording"
                  checked={recordingEnabled}
                  onCheckedChange={setRecordingEnabled}
                  disabled={isCallActive}
                />
              </div>

              {recordingEnabled && (
                <p className="text-xs text-muted-foreground">
                  Recording consent announcement will play before the call connects.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Call Status Display */}
        {callState !== 'idle' && (
          <Card>
            <CardContent className="py-8">
              <CallStatus
                state={callState}
                duration={duration}
                errorMessage={error || undefined}
              />
            </CardContent>
          </Card>
        )}

        {/* Compliance Alert */}
        {complianceFailure && (
          <ComplianceAlert
            reason={complianceFailure.reason}
            message={complianceFailure.message}
            contactId={contactId}
            contactTimezone={complianceFailure.timezone}
          />
        )}

        {/* Error Display */}
        {error && callState === 'failed' && !complianceFailure && (
          <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20">
            <CardContent className="py-4">
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {callState === 'idle' && (
            <Button
              size="xl"
              className="w-full gap-2"
              onClick={handleStartCall}
              disabled={!canStartCall}
            >
              <Phone className="h-5 w-5" />
              Start Call
            </Button>
          )}

          {isCallActive && (
            <Button
              size="xl"
              variant="destructive"
              className="w-full gap-2"
              onClick={handleEndCall}
            >
              <PhoneOff className="h-5 w-5" />
              End Call
            </Button>
          )}

          {(callState === 'completed' || callState === 'failed' || callState === 'blocked') && (
            <div className="flex gap-3">
              <Button
                size="lg"
                variant="outline"
                className="flex-1"
                onClick={() => router.back()}
              >
                Done
              </Button>
              <Button
                size="lg"
                className="flex-1"
                onClick={handleReset}
              >
                {callState === 'blocked' ? 'Try Different Number' : 'Call Again'}
              </Button>
            </div>
          )}
        </div>

        {/* TCPA Notice */}
        {callState === 'idle' && (
          <p className="text-xs text-center text-muted-foreground px-4">
            Calls are subject to TCPA regulations. Compliance checks for opt-out status,
            DNC registry, calling hours, and consent are performed before connecting.
          </p>
        )}

        {/* Call History Link */}
        {contactId && callState === 'idle' && (
          <div className="text-center">
            <Link
              href={`/contacts/${contactId}?tab=activity`}
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              <Clock className="h-4 w-4" />
              View call history
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
