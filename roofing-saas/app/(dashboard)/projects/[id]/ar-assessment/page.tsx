'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Eye, Calculator } from 'lucide-react'

import { ARViewport } from '@/components/ar/ARViewport'
import { MeasurementOverlay } from '@/components/ar/MeasurementOverlay'
import { DamageMarkerList } from '@/components/ar/DamageMarker'
import { ARToolbar } from '@/components/ar/ARToolbar'

import { 
  ARSession, 
  ARMeasurement, 
  DamageMarker, 
  ARTool,
  AREstimateData 
} from '@/lib/ar/ar-types'
import { arEngine } from '@/lib/ar/ar-engine'
import { damageClassifier } from '@/lib/ar/damage-classifier'

export default function ARAssessmentPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [arSession, _setArSession] = useState<ARSession | null>(null)
  const [currentTool, setCurrentTool] = useState<ARTool>(ARTool.NONE)
  const [measurements, setMeasurements] = useState<ARMeasurement[]>([])
  const [damageMarkers, setDamageMarkers] = useState<DamageMarker[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [project, setProject] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    fetchProjectData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const fetchProjectData = async () => {
    try {
      const response = await fetch('/api/projects/' + projectId)
      if (response.ok) {
        const data = await response.json()
        setProject(data.project || data)
      }
    } catch (error) {
      console.error('Failed to fetch project:', error)
    }
  }

  const handleMeasurementComplete = (measurement: ARMeasurement) => {
    setMeasurements(prev => [...prev, measurement])
    saveMeasurement(measurement)
  }

  const handleDamageMarkerAdded = (marker: DamageMarker) => {
    setDamageMarkers(prev => [...prev, marker])
    saveDamageMarker(marker)
  }

  const handleMeasurementDelete = (id: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== id))
    
    if (arSession) {
      arSession.measurements = arSession.measurements.filter(m => m.id !== id)
    }
  }

  const handleDamageMarkerUpdate = (updatedMarker: DamageMarker) => {
    setDamageMarkers(prev => 
      prev.map(marker => 
        marker.id === updatedMarker.id ? updatedMarker : marker
      )
    )
  }

  const handleDamageMarkerDelete = (id: string) => {
    setDamageMarkers(prev => prev.filter(m => m.id !== id))
    
    if (arSession) {
      arSession.damage_markers = arSession.damage_markers.filter(m => m.id !== id)
    }
  }

  const handleToolChange = (tool: ARTool) => {
    setCurrentTool(tool)
    arEngine.setTool(tool)
  }

  const handleSaveSession = async () => {
    if (!arSession) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/ar/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session: arSession,
          measurements,
          damage_markers: damageMarkers
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save AR session')
      }

      console.log('AR session saved successfully')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save session')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportData = async () => {
    try {
      setIsLoading(true)
      
      const analysis = damageClassifier.analyzeDamagePattern(damageMarkers)
      
      const exportData: AREstimateData = {
        session_id: arSession?.id || '',
        total_damaged_area: analysis.total_affected_area as number,
        damage_summary: {},
        recommended_line_items: generateLineItems(analysis, measurements, damageMarkers)
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'ar-assessment-' + projectId + '-' + new Date().toISOString().split('T')[0] + '.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Export failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset the AR session? This will clear all measurements and damage markers.')) {
      setMeasurements([])
      setDamageMarkers([])
      setCurrentTool(ARTool.NONE)
      
      if (arSession) {
        arSession.measurements = []
        arSession.damage_markers = []
      }
    }
  }

  const generateLineItems = (
    analysis: Record<string, unknown>,
    measurements: ARMeasurement[],
    _damageMarkers: DamageMarker[]
  ) => {
    const lineItems = []

    measurements
      .filter(m => m.type === 'area')
      .reduce((sum, m) => sum + m.value, 0)

    const totalArea = analysis.total_affected_area as number
    const primaryCause = analysis.primary_cause as string

    if (totalArea > 0) {
      lineItems.push({
        description: 'Roof repair - damaged area (' + primaryCause + ')',
        quantity: Math.ceil(totalArea),
        unit: 'sqft',
        unit_price: 15.00,
        category: 'materials' as const,
        source_measurements: damageMarkers.map(m => m.id)
      })

      lineItems.push({
        description: 'Labor for roof damage repair',
        quantity: Math.ceil(totalArea / 50),
        unit: 'hours',
        unit_price: 65.00,
        category: 'labor' as const
      })
    }

    return lineItems
  }

  const saveMeasurement = async (measurement: ARMeasurement) => {
    try {
      await fetch('/api/ar/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          measurement
        })
      })
    } catch (error) {
      console.error('Failed to save measurement:', error)
    }
  }

  const saveDamageMarker = async (marker: DamageMarker) => {
    try {
      await fetch('/api/ar/damage-markers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          marker
        })
      })
    } catch (error) {
      console.error('Failed to save damage marker:', error)
    }
  }

  const navigateToEstimate = () => {
    router.push('/estimates/new?project_id=' + projectId + '&from_ar=true')
  }

  return (
    <div className="min-h-screen bg-muted">
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={'/projects/' + projectId}
              className="p-2 text-muted-foreground hover:bg-muted rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                AR Damage Assessment
              </h1>
              {project && (
                <p className="text-sm text-muted-foreground">{project.name as string}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/projects/' + projectId)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-muted text-foreground rounded-lg hover:bg-muted/80"
            >
              <Eye className="h-4 w-4" />
              View Project
            </button>

            <button
              onClick={navigateToEstimate}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              <Calculator className="h-4 w-4" />
              Create Estimate
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 h-[calc(100vh-80px)]">
        <div className="lg:col-span-2">
          <div className="bg-card rounded-lg shadow-lg h-full p-4">
            <h2 className="text-lg font-medium text-foreground mb-4">AR Camera View</h2>
            <ARViewport
              projectId={projectId}
              onMeasurementComplete={handleMeasurementComplete}
              _onDamageMarkerAdded={handleDamageMarkerAdded}
              className="h-[calc(100%-60px)]"
            />
          </div>
        </div>

        <div className="space-y-6">
          <ARToolbar
            session={arSession}
            activeTool={currentTool}
            onToolChange={handleToolChange}
            onSaveSession={handleSaveSession}
            onExportData={handleExportData}
            onReset={handleReset}
          />

          <div className="max-h-64 overflow-y-auto">
            <MeasurementOverlay
              measurements={measurements}
              onMeasurementDelete={handleMeasurementDelete}
            />
          </div>

          <div className="max-h-64 overflow-y-auto">
            <DamageMarkerList
              markers={damageMarkers}
              onMarkerUpdate={handleDamageMarkerUpdate}
              onMarkerDelete={handleDamageMarkerDelete}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg shadow-lg">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm text-red-600 hover:text-red-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 shadow-xl">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-foreground">Processing...</p>
          </div>
        </div>
      )}
    </div>
  )
}
