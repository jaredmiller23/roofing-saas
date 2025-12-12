'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, Plus, Pencil, Trash2, GripVertical } from 'lucide-react'

interface PipelineStage {
  id: string
  name: string
  description: string | null
  color: string
  icon: string | null
  stage_order: number
  stage_type: 'open' | 'won' | 'lost'
  win_probability: number
  auto_actions: Record<string, unknown> | null
}

export function PipelineSettings() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: '',
    stage_type: 'open' as 'open' | 'won' | 'lost',
    win_probability: 0
  })

  useEffect(() => {
    loadStages()
  }, [])

  const loadStages = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/settings/pipeline-stages')
      const data = await res.json()
      setStages(data.stages || [])
    } catch (err) {
      console.error('Error loading pipeline stages:', err)
      setError('Failed to load pipeline stages')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      const url = editingStage
        ? `/api/settings/pipeline-stages/${editingStage.id}`
        : '/api/settings/pipeline-stages'

      const method = editingStage ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          stage_order: editingStage ? editingStage.stage_order : stages.length
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save stage')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

      // Reset form and reload
      setFormData({
        name: '',
        description: '',
        color: '#3B82F6',
        icon: '',
        stage_type: 'open',
        win_probability: 0
      })
      setEditingStage(null)
      setShowAddForm(false)
      loadStages()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save stage')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (stage: PipelineStage) => {
    setEditingStage(stage)
    setFormData({
      name: stage.name,
      description: stage.description || '',
      color: stage.color,
      icon: stage.icon || '',
      stage_type: stage.stage_type,
      win_probability: stage.win_probability
    })
    setShowAddForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this stage?')) return

    try {
      const res = await fetch(`/api/settings/pipeline-stages/${id}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete stage')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      loadStages()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete stage')
    }
  }

  const handleCancelEdit = () => {
    setEditingStage(null)
    setShowAddForm(false)
    setFormData({
      name: '',
      description: '',
      color: '#3B82F6',
      icon: '',
      stage_type: 'open',
      win_probability: 0
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
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            Pipeline stage saved successfully!
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertDescription className="text-red-900">{error}</AlertDescription>
        </Alert>
      )}

      {/* Pipeline Preview */}
      <div className="bg-card rounded-lg border border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Sales Pipeline Stages</h3>
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Stage
          </Button>
        </div>

        {/* Visual Pipeline */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4">
          {stages.map((stage, index) => (
            <div key={stage.id} className="flex items-center">
              <div
                className="relative group min-w-[180px] p-4 rounded-lg border-2 text-white"
                style={{
                  backgroundColor: stage.color,
                  borderColor: stage.color
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{stage.name}</div>
                    <div className="text-xs opacity-90 mt-1">
                      {stage.win_probability}% win probability
                    </div>
                    <div className="text-xs opacity-75 mt-1 capitalize">
                      {stage.stage_type}
                    </div>
                  </div>
                  <GripVertical className="h-4 w-4 opacity-50" />
                </div>

                {/* Edit/Delete buttons on hover */}
                <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                  <button
                    onClick={() => handleEdit(stage)}
                    className="p-1 bg-card/20 hover:bg-card/30 rounded"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(stage.id)}
                    className="p-1 bg-card/20 hover:bg-card/30 rounded"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              {index < stages.length - 1 && (
                <div className="text-muted-foreground px-2">→</div>
              )}
            </div>
          ))}

          {stages.length === 0 && (
            <div className="text-muted-foreground text-sm py-8 text-center w-full">
              No pipeline stages configured. Add your first stage to get started.
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-card rounded-lg border border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {editingStage ? 'Edit Stage' : 'Add New Stage'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Stage Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Lead, Qualified, Proposal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Stage Type *
              </label>
              <select
                value={formData.stage_type}
                onChange={(e) => setFormData({ ...formData, stage_type: e.target.value as 'open' | 'won' | 'lost' })}
                className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="open">Open (Active)</option>
                <option value="won">Won (Closed Won)</option>
                <option value="lost">Lost (Closed Lost)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Win Probability (%)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.win_probability}
                onChange={(e) => setFormData({ ...formData, win_probability: parseInt(e.target.value) || 0 })}
                placeholder="0-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Stage Color
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

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Brief description of this stage..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Icon (optional)
              </label>
              <Input
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="e.g., star, check, x (lucide icon name)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter a Lucide icon name for visual representation
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              onClick={handleCancelEdit}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.name}
              className="bg-primary hover:bg-primary/90"
            >
              {saving ? 'Saving...' : editingStage ? 'Update Stage' : 'Add Stage'}
            </Button>
          </div>
        </div>
      )}

      {/* Stage List (Table View) */}
      {stages.length > 0 && !showAddForm && (
        <div className="bg-card rounded-lg border border overflow-hidden">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Stage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Win Probability</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Color</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {stages.map((stage) => (
                <tr key={stage.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {stage.stage_order + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-foreground">{stage.name}</div>
                    {stage.description && (
                      <div className="text-sm text-muted-foreground">{stage.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      stage.stage_type === 'won' ? 'bg-green-100 text-green-800' :
                      stage.stage_type === 'lost' ? 'bg-red-100 text-red-800' :
                      'bg-primary/10 text-primary'
                    }`}>
                      {stage.stage_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {stage.win_probability}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded border border-border"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span className="text-sm text-muted-foreground">{stage.color}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(stage)}
                      className="text-primary hover:text-primary/80 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(stage.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
