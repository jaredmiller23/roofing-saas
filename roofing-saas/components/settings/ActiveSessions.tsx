'use client'

// =============================================
// Active Sessions Component
// =============================================
// Purpose: View and manage active login sessions
// Author: Claude Code
// Date: 2025-12-13
// =============================================

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import {
  Loader2,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  LogOut,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  MapPin,
  Clock
} from 'lucide-react'

interface Session {
  id: string
  ip_address: string | null
  user_agent: string | null
  device_type: string | null
  browser: string | null
  browser_version: string | null
  os: string | null
  os_version: string | null
  location_city: string | null
  location_region: string | null
  location_country: string | null
  is_current: boolean
  created_at: string
  last_active_at: string
}

export function ActiveSessions() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [revokingAll, setRevokingAll] = useState(false)

  // Confirmation dialogs
  const [sessionToRevoke, setSessionToRevoke] = useState<Session | null>(null)
  const [showRevokeAllDialog, setShowRevokeAllDialog] = useState(false)

  useEffect(() => {
    fetchSessions()
  }, [])

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/auth/sessions')
      if (!response.ok) throw new Error('Failed to fetch sessions')

      const data = await response.json()
      setSessions(data.sessions || [])
    } catch (error) {
      console.error('Error fetching sessions:', error)
      setMessage({ type: 'error', text: 'Failed to load sessions' })
    } finally {
      setLoading(false)
    }
  }

  const handleRevokeSession = async () => {
    if (!sessionToRevoke) return

    setRevoking(sessionToRevoke.id)
    setMessage(null)

    try {
      const response = await fetch(`/api/auth/sessions?id=${sessionToRevoke.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign out session')
      }

      setMessage({ type: 'success', text: 'Session signed out successfully' })
      setSessions(prev => prev.filter(s => s.id !== sessionToRevoke.id))
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to sign out session'
      })
    } finally {
      setRevoking(null)
      setSessionToRevoke(null)
    }
  }

  const handleRevokeAll = async () => {
    setRevokingAll(true)
    setMessage(null)

    try {
      const response = await fetch('/api/auth/sessions/revoke-all', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign out sessions')
      }

      setMessage({ type: 'success', text: data.message })
      // Keep only the current session
      setSessions(prev => prev.filter(s => s.is_current))
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to sign out sessions'
      })
    } finally {
      setRevokingAll(false)
      setShowRevokeAllDialog(false)
    }
  }

  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-5 w-5" />
      case 'tablet':
        return <Tablet className="h-5 w-5" />
      default:
        return <Monitor className="h-5 w-5" />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }

  const getLocationString = (session: Session) => {
    const parts = []
    if (session.location_city) parts.push(session.location_city)
    if (session.location_region) parts.push(session.location_region)
    if (session.location_country) parts.push(session.location_country)
    return parts.length > 0 ? parts.join(', ') : null
  }

  const getDeviceString = (session: Session) => {
    const parts = []
    if (session.browser) {
      parts.push(session.browser + (session.browser_version ? ` ${session.browser_version}` : ''))
    }
    if (session.os) {
      parts.push(session.os + (session.os_version ? ` ${session.os_version}` : ''))
    }
    return parts.length > 0 ? parts.join(' on ') : 'Unknown device'
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

  const otherSessions = sessions.filter(s => !s.is_current)

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Active Sessions
              </CardTitle>
              <CardDescription>
                Manage your active login sessions across devices
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchSessions}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
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

          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No active sessions found
            </p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`flex items-start justify-between p-4 rounded-lg border ${
                    session.is_current ? 'border-primary/30 bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex gap-4">
                    <div className="mt-1 text-muted-foreground">
                      {getDeviceIcon(session.device_type)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {getDeviceString(session)}
                        </span>
                        {session.is_current && (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                            This device
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {getLocationString(session) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {getLocationString(session)}
                          </span>
                        )}
                        {session.ip_address && (
                          <span>IP: {session.ip_address}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Last active: {formatDate(session.last_active_at)}
                      </div>
                    </div>
                  </div>

                  {!session.is_current && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setSessionToRevoke(session)}
                      disabled={revoking === session.id}
                    >
                      {revoking === session.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <LogOut className="h-4 w-4 mr-1" />
                          Sign out
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {otherSessions.length > 0 && (
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setShowRevokeAllDialog(true)}
                disabled={revokingAll}
              >
                {revokingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing out...
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out all other devices
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revoke Single Session Dialog */}
      <AlertDialog open={!!sessionToRevoke} onOpenChange={(open) => !open && setSessionToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out this device?</AlertDialogTitle>
            <AlertDialogDescription>
              This will sign out the session on{' '}
              <strong>{sessionToRevoke ? getDeviceString(sessionToRevoke) : 'this device'}</strong>.
              They will need to sign in again to access the account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeSession}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke All Sessions Dialog */}
      <AlertDialog open={showRevokeAllDialog} onOpenChange={setShowRevokeAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out all other devices?</AlertDialogTitle>
            <AlertDialogDescription>
              This will sign out {otherSessions.length} other{' '}
              {otherSessions.length === 1 ? 'session' : 'sessions'}. You will remain signed in on this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sign out all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
