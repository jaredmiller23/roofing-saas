'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface QuickBooksConnectionProps {
  connection: {
    realm_id: string
    company_name: string
    country: string
    expires_at: string
    created_at: string
  } | null
}

export function QuickBooksConnection({ connection }: QuickBooksConnectionProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const handleConnect = () => {
    setIsConnecting(true)
    window.location.href = '/api/quickbooks/auth'
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect QuickBooks? This will remove all sync mappings.')) {
      return
    }

    setIsDisconnecting(true)
    try {
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

  const handleSyncContacts = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch('/api/quickbooks/sync/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulkSync: true }),
      })

      const data = await response.json()

      if (response.ok) {
        alert(`Successfully synced ${data.synced} of ${data.total} contacts`)
      } else {
        alert(`Failed to sync contacts: ${data.error}`)
      }
    } catch {
      alert('Failed to sync contacts. Please try again.')
    } finally {
      setIsSyncing(false)
    }
  }

  if (!connection) {
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
        </CardContent>
      </Card>
    )
  }

  const tokenExpiresAt = new Date(connection.expires_at)
  const isExpired = tokenExpiresAt <= new Date()
  const isExpiringSoon = tokenExpiresAt.getTime() - Date.now() < 30 * 60 * 1000 // 30 minutes

  return (
    <Card>
      <CardHeader>
        <CardTitle>QuickBooks Connected</CardTitle>
        <CardDescription>
          Your QuickBooks account is connected and ready to sync
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{connection.company_name}</p>
              <p className="text-sm text-gray-500">
                Realm ID: {connection.realm_id}
              </p>
              <p className="text-sm text-gray-500">
                Country: {connection.country}
              </p>
              <p className="text-sm text-gray-500">
                Connected: {new Date(connection.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isExpired ? 'bg-red-500' : 'bg-green-500'}`}></div>
              <span className="text-sm text-gray-600">{isExpired ? 'Expired' : 'Active'}</span>
            </div>
          </div>
        </div>

        {isExpired && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-800">
              Your QuickBooks connection has expired. Please reconnect to continue syncing.
            </p>
          </div>
        )}

        {isExpiringSoon && !isExpired && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-800">
              Your token is expiring soon. Tokens refresh automatically when you sync.
            </p>
          </div>
        )}

        <div className="border-t pt-4">
          <h3 className="font-medium mb-2">Sync Actions</h3>
          <p className="text-sm text-gray-600 mb-3">
            Sync your CRM data with QuickBooks
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSyncContacts}
              disabled={isSyncing || isExpired}
            >
              {isSyncing ? 'Syncing...' : 'Sync All Contacts'}
            </Button>
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t">
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
