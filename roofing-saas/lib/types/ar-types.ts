/**
 * AR (Augmented Reality) Types
 *
 * TypeScript interfaces for AR assessment functionality to replace `any` types
 * in AR-related components.
 */

/**
 * AR Session and Camera Types
 */
export interface ARSession {
  id: string;
  project_id: string;
  status: 'initializing' | 'active' | 'paused' | 'completed' | 'failed';
  start_time: number;
  end_time?: number;
  camera_config: ARCameraConfig;
  measurements: ARMeasurement[];
  markers: DamageMarker[];
  metadata?: Record<string, unknown>;
}

export interface ARCameraConfig {
  resolution: {
    width: number;
    height: number;
  };
  field_of_view: number;
  focal_length: number;
  position: Vector3D;
  orientation: Quaternion;
  calibration_data?: CameraCalibration;
}

export interface CameraCalibration {
  intrinsic_matrix: number[][];
  distortion_coefficients: number[];
  calibrated_at: string;
  accuracy_score: number;
}

/**
 * 3D Math Types
 */
export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Transform {
  position: Vector3D;
  rotation: Quaternion;
  scale: Vector3D;
}

/**
 * AR Measurement Types
 */
export interface ARMeasurement {
  id: string;
  type: 'distance' | 'area' | 'angle' | 'volume';
  label: string;
  value: number;
  unit: string;
  accuracy: number;
  points: ARPoint[];
  metadata: MeasurementMetadata;
  created_at: number;
}

export interface ARPoint {
  id: string;
  world_position: Vector3D;
  screen_position: {
    x: number;
    y: number;
  };
  confidence: number;
  is_anchor: boolean;
}

export interface MeasurementMetadata {
  surface_type?: string;
  material?: string;
  notes?: string;
  photo_references?: string[];
  validation_status?: 'pending' | 'approved' | 'rejected';
}

/**
 * Damage Detection and Markers
 */
export interface DamageMarker {
  id: string;
  type: DamageType;
  severity: DamageSeverity;
  position: Vector3D;
  screen_coordinates: {
    x: number;
    y: number;
  };
  description: string;
  confidence_score: number;
  bounding_box?: BoundingBox;
  photos: string[];
  metadata: DamageMetadata;
  created_at: number;
}

export type DamageType =
  | 'missing_shingle'
  | 'damaged_shingle'
  | 'gutter_damage'
  | 'flashing_issue'
  | 'chimney_damage'
  | 'vent_damage'
  | 'structural_damage'
  | 'debris'
  | 'other';

export type DamageSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface BoundingBox {
  top_left: Vector3D;
  bottom_right: Vector3D;
  width: number;
  height: number;
}

export interface DamageMetadata {
  repair_priority: number;
  estimated_cost?: number;
  repair_complexity: 'simple' | 'moderate' | 'complex';
  requires_specialist?: boolean;
  weather_exposure: 'low' | 'medium' | 'high';
  notes?: string;
}

/**
 * AR Viewport and Interaction Types
 */
export interface ARViewportState {
  is_tracking: boolean;
  tracking_quality: 'poor' | 'limited' | 'normal' | 'good';
  plane_detection: PlaneDetection[];
  lighting_estimate: LightingEstimate;
  camera_access: boolean;
  ar_support: boolean;
  error?: string;
}

export interface PlaneDetection {
  id: string;
  type: 'horizontal' | 'vertical';
  center: Vector3D;
  normal: Vector3D;
  extent: {
    width: number;
    height: number;
  };
  confidence: number;
}

export interface LightingEstimate {
  ambient_intensity: number;
  ambient_color: {
    r: number;
    g: number;
    b: number;
  };
  directional_intensity: number;
  directional_direction: Vector3D;
}

/**
 * AR Tool and Interaction Types
 */
export interface ARTool {
  id: string;
  name: string;
  type: ARToolType;
  icon: string;
  is_active: boolean;
  config: ARToolConfig;
}

export type ARToolType =
  | 'measurement'
  | 'marker'
  | 'annotation'
  | 'photo'
  | 'selection';

export interface ARToolConfig {
  snap_to_surface?: boolean;
  auto_measure?: boolean;
  measurement_units?: string;
  marker_size?: number;
  precision?: number;
  [key: string]: unknown;
}

export interface ARInteraction {
  type: 'tap' | 'drag' | 'pinch' | 'rotate';
  position: {
    x: number;
    y: number;
  };
  timestamp: number;
  target?: string;
  data?: Record<string, unknown>;
}

/**
 * AR Export and Reporting Types
 */
export interface ARReport {
  id: string;
  session_id: string;
  project_id: string;
  generated_at: number;
  measurements_summary: MeasurementSummary;
  damage_summary: DamageSummary;
  photos: ARPhoto[];
  export_formats: string[];
  metadata?: Record<string, unknown>;
}

export interface MeasurementSummary {
  total_measurements: number;
  total_area: number;
  total_perimeter: number;
  measurements_by_type: Record<string, number>;
  accuracy_stats: AccuracyStats;
}

export interface DamageSummary {
  total_markers: number;
  damage_by_type: Record<DamageType, number>;
  damage_by_severity: Record<DamageSeverity, number>;
  estimated_repair_cost: number;
  priority_items: DamageMarker[];
}

export interface AccuracyStats {
  average_accuracy: number;
  min_accuracy: number;
  max_accuracy: number;
  measurements_below_threshold: number;
}

export interface ARPhoto {
  id: string;
  filename: string;
  url: string;
  timestamp: number;
  camera_pose: Transform;
  associated_measurements: string[];
  associated_markers: string[];
  metadata?: Record<string, unknown>;
}