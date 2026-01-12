/**
 * Reference Data Query Utilities
 *
 * Functions to query building codes, manufacturer specs, policy provisions,
 * and discontinued shingles from the NAS database.
 */

import { createClient } from '@/lib/supabase/client'
import type {
  BuildingCode,
  ManufacturerSpec,
  PolicyProvision,
  DiscontinuedShingle,
} from '@/lib/packet/types'

/**
 * Get applicable building codes for a jurisdiction and damage types
 */
export async function getApplicableCodes(params: {
  state: string
  county?: string
  city?: string
  damageTypes?: string[]
}): Promise<BuildingCode[]> {
  const supabase = createClient()
  const { state, county, city, damageTypes } = params

  let query = supabase
    .from('building_codes')
    .select('*')
    .eq('state_code', state)

  // Filter by jurisdiction level - state codes always apply
  // County and city codes are additive
  if (county) {
    query = query.or(`county.is.null,county.eq.${county}`)
  }
  if (city) {
    query = query.or(`city.is.null,city.eq.${city}`)
  }

  // Filter by damage types if provided (uses array overlap)
  if (damageTypes && damageTypes.length > 0) {
    query = query.overlaps('applies_to', damageTypes)
  }

  const { data, error } = await query.order('code_section')

  if (error) {
    console.error('Error fetching building codes:', error)
    return []
  }

  return data as BuildingCode[]
}

/**
 * Get manufacturer specifications by manufacturer and product category
 */
export async function getManufacturerSpecs(params: {
  manufacturer?: string
  productCategory?: string
  productName?: string
}): Promise<ManufacturerSpec[]> {
  const supabase = createClient()
  const { manufacturer, productCategory, productName } = params

  let query = supabase.from('manufacturer_specs').select('*')

  if (manufacturer) {
    query = query.ilike('manufacturer', `%${manufacturer}%`)
  }
  if (productCategory) {
    query = query.eq('product_category', productCategory)
  }
  if (productName) {
    query = query.ilike('product_name', `%${productName}%`)
  }

  const { data, error } = await query.order('manufacturer').order('product_category')

  if (error) {
    console.error('Error fetching manufacturer specs:', error)
    return []
  }

  return data as ManufacturerSpec[]
}

/**
 * Get policy provisions by carrier
 */
export async function getPolicyProvisions(params: {
  carrier?: string
  provisionType?: 'coverage' | 'exclusion' | 'condition' | 'definition'
  commonDispute?: string
}): Promise<PolicyProvision[]> {
  const supabase = createClient()
  const { carrier, provisionType, commonDispute } = params

  let query = supabase.from('policy_provisions').select('*')

  if (carrier) {
    query = query.ilike('carrier', `%${carrier}%`)
  }
  if (provisionType) {
    query = query.eq('provision_type', provisionType)
  }
  if (commonDispute) {
    query = query.contains('common_disputes', [commonDispute])
  }

  const { data, error } = await query.order('carrier').order('provision_type')

  if (error) {
    console.error('Error fetching policy provisions:', error)
    return []
  }

  return data as PolicyProvision[]
}

/**
 * Check if a shingle is discontinued
 */
export async function checkDiscontinuedShingle(params: {
  manufacturer?: string
  productLine?: string
  productName?: string
  color?: string
}): Promise<DiscontinuedShingle | null> {
  const supabase = createClient()
  const { manufacturer, productLine, productName, color } = params

  let query = supabase.from('discontinued_shingles').select('*')

  if (manufacturer) {
    query = query.ilike('manufacturer', `%${manufacturer}%`)
  }
  if (productLine) {
    query = query.ilike('product_line', `%${productLine}%`)
  }
  if (productName) {
    query = query.ilike('product_name', `%${productName}%`)
  }
  if (color) {
    query = query.ilike('color', `%${color}%`)
  }

  const { data, error } = await query.limit(1).maybeSingle()

  if (error) {
    console.error('Error checking discontinued shingle:', error)
    return null
  }

  return data as DiscontinuedShingle | null
}

/**
 * Get all discontinued shingles for a manufacturer
 */
export async function getDiscontinuedShingles(manufacturer?: string): Promise<DiscontinuedShingle[]> {
  const supabase = createClient()

  let query = supabase.from('discontinued_shingles').select('*')

  if (manufacturer) {
    query = query.ilike('manufacturer', `%${manufacturer}%`)
  }

  const { data, error } = await query.order('manufacturer').order('discontinued_date', { ascending: false })

  if (error) {
    console.error('Error fetching discontinued shingles:', error)
    return []
  }

  return data as DiscontinuedShingle[]
}

/**
 * Get roofing-specific building codes (convenience function)
 */
export async function getRoofingCodes(state: string, county?: string): Promise<BuildingCode[]> {
  return getApplicableCodes({
    state,
    county,
    damageTypes: [
      'shingles',
      'roof_covering',
      'asphalt_shingles',
      'underlayment',
      'flashing',
      'ice_barrier',
      'reroof',
      'replacement',
    ],
  })
}

/**
 * Get all manufacturer specs for major roofing manufacturers
 */
export async function getAllRoofingManufacturerSpecs(): Promise<ManufacturerSpec[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('manufacturer_specs')
    .select('*')
    .in('manufacturer', ['GAF', 'Owens Corning', 'CertainTeed', 'Tamko', 'Atlas'])
    .order('manufacturer')
    .order('product_category')

  if (error) {
    console.error('Error fetching roofing manufacturer specs:', error)
    return []
  }

  return data as ManufacturerSpec[]
}

/**
 * Get coverage provisions for common roofing claim disputes
 */
export async function getRoofingCoverageProvisions(carrier?: string): Promise<PolicyProvision[]> {
  const supabase = createClient()

  let query = supabase
    .from('policy_provisions')
    .select('*')
    .eq('provision_type', 'coverage')
    .overlaps('common_disputes', [
      'replacement_cost',
      'like_kind_quality',
      'repair_vs_replace',
      'matching',
      'code_upgrade',
      'ordinance_law',
    ])

  if (carrier) {
    query = query.ilike('carrier', `%${carrier}%`)
  }

  const { data, error } = await query.order('carrier')

  if (error) {
    console.error('Error fetching roofing coverage provisions:', error)
    return []
  }

  return data as PolicyProvision[]
}
