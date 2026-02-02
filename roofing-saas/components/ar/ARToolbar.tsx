'use client'

import React, { useState } from 'react'
import { ARTool, ARSession } from '@/lib/ar/ar-types'
import {
  Ruler,
  Square,
  Triangle,
  AlertTriangle,
  Camera,
  Save,
  Download,
  RotateCcw,
  Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ARToolbarProps {
  session: ARSession | null
  activeTool: ARTool
  onToolChange: (tool: ARTool) => void
  onSaveSession: () => Promise<void>
  onExportData: () => Promise<void>
  onReset: () => Promise<void>
  className?: string
}

export function ARToolbar({
  session,
  activeTool,
  onToolChange,
  onSaveSession,
  onExportData,
  onReset,
  className = ''
}: ARToolbarProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const tools = [
    {
      type: ARTool.DISTANCE,
      icon: Ruler,
      label: 'Distance',
      description: 'Measure distance between two points'
    },
    {
      type: ARTool.AREA,
      icon: Square,
      label: 'Area',
      description: 'Measure area of a region'
    },
    {
      type: ARTool.ANGLE,
      icon: Triangle,
      label: 'Angle',
      description: 'Measure angles and roof pitch'
    },
    {
      type: ARTool.DAMAGE_MARKER,
      icon: AlertTriangle,
      label: 'Damage',
      description: 'Mark damage locations'
    },
    {
      type: ARTool.PHOTO,
      icon: Camera,
      label: 'Photo',
      description: 'Capture annotated photos'
    }
  ]

  const handleSave = async () => {
    try {
      setIsSaving(true)
      await onSaveSession()
    } catch (error) {
      console.error('Save failed:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleExport = async () => {
    try {
      setIsExporting(true)
      await onExportData()
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const getSessionSummary = () => {
    if (!session) return null

    const totalMeasurements = session.measurements.length
    const totalDamageMarkers = session.damage_markers.length
    const totalPhotos = session.photos.length

    // Calculate total damaged area
    const totalDamagedArea = session.damage_markers.reduce((total, marker) => {
      const areaMeasurements = marker.measurements.filter(m => m.type === 'area')
      return total + areaMeasurements.reduce((sum, m) => sum + m.value, 0)
    }, 0)

    return {
      measurements: totalMeasurements,
      damageMarkers: totalDamageMarkers,
      photos: totalPhotos,
      damagedArea: totalDamagedArea
    }
  }

  const summary = getSessionSummary()

  return (
    <div className={'bg-card rounded-lg shadow-lg border border-border ' + className}>
      {/* Tool Selection */}
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-medium text-foreground mb-3">AR Tools</h3>
        
        <div className="grid grid-cols-5 gap-2">
          {tools.map((tool) => {
            const Icon = tool.icon
            const isActive = activeTool === tool.type
            
            return (
              <button
                key={tool.type}
                onClick={() => onToolChange(tool.type)}
                className={
                  'flex flex-col items-center p-3 rounded-lg border-2 transition-colors ' +
                  (isActive
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-border text-muted-foreground hover:bg-muted/50')
                }
                title={tool.description}
              >
                <Icon className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">{tool.label}</span>
              </button>
            )
          })}
        </div>
        
        {activeTool !== ARTool.NONE && (
          <div className="mt-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2">
              {tools.find(t => t.type === activeTool)?.icon && (
                <span className="text-primary">
                  {React.createElement(tools.find(t => t.type === activeTool)!.icon, {
                    className: 'h-4 w-4'
                  })}
                </span>
              )}
              <span className="text-sm font-medium text-primary">
                {tools.find(t => t.type === activeTool)?.label} Mode
              </span>
            </div>
            <p className="text-xs text-primary/80 mt-1">
              {tools.find(t => t.type === activeTool)?.description}
            </p>
          </div>
        )}
      </div>

      {/* Session Summary */}
      {summary && (
        <div className="p-4 border-b border-border">
          <h4 className="text-md font-medium text-foreground mb-3">Session Summary</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{summary.measurements}</div>
              <div className="text-xs text-muted-foreground">Measurements</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{summary.damageMarkers}</div>
              <div className="text-xs text-muted-foreground">Damage Markers</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{summary.photos}</div>
              <div className="text-xs text-muted-foreground">Photos</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {summary.damagedArea.toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground">sq ft damaged</div>
            </div>
          </div>

          {session?.status && (
            <div className="mt-3 text-center">
              <span className={
                'px-3 py-1 rounded-full text-sm font-medium ' +
                (session.status === 'active'
                  ? 'bg-green-500/10 text-green-500'
                  : 'bg-muted text-muted-foreground')
              }>
                Session {session.status}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={handleSave}
            disabled={isSaving || !session}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span className="text-sm">Save</span>
          </button>

          <Button
            onClick={handleExport}
            disabled={isExporting || !session}
            variant="success"
            size="sm"
            className="gap-2"
          >
            {isExporting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span className="text-sm">Export</span>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={onReset}
            disabled={!session}
            variant="warning"
            size="sm"
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="text-sm">Reset</span>
          </Button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
          >
            <Settings className="h-4 w-4" />
            <span className="text-sm">Settings</span>
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="border-t border-border p-4 bg-muted/30">
          <h4 className="text-md font-medium text-foreground mb-3">AR Settings</h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Measurement Unit
              </label>
              <select className="w-full px-3 py-1 text-sm border border-border rounded">
                <option value="ft">Feet</option>
                <option value="m">Meters</option>
                <option value="in">Inches</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-primary border-border rounded"
                  defaultChecked
                />
                <span className="text-sm text-foreground">Show confidence indicators</span>
              </label>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-primary border-border rounded"
                  defaultChecked
                />
                <span className="text-sm text-foreground">Auto-save measurements</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
