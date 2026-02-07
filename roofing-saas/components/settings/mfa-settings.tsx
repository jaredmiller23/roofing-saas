'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Shield, ShieldCheck, Copy, Download, Loader2 } from 'lucide-react'

type MFAFactor = {
  id: string
  type: 'totp'
  status: 'verified' | 'unverified'
  friendlyName?: string
  createdAt: string
  updatedAt: string
}

type MFAStatusData = {
  enabled: boolean
  factors: MFAFactor[]
  assuranceLevel: string
  requiresMFA: boolean
}

type EnrollmentData = {
  factorId: string
  qrCode: string
  secret: string
  uri: string
}

type EnrollmentStep = 'idle' | 'scanning' | 'recovery' | 'done'

function MFASkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-72" />
      <Skeleton className="h-10 w-32 mt-4" />
    </div>
  )
}

export function MFASettings() {
  // Status state
  const [mfaStatus, setMfaStatus] = useState<MFAStatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Enrollment state
  const [enrollmentStep, setEnrollmentStep] = useState<EnrollmentStep>('idle')
  const [enrollment, setEnrollment] = useState<EnrollmentData | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [verifyCode, setVerifyCode] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [verifying, setVerifying] = useState(false)

  // Disable state
  const [disableDialogOpen, setDisableDialogOpen] = useState(false)
  const [disableCode, setDisableCode] = useState('')
  const [disabling, setDisabling] = useState(false)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/mfa/status')
      const result = await response.json()

      if (!response.ok || !result.success) {
        setError(result.error?.message || 'Failed to load MFA status')
        return
      }

      setMfaStatus(result.data.mfa)
    } catch {
      setError('An unexpected error occurred while loading MFA status')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleStartEnrollment = async () => {
    setEnrolling(true)
    try {
      const response = await fetch('/api/auth/mfa/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        toast.error(result.error?.message || 'Failed to start MFA enrollment')
        return
      }

      setEnrollment(result.data.enrollment)
      setRecoveryCodes(result.data.recoveryCodes || [])
      setEnrollmentStep('scanning')
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setEnrolling(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!enrollment) return

    setVerifying(true)
    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factorId: enrollment.factorId,
          code: verifyCode,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        toast.error(result.error?.message || 'Invalid verification code')
        return
      }

      // The verify endpoint also returns recovery codes
      if (result.data.recoveryCodes?.length) {
        setRecoveryCodes(result.data.recoveryCodes)
      }

      toast.success('MFA enabled successfully')
      setEnrollmentStep('recovery')
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setVerifying(false)
    }
  }

  const handleRecoveryCodesSaved = () => {
    setEnrollmentStep('done')
    setEnrollment(null)
    setVerifyCode('')
    setRecoveryCodes([])
    fetchStatus()
  }

  const handleCancelEnrollment = () => {
    setEnrollmentStep('idle')
    setEnrollment(null)
    setVerifyCode('')
    setRecoveryCodes([])
  }

  const handleDisableMFA = async () => {
    setDisabling(true)
    try {
      const response = await fetch('/api/auth/mfa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        toast.error(result.error?.message || 'Failed to disable MFA')
        return
      }

      toast.success('MFA has been disabled')
      setDisableDialogOpen(false)
      setDisableCode('')
      fetchStatus()
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setDisabling(false)
    }
  }

  const handleCopyRecoveryCodes = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'))
      toast.success('Recovery codes copied to clipboard')
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }

  const handleDownloadRecoveryCodes = () => {
    const content = [
      'MFA Recovery Codes',
      '==================',
      '',
      'Keep these codes in a safe place.',
      'Each code can only be used once.',
      '',
      ...recoveryCodes,
      '',
      `Generated: ${new Date().toISOString()}`,
    ].join('\n')

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'mfa-recovery-codes.txt'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Recovery codes downloaded')
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Security Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account security and multi-factor authentication
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="pt-6">
              <MFASkeleton />
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {!loading && error && (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-destructive mb-4">{error}</p>
              <Button variant="outline" onClick={fetchStatus}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* MFA Disabled State */}
        {!loading && !error && mfaStatus && !mfaStatus.enabled && enrollmentStep === 'idle' && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-muted-foreground" />
                <div>
                  <CardTitle>Multi-Factor Authentication</CardTitle>
                  <CardDescription>
                    Add an extra layer of security to your account
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">
                    Multi-factor authentication (MFA) adds a second verification step when you sign in.
                    After entering your password, you&apos;ll also need to provide a code from your
                    authenticator app. This makes it much harder for anyone to access your account,
                    even if they know your password.
                  </p>
                </div>
                <Button onClick={handleStartEnrollment} disabled={enrolling} className="gap-2">
                  {enrolling ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4" />
                  )}
                  Enable MFA
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enrollment: QR Code Scanning Step */}
        {!loading && enrollmentStep === 'scanning' && enrollment && (
          <Card>
            <CardHeader>
              <CardTitle>Set Up Authenticator App</CardTitle>
              <CardDescription>
                Scan the QR code below with your authenticator app (Google Authenticator, Authy, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="rounded-lg border border-border bg-foreground p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={enrollment.qrCode}
                      alt="MFA QR Code"
                      className="h-48 w-48"
                    />
                  </div>
                </div>

                {/* Manual Entry Secret */}
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    Can&apos;t scan? Enter this key manually:
                  </p>
                  <p className="font-mono text-sm text-foreground select-all break-all">
                    {enrollment.secret}
                  </p>
                </div>

                {/* Verification Code Input */}
                <div className="space-y-2">
                  <Label htmlFor="verify-code">Verification Code</Label>
                  <p className="text-sm text-muted-foreground">
                    Enter the 6-digit code from your authenticator app to verify setup
                  </p>
                  <Input
                    id="verify-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    value={verifyCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '')
                      setVerifyCode(value)
                    }}
                    className="font-mono text-center text-lg tracking-widest max-w-48"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleVerifyCode}
                    disabled={verifying || verifyCode.length !== 6}
                    className="gap-2"
                  >
                    {verifying && <Loader2 className="h-4 w-4 animate-spin" />}
                    Verify
                  </Button>
                  <Button variant="outline" onClick={handleCancelEnrollment} disabled={verifying}>
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enrollment: Recovery Codes Step */}
        {!loading && enrollmentStep === 'recovery' && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-green-500" />
                <div>
                  <CardTitle>Save Your Recovery Codes</CardTitle>
                  <CardDescription>
                    Store these codes in a safe place. If you lose access to your authenticator app,
                    you can use one of these codes to sign in. Each code can only be used once.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Recovery Codes Grid */}
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="grid grid-cols-2 gap-2">
                    {recoveryCodes.map((code) => (
                      <div
                        key={code}
                        className="font-mono text-sm text-foreground py-1 px-2 rounded bg-card"
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Copy/Download Actions */}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleCopyRecoveryCodes} className="gap-2">
                    <Copy className="h-4 w-4" />
                    Copy All
                  </Button>
                  <Button variant="outline" onClick={handleDownloadRecoveryCodes} className="gap-2">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>

                {/* Confirmation */}
                <Button onClick={handleRecoveryCodesSaved} className="w-full">
                  I&apos;ve saved my recovery codes
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* MFA Enabled State */}
        {!loading && !error && mfaStatus && mfaStatus.enabled && enrollmentStep === 'idle' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-6 w-6 text-green-500" />
                  <div>
                    <CardTitle>Multi-Factor Authentication</CardTitle>
                    <CardDescription>
                      Your account is protected with an authenticator app
                    </CardDescription>
                  </div>
                </div>
                <Badge className="bg-green-500/15 text-green-500 border-green-500/20">
                  MFA Enabled
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Factor Info */}
                {mfaStatus.factors
                  .filter((f) => f.status === 'verified')
                  .map((factor) => (
                    <div
                      key={factor.id}
                      className="flex items-center justify-between rounded-lg border border-border p-4"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {factor.friendlyName || 'Authenticator App'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Added {new Date(factor.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline">TOTP</Badge>
                    </div>
                  ))}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="destructive"
                    onClick={() => setDisableDialogOpen(true)}
                    className="gap-2"
                  >
                    <Shield className="h-4 w-4" />
                    Disable MFA
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Disable MFA Confirmation Dialog */}
        <AlertDialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disable Multi-Factor Authentication</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the extra security layer from your account.
                You will only need your password to sign in. Are you sure you want to continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <Label htmlFor="disable-code">Current TOTP Code</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Enter the 6-digit code from your authenticator app to confirm
              </p>
              <Input
                id="disable-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={disableCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '')
                  setDisableCode(value)
                }}
                className="font-mono text-center text-lg tracking-widest max-w-48"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={disabling}
                onClick={() => {
                  setDisableCode('')
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={(e) => {
                  e.preventDefault()
                  handleDisableMFA()
                }}
                disabled={disabling || disableCode.length !== 6}
              >
                {disabling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Disable MFA
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
