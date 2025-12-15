'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Save, Settings, Plus } from 'lucide-react'

interface DashboardWidget {
  id: string
  type: string
  position: { x: number; y: number; w: number; h: number }
  props?: Record<string, unknown>
}

export interface Dashboard {
  id: string
  name: string
  description?: string
  widgets: DashboardWidget[]
  layout: {
    cols: number
    rowHeight: number
    margin: [number, number]
  }
}

interface DashboardEditorProps {
  dashboard?: Dashboard
  onSave?: (dashboard: Dashboard) => void
  onCancel?: () => void
}

/**
 * Dashboard Editor Component
 *
 * Provides a drag-and-drop interface for creating and editing custom dashboards.
 * Supports adding widgets, configuring layout, and managing dashboard settings.
 */
export function DashboardEditor({
  dashboard: initialDashboard,
  onSave,
  onCancel
}: DashboardEditorProps) {
  const [dashboard, setDashboard] = useState<Dashboard>(() =>
    initialDashboard || {
      id: crypto.randomUUID(),
      name: 'New Dashboard',
      description: '',
      widgets: [],
      layout: {
        cols: 12,
        rowHeight: 100,
        margin: [16, 16]
      }
    }
  )

  const [selectedWidget, _setSelectedWidget] = useState<string | null>(null)
  const [_isEditing, _setIsEditing] = useState(false)

  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(dashboard)
    }
  }, [dashboard, onSave])

  const addWidget = useCallback((widgetType: string) => {
    const newWidget: DashboardWidget = {
      id: crypto.randomUUID(),
      type: widgetType,
      position: { x: 0, y: 0, w: 4, h: 3 },
      props: {}
    }

    setDashboard(prev => ({
      ...prev,
      widgets: [...prev.widgets, newWidget]
    }))
  }, [])

  const removeWidget = useCallback((widgetId: string) => {
    setDashboard(prev => ({
      ...prev,
      widgets: prev.widgets.filter(w => w.id !== widgetId)
    }))

    if (selectedWidget === widgetId) {
      _setSelectedWidget(null)
    }
  }, [selectedWidget])

  const _updateWidget = useCallback((widgetId: string, updates: Partial<DashboardWidget>) => {
    setDashboard(prev => ({
      ...prev,
      widgets: prev.widgets.map(w =>
        w.id === widgetId ? { ...w, ...updates } : w
      )
    }))
  }, [])

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar - Widget Library */}
      <div className="w-80 border-r border-border bg-card">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold mb-2">Widget Library</h2>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => addWidget('kpi-card')}
            >
              <Plus className="w-4 h-4 mr-2" />
              KPI Card
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => addWidget('chart')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Chart
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => addWidget('list')}
            >
              <Plus className="w-4 h-4 mr-2" />
              List
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => addWidget('calendar')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Calendar
            </Button>
          </div>
        </div>

        {/* Widget Configuration */}
        {selectedWidget && (
          <div className="p-4">
            <h3 className="text-md font-medium mb-3">Widget Settings</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="widget-title">Title</Label>
                <Input
                  id="widget-title"
                  placeholder="Widget title"
                  className="mt-1"
                />
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => removeWidget(selectedWidget)}
              >
                Remove Widget
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex-1">
            <Input
              value={dashboard.name}
              onChange={(e) => setDashboard(prev => ({ ...prev, name: e.target.value }))}
              className="text-lg font-semibold bg-transparent border-none shadow-none p-0 h-auto"
              placeholder="Dashboard name"
            />
            <Input
              value={dashboard.description || ''}
              onChange={(e) => setDashboard(prev => ({ ...prev, description: e.target.value }))}
              className="text-sm text-muted-foreground bg-transparent border-none shadow-none p-0 h-auto mt-1"
              placeholder="Dashboard description"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>

        {/* Dashboard Canvas */}
        <div className="flex-1 p-6 bg-muted/50">
          <div className="grid grid-cols-12 gap-4 h-full">
            {dashboard.widgets.map((widget) => (
              <div
                key={widget.id}
                className={`
                  relative bg-card border border-border rounded-lg p-4 cursor-pointer
                  transition-all duration-200 hover:shadow-md
                  ${selectedWidget === widget.id ? 'ring-2 ring-primary' : ''}
                `}
                style={{
                  gridColumn: `span ${widget.position.w}`,
                  gridRow: `span ${Math.ceil(widget.position.h / 2)}`,
                }}
                onClick={() => _setSelectedWidget(widget.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium capitalize">{widget.type}</span>
                  <Settings className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="text-muted-foreground text-sm">
                  Widget content will be rendered here
                </div>
              </div>
            ))}

            {dashboard.widgets.length === 0 && (
              <div className="col-span-12 flex items-center justify-center h-64 border-2 border-dashed border-border rounded-lg">
                <div className="text-center">
                  <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Start building your dashboard by adding widgets from the sidebar
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}