'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Download,
  Trash2,
  AlertTriangle,
  Loader2,
  Shield,
  CheckCircle2,
  Database,
} from 'lucide-react'

interface TenantInfo {
  id: string
  name: string
  subscription_tier: string | null
  subscription_status: string | null
  user_count: number
  is_active: boolean
}

interface DeletionResult {
  tenant_id: string
  tenant_name: string
  deleted_at: string
  total_rows_deleted: number
  tables: Record<string, number>
  errors?: string[]
}

const PRODUCTION_TENANT_ID = '00000000-0000-0000-0000-000000000000'

export function DataManagement() {
  const [tenants, setTenants] = useState<TenantInfo[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [confirmationInput, setConfirmationInput] = useState('')
  const [deletionResult, setDeletionResult] = useState<DeletionResult | null>(null)

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId)
  const isProductionTenant = selectedTenantId === PRODUCTION_TENANT_ID

  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/tenants')
      const json = await res.json()

      if (json.success && json.data?.tenants) {
        setTenants(json.data.tenants)
      } else {
        toast.error('Failed to load tenants')
      }
    } catch {
      toast.error('Failed to load tenants')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTenants()
  }, [fetchTenants])

  const handleExport = async () => {
    if (!selectedTenantId) return

    try {
      setExporting(true)
      const res = await fetch(`/api/admin/data-export/${selectedTenantId}`)

      if (!res.ok) {
        const errorJson = await res.json()
        toast.error(errorJson.error?.message || 'Export failed')
        return
      }

      // Download the JSON file
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition')
      const filenameMatch = disposition?.match(/filename="(.+)"/)
      const filename = filenameMatch?.[1] || `tenant-export-${selectedTenantId}.json`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Data exported successfully')
    } catch {
      toast.error('Export failed unexpectedly')
    } finally {
      setExporting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedTenantId || !selectedTenant) return

    try {
      setDeleting(true)
      const res = await fetch(`/api/admin/data-deletion/${selectedTenantId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: confirmationInput }),
      })

      const json = await res.json()

      if (json.success) {
        setDeletionResult(json.data)
        setDeleteDialogOpen(false)
        setConfirmationInput('')
        setSelectedTenantId('')
        toast.success('Tenant data deleted successfully')
        // Refresh tenant list
        fetchTenants()
      } else {
        toast.error(json.error?.message || 'Deletion failed')
      }
    } catch {
      toast.error('Deletion failed unexpectedly')
    } finally {
      setDeleting(false)
    }
  }

  const openDeleteDialog = () => {
    setConfirmationInput('')
    setDeletionResult(null)
    setDeleteDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Database className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Data Management</h1>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>System Admin Access</AlertTitle>
        <AlertDescription>
          This page provides GDPR-compliant data export and deletion capabilities.
          All actions are logged and audited. Data deletion is permanent and irreversible.
        </AlertDescription>
      </Alert>

      {/* Tenant Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Tenant</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Choose a tenant..." />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>
                  <span className="flex items-center gap-2">
                    {tenant.name}
                    {tenant.id === PRODUCTION_TENANT_ID && (
                      <Badge variant="destructive" className="text-xs">
                        PRODUCTION
                      </Badge>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedTenant && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="outline">
                {selectedTenant.user_count} user{selectedTenant.user_count !== 1 ? 's' : ''}
              </Badge>
              <Badge variant="secondary">
                {selectedTenant.subscription_tier || 'No plan'}
              </Badge>
              <Badge
                variant={selectedTenant.is_active ? 'outline' : 'destructive'}
              >
                {selectedTenant.is_active ? 'Active' : 'Inactive'}
              </Badge>
              {isProductionTenant && (
                <Badge variant="destructive">
                  Production - Deletion Blocked
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Download className="h-5 w-5" />
            Data Export
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Export all tenant data as a JSON file. This includes contacts, projects, activities,
            tasks, documents, timesheets, expenses, proposals, templates, campaigns, and more.
            Only non-deleted records are included.
          </p>
          <Button
            onClick={handleExport}
            disabled={!selectedTenantId || exporting}
          >
            {exporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export Tenant Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Deletion Section */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Data Deletion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Danger Zone</AlertTitle>
            <AlertDescription>
              This will permanently delete ALL data for the selected tenant, including the
              tenant record itself. This action cannot be undone. Export the data first.
            </AlertDescription>
          </Alert>
          <Button
            variant="destructive"
            onClick={openDeleteDialog}
            disabled={!selectedTenantId || isProductionTenant}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isProductionTenant ? 'Production Deletion Blocked' : 'Delete Tenant Data'}
          </Button>
        </CardContent>
      </Card>

      {/* Deletion Result */}
      {deletionResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Deletion Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Tenant <strong>{deletionResult.tenant_name}</strong> was deleted at{' '}
                {new Date(deletionResult.deleted_at).toLocaleString()}.
                Total rows removed: <strong>{deletionResult.total_rows_deleted}</strong>
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {Object.entries(deletionResult.tables).map(([table, count]) => (
                  <div
                    key={table}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground">{table}</span>
                    <Badge variant={count === -1 ? 'destructive' : 'secondary'}>
                      {count === -1 ? 'Error' : count}
                    </Badge>
                  </div>
                ))}
              </div>
              {deletionResult.errors && deletionResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Partial Errors</AlertTitle>
                  <AlertDescription>
                    Some tables encountered errors during deletion:{' '}
                    {deletionResult.errors.join(', ')}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirm Permanent Deletion
            </DialogTitle>
            <DialogDescription>
              This will permanently delete all data for{' '}
              <strong>{selectedTenant?.name}</strong>. This includes all contacts,
              projects, tasks, documents, financials, templates, campaigns, and the
              tenant record itself. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-foreground">
              Type <strong className="text-destructive">{selectedTenant?.name}</strong> to
              confirm:
            </p>
            <Input
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder={selectedTenant?.name || ''}
              className="font-mono"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={
                deleting || confirmationInput !== selectedTenant?.name
              }
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Permanently
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
