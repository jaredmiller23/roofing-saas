'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, XCircle, RefreshCw, ExternalLink, AlertCircle } from 'lucide-react'
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

export function QuickBooksIntegration() {
  const [status, setStatus] = useState<QuickBooksStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/quickbooks/status')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch status')
      }

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

      const response = await fetch('/api/quickbooks/disconnect', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disconnect')
      }

      // Refresh status
      await fetchStatus()
    } catch (err) {
      logger.error('Failed to disconnect QuickBooks', { error: err })
      setError(err instanceof Error ? err.message : 'Failed to disconnect QuickBooks')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <img
              src="/quickbooks-logo.svg"
              alt="QuickBooks"
              className="h-6 w-6"
              onError={(e) => {
                // Fallback to text if image doesn't load
                e.currentTarget.style.display = 'none'
              }}
            />
            QuickBooks Online
          </CardTitle>
          <CardDescription>Sync customers, invoices, and payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <img
            src="/quickbooks-logo.svg"
            alt="QuickBooks"
            className="h-6 w-6"
            onError={(e) => {
              // Fallback to text if image doesn't load
              e.currentTarget.style.display = 'none'
            }}
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
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            {status?.connected ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium text-gray-900">Connected</div>
                  {status.company_name && (
                    <div className="text-sm text-gray-600">{status.company_name}</div>
                  )}
                </div>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="font-medium text-gray-900">Not Connected</div>
                  <div className="text-sm text-gray-600">Connect to enable syncing</div>
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
              <span className="text-gray-600">Company ID:</span>
              <span className="font-mono text-gray-900">{status.realm_id}</span>
            </div>
            {status.country && (
              <div className="flex justify-between">
                <span className="text-gray-600">Country:</span>
                <span className="text-gray-900">{status.country}</span>
              </div>
            )}
            {status.connected_at && (
              <div className="flex justify-between">
                <span className="text-gray-600">Connected:</span>
                <span className="text-gray-900">
                  {new Date(status.connected_at).toLocaleDateString()}
                </span>
              </div>
            )}
            {status.expires_at && (
              <div className="flex justify-between">
                <span className="text-gray-600">Token Expires:</span>
                <span className="text-gray-900">
                  {new Date(status.expires_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Features List */}
        <div className="pt-4 border-t">
          <div className="text-sm font-medium text-gray-900 mb-3">Sync Features:</div>
          <ul className="space-y-2 text-sm text-gray-600">
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
              className="bg-blue-600 hover:bg-blue-700"
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
        <div className="text-xs text-gray-500 pt-2 border-t">
          <strong>Note:</strong> You'll be redirected to QuickBooks to authorize this connection.
          Make sure pop-ups are enabled in your browser.
        </div>
      </CardContent>
    </Card>
  )
}
