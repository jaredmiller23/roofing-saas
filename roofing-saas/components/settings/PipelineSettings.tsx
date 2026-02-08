'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api/client'
import { getContrastColor } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Pencil, GripVertical, Info, GitBranch } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/ui/empty-state'

interface PipelineStage {
  id: string
  stage_key: string
  name: string
  description: string | null
  color: string
  icon: string | null
  stage_order: number
  stage_type: 'active' | 'won' | 'lost'
  win_probability: number
  is_active: boolean
  is_default: boolean
}

export function PipelineSettings() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: '',
    stage_type: 'active' as 'active' | 'won' | 'lost',
    win_probability: 0
  })

  useEffect(() => {
    loadStages()
  }, [])

  const loadStages = async () => {
    try {
      setLoading(true)
      const data = await apiFetch<PipelineStage[]>('/api/settings/pipeline-stages')
      setStages(data || [])
    } catch (err) {
      console.error('Error loading pipeline stages:', err)
      toast.error('Failed to load pipeline stages')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!editingStage) return

    try {
      setSaving(true)

      await apiFetch<PipelineStage>(`/api/settings/pipeline-stages/${editingStage.id}`, {
        method: 'PATCH',
        body: {
          name: formData.name,
          description: formData.description || null,
          color: formData.color,
          icon: formData.icon || null,
          stage_type: formData.stage_type,
          win_probability: formData.win_probability
        }
      })

      toast.success('Pipeline stage updated successfully')
      setEditingStage(null)
      loadStages()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save stage')
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
  }

  const handleCancelEdit = () => {
    setEditingStage(null)
    setFormData({
      name: '',
      description: '',
      color: '#3B82F6',
      icon: '',
      stage_type: 'active',
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
      {/* Info Banner */}
      <Alert className="bg-primary/5 border-primary/20">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription className="text-muted-foreground">
          Pipeline stages are linked to your project workflow. You can customize display names, colors, and win probabilities for each stage.
        </AlertDescription>
      </Alert>

      {/* Pipeline Preview */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Sales Pipeline Stages</h3>
        </div>

        {/* Visual Pipeline */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4">
          {stages.map((stage, index) => (
            <div key={stage.id} className="flex items-center">
              <div
                className="relative group min-w-[180px] p-4 rounded-lg border-2 cursor-pointer"
                style={{
                  backgroundColor: stage.color,
                  borderColor: stage.color,
                  color: getContrastColor(stage.color)
                }}
                onClick={() => handleEdit(stage)}
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

                {/* Edit button on hover */}
                <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEdit(stage)
                    }}
                    className="p-1 bg-card/20 hover:bg-card/30 rounded"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
              </div>
              {index < stages.length - 1 && (
                <div className="text-muted-foreground px-2">&rarr;</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Edit Form */}
      {editingStage && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Edit Stage: {editingStage.name}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Stage Key (read-only) */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Stage Key
              </label>
              <Input
                value={editingStage.stage_key}
                disabled
                className="bg-muted/30 text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1">
                System identifier — cannot be changed
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Display Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Prospect, Qualified, Quote Sent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Stage Type
              </label>
              <select
                value={formData.stage_type}
                onChange={(e) => setFormData({ ...formData, stage_type: e.target.value as 'active' | 'won' | 'lost' })}
                className="w-full px-3 py-2 bg-card border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
              >
                <option value="active">Active</option>
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

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Icon (optional)
              </label>
              <Input
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="e.g., star, check, x (lucide icon name)"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 bg-card border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
                placeholder="Brief description of this stage..."
              />
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
              {saving ? 'Saving...' : 'Update Stage'}
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {stages.length === 0 && !editingStage && (
        <div className="bg-card rounded-lg border border-border">
          <EmptyState
            icon={GitBranch}
            title="No pipeline stages configured"
            description="Pipeline stages define the journey a project takes from lead to close. Add stages to get started."
          />
        </div>
      )}

      {/* Stage List (Table View) — shown when not editing */}
      {stages.length > 0 && !editingStage && (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Stage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Key</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Win Probability</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Color</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {stages.map((stage) => (
                <tr key={stage.id} className="hover:bg-muted/10 cursor-pointer" onClick={() => handleEdit(stage)}>
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
                    <code className="text-xs bg-muted/30 px-2 py-1 rounded text-muted-foreground">
                      {stage.stage_key}
                    </code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      stage.stage_type === 'won' ? 'bg-chart-2/10 text-chart-2' :
                      stage.stage_type === 'lost' ? 'bg-destructive/10 text-destructive' :
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
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(stage)
                      }}
                      className="text-primary hover:text-primary/80"
                    >
                      Edit
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
