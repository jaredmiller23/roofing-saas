'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, XCircle, RefreshCw, ExternalLink, AlertCircle, Upload, Users, FileText } from 'lucide-react'
import { apiFetch } from '@/lib/api/client'
import { logger } from '@/lib/logger'

interface QuickBooksStatus {
  connected: boolean
  realm_id?: string
  company_name?: string
  country?: string
  expires_at?: string
  is_expired?: boolean
  connected_at?: string
  message?: string
}

interface SyncStatus {
  syncing: boolean
  type?: 'contact' | 'project' | 'bulk'
  progress?: string
}

export function QuickBooksIntegration() {
  const [status, setStatus] = useState<QuickBooksStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ syncing: false })
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null)

  const fetchStatus = async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await apiFetch<QuickBooksStatus>('/api/quickbooks/status')
      setStatus(data)
    } catch (err) {
      logger.error('Failed to fetch QuickBooks status', { error: err })
      setError(err instanceof Error ? err.message : 'Failed to load QuickBooks status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()

    // Check URL params for OAuth callback results
    const params = new URLSearchParams(window.location.search)
    const qbConnected = params.get('qb_connected')
    const qbError = params.get('qb_error')

    if (qbConnected === 'true') {
      setError(null)
      fetchStatus()
      // Remove query params from URL
      window.history.replaceState({}, '', window.location.pathname)
    }

    if (qbError) {
      setError(decodeURIComponent(qbError))
      // Remove query params from URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const handleConnect = () => {
    setActionLoading(true)
    // Redirect to OAuth flow
    window.location.href = '/api/quickbooks/auth'
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect QuickBooks? This will stop all data syncing.')) {
      return
    }

    try {
      setActionLoading(true)
      setError(null)

      await apiFetch('/api/quickbooks/disconnect', { method: 'POST' })

      // Refresh status
      await fetchStatus()
    } catch (err) {
      logger.error('Failed to disconnect QuickBooks', { error: err })
      setError(err instanceof Error ? err.message : 'Failed to disconnect QuickBooks')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSyncContacts = async (bulkSync: boolean = false) => {
    try {
      setSyncStatus({ syncing: true, type: bulkSync ? 'bulk' : 'contact', progress: 'Syncing...' })
      setError(null)
      setSyncSuccess(null)

      const data = await apiFetch<{ synced?: number }>('/api/quickbooks/sync/contact', {
        method: 'POST',
        body: { bulkSync },
      })

      setSyncSuccess(bulkSync
        ? `Successfully synced ${data.synced || 0} contacts to QuickBooks`
        : 'Contact synced to QuickBooks successfully'
      )
    } catch (err) {
      logger.error('Failed to sync contacts', { error: err })
      setError(err instanceof Error ? err.message : 'Failed to sync contacts')
    } finally {
      setSyncStatus({ syncing: false })
    }
  }

  const handleSyncProjects = async () => {
    try {
      setSyncStatus({ syncing: true, type: 'project', progress: 'Syncing projects as invoices...' })
      setError(null)
      setSyncSuccess(null)

      await apiFetch('/api/quickbooks/sync/project', { method: 'POST' })

      setSyncSuccess('Projects synced to QuickBooks successfully')
    } catch (err) {
      logger.error('Failed to sync projects', { error: err })
      setError(err instanceof Error ? err.message : 'Failed to sync projects')
    } finally {
      setSyncStatus({ syncing: false })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image
              src="/quickbooks-logo.svg"
              alt="QuickBooks"
              width={24}
              height={24}
              className="h-6 w-6"
            />
            QuickBooks Online
          </CardTitle>
          <CardDescription>Sync customers, invoices, and payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image
            src="/quickbooks-logo.svg"
            alt="QuickBooks"
            width={24}
            height={24}
            className="h-6 w-6"
          />
          QuickBooks Online
        </CardTitle>
        <CardDescription>Sync customers, invoices, and payments with QuickBooks</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            {status?.connected ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium text-foreground">Connected</div>
                  {status.company_name && (
                    <div className="text-sm text-muted-foreground">{status.company_name}</div>
                  )}
                </div>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium text-foreground">Not Connected</div>
                  <div className="text-sm text-muted-foreground">Connect to enable syncing</div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {status?.connected && status.is_expired && (
              <Badge variant="destructive">Token Expired</Badge>
            )}
            {status?.connected && !status.is_expired && (
              <Badge variant="default" className="bg-green-600">Active</Badge>
            )}
          </div>
        </div>

        {/* Connection Details */}
        {status?.connected && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Company ID:</span>
              <span className="font-mono text-foreground">{status.realm_id}</span>
            </div>
            {status.country && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Country:</span>
                <span className="text-foreground">{status.country}</span>
              </div>
            )}
            {status.connected_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Connected:</span>
                <span className="text-foreground">
                  {new Date(status.connected_at).toLocaleDateString()}
                </span>
              </div>
            )}
            {status.expires_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Token Expires:</span>
                <span className="text-foreground">
                  {new Date(status.expires_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Features List */}
        <div className="pt-4 border-t">
          <div className="text-sm font-medium text-foreground mb-3">Sync Features:</div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Sync contacts as QuickBooks customers
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Create invoices from projects
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Track payments and revenue
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Automatic financial reporting
            </li>
          </ul>
        </div>

        {/* Sync Controls */}
        {status?.connected && !status.is_expired && (
          <div className="pt-4 border-t">
            <div className="text-sm font-medium text-foreground mb-3">Data Sync:</div>

            {/* Success Alert */}
            {syncSuccess && (
              <Alert className="mb-4 bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{syncSuccess}</AlertDescription>
              </Alert>
            )}

            {/* Sync Progress */}
            {syncStatus.syncing && (
              <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg flex items-center gap-3">
                <RefreshCw className="h-4 w-4 text-primary animate-spin" />
                <span className="text-sm text-primary">{syncStatus.progress}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sync Contacts */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium text-foreground">Contacts</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Sync your contacts to QuickBooks as customers
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSyncContacts(true)}
                  disabled={syncStatus.syncing || actionLoading}
                  className="w-full"
                >
                  {syncStatus.syncing && syncStatus.type === 'bulk' ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Syncing All...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Sync All Contacts
                    </>
                  )}
                </Button>
              </div>

              {/* Sync Projects */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium text-foreground">Projects</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Create invoices in QuickBooks from won projects
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncProjects}
                  disabled={syncStatus.syncing || actionLoading}
                  className="w-full"
                >
                  {syncStatus.syncing && syncStatus.type === 'project' ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Sync Projects
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="mt-3 text-xs text-muted-foreground">
              <strong>Note:</strong> Contacts must be synced before their projects can be synced as invoices.
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          {status?.connected ? (
            <>
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  'Disconnect'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={fetchStatus}
                disabled={actionLoading}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Status
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open('https://quickbooks.intuit.com', '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open QuickBooks
              </Button>
            </>
          ) : (
            <Button
              onClick={handleConnect}
              disabled={actionLoading}
              className="bg-primary hover:bg-primary/90"
            >
              {actionLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  Connect QuickBooks
                  <ExternalLink className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>

        {/* Help Text */}
        <div className="text-xs text-muted-foreground pt-2 border-t">
          <strong>Note:</strong> You&apos;ll be redirected to QuickBooks to authorize this connection.
          Make sure pop-ups are enabled in your browser.
        </div>
      </CardContent>
    </Card>
  )
}
