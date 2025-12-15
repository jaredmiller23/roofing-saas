'use client'

/**
 * DashboardEditor Component
 *
 * Main dashboard editing interface with drag-and-drop widget management.
 * Allows users to create and customize their dashboards.
 */

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Save,
  Plus,
  Eye,
  Settings,
  ArrowLeft,
  Undo,
  Redo,
} from 'lucide-react'
import { DashboardGrid } from './DashboardGrid'
import { WidgetLibrary } from './WidgetLibrary'
import { toast } from 'sonner'
import type {
  Dashboard,
  DashboardWidget,
  CreateDashboardInput,
  WidgetType,
} from '@/lib/dashboard/dashboard-types'
import { getWidgetDefinition } from '@/lib/dashboard/widget-registry'
import {
  createDashboard,
  updateDashboard,
  addWidget,
  removeWidget,
  repositionWidget,
  resizeWidget,
} from '@/lib/dashboard/dashboard-engine'

interface DashboardEditorProps {
  dashboard?: Dashboard
  onSave?: (dashboard: Dashboard) => void
  onCancel?: () => void
}

export function DashboardEditor({ dashboard, onSave, onCancel }: DashboardEditorProps) {
  const [editedDashboard, setEditedDashboard] = useState<Dashboard | CreateDashboardInput>(
    dashboard || {
      name: 'New Dashboard',
      description: '',
      visibility: 'private',
      role_based: false,
      layout: {
        type: 'grid',
        columns: 12,
        rowHeight: 80,
        gap: 16,
        responsive: true,
      },
      widgets: [],
    }
  )

  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      let savedDashboard: Dashboard

      if ('id' in editedDashboard) {
        // Update existing dashboard
        savedDashboard = await updateDashboard(editedDashboard)
        toast.success('Dashboard updated successfully')
      } else {
        // Create new dashboard
        savedDashboard = await createDashboard(editedDashboard as CreateDashboardInput)
        toast.success('Dashboard created successfully')
      }

      onSave?.(savedDashboard)
    } catch (error) {
      console.error('Failed to save dashboard:', error)
      toast.error('Failed to save dashboard')
    } finally {
      setSaving(false)
    }
  }, [editedDashboard, onSave])

  const handleAddWidget = useCallback(
    (widgetType: WidgetType) => {
      const definition = getWidgetDefinition(widgetType)
      if (!definition) {
        toast.error('Widget type not found')
        return
      }

      // Calculate position for new widget
      const widgets = 'widgets' in editedDashboard ? editedDashboard.widgets || [] : []
      const maxY = widgets.reduce((max, w) => Math.max(max, w.position.y + w.size.height), 0)

      const newWidget: DashboardWidget = {
        id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: widgetType,
        title: definition.name,
        description: definition.description,
        position: { x: 0, y: maxY },
        size: definition.default_size,
        config: definition.default_config,
        enabled: true,
      }

      setEditedDashboard((prev) => ({
        ...prev,
        widgets: [...(('widgets' in prev && prev.widgets) || []), newWidget],
      }))

      setShowWidgetLibrary(false)
      toast.success(`Added ${definition.name}`)
    },
    [editedDashboard]
  )

  const handleRemoveWidget = useCallback((widgetId: string) => {
    setEditedDashboard((prev) => ({
      ...prev,
      widgets: (('widgets' in prev && prev.widgets) || []).filter((w) => w.id !== widgetId),
    }))
    toast.success('Widget removed')
  }, [])

  const handleWidgetMove = useCallback((widgetId: string, x: number, y: number) => {
    setEditedDashboard((prev) => ({
      ...prev,
      widgets: (('widgets' in prev && prev.widgets) || []).map((w) =>
        w.id === widgetId ? { ...w, position: { ...w.position, x, y } } : w
      ),
    }))
  }, [])

  const handleWidgetResize = useCallback((widgetId: string, width: number, height: number) => {
    setEditedDashboard((prev) => ({
      ...prev,
      widgets: (('widgets' in prev && prev.widgets) || []).map((w) =>
        w.id === widgetId ? { ...w, size: { ...w.size, width, height } } : w
      ),
    }))
  }, [])

  const renderWidget = useCallback((widget: DashboardWidget) => {
    // Placeholder widget renderer
    return (
      <div className="flex items-center justify-center h-full bg-muted/30 rounded">
        <p className="text-sm text-muted-foreground">
          {widget.type} widget placeholder
        </p>
      </div>
    )
  }, [])

  const widgets = 'widgets' in editedDashboard ? editedDashboard.widgets : []
  const layout = editedDashboard.layout

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <Input
              value={editedDashboard.name}
              onChange={(e) =>
                setEditedDashboard((prev) => ({ ...prev, name: e.target.value }))
              }
              className="text-lg font-semibold border-none bg-transparent p-0 h-auto focus-visible:ring-0"
              placeholder="Dashboard Name"
            />
            <p className="text-sm text-muted-foreground mt-1">
              {widgets?.length || 0} widget{(widgets?.length || 0) !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {previewMode ? 'Edit' : 'Preview'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowWidgetLibrary(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Widget
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Dashboard Canvas */}
      <div className="flex-1 overflow-auto p-6">
        <DashboardGrid
          layout={layout}
          widgets={widgets || []}
          editable={!previewMode}
          onWidgetMove={handleWidgetMove}
          onWidgetResize={handleWidgetResize}
          onWidgetRemove={handleRemoveWidget}
          renderWidget={renderWidget}
        />

        {(widgets?.length || 0) === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="max-w-md">
              <h3 className="text-lg font-semibold mb-2">No widgets yet</h3>
              <p className="text-muted-foreground mb-4">
                Start building your dashboard by adding widgets from the library.
              </p>
              <Button onClick={() => setShowWidgetLibrary(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Widget
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Widget Library Sheet */}
      <Sheet open={showWidgetLibrary} onOpenChange={setShowWidgetLibrary}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Widget Library</SheetTitle>
            <SheetDescription>
              Choose widgets to add to your dashboard
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <WidgetLibrary onWidgetSelect={handleAddWidget} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Dashboard Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dashboard Settings</DialogTitle>
            <DialogDescription>
              Configure your dashboard preferences
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editedDashboard.name}
                onChange={(e) =>
                  setEditedDashboard((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={editedDashboard.description || ''}
                onChange={(e) =>
                  setEditedDashboard((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowSettings(false)}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DashboardEditor
