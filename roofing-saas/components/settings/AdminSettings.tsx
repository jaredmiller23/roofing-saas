'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { UserCog, History, AlertTriangle, Shield, Eye } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { UserPicker, ConfirmImpersonationDialog } from '@/components/impersonation'
import type {
  UserForImpersonation,
  ImpersonationStatusResponse,
  ListImpersonationLogsResponse,
  ImpersonationLogWithUsers
} from '@/lib/impersonation/types'

/**
 * AdminSettings
 * Admin-only settings panel for user impersonation and audit logs
 */
export function AdminSettings() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [impersonationStatus, setImpersonationStatus] = useState<ImpersonationStatusResponse | null>(null)
  const [recentLogs, setRecentLogs] = useState<ImpersonationLogWithUsers[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  // Dialog state
  const [selectedUser, setSelectedUser] = useState<UserForImpersonation | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check admin status and impersonation status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Check impersonation status
        const statusResponse = await fetch('/api/admin/impersonate/status')
        if (statusResponse.ok) {
          const statusData: ImpersonationStatusResponse = await statusResponse.json()
          setImpersonationStatus(statusData)
          setIsAdmin(true) // If we can access the status endpoint, user is admin
        } else if (statusResponse.status === 403) {
          setIsAdmin(false)
        }
      } catch (err) {
        console.error('Error checking admin status:', err)
        setIsAdmin(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkStatus()
  }, [])

  // Load recent impersonation logs
  useEffect(() => {
    if (!isAdmin) return

    const loadLogs = async () => {
      setLogsLoading(true)
      try {
        const response = await fetch('/api/admin/impersonate/logs?limit=5')
        if (response.ok) {
          const data: ListImpersonationLogsResponse = await response.json()
          setRecentLogs(data.logs || [])
        }
      } catch (err) {
        console.error('Error loading impersonation logs:', err)
      } finally {
        setLogsLoading(false)
      }
    }

    loadLogs()
  }, [isAdmin])

  const handleUserSelect = (user: UserForImpersonation) => {
    setSelectedUser(user)
    setIsDialogOpen(true)
    setError(null)
  }

  const handleStartImpersonation = async (userId: string, reason?: string) => {
    try {
      const response = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, reason }),
      })

      if (response.ok) {
        // Reload page to apply impersonation
        window.location.reload()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to start impersonation')
        throw new Error(data.error)
      }
    } catch (err) {
      console.error('Error starting impersonation:', err)
      throw err
    }
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '-'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-48 w-full bg-gray-100 animate-pulse rounded-lg" />
        <div className="h-64 w-full bg-gray-100 animate-pulse rounded-lg" />
      </div>
    )
  }

  // Non-admin access
  if (!isAdmin) {
    return (
      <Alert variant="destructive">
        <Shield className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          You don&apos;t have admin privileges to access this section.
          Contact your administrator if you need access.
        </AlertDescription>
      </Alert>
    )
  }

  // Currently impersonating
  if (impersonationStatus?.is_impersonating) {
    return (
      <Alert className="border-orange-500 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertTitle className="text-orange-900">Active Impersonation Session</AlertTitle>
        <AlertDescription className="text-orange-800">
          You are currently impersonating <strong>{impersonationStatus.impersonated_user?.email}</strong>.
          Exit the impersonation session using the banner at the top of the page to access admin settings.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Impersonation Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            User Impersonation
          </CardTitle>
          <CardDescription>
            View the application as another user for support and debugging purposes.
            All sessions are logged for security and compliance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <Eye className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-blue-900">View as Another User</h4>
              <p className="text-sm text-blue-700 mt-1">
                Select a team member to view the application exactly as they see it.
                Use this to help with support requests or verify permissions.
              </p>
              <div className="mt-3">
                <UserPicker onUserSelect={handleUserSelect} />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h4 className="font-medium text-foreground mb-2">Security Notes</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              <li>All impersonation sessions are logged with timestamps and reasons</li>
              <li>Sessions automatically expire after 4 hours</li>
              <li>You cannot impersonate other admin users</li>
              <li>Actions taken while impersonating are attributed to you in the audit log</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Recent Impersonation Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Impersonation Sessions
          </CardTitle>
          <CardDescription>
            Your recent user impersonation activity for audit purposes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-3">
              <div className="h-12 w-full bg-gray-100 animate-pulse rounded" />
              <div className="h-12 w-full bg-gray-100 animate-pulse rounded" />
              <div className="h-12 w-full bg-gray-100 animate-pulse rounded" />
            </div>
          ) : recentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No impersonation sessions recorded yet
            </p>
          ) : (
            <div className="divide-y divide-gray-200">
              {recentLogs.map((log) => (
                <div key={log.id} className="py-3 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {log.impersonated_email || log.impersonated_name}
                      </span>
                      <Badge
                        variant={
                          log.status === 'active'
                            ? 'default'
                            : log.status === 'ended'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {log.status}
                      </Badge>
                    </div>
                    {log.reason && (
                      <p className="text-xs text-muted-foreground mt-0.5">{log.reason}</p>
                    )}
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div>{formatDate(log.started_at)}</div>
                    <div className="text-xs">
                      Duration: {formatDuration(log.duration_seconds)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {recentLogs.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href="/admin/audit-logs">
                  <Eye className="h-4 w-4 mr-2" />
                  View All Audit Logs
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <ConfirmImpersonationDialog
        user={selectedUser}
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false)
          setSelectedUser(null)
        }}
        onConfirm={handleStartImpersonation}
      />
    </div>
  )
}
