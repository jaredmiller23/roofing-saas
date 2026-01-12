/**
 * Xactimate Damage Mapping
 *
 * Maps inspection damage findings to Xactimate line item codes.
 * This enables generation of detailed punch lists for XM8 entry.
 */

/**
 * Xactimate line item structure
 */
export interface XactLineItem {
  code: string
  description: string
  category: string
  unit: 'SQ' | 'LF' | 'SF' | 'EA' | 'HR'
  notes?: string
  requires_quantity: boolean
}

/**
 * Punch list item with quantity and calculation source
 */
export interface PunchListItem extends XactLineItem {
  quantity?: number
  quantity_source?: string
  calculated_from?: string
  special_instructions?: string
}

/**
 * Damage type to Xactimate line item mapping
 *
 * Categories based on standard roofing claim scope:
 * - Tear-off and disposal
 * - Underlayment and deck prep
 * - Shingle installation
 * - Accessories (flashing, vents, boots, drip edge)
 * - Ridge/hip cap
 * - Gutters and downspouts
 */
export const DAMAGE_TO_XACT_MAPPING: Record<string, XactLineItem[]> = {
  // === FULL ROOF REPLACEMENT ===
  full_replacement: [
    { code: 'R RFG', description: 'Remove composition shingles', category: 'Tear-off', unit: 'SQ', requires_quantity: true },
    { code: 'R DMP', description: 'Dump fees - roofing debris', category: 'Disposal', unit: 'SQ', requires_quantity: true },
    { code: 'R FELT', description: '15# felt underlayment', category: 'Underlayment', unit: 'SQ', requires_quantity: true },
    { code: 'R SHG', description: 'Composition shingles - architectural', category: 'Shingles', unit: 'SQ', requires_quantity: true },
    { code: 'R STR', description: 'Starter strip shingles', category: 'Accessories', unit: 'LF', requires_quantity: true },
    { code: 'R RDG', description: 'Ridge cap shingles', category: 'Ridge', unit: 'LF', requires_quantity: true },
    { code: 'R DRP', description: 'Drip edge - aluminum', category: 'Accessories', unit: 'LF', requires_quantity: true },
  ],

  // === SHINGLE DAMAGE ===
  shingles: [
    { code: 'R RFG', description: 'Remove composition shingles', category: 'Tear-off', unit: 'SQ', requires_quantity: true },
    { code: 'R DMP', description: 'Dump fees - roofing debris', category: 'Disposal', unit: 'SQ', requires_quantity: true },
    { code: 'R FELT', description: '15# felt underlayment', category: 'Underlayment', unit: 'SQ', requires_quantity: true },
    { code: 'R SHG', description: 'Composition shingles - architectural', category: 'Shingles', unit: 'SQ', requires_quantity: true },
  ],

  shingle_damage: [
    { code: 'R RFG', description: 'Remove composition shingles', category: 'Tear-off', unit: 'SQ', requires_quantity: true },
    { code: 'R DMP', description: 'Dump fees - roofing debris', category: 'Disposal', unit: 'SQ', requires_quantity: true },
    { code: 'R FELT', description: '15# felt underlayment', category: 'Underlayment', unit: 'SQ', requires_quantity: true },
    { code: 'R SHG', description: 'Composition shingles - architectural', category: 'Shingles', unit: 'SQ', requires_quantity: true },
  ],

  hail_damage: [
    { code: 'R RFG', description: 'Remove composition shingles', category: 'Tear-off', unit: 'SQ', requires_quantity: true, notes: 'Hail impact damage' },
    { code: 'R DMP', description: 'Dump fees - roofing debris', category: 'Disposal', unit: 'SQ', requires_quantity: true },
    { code: 'R FELT', description: '15# felt underlayment', category: 'Underlayment', unit: 'SQ', requires_quantity: true },
    { code: 'R SHG', description: 'Composition shingles - architectural', category: 'Shingles', unit: 'SQ', requires_quantity: true },
    { code: 'R ICE', description: 'Ice and water shield - valleys/eaves', category: 'Underlayment', unit: 'SQ', requires_quantity: true, notes: 'If code requires replacement' },
  ],

  wind_damage: [
    { code: 'R RFG', description: 'Remove composition shingles', category: 'Tear-off', unit: 'SQ', requires_quantity: true, notes: 'Wind lifted/missing shingles' },
    { code: 'R DMP', description: 'Dump fees - roofing debris', category: 'Disposal', unit: 'SQ', requires_quantity: true },
    { code: 'R SHG', description: 'Composition shingles - architectural', category: 'Shingles', unit: 'SQ', requires_quantity: true },
  ],

  // === RIDGE AND HIP ===
  ridge_cap: [
    { code: 'R RDG', description: 'Ridge cap shingles', category: 'Ridge', unit: 'LF', requires_quantity: true },
  ],

  ridge_damage: [
    { code: 'R RDG', description: 'Ridge cap shingles', category: 'Ridge', unit: 'LF', requires_quantity: true },
  ],

  hip_cap: [
    { code: 'R HIP', description: 'Hip cap shingles', category: 'Ridge', unit: 'LF', requires_quantity: true },
  ],

  // === FLASHING ===
  flashing: [
    { code: 'R FLS', description: 'Step flashing - aluminum', category: 'Flashing', unit: 'LF', requires_quantity: true },
    { code: 'R VFL', description: 'Valley flashing - aluminum', category: 'Flashing', unit: 'LF', requires_quantity: true },
  ],

  step_flashing: [
    { code: 'R FLS', description: 'Step flashing - aluminum', category: 'Flashing', unit: 'LF', requires_quantity: true },
  ],

  valley_flashing: [
    { code: 'R VFL', description: 'Valley flashing - aluminum', category: 'Flashing', unit: 'LF', requires_quantity: true },
  ],

  counter_flashing: [
    { code: 'R CFL', description: 'Counter flashing', category: 'Flashing', unit: 'LF', requires_quantity: true },
  ],

  // === PENETRATIONS ===
  pipe_boots: [
    { code: 'R PLM', description: 'Pipe jack/boot - lead or rubber', category: 'Penetrations', unit: 'EA', requires_quantity: true },
  ],

  pipe_boot: [
    { code: 'R PLM', description: 'Pipe jack/boot - lead or rubber', category: 'Penetrations', unit: 'EA', requires_quantity: true },
  ],

  vents: [
    { code: 'R VNT', description: 'Roof vent - static', category: 'Penetrations', unit: 'EA', requires_quantity: true },
  ],

  roof_vent: [
    { code: 'R VNT', description: 'Roof vent - static', category: 'Penetrations', unit: 'EA', requires_quantity: true },
  ],

  turbine_vent: [
    { code: 'R TVN', description: 'Turbine vent', category: 'Penetrations', unit: 'EA', requires_quantity: true },
  ],

  power_vent: [
    { code: 'R PVN', description: 'Power vent - roof mounted', category: 'Penetrations', unit: 'EA', requires_quantity: true },
  ],

  skylight: [
    { code: 'R SKY', description: 'Skylight - re-flash/reseal', category: 'Penetrations', unit: 'EA', requires_quantity: true },
  ],

  // === UNDERLAYMENT ===
  underlayment: [
    { code: 'R FELT', description: '15# felt underlayment', category: 'Underlayment', unit: 'SQ', requires_quantity: true },
  ],

  synthetic_underlayment: [
    { code: 'R SYN', description: 'Synthetic underlayment', category: 'Underlayment', unit: 'SQ', requires_quantity: true },
  ],

  ice_barrier: [
    { code: 'R ICE', description: 'Ice and water shield', category: 'Underlayment', unit: 'SQ', requires_quantity: true },
  ],

  ice_dam: [
    { code: 'R ICE', description: 'Ice and water shield', category: 'Underlayment', unit: 'SQ', requires_quantity: true, notes: 'Per IRC R905.2.7 at eaves' },
  ],

  // === EDGE METAL ===
  drip_edge: [
    { code: 'R DRP', description: 'Drip edge - aluminum', category: 'Accessories', unit: 'LF', requires_quantity: true },
  ],

  starter_strip: [
    { code: 'R STR', description: 'Starter strip shingles', category: 'Accessories', unit: 'LF', requires_quantity: true },
  ],

  // === GUTTERS ===
  gutters: [
    { code: 'R GTR', description: 'Aluminum gutter - 5"', category: 'Gutters', unit: 'LF', requires_quantity: true },
    { code: 'R DWN', description: 'Aluminum downspout', category: 'Gutters', unit: 'LF', requires_quantity: true },
  ],

  gutter_damage: [
    { code: 'R GTR', description: 'Aluminum gutter - 5"', category: 'Gutters', unit: 'LF', requires_quantity: true },
  ],

  downspout: [
    { code: 'R DWN', description: 'Aluminum downspout', category: 'Gutters', unit: 'LF', requires_quantity: true },
  ],

  gutter_guard: [
    { code: 'R GGD', description: 'Gutter guard/leaf screen', category: 'Gutters', unit: 'LF', requires_quantity: true },
  ],

  // === DECKING ===
  decking: [
    { code: 'R PLY', description: 'Plywood sheathing - 7/16" OSB', category: 'Decking', unit: 'SF', requires_quantity: true },
  ],

  deck_repair: [
    { code: 'R PLY', description: 'Plywood sheathing - 7/16" OSB', category: 'Decking', unit: 'SF', requires_quantity: true },
  ],

  // === FASCIA/SOFFIT ===
  fascia: [
    { code: 'R FSC', description: 'Fascia board - 1x6', category: 'Fascia/Soffit', unit: 'LF', requires_quantity: true },
  ],

  soffit: [
    { code: 'R SFT', description: 'Soffit - aluminum', category: 'Fascia/Soffit', unit: 'SF', requires_quantity: true },
  ],

  // === CHIMNEY ===
  chimney: [
    { code: 'R CHM', description: 'Chimney flashing - complete', category: 'Flashing', unit: 'EA', requires_quantity: true },
    { code: 'R CCP', description: 'Chimney cap', category: 'Penetrations', unit: 'EA', requires_quantity: true },
  ],

  chimney_flashing: [
    { code: 'R CHM', description: 'Chimney flashing - complete', category: 'Flashing', unit: 'EA', requires_quantity: true },
  ],

  // === SATELLITE/ANTENNA ===
  satellite_dish: [
    { code: 'R SAT', description: 'Remove and reset satellite dish', category: 'Penetrations', unit: 'EA', requires_quantity: true },
  ],

  antenna: [
    { code: 'R ANT', description: 'Remove and reset antenna', category: 'Penetrations', unit: 'EA', requires_quantity: true },
  ],

  // === LABOR ===
  steep_charge: [
    { code: 'R STP', description: 'Steep roof charge (7:12+)', category: 'Labor', unit: 'SQ', requires_quantity: true },
  ],

  high_roof: [
    { code: 'R HGH', description: 'High roof charge (2+ stories)', category: 'Labor', unit: 'SQ', requires_quantity: true },
  ],

  // === OVERHEAD AND PROFIT ===
  overhead_profit: [
    { code: 'O&P', description: 'Overhead and Profit', category: 'General', unit: 'EA', requires_quantity: false, notes: 'Industry standard 10% + 10%' },
  ],
}

/**
 * Common damage type aliases for flexible matching
 */
export const DAMAGE_TYPE_ALIASES: Record<string, string> = {
  // Shingle variations
  'asphalt_shingles': 'shingles',
  'composition_shingles': 'shingles',
  'architectural_shingles': 'shingles',
  '3tab_shingles': 'shingles',
  'shingle_hail': 'hail_damage',
  'shingle_wind': 'wind_damage',

  // Ridge variations
  'ridge': 'ridge_cap',
  'hip': 'hip_cap',
  'ridge_and_hip': 'ridge_cap',

  // Flashing variations
  'step': 'step_flashing',
  'valley': 'valley_flashing',
  'counter': 'counter_flashing',

  // Penetration variations
  'pipe': 'pipe_boots',
  'vent': 'vents',
  'boot': 'pipe_boots',
  'plumbing_boot': 'pipe_boots',

  // Underlayment variations
  'felt': 'underlayment',
  'ice_and_water': 'ice_barrier',

  // Edge variations
  'drip': 'drip_edge',
  'starter': 'starter_strip',
  'eave_starter': 'starter_strip',

  // Gutter variations
  'gutter': 'gutters',
  'downspouts': 'downspout',

  // Deck variations
  'plywood': 'decking',
  'osb': 'decking',
  'sheathing': 'decking',
}

/**
 * Get Xactimate line items for a damage type
 */
export function getLineItemsForDamage(damageType: string): XactLineItem[] {
  // Normalize the damage type
  const normalized = damageType.toLowerCase().replace(/[^a-z_]/g, '_')

  // Check direct mapping
  if (DAMAGE_TO_XACT_MAPPING[normalized]) {
    return DAMAGE_TO_XACT_MAPPING[normalized]
  }

  // Check aliases
  const aliased = DAMAGE_TYPE_ALIASES[normalized]
  if (aliased && DAMAGE_TO_XACT_MAPPING[aliased]) {
    return DAMAGE_TO_XACT_MAPPING[aliased]
  }

  // Return empty array if no mapping found
  return []
}

/**
 * Get all unique categories in the mapping
 */
export function getCategories(): string[] {
  const categories = new Set<string>()
  for (const items of Object.values(DAMAGE_TO_XACT_MAPPING)) {
    for (const item of items) {
      categories.add(item.category)
    }
  }
  return Array.from(categories).sort()
}
