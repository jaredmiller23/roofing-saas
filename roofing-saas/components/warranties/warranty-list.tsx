'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Shield, Pencil, Trash2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiFetch } from '@/lib/api/client'
import type { Warranty, WarrantyStatus } from '@/lib/types/warranty'
import { WARRANTY_STATUSES } from '@/lib/types/warranty'
import { WarrantyForm } from './warranty-form'

interface WarrantyListProps {
  projectId?: string
  showProjectColumn?: boolean
}

const STATUS_COLORS: Record<WarrantyStatus, string> = {
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  expired: 'bg-red-500/20 text-red-400 border-red-500/30',
  claimed: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  voided: 'bg-muted text-muted-foreground border-border',
}

const TYPE_LABELS: Record<string, string> = {
  manufacturer: 'Manufacturer',
  workmanship: 'Workmanship',
  material: 'Material',
  extended: 'Extended',
}

export function WarrantyList({ projectId, showProjectColumn = true }: WarrantyListProps) {
  const [warranties, setWarranties] = useState<Warranty[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingWarranty, setEditingWarranty] = useState<Warranty | null>(null)
  const [projectNames, setProjectNames] = useState<Record<string, string>>({})

  const fetchWarranties = useCallback(async () => {
    try {
      setLoading(true)
      let url = '/api/warranties?'
      if (projectId) {
        url += `project_id=${projectId}&`
      }
      if (statusFilter && statusFilter !== 'all') {
        url += `status=${statusFilter}&`
      }

      const result = await apiFetch<{ warranties: Warranty[] }>(url)
      setWarranties(result?.warranties ?? [])

      // Fetch project names if showing project column
      if (showProjectColumn && result?.warranties?.length) {
        const uniqueProjectIds = [...new Set(result.warranties.map(w => w.project_id))]
        const names: Record<string, string> = {}
        for (const pid of uniqueProjectIds) {
          try {
            const project = await apiFetch<{ name: string }>(`/api/projects/${pid}`)
            if (project?.name) {
              names[pid] = project.name
            }
          } catch {
            names[pid] = 'Unknown Project'
          }
        }
        setProjectNames(names)
      }
    } catch {
      toast.error('Failed to load warranties')
    } finally {
      setLoading(false)
    }
  }, [projectId, statusFilter, showProjectColumn])

  useEffect(() => {
    fetchWarranties()
  }, [fetchWarranties])

  async function handleDelete(warrantyId: string) {
    if (!confirm('Are you sure you want to delete this warranty?')) return

    try {
      await apiFetch(`/api/warranties/${warrantyId}`, { method: 'DELETE' })
      toast.success('Warranty deleted')
      fetchWarranties()
    } catch {
      toast.error('Failed to delete warranty')
    }
  }

  function handleEdit(warranty: Warranty) {
    setEditingWarranty(warranty)
    setShowForm(true)
  }

  function handleAdd() {
    setEditingWarranty(null)
    setShowForm(true)
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '\u2014'
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground mt-4 text-sm">Loading warranties...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {WARRANTY_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Warranty
          </Button>
        </div>

        {/* Table */}
        {warranties.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium text-foreground mb-1">No warranties found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {statusFilter !== 'all'
                  ? 'No warranties match the current filter.'
                  : 'Add a warranty to start tracking coverage for your projects.'}
              </p>
              {statusFilter === 'all' && (
                <Button onClick={handleAdd} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add First Warranty
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                Warranties ({warranties.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    {showProjectColumn && <TableHead>Project</TableHead>}
                    <TableHead>Type</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warranties.map((warranty) => (
                    <TableRow key={warranty.id}>
                      {showProjectColumn && (
                        <TableCell className="font-medium text-foreground">
                          {projectNames[warranty.project_id] || 'Loading...'}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {TYPE_LABELS[warranty.warranty_type] || warranty.warranty_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground">
                        {warranty.provider || '\u2014'}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {warranty.duration_years} {warranty.duration_years === 1 ? 'year' : 'years'}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {formatDate(warranty.start_date)}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {formatDate(warranty.end_date)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${STATUS_COLORS[warranty.status as WarrantyStatus] || ''} border`}
                        >
                          {warranty.status.charAt(0).toUpperCase() + warranty.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {warranty.document_url && (
                            <a
                              href={warranty.document_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <ExternalLink className="h-4 w-4" />
                                <span className="sr-only">View document</span>
                              </Button>
                            </a>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEdit(warranty)}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit warranty</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(warranty.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete warranty</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      <WarrantyForm
        open={showForm}
        onOpenChange={setShowForm}
        onSuccess={fetchWarranties}
        warranty={editingWarranty}
        projectId={projectId}
      />
    </>
  )
}
