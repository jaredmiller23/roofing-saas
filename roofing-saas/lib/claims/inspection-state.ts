/**
 * Inspection State Management
 *
 * Manages state for the multi-step inspection wizard.
 * Designed for offline-first mobile usage.
 */

import { type DamageType, type SeverityLevel } from '@/components/claims/DamageTypeSelector'

/**
 * Steps in the inspection wizard
 */
export type InspectionStep =
  | 'location'     // Verify GPS location
  | 'overview'     // Take overview photo
  | 'checklist'    // Select damage areas
  | 'capture'      // Capture photos per area
  | 'summary'      // Review before submit

/**
 * Status of a damage area photo
 */
export interface DamageAreaPhoto {
  id: string
  damageType: DamageType
  severity?: SeverityLevel
  previewUrl?: string
  uploaded: boolean
  uploadedPhotoId?: string
}

/**
 * Damage area in the inspection checklist
 */
export interface DamageArea {
  type: DamageType
  label: string
  selected: boolean
  photos: DamageAreaPhoto[]
  notes?: string
}

/**
 * Full inspection state
 */
export interface InspectionState {
  projectId: string
  contactId: string
  tenantId: string

  // Current step
  currentStep: InspectionStep

  // Location verification
  location: {
    verified: boolean
    latitude?: number
    longitude?: number
    accuracy?: number
    propertyLatitude?: number
    propertyLongitude?: number
    distance?: number // meters from property
  }

  // Overview photo
  overviewPhoto?: DamageAreaPhoto

  // Damage areas
  damageAreas: DamageArea[]

  // Current capture index (for capture step)
  currentCaptureIndex: number

  // Timestamps
  startedAt: string
  completedAt?: string

  // Sync status
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error'
  syncError?: string
}

/**
 * Default damage areas for roofing inspection
 */
export const DEFAULT_DAMAGE_AREAS: DamageArea[] = [
  { type: 'shingles', label: 'Shingles', selected: false, photos: [] },
  { type: 'ridge_cap', label: 'Ridge Cap', selected: false, photos: [] },
  { type: 'flashing', label: 'Flashing', selected: false, photos: [] },
  { type: 'gutters', label: 'Gutters', selected: false, photos: [] },
  { type: 'soffit', label: 'Soffit', selected: false, photos: [] },
  { type: 'fascia', label: 'Fascia', selected: false, photos: [] },
  { type: 'vents', label: 'Vents', selected: false, photos: [] },
  { type: 'skylights', label: 'Skylights', selected: false, photos: [] },
  { type: 'chimney', label: 'Chimney', selected: false, photos: [] },
  { type: 'siding', label: 'Siding', selected: false, photos: [] },
  { type: 'windows', label: 'Windows', selected: false, photos: [] },
]

/**
 * Create initial inspection state
 */
export function createInitialState(
  projectId: string,
  contactId: string,
  tenantId: string,
  propertyCoords?: { latitude: number; longitude: number }
): InspectionState {
  return {
    projectId,
    contactId,
    tenantId,
    currentStep: 'location',
    location: {
      verified: false,
      propertyLatitude: propertyCoords?.latitude,
      propertyLongitude: propertyCoords?.longitude,
    },
    damageAreas: [...DEFAULT_DAMAGE_AREAS],
    currentCaptureIndex: 0,
    startedAt: new Date().toISOString(),
    syncStatus: 'pending',
  }
}

/**
 * Calculate distance between two coordinates in meters
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3 // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Get next step in the wizard
 */
export function getNextStep(state: InspectionState): InspectionStep | null {
  const selectedAreas = state.damageAreas.filter(a => a.selected)

  switch (state.currentStep) {
    case 'location':
      return 'overview'
    case 'overview':
      return 'checklist'
    case 'checklist':
      // Only proceed if at least one area selected
      return selectedAreas.length > 0 ? 'capture' : null
    case 'capture':
      // Check if all selected areas have at least one photo
      const allCaptured = selectedAreas.every(a => a.photos.length > 0)
      return allCaptured ? 'summary' : null
    case 'summary':
      return null
    default:
      return null
  }
}

/**
 * Get previous step in the wizard
 */
export function getPreviousStep(state: InspectionState): InspectionStep | null {
  switch (state.currentStep) {
    case 'location':
      return null
    case 'overview':
      return 'location'
    case 'checklist':
      return 'overview'
    case 'capture':
      return 'checklist'
    case 'summary':
      return 'capture'
    default:
      return null
  }
}

/**
 * Calculate inspection progress (0-100)
 */
export function calculateProgress(state: InspectionState): number {
  const steps: InspectionStep[] = ['location', 'overview', 'checklist', 'capture', 'summary']
  const currentIndex = steps.indexOf(state.currentStep)

  if (currentIndex === -1) return 0

  // Base progress from completed steps
  let progress = (currentIndex / steps.length) * 100

  // Add partial progress for capture step
  if (state.currentStep === 'capture') {
    const selectedAreas = state.damageAreas.filter(a => a.selected)
    const capturedAreas = selectedAreas.filter(a => a.photos.length > 0)
    if (selectedAreas.length > 0) {
      const captureProgress = (capturedAreas.length / selectedAreas.length) * 20
      progress += captureProgress
    }
  }

  return Math.min(progress, 100)
}

/**
 * Get inspection summary for display
 */
export function getInspectionSummary(state: InspectionState) {
  const selectedAreas = state.damageAreas.filter(a => a.selected)
  const totalPhotos = selectedAreas.reduce((sum, a) => sum + a.photos.length, 0)
  const hasOverview = !!state.overviewPhoto

  return {
    locationVerified: state.location.verified,
    hasOverviewPhoto: hasOverview,
    selectedAreaCount: selectedAreas.length,
    totalPhotoCount: totalPhotos + (hasOverview ? 1 : 0),
    areas: selectedAreas.map(a => ({
      type: a.type,
      label: a.label,
      photoCount: a.photos.length,
      hasSeverePhoto: a.photos.some(p => p.severity === 'severe'),
    })),
    startedAt: state.startedAt,
    readyToSubmit: state.location.verified && hasOverview && totalPhotos > 0,
  }
}
