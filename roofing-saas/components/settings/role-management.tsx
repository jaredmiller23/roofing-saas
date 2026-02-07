'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Shield, Lock } from 'lucide-react'
import { apiFetch } from '@/lib/api/client'
import { RoleEditor, type RoleData } from './role-editor'
import {
  PERMISSION_MODULES,
  type ModulePermissions,
} from '@/lib/auth/permission-constants'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Count how many individual permissions are enabled across all modules */
function countActivePermissions(permissions: Partial<Record<string, ModulePermissions>>): number {
  let count = 0
  for (const mod of PERMISSION_MODULES) {
    const modPerms = permissions[mod]
    if (!modPerms) continue
    if (modPerms.view) count++
    if (modPerms.create) count++
    if (modPerms.edit) count++
    if (modPerms.delete) count++
  }
  return count
}

/** Total possible permissions */
const TOTAL_PERMISSIONS = PERMISSION_MODULES.length * 4

// ─── Built-in role names ─────────────────────────────────────────────────────

const BUILT_IN_ROLES = new Set(['owner', 'admin', 'user', 'viewer'])

function isBuiltInRole(role: RoleData): boolean {
  return role.is_system || BUILT_IN_ROLES.has(role.name.toLowerCase())
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RoleManagement() {
  const [roles, setRoles] = useState<RoleData[]>([])
  const [loading, setLoading] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleData | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RoleData | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadRoles = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiFetch<RoleData[]>('/api/settings/roles')
      setRoles(data || [])
    } catch (err) {
      console.error('Error loading roles:', err)
      toast.error('Failed to load roles')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRoles()
  }, [loadRoles])

  const handleCreateRole = () => {
    setEditingRole(null)
    setEditorOpen(true)
  }

  const handleEditRole = (role: RoleData) => {
    setEditingRole(role)
    setEditorOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return

    try {
      setDeleting(true)
      await apiFetch(`/api/settings/roles/${deleteTarget.id}`, { method: 'DELETE' })
      toast.success(`Role "${deleteTarget.name}" deleted`)
      setDeleteTarget(null)
      loadRoles()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete role')
    } finally {
      setDeleting(false)
    }
  }

  const handleEditorSaved = () => {
    loadRoles()
  }

  // ─── Loading skeleton ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-7 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="border border-border rounded-lg">
          <div className="p-4 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ─── Main render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Role Management</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Define custom roles and permissions for your team members.
          </p>
        </div>
        <Button onClick={handleCreateRole}>
          <Plus className="h-4 w-4 mr-2" />
          Create Role
        </Button>
      </div>

      {/* Roles Table */}
      {roles.length === 0 ? (
        <div className="border border-border rounded-lg p-12 text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h4 className="text-base font-medium text-foreground mb-2">No roles configured</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first custom role to control what team members can access.
          </p>
          <Button onClick={handleCreateRole}>
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Role</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Permissions</TableHead>
                <TableHead className="text-center">Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => {
                const activeCount = countActivePermissions(role.permissions ?? {})
                const builtIn = isBuiltInRole(role)

                return (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-medium text-foreground">{role.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {role.description || '--'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm text-muted-foreground">
                        {activeCount} / {TOTAL_PERMISSIONS}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {builtIn ? (
                        <Badge variant="secondary" className="gap-1">
                          <Lock className="h-3 w-3" />
                          Built-in
                        </Badge>
                      ) : (
                        <Badge variant="outline">Custom</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditRole(role)}
                          aria-label={`Edit ${role.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!builtIn && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(role)}
                            aria-label={`Delete ${role.name}`}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Role Editor Dialog */}
      <RoleEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        role={editingRole}
        onSaved={handleEditorSaved}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the &quot;{deleteTarget?.name}&quot; role?
              Users currently assigned to this role will need to be reassigned.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete Role'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
