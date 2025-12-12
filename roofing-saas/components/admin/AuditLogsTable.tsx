'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import type { ImpersonationLogWithUsers } from '@/lib/impersonation/types'

type StatusFilter = 'all' | 'active' | 'ended' | 'expired' | 'terminated'

export function AuditLogsTable() {
  const [logs, setLogs] = useState<ImpersonationLogWithUsers[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const logsPerPage = 25

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()

      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      params.append('limit', logsPerPage.toString())
      params.append('offset', (page * logsPerPage).toString())

      const response = await fetch(`/api/admin/impersonate/logs?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch logs')
      }

      const data = await response.json()
      setLogs(data.logs || [])
      setHasMore(data.logs?.length === logsPerPage)
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [statusFilter, page])

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'destructive' | 'secondary' | 'outline', color: string }> = {
      active: { variant: 'default', color: 'bg-green-500' },
      ended: { variant: 'secondary', color: 'bg-gray-500' },
      expired: { variant: 'outline', color: 'bg-orange-500' },
      terminated: { variant: 'destructive', color: 'bg-red-500' },
    }

    const config = variants[status] || { variant: 'outline' as const, color: 'bg-gray-500' }

    return (
      <Badge variant={config.variant} className="capitalize">
        {status}
      </Badge>
    )
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A'

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Audit Logs</CardTitle>
            <CardDescription>
              Complete history of all impersonation sessions
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={(value) => {
              setStatusFilter(value as StatusFilter)
              setPage(0)
            }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="ended">Ended</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchLogs}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No audit logs found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium text-sm">Admin</th>
                    <th className="text-left p-3 font-medium text-sm">Impersonated User</th>
                    <th className="text-left p-3 font-medium text-sm">Status</th>
                    <th className="text-left p-3 font-medium text-sm">Started</th>
                    <th className="text-left p-3 font-medium text-sm">Duration</th>
                    <th className="text-left p-3 font-medium text-sm">Reason</th>
                    <th className="text-left p-3 font-medium text-sm">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {log.admin_email || 'Unknown'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {log.admin_name || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {log.impersonated_email || 'Unknown'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {log.impersonated_name || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        {getStatusBadge(log.status)}
                      </td>
                      <td className="p-3 text-sm">
                        {formatDate(log.started_at)}
                      </td>
                      <td className="p-3 text-sm">
                        {formatDuration(log.duration_seconds)}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground max-w-xs truncate">
                        {log.reason || 'No reason provided'}
                      </td>
                      <td className="p-3 text-sm font-mono text-muted-foreground">
                        {log.ip_address || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {page * logsPerPage + 1}-{page * logsPerPage + logs.length} logs
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0 || loading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page + 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={!hasMore || loading}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
