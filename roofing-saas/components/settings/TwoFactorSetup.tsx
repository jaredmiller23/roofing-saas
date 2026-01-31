'use client'

// =============================================
// Two-Factor Authentication Setup Component
// =============================================
// Purpose: UI for enabling/disabling 2FA with TOTP
// Author: Claude Code
// Date: 2025-12-13
// =============================================

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Loader2, Shield, ShieldCheck, ShieldOff, Copy, CheckCircle, AlertCircle, Key } from 'lucide-react'
import Image from 'next/image'

interface MFAStatus {
  enabled: boolean
  factors: Array<{
    id: string
    type: string
    status: string
    friendlyName?: string
  }>
  assuranceLevel: string
}

interface EnrollmentData {
  factorId: string
  qrCode: string
  secret: string
  uri: string
}

export function TwoFactorSetup() {
  const [status, setStatus] = useState<MFAStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [disabling, setDisabling] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Setup dialog state
  const [setupDialogOpen, setSetupDialogOpen] = useState(false)
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)

  // Disable dialog state
  const [disableDialogOpen, setDisableDialogOpen] = useState(false)

  // Secret visibility
  const [showSecret, setShowSecret] = useState(false)
  const [copiedSecret, setCopiedSecret] = useState(false)

  useEffect(() => {
    fetchStatus()
  }, [])

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const data = await apiFetch<{ mfa: MFAStatus }>('/api/auth/mfa/status')
      setStatus(data.mfa)
    } catch (error) {
      console.error('Error fetching MFA status:', error)
      setMessage({ type: 'error', text: 'Failed to load MFA status' })
    } finally {
      setLoading(false)
    }
  }

  const handleStartSetup = async () => {
    setEnrolling(true)
    setMessage(null)

    try {
      const data = await apiFetch<{ enrollment: EnrollmentData }>('/api/auth/mfa/enroll', {
        method: 'POST',
        body: { friendlyName: 'Authenticator App' },
      })

      setEnrollmentData(data.enrollment)
      setSetupDialogOpen(true)
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to start MFA setup'
      })
    } finally {
      setEnrolling(false)
    }
  }

  const handleVerify = async () => {
    if (!enrollmentData || verificationCode.length !== 6) return

    setVerifying(true)
    setMessage(null)

    try {
      const data = await apiFetch<{ recoveryCodes: string[] }>('/api/auth/mfa/verify', {
        method: 'POST',
        body: {
          factorId: enrollmentData.factorId,
          code: verificationCode,
        },
      })

      // Show recovery codes
      setRecoveryCodes(data.recoveryCodes)
      setMessage({ type: 'success', text: 'Two-factor authentication enabled!' })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Verification failed'
      })
    } finally {
      setVerifying(false)
    }
  }

  const handleCloseSetup = () => {
    setSetupDialogOpen(false)
    setEnrollmentData(null)
    setVerificationCode('')
    setRecoveryCodes(null)
    setShowSecret(false)
    fetchStatus()
  }

  const handleDisable = async () => {
    setDisabling(true)
    setMessage(null)

    try {
      await apiFetch('/api/auth/mfa/disable', {
        method: 'POST',
        body: {},
      })

      setMessage({ type: 'success', text: 'Two-factor authentication disabled' })
      setDisableDialogOpen(false)
      fetchStatus()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to disable MFA'
      })
    } finally {
      setDisabling(false)
    }
  }

  const copySecret = async () => {
    if (!enrollmentData?.secret) return

    try {
      await navigator.clipboard.writeText(enrollmentData.secret)
      setCopiedSecret(true)
      setTimeout(() => setCopiedSecret(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const copyRecoveryCodes = async () => {
    if (!recoveryCodes) return

    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'))
      setMessage({ type: 'success', text: 'Recovery codes copied to clipboard' })
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </div>
            {status?.enabled && (
              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                <ShieldCheck className="h-3 w-3 mr-1" />
                Enabled
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <Alert className={`${message.type === 'success' ? 'bg-green-500/10 border-green-500' : 'bg-destructive/10 border-destructive'}`}>
              <div className="flex items-center gap-2">
                {message.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
                <AlertDescription className={message.type === 'success' ? 'text-green-500' : 'text-destructive'}>
                  {message.text}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {status?.enabled ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your account is protected with two-factor authentication using an authenticator app.
              </p>
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setDisableDialogOpen(true)}
              >
                <ShieldOff className="h-4 w-4 mr-2" />
                Disable 2FA
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Two-factor authentication adds an extra layer of security by requiring a code from your
                authenticator app when you sign in.
              </p>
              <Button onClick={handleStartSetup} disabled={enrolling}>
                {enrolling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Enable 2FA
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <Dialog open={setupDialogOpen} onOpenChange={(open) => !open && handleCloseSetup()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {recoveryCodes ? 'Save Your Recovery Codes' : 'Set Up Two-Factor Authentication'}
            </DialogTitle>
            <DialogDescription>
              {recoveryCodes
                ? 'Store these codes safely. You can use them to access your account if you lose your authenticator.'
                : 'Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)'}
            </DialogDescription>
          </DialogHeader>

          {recoveryCodes ? (
            <div className="space-y-4">
              <Alert className="bg-orange-500/10 border-orange-500">
                <Key className="h-4 w-4 text-orange-500" />
                <AlertTitle className="text-orange-500">Save these codes</AlertTitle>
                <AlertDescription className="text-orange-500/80">
                  Each code can only be used once. Keep them in a safe place.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
                {recoveryCodes.map((code, i) => (
                  <div key={i} className="text-center py-1">
                    {code}
                  </div>
                ))}
              </div>

              <Button variant="outline" className="w-full" onClick={copyRecoveryCodes}>
                <Copy className="h-4 w-4 mr-2" />
                Copy All Codes
              </Button>

              <DialogFooter>
                <Button onClick={handleCloseSetup} className="w-full">
                  I&apos;ve Saved My Codes
                </Button>
              </DialogFooter>
            </div>
          ) : enrollmentData ? (
            <div className="space-y-4">
              {/* QR Code */}
              <div className="flex justify-center">
                <div className="p-4 bg-card rounded-lg">
                  <Image
                    src={enrollmentData.qrCode}
                    alt="QR Code for authenticator"
                    width={200}
                    height={200}
                    className="mx-auto"
                  />
                </div>
              </div>

              {/* Manual Entry */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Can&apos;t scan? Enter this code manually:
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type={showSecret ? 'text' : 'password'}
                    value={enrollmentData.secret}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copySecret}
                  >
                    {copiedSecret ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? 'Hide' : 'Show'} secret
                </Button>
              </div>

              {/* Verification Code Input */}
              <div className="space-y-2">
                <Label htmlFor="verification-code">Enter the 6-digit code from your app</Label>
                <Input
                  id="verification-code"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleCloseSetup}>
                  Cancel
                </Button>
                <Button
                  onClick={handleVerify}
                  disabled={verificationCode.length !== 6 || verifying}
                >
                  {verifying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Enable'
                  )}
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Disable Confirmation Dialog */}
      <AlertDialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Two-Factor Authentication?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the extra layer of security from your account. You can re-enable it
              at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisable}
              disabled={disabling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disabling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Disabling...
                </>
              ) : (
                'Disable 2FA'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
