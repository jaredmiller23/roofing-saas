'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface QuickBooksConnectionProps {
  connection: {
    id: string
    company_name: string
    is_active: boolean
    token_expires_at: string
    environment: string
    last_sync_at?: string
    sync_error?: string
  } | null
}

export function QuickBooksConnection({ connection }: QuickBooksConnectionProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  const handleConnect = () => {
    setIsConnecting(true)
    window.location.href = '/api/quickbooks/auth'
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect QuickBooks? This will stop all syncing.')) {
      return
    }

    setIsDisconnecting(true)
    try {
      // TODO: Create disconnect endpoint
      const response = await fetch('/api/quickbooks/disconnect', {
        method: 'POST',
      })

      if (response.ok) {
        window.location.reload()
      } else {
        alert('Failed to disconnect. Please try again.')
        setIsDisconnecting(false)
      }
    } catch {
      alert('Failed to disconnect. Please try again.')
      setIsDisconnecting(false)
    }
  }

  const handleRefresh = async () => {
    try {
      const response = await fetch('/api/quickbooks/refresh', {
        method: 'POST',
      })

      if (response.ok) {
        alert('Token refreshed successfully')
        window.location.reload()
      } else {
        const data = await response.json()
        if (data.error === 'REAUTH_REQUIRED') {
          alert('Your QuickBooks connection has expired. Please reconnect.')
        } else {
          alert('Failed to refresh token. Please try again.')
        }
      }
    } catch {
      alert('Failed to refresh token. Please try again.')
    }
  }

  if (!connection || !connection.is_active) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connect to QuickBooks</CardTitle>
          <CardDescription>
            Connect your QuickBooks account to sync customers and create invoices automatically
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleConnect} disabled={isConnecting}>
            {isConnecting ? 'Connecting...' : 'Connect QuickBooks'}
          </Button>

          {connection && !connection.is_active && connection.sync_error && (
            <p className="mt-4 text-sm text-red-600">
              Previous connection error: {connection.sync_error}
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  const tokenExpiresAt = new Date(connection.token_expires_at)
  const isExpiringSoon = tokenExpiresAt.getTime() - Date.now() < 30 * 60 * 1000 // 30 minutes

  return (
    <Card>
      <CardHeader>
        <CardTitle>QuickBooks Connected</CardTitle>
        <CardDescription>
          Your QuickBooks account is connected and syncing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{connection.company_name}</p>
              <p className="text-sm text-gray-500">
                Environment: {connection.environment}
              </p>
              {connection.last_sync_at && (
                <p className="text-sm text-gray-500">
                  Last synced: {new Date(connection.last_sync_at).toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Active</span>
            </div>
          </div>
        </div>

        {isExpiringSoon && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-800">
              Your token is expiring soon. Click refresh to renew it.
            </p>
          </div>
        )}

        {connection.sync_error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-800">
              Sync error: {connection.sync_error}
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={handleRefresh}>
            Refresh Token
          </Button>
          <Button
            variant="destructive"
            onClick={handleDisconnect}
            disabled={isDisconnecting}
          >
            {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
          </Button>
        </div>

        <div className="text-xs text-gray-500 pt-2">
          <p>Token expires: {tokenExpiresAt.toLocaleString()}</p>
        </div>
      </CardContent>
    </Card>
  )
}
