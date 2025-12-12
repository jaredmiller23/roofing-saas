'use client'

import { useState, useCallback } from 'react'
import {
  type InspectionState,
  type InspectionStep,
  createInitialState,
  getNextStep,
  getPreviousStep,
  calculateProgress,
} from '@/lib/claims/inspection-state'
import { LocationVerifier } from './LocationVerifier'
import { DamageChecklist } from './DamageChecklist'
import { InspectionSummary } from './InspectionSummary'
import { ClaimPhotoCapture } from './ClaimPhotoCapture'
import type { DamageType, SeverityLevel } from './DamageTypeSelector'

interface InspectionWizardProps {
  projectId: string
  contactId: string
  tenantId: string
  propertyCoords?: { latitude: number; longitude: number }
  onComplete: (state: InspectionState) => void
  onCancel: () => void
}

/**
 * InspectionWizard - Multi-step inspection flow
 *
 * Mobile-first wizard for conducting property inspections:
 * 1. Location verification
 * 2. Overview photo
 * 3. Damage checklist
 * 4. Photo capture per area
 * 5. Summary and submit
 */
export function InspectionWizard({
  projectId,
  contactId,
  tenantId,
  propertyCoords,
  onComplete,
  onCancel,
}: InspectionWizardProps) {
  const [state, setState] = useState<InspectionState>(() =>
    createInitialState(projectId, contactId, tenantId, propertyCoords)
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const progress = calculateProgress(state)

  // Navigation helpers
  const goToStep = useCallback((step: InspectionStep) => {
    setState(prev => ({ ...prev, currentStep: step }))
  }, [])

  const goNext = useCallback(() => {
    const nextStep = getNextStep(state)
    if (nextStep) goToStep(nextStep)
  }, [state, goToStep])

  const goBack = useCallback(() => {
    const prevStep = getPreviousStep(state)
    if (prevStep) goToStep(prevStep)
  }, [state, goToStep])

  // Location verification handler
  const handleLocationVerified = useCallback(
    (coords: { latitude: number; longitude: number; distance: number }) => {
      setState(prev => ({
        ...prev,
        location: {
          ...prev.location,
          verified: true,
          latitude: coords.latitude,
          longitude: coords.longitude,
          distance: coords.distance,
        },
      }))
      goNext()
    },
    [goNext]
  )

  // Overview photo handler
  const handleOverviewPhoto = useCallback(
    (photo: { id: string; damageType?: DamageType; severity?: SeverityLevel }) => {
      setState(prev => ({
        ...prev,
        overviewPhoto: {
          id: photo.id,
          damageType: 'overview',
          uploaded: true,
          uploadedPhotoId: photo.id,
        },
      }))
      goNext()
    },
    [goNext]
  )

  // Damage checklist toggle
  const handleToggleArea = useCallback((type: string) => {
    setState(prev => ({
      ...prev,
      damageAreas: prev.damageAreas.map(area =>
        area.type === type ? { ...area, selected: !area.selected } : area
      ),
    }))
  }, [])

  // Area photo capture
  const handleAreaPhoto = useCallback(
    (
      areaType: DamageType,
      photo: { id: string; damageType?: DamageType; severity?: SeverityLevel }
    ) => {
      setState(prev => ({
        ...prev,
        damageAreas: prev.damageAreas.map(area =>
          area.type === areaType
            ? {
                ...area,
                photos: [
                  ...area.photos,
                  {
                    id: photo.id,
                    damageType: photo.damageType || areaType,
                    severity: photo.severity,
                    uploaded: true,
                    uploadedPhotoId: photo.id,
                  },
                ],
              }
            : area
        ),
      }))
    },
    []
  )

  // Move to next area in capture flow
  const handleNextArea = useCallback(() => {
    const selectedAreas = state.damageAreas.filter(a => a.selected)
    const currentIdx = state.currentCaptureIndex

    if (currentIdx < selectedAreas.length - 1) {
      setState(prev => ({ ...prev, currentCaptureIndex: currentIdx + 1 }))
    } else {
      // All areas captured, go to summary
      goToStep('summary')
    }
  }, [state.damageAreas, state.currentCaptureIndex, goToStep])

  // Submit inspection
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true)

    try {
      // Mark as completed
      const completedState: InspectionState = {
        ...state,
        completedAt: new Date().toISOString(),
        syncStatus: 'synced',
      }

      setState(completedState)
      onComplete(completedState)
    } catch (error) {
      console.error('Submit error:', error)
      setState(prev => ({
        ...prev,
        syncStatus: 'error',
        syncError: 'Failed to submit inspection',
      }))
    } finally {
      setIsSubmitting(false)
    }
  }, [state, onComplete])

  // Get current capture area
  const selectedAreas = state.damageAreas.filter(a => a.selected)
  const currentArea = selectedAreas[state.currentCaptureIndex]

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Progress header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={onCancel}
              className="text-muted-foreground hover:text-muted-foreground"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <span className="text-sm font-medium text-muted-foreground capitalize">
              {state.currentStep.replace('_', ' ')}
            </span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1">
            <div
              className="bg-blue-600 h-1 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Step 1: Location */}
        {state.currentStep === 'location' && (
          <LocationVerifier
            propertyLatitude={propertyCoords?.latitude}
            propertyLongitude={propertyCoords?.longitude}
            onVerified={handleLocationVerified}
            onSkip={() => {
              setState(prev => ({
                ...prev,
                location: { ...prev.location, verified: true },
              }))
              goNext()
            }}
          />
        )}

        {/* Step 2: Overview photo */}
        {state.currentStep === 'overview' && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-lg font-medium">Overview Photo</h2>
              <p className="text-sm text-muted-foreground">
                Take a wide shot of the entire roof
              </p>
            </div>
            <ClaimPhotoCapture
              contactId={contactId}
              projectId={projectId}
              tenantId={tenantId}
              suggestedDamageType="overview"
              photoOrder={0}
              onUploadSuccess={handleOverviewPhoto}
              mode="queue"
            />
            <button
              onClick={goBack}
              className="w-full py-2 border border-gray-300 text-muted-foreground rounded-lg"
            >
              Back
            </button>
          </div>
        )}

        {/* Step 3: Damage checklist */}
        {state.currentStep === 'checklist' && (
          <DamageChecklist
            areas={state.damageAreas}
            onToggle={handleToggleArea}
            onContinue={goNext}
            onBack={goBack}
          />
        )}

        {/* Step 4: Capture photos per area */}
        {state.currentStep === 'capture' && currentArea && (
          <div className="space-y-4">
            {/* Area progress */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Area {state.currentCaptureIndex + 1} of {selectedAreas.length}
              </span>
              <span>
                {currentArea.photos.length} photo
                {currentArea.photos.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Current area name */}
            <div className="text-center">
              <h2 className="text-lg font-medium">{currentArea.label}</h2>
              <p className="text-sm text-muted-foreground">Photograph any damage</p>
            </div>

            {/* Photo capture */}
            <ClaimPhotoCapture
              contactId={contactId}
              projectId={projectId}
              tenantId={tenantId}
              suggestedDamageType={currentArea.type as DamageType}
              photoOrder={state.currentCaptureIndex + 1}
              onUploadSuccess={photo =>
                handleAreaPhoto(currentArea.type as DamageType, photo)
              }
              mode="queue"
            />

            {/* Navigation */}
            <div className="flex gap-2">
              <button
                onClick={goBack}
                className="px-4 py-3 border border-gray-300 text-muted-foreground rounded-lg hover:bg-accent"
              >
                Back
              </button>
              <button
                onClick={handleNextArea}
                disabled={currentArea.photos.length === 0}
                className={`flex-1 py-3 rounded-lg font-medium ${
                  currentArea.photos.length > 0
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                {state.currentCaptureIndex < selectedAreas.length - 1
                  ? 'Next Area'
                  : 'Review'}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Summary */}
        {state.currentStep === 'summary' && (
          <InspectionSummary
            state={state}
            onSubmit={handleSubmit}
            onBack={goBack}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  )
}
