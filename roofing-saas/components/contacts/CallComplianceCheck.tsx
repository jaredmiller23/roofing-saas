'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { logger } from '@/lib/logger'

interface CallComplianceCheckProps {
  phoneNumber: string
  contactId?: string
  onResult?: (result: { allowed: boolean; reason?: string }) => void
}

interface ComplianceCheckResponse {
  success: boolean
  data: {
    canCall: boolean
    reason?: string
    warning?: string
    checks: {
      optOut?: { passed: boolean; reason?: string }
      dnc?: { passed: boolean; reason?: string }
      time?: { passed: boolean; reason?: string }
      consent?: { passed: boolean; reason?: string }
    }
  }
}

/**
 * Component to check call compliance before initiating a call
 * Performs real-time compliance checks and displays result to user
 */
export function CallComplianceCheck({ phoneNumber, contactId, onResult }: CallComplianceCheckProps) {
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<ComplianceCheckResponse['data'] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkCompliance() {
      setLoading(true)
      setError(null)

      try {
        // Build query params
        const params = new URLSearchParams({ phone: phoneNumber })
        if (contactId) {
          params.append('contactId', contactId)
        }

        // Call compliance check API
        const response = await fetch(`/api/compliance/check?${params.toString()}`)

        if (!response.ok) {
          throw new Error('Failed to check compliance')
        }

        const data: ComplianceCheckResponse = await response.json()

        if (!data.success) {
          throw new Error('Compliance check failed')
        }

        setResult(data.data)

        // Notify parent component
        if (onResult) {
          onResult({
            allowed: data.data.canCall,
            reason: data.data.reason || data.data.warning,
          })
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to check compliance'
        logger.error('Compliance check error', { error: err, phoneNumber, contactId })
        setError(errorMessage)

        // Notify parent of error (default to not allowed)
        if (onResult) {
          onResult({
            allowed: false,
            reason: errorMessage,
          })
        }
      } finally {
        setLoading(false)
      }
    }

    if (phoneNumber) {
      checkCompliance()
    }
  }, [phoneNumber, contactId, onResult])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Checking compliance...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600">
        <XCircle className="h-4 w-4" />
        <span>{error}</span>
      </div>
    )
  }

  if (!result) {
    return null
  }

  // Show result
  if (result.canCall) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span className="font-medium">Call allowed</span>
        </div>
        {result.warning && (
          <div className="flex items-start gap-2 text-sm text-orange-600">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{result.warning}</span>
          </div>
        )}
        {/* Show passed checks */}
        <div className="ml-6 text-xs text-muted-foreground space-y-1">
          {result.checks.optOut?.passed && (
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span>Not opted out</span>
            </div>
          )}
          {result.checks.dnc?.passed && (
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span>Not on DNC list</span>
            </div>
          )}
          {result.checks.time?.passed && (
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span>Within calling hours</span>
            </div>
          )}
          {result.checks.consent?.passed && (
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span>Consent obtained</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Call not allowed
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-red-600">
        <XCircle className="h-4 w-4" />
        <span className="font-medium">Call blocked</span>
      </div>
      {result.reason && (
        <div className="text-sm text-foreground">
          {result.reason}
        </div>
      )}
      {/* Show failed checks */}
      <div className="ml-6 text-xs text-muted-foreground space-y-1">
        {result.checks.optOut && !result.checks.optOut.passed && (
          <div className="flex items-center gap-1 text-red-600">
            <XCircle className="h-3 w-3" />
            <span>{result.checks.optOut.reason || 'Contact opted out'}</span>
          </div>
        )}
        {result.checks.dnc && !result.checks.dnc.passed && (
          <div className="flex items-center gap-1 text-red-600">
            <XCircle className="h-3 w-3" />
            <span>{result.checks.dnc.reason || 'On DNC list'}</span>
          </div>
        )}
        {result.checks.time && !result.checks.time.passed && (
          <div className="flex items-center gap-1 text-red-600">
            <XCircle className="h-3 w-3" />
            <span>{result.checks.time.reason || 'Outside calling hours'}</span>
          </div>
        )}
      </div>
    </div>
  )
}
