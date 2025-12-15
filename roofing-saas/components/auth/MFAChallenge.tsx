'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react'

interface MFAChallengeProps {
  /** The factor ID to challenge */
  factorId: string
  /** Callback when MFA is successfully verified */
  onVerified: () => void
  /** Callback to go back to previous step */
  onBack?: () => void
  /** Show recovery code option */
  allowRecovery?: boolean
}

export function MFAChallenge({
  factorId,
  onVerified,
  onBack,
  allowRecovery = false
}: MFAChallengeProps) {
  const [mode, setMode] = useState<'totp' | 'recovery'>('totp')
  const [code, setCode] = useState('')
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isCreatingChallenge, setIsCreatingChallenge] = useState(true)

  const inputRef = useRef<HTMLInputElement>(null)

  const createChallenge = useCallback(async () => {
    setIsCreatingChallenge(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/mfa/challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ factorId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create challenge')
      }

      setChallengeId(data.challengeId)
      setExpiresAt(data.expiresAt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create challenge')
    } finally {
      setIsCreatingChallenge(false)
    }
  }, [factorId])

  const verifyCode = async () => {
    if (!challengeId || !code.trim()) {
      setError('Please enter a verification code')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const endpoint = mode === 'recovery'
        ? '/api/auth/mfa/verify-recovery'
        : '/api/auth/mfa/verify'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          factorId,
          challengeId,
          code: code.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed')
      }

      onVerified()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Verification failed'
      setError(errorMessage)

      // Clear the code input on error
      setCode('')

      // If challenge expired, create a new one
      if (errorMessage.includes('expired')) {
        createChallenge()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCodeChange = (value: string) => {
    // Only allow numbers and limit length based on mode
    const maxLength = mode === 'recovery' ? 10 : 6
    const sanitized = value.replace(/\D/g, '').slice(0, maxLength)
    setCode(sanitized)
    setError(null)

    // Auto-submit for TOTP when 6 digits are entered
    if (mode === 'totp' && sanitized.length === 6) {
      // Use timeout to allow the state to update
      setTimeout(() => {
        if (challengeId && !loading) {
          verifyCode()
        }
      }, 100)
    }
  }

  const formatTimeLeft = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    createChallenge()
  }, [createChallenge])

  // Timer for challenge expiration
  useEffect(() => {
    if (!expiresAt) return

    const updateTimer = () => {
      const now = new Date().getTime()
      const expires = new Date(expiresAt).getTime()
      const remaining = Math.max(0, expires - now)
      setTimeLeft(Math.floor(remaining / 1000))

      if (remaining <= 0) {
        setError('Challenge expired. Please try again.')
        setChallengeId(null)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [expiresAt])

  // Auto-focus the input
  useEffect(() => {
    if (!isCreatingChallenge && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isCreatingChallenge])

  if (isCreatingChallenge) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Preparing verification...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>Two-Factor Authentication</CardTitle>
        </div>
        <CardDescription>
          {mode === 'totp'
            ? 'Enter the 6-digit code from your authenticator app'
            : 'Enter one of your recovery codes'
          }
        </CardDescription>

        {challengeId && timeLeft > 0 && (
          <div className="text-sm text-muted-foreground">
            Code expires in: {formatTimeLeft(timeLeft)}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <label htmlFor="mfa-code" className="text-sm font-medium">
            {mode === 'totp' ? 'Verification Code' : 'Recovery Code'}
          </label>
          <Input
            ref={inputRef}
            id="mfa-code"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder={mode === 'totp' ? '000000' : 'XXXX-XXXX'}
            className="text-center font-mono text-lg tracking-widest"
            autoComplete="one-time-code"
            disabled={loading || !challengeId}
          />
          <p className="text-xs text-muted-foreground">
            {mode === 'totp'
              ? 'This code changes every 30 seconds'
              : 'Each recovery code can only be used once'
            }
          </p>
        </div>

        {/* Toggle between TOTP and recovery codes */}
        {allowRecovery && (
          <div className="text-center">
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                setMode(mode === 'totp' ? 'recovery' : 'totp')
                setCode('')
                setError(null)
              }}
              className="text-sm"
            >
              {mode === 'totp'
                ? 'Use a recovery code instead'
                : 'Use authenticator app instead'
              }
            </Button>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        {onBack && (
          <Button variant="outline" onClick={onBack} disabled={loading}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}

        <Button
          onClick={verifyCode}
          disabled={loading || !challengeId || !code.trim()}
          className="flex-1"
        >
          {loading ? 'Verifying...' : 'Verify'}
        </Button>

        {/* Refresh challenge button */}
        {!challengeId || timeLeft <= 30 ? (
          <Button
            variant="outline"
            size="icon"
            onClick={createChallenge}
            disabled={isCreatingChallenge}
          >
            <RefreshCw className={`h-4 w-4 ${isCreatingChallenge ? 'animate-spin' : ''}`} />
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  )
}