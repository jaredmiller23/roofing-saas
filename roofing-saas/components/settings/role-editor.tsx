'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2 } from 'lucide-react'
import { Fragment, useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api/client'
import {
  PERMISSION_MODULES,
  PERMISSION_ACTIONS,
  PERMISSION_GROUPS,
  DEFAULT_USER_PERMISSIONS,
  OWNER_PERMISSIONS,
  ADMIN_PERMISSIONS,
  type PermissionModule,
  type PermissionAction,
  type Permissions,
  type ModulePermissions,
} from '@/lib/auth/permission-constants'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RoleData {
  id: string
  name: string
  description: string | null
  permissions: Partial<Permissions>
  is_system: boolean
  created_at: string
  tenant_id: string
  created_by: string | null
}

// Human-readable module labels
const MODULE_LABELS: Record<PermissionModule, string> = {
  contacts: 'Contacts',
  projects: 'Projects',
  tasks: 'Tasks',
  activities: 'Activities',
  calendar: 'Calendar',
  calls: 'Calls',
  messages: 'Messages',
  files: 'Files',
  reports: 'Reports',
  analytics: 'Analytics',
  settings: 'Settings',
  users: 'Users',
  team: 'Team',
  billing: 'Billing',
  territories: 'Territories',
  campaigns: 'Campaigns',
  signatures: 'Signatures',
  voice_assistant: 'Voice Assistant',
}

// Template presets for creating new roles
const ROLE_TEMPLATES: Record<string, { label: string; permissions: Partial<Permissions> }> = {
  blank: { label: 'Blank (No Permissions)', permissions: {} },
  user: { label: 'Standard User', permissions: DEFAULT_USER_PERMISSIONS },
  admin: { label: 'Administrator', permissions: ADMIN_PERMISSIONS },
  owner: { label: 'Owner (Full Access)', permissions: OWNER_PERMISSIONS },
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const actionPermissionSchema = z.object({
  view: z.boolean(),
  create: z.boolean(),
  edit: z.boolean(),
  delete: z.boolean(),
})

const permissionsSchema = z.record(z.string(), actionPermissionSchema)

const roleFormSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(50, 'Role name must be 50 characters or less'),
  description: z.string().max(200, 'Description must be 200 characters or less').optional().or(z.literal('')),
  permissions: permissionsSchema,
})

type RoleFormData = z.infer<typeof roleFormSchema>

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildDefaultPermissions(): Record<string, ModulePermissions> {
  const perms: Record<string, ModulePermissions> = {}
  for (const mod of PERMISSION_MODULES) {
    const defaultPerms = (DEFAULT_USER_PERMISSIONS as Record<string, ModulePermissions | undefined>)[mod]
    perms[mod] = defaultPerms ?? { view: false, create: false, edit: false, delete: false }
  }
  return perms
}

function buildPermissionsFromPartial(partial: Partial<Permissions>): Record<string, ModulePermissions> {
  const perms: Record<string, ModulePermissions> = {}
  for (const mod of PERMISSION_MODULES) {
    const existing = (partial as Record<string, ModulePermissions | undefined>)[mod]
    perms[mod] = existing ?? { view: false, create: false, edit: false, delete: false }
  }
  return perms
}

// ─── Component ───────────────────────────────────────────────────────────────

interface RoleEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: RoleData | null // null = creating new
  onSaved: () => void
}

export function RoleEditor({ open, onOpenChange, role, onSaved }: RoleEditorProps) {
  const [submitting, setSubmitting] = useState(false)
  const isEditing = role !== null
  const isSystemRole = role?.is_system ?? false

  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: '',
      description: '',
      permissions: buildDefaultPermissions(),
    },
  })

  // Reset form when dialog opens with role data
  const resetFormForRole = useCallback(() => {
    if (role) {
      form.reset({
        name: role.name,
        description: role.description ?? '',
        permissions: buildPermissionsFromPartial(role.permissions),
      })
    } else {
      form.reset({
        name: '',
        description: '',
        permissions: buildDefaultPermissions(),
      })
    }
  }, [role, form])

  useEffect(() => {
    if (open) {
      resetFormForRole()
    }
  }, [open, resetFormForRole])

  const handleApplyTemplate = (templateKey: string) => {
    const template = ROLE_TEMPLATES[templateKey]
    if (!template) return
    const perms = buildPermissionsFromPartial(template.permissions)
    form.setValue('permissions', perms, { shouldDirty: true })
  }

  const handleSelectAllModule = (mod: string) => {
    form.setValue(`permissions.${mod}`, {
      view: true,
      create: true,
      edit: true,
      delete: true,
    }, { shouldDirty: true })
  }

  const handleDeselectAllModule = (mod: string) => {
    form.setValue(`permissions.${mod}`, {
      view: false,
      create: false,
      edit: false,
      delete: false,
    }, { shouldDirty: true })
  }

  const handleSelectAllAction = (action: PermissionAction) => {
    const current = form.getValues('permissions')
    const updated = { ...current }
    for (const mod of PERMISSION_MODULES) {
      updated[mod] = { ...updated[mod], [action]: true }
    }
    form.setValue('permissions', updated, { shouldDirty: true })
  }

  const handleDeselectAllAction = (action: PermissionAction) => {
    const current = form.getValues('permissions')
    const updated = { ...current }
    for (const mod of PERMISSION_MODULES) {
      updated[mod] = { ...updated[mod], [action]: false }
    }
    form.setValue('permissions', updated, { shouldDirty: true })
  }

  const handleSubmit = async (data: RoleFormData) => {
    try {
      setSubmitting(true)

      const payload = {
        name: data.name,
        description: data.description || null,
        permissions: data.permissions,
      }

      if (isEditing && role) {
        await apiFetch(`/api/settings/roles/${role.id}`, {
          method: 'PATCH',
          body: payload,
        })
        toast.success('Role updated successfully')
      } else {
        await apiFetch('/api/settings/roles', {
          method: 'POST',
          body: payload,
        })
        toast.success('Role created successfully')
      }

      onSaved()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save role')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Edit Role: ${role.name}` : 'Create New Role'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the role name, description, and permissions.'
              : 'Define a new role with custom permissions for your team members.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Sales Manager, Field Rep"
                        disabled={isSystemRole}
                      />
                    </FormControl>
                    {isSystemRole && (
                      <p className="text-xs text-muted-foreground">System role names cannot be changed</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Brief description of this role&apos;s responsibilities"
                        rows={1}
                        className="min-h-[36px] resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Template Selector (only for new roles) */}
            {!isEditing && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Start from a template</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(ROLE_TEMPLATES).map(([key, template]) => (
                    <Button
                      key={key}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleApplyTemplate(key)}
                    >
                      {template.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Permission Matrix */}
            <div>
              <p className="text-sm font-medium text-foreground mb-3">Permissions</p>
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[200px]">Module</TableHead>
                      {PERMISSION_ACTIONS.map((action) => (
                        <TableHead key={action} className="text-center w-[100px]">
                          <div className="flex flex-col items-center gap-1">
                            <span className="capitalize">{action}</span>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleSelectAllAction(action)}
                                className="text-xs text-primary hover:text-primary/80"
                                aria-label={`Select all ${action}`}
                              >
                                All
                              </button>
                              <span className="text-muted-foreground">/</span>
                              <button
                                type="button"
                                onClick={() => handleDeselectAllAction(action)}
                                className="text-xs text-muted-foreground hover:text-foreground"
                                aria-label={`Deselect all ${action}`}
                              >
                                None
                              </button>
                            </div>
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="text-center w-[100px]">Quick</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {PERMISSION_GROUPS.map((group) => (
                      <Fragment key={group.name}>
                        {/* Group header */}
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={6} className="py-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              {group.name}
                            </span>
                          </TableCell>
                        </TableRow>
                        {/* Module rows */}
                        {group.modules.map((mod) => (
                          <TableRow key={mod}>
                            <TableCell className="font-medium text-foreground">
                              {MODULE_LABELS[mod]}
                            </TableCell>
                            {PERMISSION_ACTIONS.map((action) => (
                              <TableCell key={action} className="text-center">
                                <FormField
                                  control={form.control}
                                  name={`permissions.${mod}.${action}`}
                                  render={({ field }) => (
                                    <FormItem className="flex items-center justify-center">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value as boolean}
                                          onCheckedChange={field.onChange}
                                          aria-label={`${MODULE_LABELS[mod]} ${action}`}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                            ))}
                            <TableCell className="text-center">
                              <div className="flex justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleSelectAllModule(mod)}
                                  className="text-xs text-primary hover:text-primary/80"
                                  aria-label={`Select all permissions for ${MODULE_LABELS[mod]}`}
                                >
                                  All
                                </button>
                                <span className="text-muted-foreground text-xs">/</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeselectAllModule(mod)}
                                  className="text-xs text-muted-foreground hover:text-foreground"
                                  aria-label={`Deselect all permissions for ${MODULE_LABELS[mod]}`}
                                >
                                  None
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Update Role' : 'Create Role'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
