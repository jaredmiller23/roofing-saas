'use client'

import { useEffect, useRef, useState } from 'react'
import { arEngine } from '@/lib/ar/ar-engine'
import { measurementTools } from '@/lib/ar/measurement-tools'
import { ARTool, ARState, ARMeasurement, DamageMarker } from '@/lib/ar/ar-types'

interface ARViewportProps {
  projectId: string
  onMeasurementComplete: (measurement: ARMeasurement) => void
  onDamageMarkerAdded: (marker: DamageMarker) => void
  className?: string
}

export function ARViewport({
  projectId,
  onMeasurementComplete,
  onDamageMarkerAdded,
  className = ''
}: ARViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [arState, setArState] = useState<ARState | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    initializeAR()
    return () => {
      cleanup()
    }
  }, [])

  useEffect(() => {
    // Poll AR state for updates
    const interval = setInterval(() => {
      setArState(arEngine.getState())
    }, 100)

    return () => clearInterval(interval)
  }, [])

  const initializeAR = async () => {
    try {
      setIsInitializing(true)
      setError(null)

      const initialized = await arEngine.initialize()
      if (!initialized) {
        throw new Error('Failed to initialize AR system')
      }

      setArState(arEngine.getState())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsInitializing(false)
    }
  }

  const startARSession = async () => {
    try {
      setError(null)
      const session = await arEngine.startSession(projectId)
      
      if (!session) {
        throw new Error('Failed to start AR session')
      }

      setArState(arEngine.getState())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start AR session')
    }
  }

  const stopARSession = async () => {
    try {
      await arEngine.stopSession()
      setArState(arEngine.getState())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop AR session')
    }
  }

  const handleCanvasClick = async (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!arState?.session || !measurementTools.hasEnoughPoints()) {
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    try {
      // In a real implementation, this would use hit testing
      // For now, we'll simulate 3D points
      const point = {
        x: (x / canvas.width - 0.5) * 10, // Convert to world coordinates
        y: (0.5 - y / canvas.height) * 10,
        z: -5, // Fixed distance for demo
        screenX: x,
        screenY: y
      }

      measurementTools.addPoint(point)

      if (measurementTools.hasEnoughPoints()) {
        const result = measurementTools.completeMeasurement()
        if (result) {
          onMeasurementComplete(result.measurement)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Measurement failed')
    }
  }

  const cleanup = async () => {
    if (arState?.session) {
      await arEngine.stopSession()
    }
  }

  if (isInitializing) {
    return (
      <div className={'flex items-center justify-center h-64 bg-muted rounded-lg ' + className}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Initializing AR...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={'flex items-center justify-center h-64 bg-red-50 border border-red-200 rounded-lg ' + className}>
        <div className="text-center p-4">
          <p className="text-red-800 mb-4">{error}</p>
          <button
            onClick={initializeAR}
            className="px-4 py-2 bg-red-600 text-primary-foreground rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!arState?.device.supports_ar) {
    return (
      <div className={'flex items-center justify-center h-64 bg-yellow-50 border border-yellow-200 rounded-lg ' + className}>
        <div className="text-center p-4">
          <p className="text-yellow-800 mb-2">AR not supported on this device</p>
          <p className="text-sm text-yellow-600">
            Please use a device with AR capabilities (ARCore/ARKit)
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={'relative w-full h-full ' + className}>
      {!arState?.session ? (
        <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
          <div className="text-center">
            <h3 className="text-lg font-medium text-foreground mb-2">Ready for AR Assessment</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start AR mode to begin measuring roof damage
            </p>
            <button
              onClick={startARSession}
              className="px-6 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Start AR Session
            </button>
          </div>
        </div>
      ) : (
        <>
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="w-full h-full rounded-lg cursor-crosshair"
            style={{ background: 'black' }}
          />
          
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <button
              onClick={stopARSession}
              className="px-4 py-2 bg-red-600 text-primary-foreground rounded shadow hover:bg-red-700"
            >
              Stop AR
            </button>
          </div>

          <div className="absolute bottom-4 left-4 bg-black/75 text-primary-foreground p-3 rounded">
            <div className="text-sm">
              <p>Session: {arState.session.status}</p>
              <p>Measurements: {arState.session.measurements.length}</p>
              <p>Damage Markers: {arState.session.damage_markers.length}</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
