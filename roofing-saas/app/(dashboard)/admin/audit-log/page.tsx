'use client'

import { useState, useEffect } from 'react'
import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Download, RefreshCw, Activity } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AuditLogTable } from '@/components/admin/AuditLogTable'
import { AuditLogFilters } from '@/components/admin/AuditLogFilters'
import { AuditEntryDetail } from '@/components/admin/AuditEntryDetail'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { AuditEntry, AuditLogFilters as AuditFilters, AuditLogResponse } from '@/lib/audit/audit-types'

interface AuditLogPageState {
  entries: AuditEntry[]
  total: number
  page: number
  limit: number
  loading: boolean
  error: string | null
  filters: AuditFilters
  selectedEntry: AuditEntry | null
  exporting: boolean
}

export default function AuditLogPage() {
  const [state, setState] = useState<AuditLogPageState>({
    entries: [],
    total: 0,
    page: 1,
    limit: 50,
    loading: true,
    error: null,
    filters: {
      page: 1,
      limit: 50,
      sort_by: 'timestamp',
      sort_order: 'desc'
    },
    selectedEntry: null,
    exporting: false
  })

  // Fetch audit log entries
  const fetchAuditLog = async (filters: AuditFilters) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      const searchParams = new URLSearchParams()

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value))
        }
      })

      const response = await fetch(`/api/admin/audit-log?${searchParams.toString()}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch audit log: ${response.statusText}`)
      }

      const data: AuditLogResponse = await response.json()

      setState(prev => ({
        ...prev,
        entries: data.entries,
        total: data.total,
        page: data.page,
        limit: data.limit,
        loading: false
      }))
    } catch (error) {
      console.error('Error fetching audit log:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch audit log'
      }))
    }
  }

  // Handle filter changes
  const handleFiltersChange = (newFilters: AuditFilters) => {
    const updatedFilters = { ...newFilters, page: 1 } // Reset to page 1 when filters change
    setState(prev => ({ ...prev, filters: updatedFilters }))
    fetchAuditLog(updatedFilters)
  }

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    const updatedFilters = { ...state.filters, page: newPage }
    setState(prev => ({ ...prev, filters: updatedFilters }))
    fetchAuditLog(updatedFilters)
  }

  // Handle entry selection for detail view
  const handleEntrySelect = (entry: AuditEntry) => {
    setState(prev => ({ ...prev, selectedEntry: entry }))
  }

  // Handle entry detail dialog close
  const handleDetailClose = () => {
    setState(prev => ({ ...prev, selectedEntry: null }))
  }

  // Handle refresh
  const handleRefresh = () => {
    fetchAuditLog(state.filters)
  }

  // Handle export
  const handleExport = async () => {
    try {
      setState(prev => ({ ...prev, exporting: true }))

      const searchParams = new URLSearchParams()

      // Include current filters in export
      Object.entries(state.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && key !== 'page' && key !== 'limit') {
          searchParams.append(key, String(value))
        }
      })

      const response = await fetch(`/api/admin/audit-log/export?${searchParams.toString()}`)

      if (!response.ok) {
        throw new Error(`Failed to export audit log: ${response.statusText}`)
      }

      // Download the CSV file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success('Audit log exported successfully')
    } catch (error) {
      console.error('Export error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to export audit log')
    } finally {
      setState(prev => ({ ...prev, exporting: false }))
    }
  }

  // Load initial data
  useEffect(() => {
    fetchAuditLog(state.filters)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-8 w-8" />
            Audit Log
          </h1>
          <p className="text-muted-foreground">
            View and track all system changes for compliance and troubleshooting
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={state.loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${state.loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={state.exporting || state.entries.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            {state.exporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{state.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Showing {state.entries.length} of {state.total}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Page</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{state.page}</div>
            <p className="text-xs text-muted-foreground">
              of {Math.ceil(state.total / state.limit)} pages
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Per Page</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{state.limit}</div>
            <p className="text-xs text-muted-foreground">entries displayed</p>
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {state.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter audit log entries by user, entity type, action, date range, and more
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading filters...</div>}>
            <AuditLogFilters
              filters={state.filters}
              onFiltersChange={handleFiltersChange}
            />
          </Suspense>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Entries</CardTitle>
          <CardDescription>
            Chronological record of all system changes and user actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading audit entries...</div>}>
            <AuditLogTable
              entries={state.entries}
              loading={state.loading}
              page={state.page}
              totalPages={Math.ceil(state.total / state.limit)}
              onPageChange={handlePageChange}
              onEntrySelect={handleEntrySelect}
            />
          </Suspense>
        </CardContent>
      </Card>

      {/* Entry Detail Dialog */}
      <Dialog open={!!state.selectedEntry} onOpenChange={handleDetailClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Entry Details</DialogTitle>
            <DialogDescription>
              View complete details and changes for this audit entry
            </DialogDescription>
          </DialogHeader>

          {state.selectedEntry && (
            <Suspense fallback={<div>Loading entry details...</div>}>
              <AuditEntryDetail entry={state.selectedEntry} />
            </Suspense>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}