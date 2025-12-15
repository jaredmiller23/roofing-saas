/**
 * AR Damage Assessment Types
 * Core type definitions for augmented reality damage assessment system
 */

export interface ARMeasurement {
  id: string
  type: 'distance' | 'area' | 'angle' | 'pitch'
  value: number
  unit: 'ft' | 'sqft' | 'degrees' | 'in'
  points: ARPoint[]
  metadata?: {
    accuracy?: number
    confidence?: number
    timestamp: string
    deviceInfo?: string
  }
}

export interface ARPoint {
  x: number
  y: number
  z: number
  screenX?: number
  screenY?: number
}

export interface DamageMarker {
  id: string
  position: ARPoint
  type: DamageType
  severity: DamageSeverity
  description: string
  measurements: ARMeasurement[]
  photos?: string[]
  created_at: string
  updated_at?: string
}

export enum DamageType {
  MISSING_SHINGLES = 'missing_shingles',
  CRACKED_SHINGLES = 'cracked_shingles',
  GRANULE_LOSS = 'granule_loss',
  FLASHING_DAMAGE = 'flashing_damage',
  GUTTER_DAMAGE = 'gutter_damage',
  PENETRATION = 'penetration',
  STRUCTURAL = 'structural',
  DEBRIS = 'debris',
  HAIL_DAMAGE = 'hail_damage',
  WIND_DAMAGE = 'wind_damage',
  OTHER = 'other'
}

export enum DamageSeverity {
  MINOR = 'minor',
  MODERATE = 'moderate',
  SEVERE = 'severe',
  CRITICAL = 'critical'
}

export interface ARSession {
  id: string
  project_id: string
  created_at: string
  completed_at?: string
  status: 'active' | 'completed' | 'paused'
  measurements: ARMeasurement[]
  damage_markers: DamageMarker[]
  photos: ARPhoto[]
  roof_model?: RoofModel
}

export interface ARPhoto {
  id: string
  url: string
  thumbnail_url?: string
  timestamp: string
  camera_position: ARPoint
  camera_rotation: ARPoint
  annotations: DamageMarker[]
}

export interface RoofModel {
  vertices: ARPoint[]
  faces: number[][]
  texture_url?: string
  measurements: {
    total_area: number
    perimeter: number
    pitch: number
    height: number
  }
}

export interface ARCalibration {
  scale_factor: number
  ground_plane: {
    normal: ARPoint
    distance: number
  }
  reference_measurements?: ARMeasurement[]
}

export interface ARDevice {
  platform: 'android' | 'ios' | 'web'
  supports_ar: boolean
  supports_arcore?: boolean
  supports_arkit?: boolean
  supports_webxr?: boolean
  camera_permissions: boolean
  motion_permissions?: boolean
}

export interface ARState {
  session: ARSession | null
  device: ARDevice
  calibration: ARCalibration | null
  current_tool: ARTool
  is_recording: boolean
  is_measuring: boolean
  last_error?: string
}

export enum ARTool {
  NONE = 'none',
  DISTANCE = 'distance',
  AREA = 'area',
  ANGLE = 'angle',
  DAMAGE_MARKER = 'damage_marker',
  PHOTO = 'photo'
}

export interface MeasurementResult {
  measurement: ARMeasurement
  confidence: number
  accuracy_estimate: number
}

export interface DamageClassificationResult {
  type: DamageType
  severity: DamageSeverity
  confidence: number
  suggested_action: string
  estimated_cost_range: [number, number]
}

// Integration types for estimates
export interface AREstimateData {
  session_id: string
  total_damaged_area: number
  damage_summary: {
    [key in DamageType]?: {
      count: number
      total_area: number
      severity_breakdown: Record<DamageSeverity, number>
    }
  }
  recommended_line_items: EstimateLineItem[]
}

export interface EstimateLineItem {
  description: string
  quantity: number
  unit: string
  unit_price: number
  category: 'materials' | 'labor' | 'equipment' | 'permits' | 'other'
  source_measurements?: string[] // IDs of AR measurements
}
