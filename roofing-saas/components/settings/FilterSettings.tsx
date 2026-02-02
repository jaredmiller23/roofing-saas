'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, Plus, Pencil, Trash2, Filter, Zap, Settings2, X } from 'lucide-react'
import { apiFetch } from '@/lib/api/client'
import type {
  FilterConfig,
  FilterFieldType,
  FilterOperator,
  FilterOption,
  EntityType
} from '@/lib/filters/types'

const ENTITY_TYPES: EntityType[] = ['contacts', 'projects', 'pipeline', 'activities', 'call_logs', 'tasks']

const FIELD_TYPES: { value: FilterFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'select', label: 'Single Select' },
  { value: 'multi_select', label: 'Multi Select' },
  { value: 'date', label: 'Date' },
  { value: 'date_range', label: 'Date Range' },
  { value: 'number', label: 'Number' },
  { value: 'number_range', label: 'Number Range' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'user_select', label: 'User Select' },
  { value: 'tag_select', label: 'Tag Select' },
]

const OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Not Contains' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'greater_than_or_equal', label: 'Greater Than or Equal' },
  { value: 'less_than_or_equal', label: 'Less Than or Equal' },
  { value: 'in', label: 'In List' },
  { value: 'not_in', label: 'Not In List' },
  { value: 'between', label: 'Between' },
  { value: 'is_null', label: 'Is Empty' },
  { value: 'is_not_null', label: 'Is Not Empty' },
]

export function FilterSettings() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [configs, setConfigs] = useState<FilterConfig[]>([])
  const [editingConfig, setEditingConfig] = useState<FilterConfig | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  // Filter state
  const [entityTypeFilter, setEntityTypeFilter] = useState<EntityType>('contacts')

  const [formData, setFormData] = useState({
    entity_type: 'contacts' as EntityType,
    field_name: '',
    field_label: '',
    field_type: 'text' as FilterFieldType,
    filter_operator: 'equals' as FilterOperator,
    filter_options: [] as FilterOption[],
    is_quick_filter: false,
    is_advanced_filter: true,
    is_active: true,
    display_order: 0,
  })

  // Option input state
  const [newOptionValue, setNewOptionValue] = useState('')
  const [newOptionLabel, setNewOptionLabel] = useState('')

  const loadConfigs = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        entity_type: entityTypeFilter,
        include_inactive: 'true'
      })
      const data = await apiFetch<{ configs: FilterConfig[]; total: number }>(`/api/filters/configs?${params.toString()}`)
      setConfigs(data.configs || [])
    } catch (err) {
      console.error('Error loading filter configs:', err)
      setError('Failed to load filter configurations')
    } finally {
      setLoading(false)
    }
  }, [entityTypeFilter])

  useEffect(() => {
    loadConfigs()
  }, [loadConfigs])

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      // Validation
      if (!formData.field_name || !formData.field_label) {
        setError('Field name and label are required')
        setSaving(false)
        return
      }

      const url = editingConfig
        ? `/api/filters/configs/${editingConfig.id}`
        : '/api/filters/configs'

      const method = editingConfig ? 'PATCH' : 'POST'

      await apiFetch(url, { method, body: formData })

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

      // Reset form and reload
      resetForm()
      loadConfigs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save filter configuration')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (config: FilterConfig) => {
    setEditingConfig(config)
    setFormData({
      entity_type: config.entity_type,
      field_name: config.field_name,
      field_label: config.field_label,
      field_type: config.field_type,
      filter_operator: config.filter_operator,
      filter_options: config.filter_options || [],
      is_quick_filter: config.is_quick_filter,
      is_advanced_filter: config.is_advanced_filter,
      is_active: config.is_active,
      display_order: config.display_order,
    })
    setShowAddForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this filter configuration?')) return

    try {
      await apiFetch(`/api/filters/configs/${id}`, { method: 'DELETE' })

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      loadConfigs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete filter configuration')
    }
  }

  const handleToggleActive = async (config: FilterConfig) => {
    try {
      await apiFetch(`/api/filters/configs/${config.id}`, {
        method: 'PATCH',
        body: { is_active: !config.is_active },
      })

      loadConfigs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update filter')
    }
  }

  const resetForm = () => {
    setEditingConfig(null)
    setShowAddForm(false)
    setFormData({
      entity_type: entityTypeFilter,
      field_name: '',
      field_label: '',
      field_type: 'text',
      filter_operator: 'equals',
      filter_options: [],
      is_quick_filter: false,
      is_advanced_filter: true,
      is_active: true,
      display_order: 0,
    })
    setNewOptionValue('')
    setNewOptionLabel('')
  }

  const addOption = () => {
    if (!newOptionValue || !newOptionLabel) return
    setFormData({
      ...formData,
      filter_options: [
        ...formData.filter_options,
        { value: newOptionValue, label: newOptionLabel }
      ]
    })
    setNewOptionValue('')
    setNewOptionLabel('')
  }

  const removeOption = (index: number) => {
    setFormData({
      ...formData,
      filter_options: formData.filter_options.filter((_, i) => i !== index)
    })
  }

  // Group configs by quick vs advanced
  const quickFilters = configs.filter(c => c.is_quick_filter)
  const advancedFilters = configs.filter(c => !c.is_quick_filter && c.is_advanced_filter)

  if (loading && configs.length === 0) {
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
        <Alert variant="success">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Filter configuration saved successfully!
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="bg-card rounded-lg border border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Filter Configuration</h3>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Entity Type
            </label>
            <select
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value as EntityType)}
              className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
            >
              {ENTITY_TYPES.map(type => (
                <option key={type} value={type} className="capitalize">
                  {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={() => {
              setFormData(prev => ({ ...prev, entity_type: entityTypeFilter }))
              setShowAddForm(true)
            }}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Filter
          </Button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-card rounded-lg border border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {editingConfig ? 'Edit Filter' : 'Add New Filter'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Entity Type *
              </label>
              <select
                value={formData.entity_type}
                onChange={(e) => setFormData({ ...formData, entity_type: e.target.value as EntityType })}
                disabled={!!editingConfig}
                className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-muted"
              >
                {ENTITY_TYPES.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Field Name (DB Column) *
              </label>
              <Input
                value={formData.field_name}
                onChange={(e) => setFormData({ ...formData, field_name: e.target.value })}
                placeholder="e.g., status, type, created_at"
                disabled={!!editingConfig}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Database column name to filter on
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Display Label *
              </label>
              <Input
                value={formData.field_label}
                onChange={(e) => setFormData({ ...formData, field_label: e.target.value })}
                placeholder="e.g., Status, Type, Created Date"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Field Type *
              </label>
              <select
                value={formData.field_type}
                onChange={(e) => setFormData({ ...formData, field_type: e.target.value as FilterFieldType })}
                className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {FIELD_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Default Operator
              </label>
              <select
                value={formData.filter_operator}
                onChange={(e) => setFormData({ ...formData, filter_operator: e.target.value as FilterOperator })}
                className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {OPERATORS.map(op => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Display Order
              </label>
              <Input
                type="number"
                min="0"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>

            {/* Options section for select/multi_select */}
            {(formData.field_type === 'select' || formData.field_type === 'multi_select') && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Options
                </label>

                {/* Existing options */}
                {formData.filter_options.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {formData.filter_options.map((option, index) => (
                      <div
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-muted rounded-full text-sm"
                      >
                        <span className="font-medium">{option.label}</span>
                        <span className="text-muted-foreground">({option.value})</span>
                        <button
                          onClick={() => removeOption(index)}
                          className="ml-1 text-muted-foreground hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add option form */}
                <div className="flex gap-2">
                  <Input
                    value={newOptionValue}
                    onChange={(e) => setNewOptionValue(e.target.value)}
                    placeholder="Value (e.g., lead)"
                    className="flex-1"
                  />
                  <Input
                    value={newOptionLabel}
                    onChange={(e) => setNewOptionLabel(e.target.value)}
                    placeholder="Label (e.g., Lead)"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={addOption}
                    variant="outline"
                    disabled={!newOptionValue || !newOptionLabel}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Add options for dropdown filters
                </p>
              </div>
            )}

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
                    checked={formData.is_quick_filter}
                    onChange={(e) => setFormData({ ...formData, is_quick_filter: e.target.checked })}
                    className="rounded border-border"
                  />
                  <span className="text-sm text-muted-foreground">Quick Filter</span>
                  <span className="text-xs text-muted-foreground">(Show in filter bar)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_advanced_filter}
                    onChange={(e) => setFormData({ ...formData, is_advanced_filter: e.target.checked })}
                    className="rounded border-border"
                  />
                  <span className="text-sm text-muted-foreground">Advanced Filter</span>
                  <span className="text-xs text-muted-foreground">(Show in advanced panel)</span>
                </label>
              </div>
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
              disabled={saving || !formData.field_name || !formData.field_label}
              className="bg-primary hover:bg-primary/90"
            >
              {saving ? 'Saving...' : editingConfig ? 'Update Filter' : 'Add Filter'}
            </Button>
          </div>
        </div>
      )}

      {/* Quick Filters Section */}
      {quickFilters.length > 0 && (
        <div className="bg-card rounded-lg border border p-6">
          <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Quick Filters
            <span className="text-sm font-normal text-muted-foreground">
              ({quickFilters.length} filter{quickFilters.length !== 1 ? 's' : ''})
            </span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickFilters
              .sort((a, b) => a.display_order - b.display_order)
              .map((config) => (
                <FilterConfigCard
                  key={config.id}
                  config={config}
                  onEdit={() => handleEdit(config)}
                  onDelete={() => handleDelete(config.id)}
                  onToggleActive={() => handleToggleActive(config)}
                />
              ))}
          </div>
        </div>
      )}

      {/* Advanced Filters Section */}
      {advancedFilters.length > 0 && (
        <div className="bg-card rounded-lg border border p-6">
          <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-muted-foreground" />
            Advanced Filters
            <span className="text-sm font-normal text-muted-foreground">
              ({advancedFilters.length} filter{advancedFilters.length !== 1 ? 's' : ''})
            </span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {advancedFilters
              .sort((a, b) => a.display_order - b.display_order)
              .map((config) => (
                <FilterConfigCard
                  key={config.id}
                  config={config}
                  onEdit={() => handleEdit(config)}
                  onDelete={() => handleDelete(config.id)}
                  onToggleActive={() => handleToggleActive(config)}
                />
              ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {configs.length === 0 && (
        <div className="bg-card rounded-lg border border p-12 text-center">
          <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No filters configured
          </h3>
          <p className="text-muted-foreground mb-4">
            Add filters to help users search and filter {entityTypeFilter}
          </p>
          <Button
            onClick={() => {
              setFormData(prev => ({ ...prev, entity_type: entityTypeFilter }))
              setShowAddForm(true)
            }}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Filter
          </Button>
        </div>
      )}
    </div>
  )
}

// Helper component for filter config cards
function FilterConfigCard({
  config,
  onEdit,
  onDelete,
  onToggleActive
}: {
  config: FilterConfig
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
}) {
  return (
    <div
      className={`relative group p-4 border-2 rounded-lg hover:shadow-md transition-shadow ${
        config.is_active ? 'border-primary/30' : 'border opacity-60'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm text-foreground">
            {config.field_label}
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-2">
        Field: <code className="bg-muted px-1 rounded">{config.field_name}</code>
      </p>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="px-2 py-0.5 bg-muted rounded capitalize">
          {config.field_type.replace('_', ' ')}
        </span>
        {config.is_quick_filter && (
          <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 rounded">
            Quick
          </span>
        )}
        {!config.is_active && (
          <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded">
            Inactive
          </span>
        )}
        {config.filter_options?.length > 0 && (
          <span className="text-muted-foreground">
            {config.filter_options.length} options
          </span>
        )}
      </div>

      {/* Edit/Delete buttons on hover */}
      <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
        <button
          onClick={onToggleActive}
          className="p-1.5 bg-card border border hover:bg-accent rounded shadow-sm"
          title={config.is_active ? 'Deactivate' : 'Activate'}
        >
          <CheckCircle className={`h-3 w-3 ${config.is_active ? 'text-green-600' : 'text-muted-foreground'}`} />
        </button>
        <button
          onClick={onEdit}
          className="p-1.5 bg-card border border hover:bg-accent rounded shadow-sm"
          title="Edit"
        >
          <Pencil className="h-3 w-3 text-muted-foreground" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 bg-card border border hover:bg-accent rounded shadow-sm"
          title="Delete"
        >
          <Trash2 className="h-3 w-3 text-red-600" />
        </button>
      </div>
    </div>
  )
}
