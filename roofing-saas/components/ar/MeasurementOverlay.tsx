'use client'

import { useState } from 'react'
import { ARMeasurement, ARTool } from '@/lib/ar/ar-types'
import { measurementTools } from '@/lib/ar/measurement-tools'
import { Ruler, Square, Triangle, Trash2 } from 'lucide-react'

interface MeasurementOverlayProps {
  measurements: ARMeasurement[]
  onMeasurementDelete: (id: string) => void
  className?: string
}

export function MeasurementOverlay({
  measurements,
  onMeasurementDelete,
  className = ''
}: MeasurementOverlayProps) {
  const [activeTool, setActiveTool] = useState<ARTool>(ARTool.NONE)

  const startMeasurement = (tool: ARTool) => {
    setActiveTool(tool)
    measurementTools.startMeasurement(tool)
  }

  const cancelMeasurement = () => {
    setActiveTool(ARTool.NONE)
    measurementTools.cancelMeasurement()
  }

  const formatMeasurement = (measurement: ARMeasurement): string => {
    switch (measurement.type) {
      case 'distance':
        return measurement.value.toFixed(2) + ' ' + measurement.unit
      case 'area':
        return measurement.value.toFixed(1) + ' ' + measurement.unit
      case 'angle':
        return measurement.value.toFixed(1) + '°'
      case 'pitch':
        const { rise, run } = measurementTools.calculateRoofPitch(measurement.value)
        return rise + '/' + run
      default:
        return measurement.value.toString()
    }
  }

  const getToolIcon = (tool: ARTool) => {
    switch (tool) {
      case ARTool.DISTANCE:
        return <Ruler className="h-4 w-4" />
      case ARTool.AREA:
        return <Square className="h-4 w-4" />
      case ARTool.ANGLE:
        return <Triangle className="h-4 w-4" />
      default:
        return null
    }
  }

  const getToolLabel = (tool: ARTool) => {
    switch (tool) {
      case ARTool.DISTANCE:
        return 'Distance'
      case ARTool.AREA:
        return 'Area'
      case ARTool.ANGLE:
        return 'Angle'
      default:
        return 'Unknown'
    }
  }

  return (
    <div className={'space-y-4 ' + className}>
      {/* Tool Selection */}
      <div className="bg-white rounded-lg shadow-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Measurement Tools</h3>
        
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            onClick={() => startMeasurement(ARTool.DISTANCE)}
            className={
              'flex flex-col items-center p-3 rounded-lg border-2 transition-colors ' +
              (activeTool === ARTool.DISTANCE
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-600')
            }
          >
            <Ruler className="h-6 w-6 mb-1" />
            <span className="text-sm">Distance</span>
          </button>
          
          <button
            onClick={() => startMeasurement(ARTool.AREA)}
            className={
              'flex flex-col items-center p-3 rounded-lg border-2 transition-colors ' +
              (activeTool === ARTool.AREA
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-600')
            }
          >
            <Square className="h-6 w-6 mb-1" />
            <span className="text-sm">Area</span>
          </button>
          
          <button
            onClick={() => startMeasurement(ARTool.ANGLE)}
            className={
              'flex flex-col items-center p-3 rounded-lg border-2 transition-colors ' +
              (activeTool === ARTool.ANGLE
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-600')
            }
          >
            <Triangle className="h-6 w-6 mb-1" />
            <span className="text-sm">Angle</span>
          </button>
        </div>

        {activeTool !== ARTool.NONE && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getToolIcon(activeTool)}
                <span className="text-sm font-medium text-blue-900">
                  {getToolLabel(activeTool)} Mode Active
                </span>
              </div>
              <button
                onClick={cancelMeasurement}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-blue-700 mt-1">
              {activeTool === ARTool.DISTANCE && 'Tap two points to measure distance'}
              {activeTool === ARTool.AREA && 'Tap points to outline area, then complete measurement'}
              {activeTool === ARTool.ANGLE && 'Tap three points: start, vertex, end'}
            </p>
          </div>
        )}
      </div>

      {/* Measurements List */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Measurements ({measurements.length})
          </h3>
        </div>
        
        <div className="max-h-64 overflow-y-auto">
          {measurements.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No measurements yet. Use the tools above to start measuring.
            </div>
          ) : (
            measurements.map((measurement, index) => (
              <div
                key={measurement.id}
                className="p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getToolIcon(measurement.type as ARTool)}
                    <div>
                      <div className="font-medium text-gray-900">
                        {formatMeasurement(measurement)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {getToolLabel(measurement.type as ARTool)} #{index + 1}
                        {measurement.metadata?.confidence && (
                          <span className="ml-2">
                            ({Math.round(measurement.metadata.confidence * 100)}% confidence)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => onMeasurementDelete(measurement.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                    title="Delete measurement"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                
                {measurement.type === 'angle' && (
                  <div className="mt-2 text-sm text-gray-600">
                    Roof Pitch: {measurementTools.calculateRoofPitch(measurement.value).pitch}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
