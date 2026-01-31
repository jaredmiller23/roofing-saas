'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Shield, ShieldCheck, AlertTriangle, Copy, Check } from 'lucide-react'
import { apiFetch } from '@/lib/api/client'

interface MFASetupProps {
  onComplete?: () => void
  onCancel?: () => void
}

interface MFAEnrollmentData {
  factorId: string
  qrCode: string
  secret: string
  uri: string
}

export function MFASetup({ onComplete, onCancel }: MFASetupProps) {
  const [step, setStep] = useState<'setup' | 'verify' | 'success'>('setup')
  const [enrollmentData, setEnrollmentData] = useState<MFAEnrollmentData | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    startEnrollment()
  }, [])

  const startEnrollment = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await apiFetch<{ enrollment: MFAEnrollmentData; recoveryCodes: string[] }>('/api/auth/mfa/enroll', {
        method: 'POST',
        body: {
          friendlyName: 'Admin Authenticator',
        },
      })

      setEnrollmentData(data.enrollment)
      setRecoveryCodes(data.recoveryCodes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start enrollment')
    } finally {
      setLoading(false)
    }
  }

  const verifyEnrollment = async () => {
    if (!enrollmentData || !verifyCode.trim()) {
      setError('Please enter a verification code')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await apiFetch('/api/auth/mfa/verify', {
        method: 'POST',
        body: {
          factorId: enrollmentData.factorId,
          code: verifyCode.trim(),
        },
      })

      setStep('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const copySecret = async () => {
    if (!enrollmentData?.secret) return

    try {
      await navigator.clipboard.writeText(enrollmentData.secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const handleComplete = () => {
    onComplete?.()
  }

  if (loading && !enrollmentData) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="p-8 text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Setting up MFA...</p>
        </CardContent>
      </Card>
    )
  }

  if (step === 'setup' && enrollmentData) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Enable Two-Factor Authentication</CardTitle>
          </div>
          <CardDescription>
            Scan the QR code with your authenticator app or enter the secret key manually
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-card rounded-lg border">
                <QRCodeSVG value={enrollmentData.uri} size={200} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Scan this QR code with Google Authenticator, Authy, or another TOTP app
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Manual entry key</label>
            <div className="flex gap-2">
              <Input
                value={enrollmentData.secret}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copySecret}
                className="shrink-0"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              If you can&apos;t scan the QR code, enter this secret key in your authenticator app
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="verify-code" className="text-sm font-medium">
              Verification Code
            </label>
            <Input
              id="verify-code"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              placeholder="Enter 6-digit code"
              maxLength={6}
              autoComplete="one-time-code"
            />
            <p className="text-xs text-muted-foreground">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button
            onClick={verifyEnrollment}
            disabled={loading || !verifyCode.trim()}
            className="flex-1"
          >
            {loading ? 'Verifying...' : 'Verify & Enable MFA'}
          </Button>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </CardFooter>
      </Card>
    )
  }

  if (step === 'success') {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-600" />
            <CardTitle>MFA Successfully Enabled</CardTitle>
          </div>
          <CardDescription>
            Your account is now protected with two-factor authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Save these recovery codes in a secure location.
              You can use these codes to access your account if you lose your authenticator device.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <label className="text-sm font-medium">Recovery Codes</label>
            <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
              {recoveryCodes.map((code, index) => (
                <div key={index} className="font-mono text-sm">
                  <Badge variant="outline">{code}</Badge>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Each recovery code can only be used once. Store these codes safely and securely.
            </p>
          </div>

          <div className="bg-secondary/50 border border-border rounded-lg p-4">
            <h4 className="font-medium text-primary mb-2">What&apos;s next?</h4>
            <ul className="text-sm text-foreground space-y-1">
              <li>• You&apos;ll now be prompted for a code when signing in</li>
              <li>• Keep your authenticator app synced and backed up</li>
              <li>• Store your recovery codes in a secure password manager</li>
              <li>• You can disable MFA from account settings if needed</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleComplete} className="w-full">
            Complete Setup
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return null
}