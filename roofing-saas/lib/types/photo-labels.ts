/**
 * Photo Label Types
 *
 * Types for categorizing and labeling photos during roofing inspections.
 * These labels help organize photos and provide context for insurance claims.
 */

/**
 * Photo type indicates when/why the photo was taken
 */
export type PhotoType = 'before' | 'during' | 'after' | 'detail' | 'overview' | 'measurement'

/**
 * Damage cause indicates what caused the damage
 */
export type DamageCause = 'hail' | 'wind' | 'wear' | 'water' | 'impact' | 'other'

/**
 * Severity level for damage
 */
export type SeverityLevel = 'minor' | 'moderate' | 'severe'

/**
 * Roof section (where on the roof the photo was taken)
 * Matches existing DamageType from claims system
 */
export type RoofSection =
  | 'overview'
  | 'shingles'
  | 'ridge_cap'
  | 'flashing'
  | 'gutters'
  | 'soffit'
  | 'fascia'
  | 'vents'
  | 'skylights'
  | 'chimney'
  | 'siding'
  | 'windows'
  | 'other'

/**
 * Complete photo labels interface
 */
export interface PhotoLabels {
  photoType?: PhotoType
  damageCause?: DamageCause
  roofSection?: RoofSection
  severity?: SeverityLevel
  customLabel?: string
  notes?: string
}

/**
 * Photo type options with display info
 */
export const PHOTO_TYPE_OPTIONS: Array<{
  value: PhotoType
  label: string
  description: string
}> = [
  { value: 'before', label: 'Before', description: 'Photo taken before work/repair' },
  { value: 'during', label: 'During', description: 'Photo taken during work' },
  { value: 'after', label: 'After', description: 'Photo taken after completion' },
  { value: 'detail', label: 'Detail', description: 'Close-up of specific damage or feature' },
  { value: 'overview', label: 'Overview', description: 'Wide shot showing general area' },
  { value: 'measurement', label: 'Measurement', description: 'Photo with measurement reference' },
]

/**
 * Damage cause options with display info
 */
export const DAMAGE_CAUSE_OPTIONS: Array<{
  value: DamageCause
  label: string
  description: string
}> = [
  { value: 'hail', label: 'Hail', description: 'Damage from hail impact' },
  { value: 'wind', label: 'Wind', description: 'Damage from high winds' },
  { value: 'wear', label: 'Wear & Tear', description: 'Normal aging and deterioration' },
  { value: 'water', label: 'Water', description: 'Water damage or leaks' },
  { value: 'impact', label: 'Impact', description: 'Damage from falling debris or objects' },
  { value: 'other', label: 'Other', description: 'Other cause of damage' },
]

/**
 * Severity options with display info and colors
 */
export const SEVERITY_OPTIONS: Array<{
  value: SeverityLevel
  label: string
  color: string
}> = [
  { value: 'minor', label: 'Minor', color: 'yellow' },
  { value: 'moderate', label: 'Moderate', color: 'orange' },
  { value: 'severe', label: 'Severe', color: 'red' },
]

/**
 * Roof section options (matches existing DAMAGE_TYPES)
 */
export const ROOF_SECTION_OPTIONS: Array<{
  value: RoofSection
  label: string
}> = [
  { value: 'overview', label: 'Overview Shot' },
  { value: 'shingles', label: 'Shingles' },
  { value: 'ridge_cap', label: 'Ridge Cap' },
  { value: 'flashing', label: 'Flashing' },
  { value: 'gutters', label: 'Gutters' },
  { value: 'soffit', label: 'Soffit' },
  { value: 'fascia', label: 'Fascia' },
  { value: 'vents', label: 'Vents' },
  { value: 'skylights', label: 'Skylights' },
  { value: 'chimney', label: 'Chimney' },
  { value: 'siding', label: 'Siding' },
  { value: 'windows', label: 'Windows' },
  { value: 'other', label: 'Other' },
]

/**
 * Get display label for a photo type
 */
export function getPhotoTypeLabel(type: PhotoType): string {
  return PHOTO_TYPE_OPTIONS.find(o => o.value === type)?.label || type
}

/**
 * Get display label for a damage cause
 */
export function getDamageCauseLabel(cause: DamageCause): string {
  return DAMAGE_CAUSE_OPTIONS.find(o => o.value === cause)?.label || cause
}

/**
 * Get display label for a roof section
 */
export function getRoofSectionLabel(section: RoofSection): string {
  return ROOF_SECTION_OPTIONS.find(o => o.value === section)?.label || section
}
