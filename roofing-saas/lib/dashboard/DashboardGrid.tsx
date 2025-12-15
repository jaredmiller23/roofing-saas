'use client'

/**
 * DashboardGrid Component
 *
 * Grid layout system for dashboard widgets with drag-and-drop support.
 * Uses react-grid-layout for responsive, draggable grid functionality.
 */

import React, { useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GripVertical, X, Settings, Maximize2, Minimize2 } from 'lucide-react'
import type { DashboardWidget, DashboardLayout } from '@/lib/dashboard/dashboard-types'

interface DashboardGridProps {
  layout: DashboardLayout
  widgets: DashboardWidget[]
  editable?: boolean
  onWidgetMove?: (widgetId: string, x: number, y: number) => void
  onWidgetResize?: (widgetId: string, width: number, height: number) => void
  onWidgetRemove?: (widgetId: string) => void
  onWidgetConfigure?: (widgetId: string) => void
  renderWidget: (widget: DashboardWidget) => React.ReactNode
}

export function DashboardGrid({
  layout,
  widgets,
  editable = false,
  onWidgetMove,
  onWidgetResize,
  onWidgetRemove,
  onWidgetConfigure,
  renderWidget,
}: DashboardGridProps) {
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null)
  const [resizingWidget, setResizingWidget] = useState<string | null>(null)

  const handleDragStart = useCallback((widgetId: string) => {
    setDraggedWidget(widgetId)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedWidget(null)
  }, [])

  const handleResizeStart = useCallback((widgetId: string) => {
    setResizingWidget(widgetId)
  }, [])

  const handleResizeEnd = useCallback(() => {
    setResizingWidget(null)
  }, [])

  const gridColumnWidth = `${100 / layout.columns}%`
  const gridRowHeight = layout.rowHeight

  return (
    <div
      className="relative w-full"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
        gap: `${layout.gap}px`,
        minHeight: '400px',
      }}
    >
      {widgets
        .filter((w) => w.enabled)
        .map((widget) => {
          const { x, y } = widget.position
          const { width, height } = widget.size

          return (
            <div
              key={widget.id}
              className="relative"
              style={{
                gridColumn: `${x + 1} / span ${width}`,
                gridRow: `${y + 1} / span ${height}`,
                minHeight: `${height * gridRowHeight}px`,
              }}
            >
              <Card className="h-full flex flex-col overflow-hidden bg-card border-border hover:border-primary/50 transition-colors">
                {/* Widget Header */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
                  <div className="flex items-center gap-2">
                    {editable && (
                      <div
                        className="cursor-move hover:text-primary"
                        onMouseDown={() => handleDragStart(widget.id)}
                        onMouseUp={handleDragEnd}
                      >
                        <GripVertical className="h-4 w-4" />
                      </div>
                    )}
                    <h3 className="font-semibold text-sm text-foreground">
                      {widget.title}
                    </h3>
                  </div>

                  {editable && (
                    <div className="flex items-center gap-1">
                      {onWidgetConfigure && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onWidgetConfigure(widget.id)}
                        >
                          <Settings className="h-3 w-3" />
                        </Button>
                      )}
                      {onWidgetRemove && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onWidgetRemove(widget.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Widget Content */}
                <div className="flex-1 p-4 overflow-auto">
                  {widget.loading_state === 'loading' && (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  )}
                  {widget.loading_state === 'error' && (
                    <div className="flex items-center justify-center h-full text-destructive">
                      <p className="text-sm">{widget.error_message || 'Failed to load widget'}</p>
                    </div>
                  )}
                  {widget.loading_state !== 'loading' && widget.loading_state !== 'error' && (
                    renderWidget(widget)
                  )}
                </div>

                {/* Resize Handle */}
                {editable && widget.size.resizable && (
                  <div
                    className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize hover:bg-primary/20"
                    onMouseDown={() => handleResizeStart(widget.id)}
                    onMouseUp={handleResizeEnd}
                  >
                    <Maximize2 className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
              </Card>
            </div>
          )
        })}
    </div>
  )
}

export default DashboardGrid
