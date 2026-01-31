'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, Plus, Pencil, Trash2, Shield, Lock } from 'lucide-react'

interface UserRole {
  id: string
  name: string
  description: string | null
  permissions: {
    contacts: { view: boolean; create: boolean; edit: boolean; delete: boolean }
    projects: { view: boolean; create: boolean; edit: boolean; delete: boolean }
    activities: { view: boolean; create: boolean; edit: boolean; delete: boolean }
    calendar: { view: boolean; create: boolean; edit: boolean; delete: boolean }
    reports: { view: boolean; create: boolean; edit: boolean; delete: boolean }
    settings: { view: boolean; create: boolean; edit: boolean; delete: boolean }
    users: { view: boolean; create: boolean; edit: boolean; delete: boolean }
  }
  is_system: boolean
}

const PERMISSION_MODULES = [
  { key: 'contacts', label: 'Contacts & Leads' },
  { key: 'projects', label: 'Projects & Deals' },
  { key: 'activities', label: 'Activities & Tasks' },
  { key: 'calendar', label: 'Calendar & Scheduling' },
  { key: 'reports', label: 'Reports & Analytics' },
  { key: 'settings', label: 'Settings & Configuration' },
  { key: 'users', label: 'User Management' }
]

const PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete']

const DEFAULT_PERMISSIONS = {
  contacts: { view: true, create: true, edit: true, delete: false },
  projects: { view: true, create: true, edit: true, delete: false },
  activities: { view: true, create: true, edit: true, delete: false },
  calendar: { view: true, create: true, edit: true, delete: false },
  reports: { view: true, create: false, edit: false, delete: false },
  settings: { view: false, create: false, edit: false, delete: false },
  users: { view: false, create: false, edit: false, delete: false }
}

export function RoleSettings() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roles, setRoles] = useState<UserRole[]>([])
  const [editingRole, setEditingRole] = useState<UserRole | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: DEFAULT_PERMISSIONS
  })

  useEffect(() => {
    loadRoles()
  }, [])

  const loadRoles = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/settings/roles')
      const data = await res.json()
      setRoles(data.data?.roles || [])
    } catch (err) {
      console.error('Error loading roles:', err)
      setError('Failed to load roles')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      const url = editingRole
        ? `/api/settings/roles/${editingRole.id}`
        : '/api/settings/roles'

      const method = editingRole ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save role')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

      resetForm()
      loadRoles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save role')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (role: UserRole) => {
    setEditingRole(role)
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions
    })
    setShowAddForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this role? Users with this role will need to be reassigned.')) return

    try {
      const res = await fetch(`/api/settings/roles/${id}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete role')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      loadRoles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete role')
    }
  }

  const handlePermissionChange = (module: string, action: string, value: boolean) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [module]: {
          ...formData.permissions[module as keyof typeof formData.permissions],
          [action]: value
        }
      }
    })
  }

  const handleSelectAll = (module: string) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [module]: {
          view: true,
          create: true,
          edit: true,
          delete: true
        }
      }
    })
  }

  const handleDeselectAll = (module: string) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [module]: {
          view: false,
          create: false,
          edit: false,
          delete: false
        }
      }
    })
  }

  const resetForm = () => {
    setEditingRole(null)
    setShowAddForm(false)
    setFormData({
      name: '',
      description: '',
      permissions: DEFAULT_PERMISSIONS
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {success && (
        <Alert className="bg-chart-2/10 border-chart-2/30">
          <CheckCircle className="h-4 w-4 text-chart-2" />
          <AlertDescription className="text-foreground">
            Role saved successfully!
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert className="bg-destructive/10 border-destructive/30">
          <AlertDescription className="text-foreground">{error}</AlertDescription>
        </Alert>
      )}

      {/* Role List */}
      <div className="bg-card rounded-lg border border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">User Roles</h3>
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Role
          </Button>
        </div>

        {roles.length === 0 ? (
          <div className="text-muted-foreground text-sm py-8 text-center">
            No roles configured. Add your first role to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => (
              <div key={role.id} className="border border rounded-lg p-4 hover:border-primary/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold text-foreground">{role.name}</h4>
                    {role.is_system && (
                      <Lock className="h-3 w-3 text-muted-foreground" aria-label="System role" />
                    )}
                  </div>
                  {!role.is_system && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(role)}
                        className="text-primary hover:text-primary/80"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(role.id)}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {role.description && (
                  <p className="text-sm text-muted-foreground mb-3">{role.description}</p>
                )}

                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Permissions:</div>
                  {Object.entries(role.permissions).map(([module, perms]) => {
                    const activePerms = Object.entries(perms as Record<string, boolean>)
                      .filter(([, value]) => value)
                      .map(([key]) => key)

                    if (activePerms.length === 0) return null

                    return (
                      <div key={module} className="text-xs text-muted-foreground">
                        <span className="font-medium capitalize">{module}:</span>{' '}
                        {activePerms.join(', ')}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-card rounded-lg border border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {editingRole ? `Edit Role: ${editingRole.name}` : 'Add New Role'}
          </h3>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Role Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Sales Manager, Field Rep"
                  disabled={editingRole?.is_system}
                />
                {editingRole?.is_system && (
                  <p className="text-xs text-muted-foreground mt-1">System role name cannot be changed</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Description
                </label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this role"
                />
              </div>
            </div>

            {/* Permission Matrix */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Permissions</h4>
              <div className="border border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Module
                      </th>
                      {PERMISSION_ACTIONS.map((action) => (
                        <th key={action} className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {action}
                        </th>
                      ))}
                      <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {PERMISSION_MODULES.map((module) => {
                      const modulePerms = formData.permissions[module.key as keyof typeof formData.permissions]
                      return (
                        <tr key={module.key}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                            {module.label}
                          </td>
                          {PERMISSION_ACTIONS.map((action) => (
                            <td key={action} className="px-6 py-4 whitespace-nowrap text-center">
                              <input
                                type="checkbox"
                                checked={modulePerms?.[action as keyof typeof modulePerms] || false}
                                onChange={(e) => handlePermissionChange(module.key, action, e.target.checked)}
                                className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                              />
                            </td>
                          ))}
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => handleSelectAll(module.key)}
                              className="text-primary hover:text-primary/80 text-xs mr-2"
                            >
                              All
                            </button>
                            <button
                              onClick={() => handleDeselectAll(module.key)}
                              className="text-muted-foreground hover:text-foreground text-xs"
                            >
                              None
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button onClick={resetForm} variant="outline">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !formData.name}
                className="bg-primary hover:bg-primary/90"
              >
                {saving ? 'Saving...' : editingRole ? 'Update Role' : 'Add Role'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
