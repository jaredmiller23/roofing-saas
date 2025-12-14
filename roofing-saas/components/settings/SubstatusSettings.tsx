'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, Plus, Pencil, Trash2, Tag, Star } from 'lucide-react'
import type { SubstatusConfig } from '@/lib/substatus/types'

export function SubstatusSettings() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [substatuses, setSubstatuses] = useState<SubstatusConfig[]>([])
  const [editingSubstatus, setEditingSubstatus] = useState<SubstatusConfig | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  // Filter state
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('contacts')
  const [statusValueFilter, setStatusValueFilter] = useState<string>('')

  const [formData, setFormData] = useState({
    entity_type: 'contacts' as 'contacts' | 'projects' | 'leads',
    status_field_name: 'status',
    status_value: '',
    substatus_value: '',
    substatus_label: '',
    substatus_description: '',
    color: '#3B82F6',
    icon: '',
    display_order: 0,
    is_active: true,
    is_default: false,
    is_terminal: false,
    auto_transition_to: '',
    auto_transition_delay_hours: 0
  })

  const loadSubstatuses = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        entity_type: entityTypeFilter
      })
      if (statusValueFilter) {
        params.append('status_value', statusValueFilter)
      }
      const res = await fetch(`/api/substatus/configs?${params.toString()}`)
      const data = await res.json()
      setSubstatuses(data.configs || [])
    } catch (err) {
      console.error('Error loading substatuses:', err)
      setError('Failed to load substatuses')
    } finally {
      setLoading(false)
    }
  }, [entityTypeFilter, statusValueFilter])

  useEffect(() => {
    loadSubstatuses()
  }, [loadSubstatuses])

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      // Validation
      if (!formData.status_value || !formData.substatus_value || !formData.substatus_label) {
        setError('Status value, substatus value, and label are required')
        setSaving(false)
        return
      }

      const url = editingSubstatus
        ? `/api/substatus/configs/${editingSubstatus.id}`
        : '/api/substatus/configs'

      const method = editingSubstatus ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error?.message || 'Failed to save substatus')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

      // Reset form and reload
      resetForm()
      loadSubstatuses()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save substatus')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (substatus: SubstatusConfig) => {
    setEditingSubstatus(substatus)
    setFormData({
      entity_type: substatus.entity_type as 'contacts' | 'projects' | 'leads',
      status_field_name: substatus.status_field_name,
      status_value: substatus.status_value,
      substatus_value: substatus.substatus_value,
      substatus_label: substatus.substatus_label,
      substatus_description: substatus.substatus_description || '',
      color: substatus.color || '#3B82F6',
      icon: substatus.icon || '',
      display_order: substatus.display_order,
      is_active: substatus.is_active,
      is_default: substatus.is_default,
      is_terminal: substatus.is_terminal,
      auto_transition_to: substatus.auto_transition_to || '',
      auto_transition_delay_hours: substatus.auto_transition_delay_hours || 0
    })
    setShowAddForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this substatus?')) return

    try {
      const res = await fetch(`/api/substatus/configs/${id}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error?.message || 'Failed to delete substatus')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      loadSubstatuses()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete substatus')
    }
  }

  const resetForm = () => {
    setEditingSubstatus(null)
    setShowAddForm(false)
    setFormData({
      entity_type: 'contacts',
      status_field_name: 'status',
      status_value: '',
      substatus_value: '',
      substatus_label: '',
      substatus_description: '',
      color: '#3B82F6',
      icon: '',
      display_order: 0,
      is_active: true,
      is_default: false,
      is_terminal: false,
      auto_transition_to: '',
      auto_transition_delay_hours: 0
    })
  }

  // Group substatuses by status value
  const groupedSubstatuses = substatuses.reduce((acc, substatus) => {
    const key = substatus.status_value
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(substatus)
    return acc
  }, {} as Record<string, SubstatusConfig[]>)

  if (loading && substatuses.length === 0) {
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
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            Substatus saved successfully!
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertDescription className="text-red-900">{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="bg-card rounded-lg border border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Substatus Configuration</h3>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Entity Type
            </label>
            <select
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="contacts">Contacts</option>
              <option value="projects">Projects</option>
              <option value="leads">Leads</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Filter by Status (optional)
            </label>
            <Input
              value={statusValueFilter}
              onChange={(e) => setStatusValueFilter(e.target.value)}
              placeholder="e.g., Lead, Customer"
            />
          </div>
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Substatus
          </Button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-card rounded-lg border border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {editingSubstatus ? 'Edit Substatus' : 'Add New Substatus'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Entity Type *
              </label>
              <select
                value={formData.entity_type}
                onChange={(e) => setFormData({ ...formData, entity_type: e.target.value as 'contacts' | 'projects' | 'leads' })}
                disabled={!!editingSubstatus}
                className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-muted"
              >
                <option value="contacts">Contacts</option>
                <option value="projects">Projects</option>
                <option value="leads">Leads</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Status Field Name *
              </label>
              <Input
                value={formData.status_field_name}
                onChange={(e) => setFormData({ ...formData, status_field_name: e.target.value })}
                placeholder="e.g., status"
                disabled={!!editingSubstatus}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Parent Status Value *
              </label>
              <Input
                value={formData.status_value}
                onChange={(e) => setFormData({ ...formData, status_value: e.target.value })}
                placeholder="e.g., Lead, Customer"
                disabled={!!editingSubstatus}
              />
              <p className="text-xs text-muted-foreground mt-1">
                The main status this substatus belongs to
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Substatus Value *
              </label>
              <Input
                value={formData.substatus_value}
                onChange={(e) => setFormData({ ...formData, substatus_value: e.target.value })}
                placeholder="e.g., cold, warm, hot"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Internal value for this substatus
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Display Label *
              </label>
              <Input
                value={formData.substatus_label}
                onChange={(e) => setFormData({ ...formData, substatus_label: e.target.value })}
                placeholder="e.g., Cold Lead, Warm Lead"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Display Order
              </label>
              <Input
                type="number"
                min="0"
                value={formData.display_order ?? 0}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="h-10 w-16 rounded border border-border cursor-pointer"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#3B82F6"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Icon (optional)
              </label>
              <Input
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="e.g., star, check (lucide icon name)"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Description
              </label>
              <textarea
                value={formData.substatus_description}
                onChange={(e) => setFormData({ ...formData, substatus_description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Brief description of this substatus..."
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-start gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-border"
                  />
                  <span className="text-sm text-muted-foreground">Active</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="rounded border-border"
                  />
                  <span className="text-sm text-muted-foreground">Default</span>
                  <span className="text-xs text-muted-foreground">(Auto-set when status changes)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_terminal}
                    onChange={(e) => setFormData({ ...formData, is_terminal: e.target.checked })}
                    className="rounded border-border"
                  />
                  <span className="text-sm text-muted-foreground">Terminal</span>
                  <span className="text-xs text-muted-foreground">(Final state)</span>
                </label>
              </div>
            </div>

            {/* Auto-transition fields */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Auto-transition To (optional)
              </label>
              <Input
                value={formData.auto_transition_to}
                onChange={(e) => setFormData({ ...formData, auto_transition_to: e.target.value })}
                placeholder="e.g., cold"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Substatus value to auto-transition to
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Auto-transition Delay (hours)
              </label>
              <Input
                type="number"
                min="0"
                value={formData.auto_transition_delay_hours}
                onChange={(e) => setFormData({ ...formData, auto_transition_delay_hours: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              onClick={resetForm}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.status_value || !formData.substatus_value || !formData.substatus_label}
              className="bg-primary hover:bg-primary/90"
            >
              {saving ? 'Saving...' : editingSubstatus ? 'Update Substatus' : 'Add Substatus'}
            </Button>
          </div>
        </div>
      )}

      {/* Grouped Substatus Display */}
      {Object.keys(groupedSubstatuses).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(groupedSubstatuses).map(([statusValue, substatusList]) => (
            <div key={statusValue} className="bg-card rounded-lg border border p-6">
              <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Tag className="h-5 w-5 text-muted-foreground" />
                {statusValue}
                <span className="text-sm font-normal text-muted-foreground">
                  ({substatusList.length} substatus{substatusList.length !== 1 ? 'es' : ''})
                </span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {substatusList
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((substatus) => (
                    <div
                      key={substatus.id}
                      className="relative group p-4 border-2 rounded-lg hover:shadow-md transition-shadow"
                      style={{ borderColor: substatus.color || '#3B82F6' }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: substatus.color || '#3B82F6' }}
                          />
                          <span className="font-semibold text-sm text-foreground">
                            {substatus.substatus_label}
                          </span>
                          {substatus.is_default && (
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                          )}
                        </div>
                      </div>

                      {substatus.substatus_description && (
                        <p className="text-xs text-muted-foreground mb-2">
                          {substatus.substatus_description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {!substatus.is_active && (
                          <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded">
                            Inactive
                          </span>
                        )}
                        {substatus.is_terminal && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded">
                            Terminal
                          </span>
                        )}
                      </div>

                      {/* Edit/Delete buttons on hover */}
                      <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                        <button
                          onClick={() => handleEdit(substatus)}
                          className="p-1.5 bg-card border border hover:bg-accent rounded shadow-sm"
                          title="Edit"
                        >
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => handleDelete(substatus.id)}
                          className="p-1.5 bg-card border border hover:bg-accent rounded shadow-sm"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3 text-red-600" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-lg border border p-12 text-center">
          <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No substatuses configured
          </h3>
          <p className="text-muted-foreground mb-4">
            Add your first substatus to enhance your {entityTypeFilter} status tracking
          </p>
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Substatus
          </Button>
        </div>
      )}
    </div>
  )
}
