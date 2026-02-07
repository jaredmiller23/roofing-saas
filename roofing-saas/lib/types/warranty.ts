/**
 * Warranty Types
 *
 * Type definitions for the warranties feature.
 * These types are defined manually because the warranties table
 * is not yet in the generated database.types.ts file.
 */

export type WarrantyType = 'manufacturer' | 'workmanship' | 'material' | 'extended'

export type WarrantyStatus = 'active' | 'expired' | 'claimed' | 'voided'

export interface Warranty {
  id: string
  tenant_id: string
  project_id: string
  warranty_type: WarrantyType
  provider: string | null
  duration_years: number
  start_date: string
  end_date: string
  terms: string | null
  document_url: string | null
  status: WarrantyStatus
  claim_date: string | null
  claim_notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  is_deleted: boolean
}

export interface WarrantyWithProject extends Warranty {
  project_name?: string
}

export const WARRANTY_TYPES: { value: WarrantyType; label: string }[] = [
  { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'workmanship', label: 'Workmanship' },
  { value: 'material', label: 'Material' },
  { value: 'extended', label: 'Extended' },
]

export const WARRANTY_STATUSES: { value: WarrantyStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'claimed', label: 'Claimed' },
  { value: 'voided', label: 'Voided' },
]
