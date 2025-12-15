'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Shield, ShieldCheck, AlertTriangle, Key, Eye, Smartphone } from 'lucide-react'
import { MFASetup } from '@/components/auth/MFASetup'
import { createClient } from '@/lib/supabase/client'
import { AdminGate } from '@/components/auth/PermissionGate'

interface MFAFactor {
  id: string
  type: 'totp'
  status: 'verified' | 'unverified'
  friendlyName?: string
  createdAt: string
  updatedAt: string
}

interface MFAStatus {
  enabled: boolean
  factors: MFAFactor[]
}

export function SecuritySettings() {
  const [mfaStatus, setMfaStatus] = useState<MFAStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const supabase = createClient()

  const loadUserRole = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const response = await fetch('/api/auth/user-role')
      if (response.ok) {
        const data = await response.json()
        setUserRole(data.role)
      }
    } catch (err) {
      console.error('Failed to load user role:', err)
    }
  }, [supabase.auth])

  const loadMFAStatus = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/mfa/status')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load MFA status')
      }

      setMfaStatus(data.mfa)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load MFA status')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load MFA status and user role on mount
  useEffect(() => {
    loadMFAStatus()
    loadUserRole()
  }, [loadMFAStatus, loadUserRole])

  const disableMFA = async (factorId: string) => {
    if (!confirm('Are you sure you want to disable two-factor authentication? This will reduce your account security.')) {
      return
    }

    try {
      const response = await fetch('/api/auth/mfa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ factorId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disable MFA')
      }

      await loadMFAStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable MFA')
    }
  }

  const handleSetupComplete = () => {
    setShowSetup(false)
    loadMFAStatus()
  }

  const isAdminUser = userRole === 'admin' || userRole === 'owner'
  const hasMFA = mfaStatus?.enabled || false

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading security settings...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Security Settings</h2>
        <p className="text-muted-foreground">
          Manage your account security and two-factor authentication
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Admin MFA Requirement Notice */}
      <AdminGate>
        {!hasMFA && (
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Security Requirement:</strong> As an admin user, you are required to enable
              two-factor authentication (MFA) to protect sensitive system access. Please set up MFA immediately.
            </AlertDescription>
          </Alert>
        )}
      </AdminGate>

      {/* Two-Factor Authentication Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${hasMFA ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                {hasMFA ? <ShieldCheck className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
              </div>
              <div>
                <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account with TOTP-based authentication
                </CardDescription>
              </div>
            </div>
            <Badge variant={hasMFA ? 'default' : 'secondary'}>
              {hasMFA ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {hasMFA ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-900">MFA is Active</span>
                </div>
                <p className="text-sm text-green-800">
                  Your account is protected with two-factor authentication. You&apos;ll be prompted
                  for a verification code each time you sign in.
                </p>
              </div>

              {/* Show configured factors */}
              <div className="space-y-2">
                <h4 className="font-medium">Configured Authenticators</h4>
                {mfaStatus?.factors.map((factor) => (
                  <div
                    key={factor.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{factor.friendlyName || 'Authenticator App'}</p>
                        <p className="text-sm text-muted-foreground">
                          Added {new Date(factor.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={factor.status === 'verified' ? 'default' : 'secondary'}>
                        {factor.status}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => disableMFA(factor.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium text-yellow-900">MFA Recommended</span>
                </div>
                <p className="text-sm text-yellow-800">
                  Two-factor authentication significantly improves your account security.
                  {isAdminUser && ' As an admin user, MFA is required for system security.'}
                </p>
              </div>

              <Dialog open={showSetup} onOpenChange={setShowSetup}>
                <DialogTrigger asChild>
                  <Button className="w-full" variant={isAdminUser ? "default" : "outline"}>
                    <Shield className="h-4 w-4 mr-2" />
                    Set Up Two-Factor Authentication
                    {isAdminUser && <span className="ml-2 text-xs">(Required)</span>}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
                    <DialogDescription>
                      Follow the steps below to secure your account with MFA
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-center">
                    <MFASetup
                      onComplete={handleSetupComplete}
                      onCancel={() => setShowSetup(false)}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Security Benefits */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Security Benefits</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-primary rounded-full" />
                Protects against password theft and breaches
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-primary rounded-full" />
                Prevents unauthorized access even if password is compromised
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-primary rounded-full" />
                Compatible with Google Authenticator, Authy, and other TOTP apps
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-primary rounded-full" />
                Recovery codes provided for backup access
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Additional Security Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Password & Access</CardTitle>
              <CardDescription>
                Manage your password and account access settings
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Password</p>
              <p className="text-sm text-muted-foreground">
                Change your account password
              </p>
            </div>
            <Button variant="outline" onClick={() => window.location.href = '/auth/update-password'}>
              Change Password
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Active Sessions</p>
              <p className="text-sm text-muted-foreground">
                View and manage your active login sessions
              </p>
            </div>
            <Button variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              View Sessions
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}