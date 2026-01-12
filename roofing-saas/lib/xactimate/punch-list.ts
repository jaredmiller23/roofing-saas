/**
 * Xactimate Punch List Generator
 *
 * Generates detailed, human-readable punch lists from inspection data
 * for manual entry into Xactimate (XM8).
 */

import {
  getLineItemsForDamage,
  type PunchListItem,
  type XactLineItem,
} from './damage-mapping'

/**
 * Inspection data structure for punch list generation
 */
export interface InspectionData {
  // Roof measurements
  roof_squares?: number
  ridge_linear_feet?: number
  hip_linear_feet?: number
  valley_linear_feet?: number
  eave_linear_feet?: number
  rake_linear_feet?: number
  drip_edge_linear_feet?: number

  // Penetrations
  pipe_boot_count?: number
  vent_count?: number
  skylight_count?: number
  chimney_count?: number
  satellite_count?: number

  // Gutters
  gutter_linear_feet?: number
  downspout_count?: number
  downspout_linear_feet?: number

  // Damage areas
  affected_areas: string[]
  damage_types?: string[]

  // Test square data
  test_square_count?: number
  hail_hits_per_square?: number

  // Roof characteristics
  roof_pitch?: string
  stories?: number
  has_steep_sections?: boolean

  // Deck damage
  deck_repair_square_feet?: number

  // Notes
  notes?: string
}

/**
 * Punch list generation options
 */
export interface PunchListOptions {
  include_overhead_profit?: boolean
  include_steep_charge?: boolean
  include_high_roof_charge?: boolean
  group_by_category?: boolean
}

/**
 * Generated punch list result
 */
export interface PunchListResult {
  items: PunchListItem[]
  by_category: Record<string, PunchListItem[]>
  total_items: number
  notes: string[]
  generated_at: string
}

/**
 * Generate a comprehensive punch list from inspection data
 */
export function generatePunchList(
  inspection: InspectionData,
  options: PunchListOptions = {}
): PunchListResult {
  const {
    include_overhead_profit = true,
    include_steep_charge = true,
    include_high_roof_charge = true,
  } = options

  const items: PunchListItem[] = []
  const notes: string[] = []
  const seenCodes = new Set<string>()

  // Helper to add items without duplicates
  const addItem = (item: XactLineItem, quantity?: number, source?: string, instructions?: string) => {
    if (seenCodes.has(item.code)) return
    seenCodes.add(item.code)

    items.push({
      ...item,
      quantity,
      quantity_source: source,
      special_instructions: instructions || item.notes,
    })
  }

  // Process each affected area
  for (const area of inspection.affected_areas) {
    const lineItems = getLineItemsForDamage(area)

    for (const item of lineItems) {
      // Calculate quantity based on item type
      let quantity: number | undefined
      let source: string | undefined

      switch (item.unit) {
        case 'SQ':
          if (inspection.roof_squares) {
            quantity = inspection.roof_squares
            source = 'Roof measurement'
          }
          break

        case 'LF':
          if (item.category === 'Ridge' && inspection.ridge_linear_feet) {
            quantity = inspection.ridge_linear_feet + (inspection.hip_linear_feet || 0)
            source = 'Ridge + hip measurement'
          } else if (item.category === 'Flashing' && item.code === 'R VFL' && inspection.valley_linear_feet) {
            quantity = inspection.valley_linear_feet
            source = 'Valley measurement'
          } else if (item.category === 'Accessories' && item.code === 'R DRP') {
            quantity = inspection.drip_edge_linear_feet ||
              ((inspection.eave_linear_feet || 0) + (inspection.rake_linear_feet || 0))
            source = 'Eave + rake perimeter'
          } else if (item.category === 'Accessories' && item.code === 'R STR') {
            quantity = inspection.eave_linear_feet || inspection.drip_edge_linear_feet
            source = 'Eave length'
          } else if (item.category === 'Gutters' && inspection.gutter_linear_feet) {
            quantity = inspection.gutter_linear_feet
            source = 'Gutter measurement'
          }
          break

        case 'EA':
          if (item.code === 'R PLM' && inspection.pipe_boot_count) {
            quantity = inspection.pipe_boot_count
            source = 'Pipe boot count from inspection'
          } else if (item.code === 'R VNT' && inspection.vent_count) {
            quantity = inspection.vent_count
            source = 'Vent count from inspection'
          } else if (item.code === 'R SKY' && inspection.skylight_count) {
            quantity = inspection.skylight_count
            source = 'Skylight count from inspection'
          } else if (item.code === 'R CHM' && inspection.chimney_count) {
            quantity = inspection.chimney_count
            source = 'Chimney count from inspection'
          } else if (item.code === 'R SAT' && inspection.satellite_count) {
            quantity = inspection.satellite_count
            source = 'Satellite dish count from inspection'
          }
          break

        case 'SF':
          if (item.category === 'Decking' && inspection.deck_repair_square_feet) {
            quantity = inspection.deck_repair_square_feet
            source = 'Deck repair measurement'
          }
          break
      }

      addItem(item, quantity, source)
    }
  }

  // Add steep roof charge if applicable
  if (include_steep_charge && (inspection.has_steep_sections || isPitchSteep(inspection.roof_pitch))) {
    addItem(
      { code: 'R STP', description: 'Steep roof charge (7:12+)', category: 'Labor', unit: 'SQ', requires_quantity: true },
      inspection.roof_squares,
      'Roof pitch >= 7:12'
    )
    notes.push('Steep roof charge applied - pitch is 7:12 or greater')
  }

  // Add high roof charge if applicable
  if (include_high_roof_charge && inspection.stories && inspection.stories >= 2) {
    addItem(
      { code: 'R HGH', description: 'High roof charge (2+ stories)', category: 'Labor', unit: 'SQ', requires_quantity: true },
      inspection.roof_squares,
      `${inspection.stories} story building`
    )
    notes.push(`High roof charge applied - ${inspection.stories} story building`)
  }

  // Add overhead and profit if requested
  if (include_overhead_profit) {
    addItem(
      { code: 'O&P', description: 'Overhead and Profit', category: 'General', unit: 'EA', requires_quantity: false },
      undefined,
      undefined,
      'Industry standard 10% overhead + 10% profit'
    )
  }

  // Add hail damage note if applicable
  if (inspection.hail_hits_per_square) {
    notes.push(
      `Test square: ${inspection.hail_hits_per_square} hail hits per square. ` +
      `Industry threshold for replacement is typically 8+ hits.`
    )
  }

  // Sort items by category
  items.sort((a, b) => {
    const categoryOrder = [
      'Tear-off',
      'Disposal',
      'Decking',
      'Underlayment',
      'Shingles',
      'Ridge',
      'Accessories',
      'Flashing',
      'Penetrations',
      'Gutters',
      'Fascia/Soffit',
      'Labor',
      'General',
    ]
    const aIndex = categoryOrder.indexOf(a.category)
    const bIndex = categoryOrder.indexOf(b.category)
    return aIndex - bIndex
  })

  // Group by category
  const byCategory: Record<string, PunchListItem[]> = {}
  for (const item of items) {
    if (!byCategory[item.category]) {
      byCategory[item.category] = []
    }
    byCategory[item.category].push(item)
  }

  return {
    items,
    by_category: byCategory,
    total_items: items.length,
    notes,
    generated_at: new Date().toISOString(),
  }
}

/**
 * Format punch list as text for display or export
 */
export function formatPunchListAsText(result: PunchListResult, propertyAddress?: string): string {
  const lines: string[] = []

  lines.push('═══════════════════════════════════════════════════════════════')
  lines.push('          XACTIMATE PUNCH LIST - ROOFING SCOPE')
  lines.push('═══════════════════════════════════════════════════════════════')

  if (propertyAddress) {
    lines.push(`Property: ${propertyAddress}`)
  }
  lines.push(`Generated: ${new Date(result.generated_at).toLocaleString()}`)
  lines.push('')

  // Output by category
  for (const [category, items] of Object.entries(result.by_category)) {
    lines.push(`─── ${category.toUpperCase()} ${'─'.repeat(50 - category.length)}`)
    lines.push('')

    for (const item of items) {
      const quantityStr = item.quantity !== undefined
        ? `${item.quantity} ${item.unit}`
        : `___ ${item.unit}`

      lines.push(`☐ ${item.code.padEnd(8)} ${item.description}`)
      lines.push(`    Qty: ${quantityStr}`)

      if (item.quantity_source) {
        lines.push(`    Source: ${item.quantity_source}`)
      }
      if (item.special_instructions) {
        lines.push(`    Note: ${item.special_instructions}`)
      }
      lines.push('')
    }
  }

  // Notes section
  if (result.notes.length > 0) {
    lines.push('─── NOTES ' + '─'.repeat(45))
    lines.push('')
    for (const note of result.notes) {
      lines.push(`• ${note}`)
    }
    lines.push('')
  }

  lines.push('═══════════════════════════════════════════════════════════════')
  lines.push(`Total Line Items: ${result.total_items}`)
  lines.push('')
  lines.push('Instructions: Enter each line item into Xactimate (XM8).')
  lines.push('Fill in quantities marked with "___" from actual measurements.')
  lines.push('═══════════════════════════════════════════════════════════════')

  return lines.join('\n')
}

/**
 * Check if a roof pitch is considered steep (7:12 or greater)
 */
function isPitchSteep(pitch?: string): boolean {
  if (!pitch) return false

  // Parse pitch like "7:12" or "7/12"
  const match = pitch.match(/(\d+)[:/](\d+)/)
  if (match) {
    const rise = parseInt(match[1], 10)
    const run = parseInt(match[2], 10)
    return rise >= 7 && run === 12
  }

  return false
}
