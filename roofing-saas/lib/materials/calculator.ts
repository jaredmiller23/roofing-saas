/**
 * Material Calculator
 *
 * Automates material ordering calculations for roofing jobs.
 * Takes roof measurements and outputs a complete material list
 * with quantities rounded up (can't order partial bundles).
 *
 * Based on ASR's Build Operator workflow:
 * 1. Take measurement snippets
 * 2. Apply waste factor (x1.11)
 * 3. Calculate all materials
 * 4. Generate material order
 */

import type {
  RoofMeasurements,
  MaterialList,
  MaterialItem,
  MaterialConfig,
  CalculateMaterialsResponse,
} from './types'
import { DEFAULT_MATERIAL_CONFIG } from './types'
import type { QuoteLineItem } from '@/lib/types/quote-option'

/**
 * Calculate all materials needed for a roofing job
 *
 * @param measurements - Roof measurements from AR, manual entry, or report
 * @param customConfig - Optional custom configuration to override defaults
 * @returns Complete material list with quantities and notes
 */
export function calculateMaterials(
  measurements: RoofMeasurements,
  customConfig?: Partial<MaterialConfig>
): MaterialList {
  const config: MaterialConfig = {
    ...DEFAULT_MATERIAL_CONFIG,
    ...customConfig,
  }

  // Apply waste factor to get effective squares
  const effectiveSquares = measurements.totalSquares * config.wasteFactor

  // Calculate each material
  const shingles = calculateShingles(effectiveSquares, config)
  const starter = calculateStarter(measurements.rakesEavesLF, config)
  const iceWater = calculateIceWater(measurements.valleysPenetrationsLF, config)
  const ridgeCap = calculateRidgeCap(measurements.hipsRidgesLF, config)
  const ridgeVent = calculateRidgeVent(measurements.ridgeLF, config)
  const capNails = calculateCapNails(effectiveSquares, config)
  const coilNails = calculateCoilNails(effectiveSquares, config)

  // Optional materials
  const stepFlashing = measurements.stepFlashingLF
    ? calculateStepFlashing(measurements.stepFlashingLF, config)
    : undefined

  const pipeBoots = measurements.pipeBootCount
    ? calculatePipeBoots(measurements.pipeBootCount)
    : undefined

  return {
    shingles,
    starter,
    iceWater,
    ridgeCap,
    ridgeVent,
    capNails,
    coilNails,
    stepFlashing,
    pipeBoots,
    summary: {
      totalSquares: measurements.totalSquares,
      wasteFactorApplied: config.wasteFactor,
      effectiveSquares: roundUp(effectiveSquares, 2),
      calculatedAt: new Date().toISOString(),
    },
  }
}

/**
 * Generate quote line items from calculated materials
 *
 * @param measurements - Roof measurements
 * @param customConfig - Optional custom configuration
 * @param unitPrices - Optional unit prices for each material
 * @returns Array of quote line items ready to add to a proposal
 */
export function generateMaterialLineItems(
  measurements: RoofMeasurements,
  customConfig?: Partial<MaterialConfig>,
  unitPrices?: Partial<Record<string, number>>
): Omit<QuoteLineItem, 'id'>[] {
  const materials = calculateMaterials(measurements, customConfig)
  const lineItems: Omit<QuoteLineItem, 'id'>[] = []

  // Helper to create line item
  const addLineItem = (
    description: string,
    material: MaterialItem,
    category: QuoteLineItem['category'] = 'materials'
  ) => {
    const unitPrice = unitPrices?.[description.toLowerCase()] ?? material.unitPrice ?? 0
    lineItems.push({
      description,
      quantity: material.quantity,
      unit: material.unit,
      unit_price: unitPrice,
      total_price: material.quantity * unitPrice,
      category,
    })
  }

  // Core materials
  addLineItem('Architectural Shingles', materials.shingles)
  addLineItem('Starter Strip', materials.starter)
  addLineItem('Ice & Water Shield', materials.iceWater)
  addLineItem('Ridge Cap Shingles', materials.ridgeCap)
  addLineItem('Ridge Vent', materials.ridgeVent)
  addLineItem('Cap Nails', materials.capNails)
  addLineItem('Coil Nails', materials.coilNails)

  // Optional materials
  if (materials.stepFlashing) {
    addLineItem('Step Flashing', materials.stepFlashing)
  }

  if (materials.pipeBoots) {
    if (materials.pipeBoots.small.quantity > 0) {
      addLineItem('Pipe Boot 2"', materials.pipeBoots.small)
    }
    if (materials.pipeBoots.large.quantity > 0) {
      addLineItem('Pipe Boot 3"', materials.pipeBoots.large)
    }
  }

  if (materials.dripEdge) {
    addLineItem('Drip Edge', materials.dripEdge)
  }

  if (materials.underlayment) {
    addLineItem('Synthetic Underlayment', materials.underlayment)
  }

  return lineItems
}

/**
 * Full calculation response for API endpoint
 */
export function calculateMaterialsWithLineItems(
  measurements: RoofMeasurements,
  customConfig?: Partial<MaterialConfig>,
  unitPrices?: Partial<Record<string, number>>
): CalculateMaterialsResponse {
  const materials = calculateMaterials(measurements, customConfig)
  const lineItems = generateMaterialLineItems(measurements, customConfig, unitPrices)

  return {
    materials,
    lineItems,
  }
}

// ============================================================================
// Individual Material Calculations
// ============================================================================

/**
 * Calculate shingle bundles needed
 * Formula: effective squares x bundles per square, rounded up
 */
function calculateShingles(effectiveSquares: number, config: MaterialConfig): MaterialItem {
  const bundles = roundUp(effectiveSquares * config.bundlesPerSquare)

  return {
    quantity: bundles,
    unit: 'bundles',
    note: `${roundUp(effectiveSquares, 2)} effective squares x ${config.bundlesPerSquare} bundles/sq = ${bundles} bundles`,
  }
}

/**
 * Calculate starter strip bundles
 * Formula: (rakes + eaves LF) / LF per bundle, rounded up
 */
function calculateStarter(rakesEavesLF: number, config: MaterialConfig): MaterialItem {
  const bundles = roundUp(rakesEavesLF / config.starterLFPerBundle)

  return {
    quantity: bundles,
    unit: 'bundles',
    note: `${rakesEavesLF} LF / ${config.starterLFPerBundle} LF per bundle = ${bundles} bundles`,
  }
}

/**
 * Calculate ice & water shield rolls
 * Formula: (valleys + penetrations LF) / LF per roll, rounded up
 */
function calculateIceWater(valleysPenetrationsLF: number, config: MaterialConfig): MaterialItem {
  const rolls = roundUp(valleysPenetrationsLF / config.iceWaterLFPerRoll)

  return {
    quantity: rolls,
    unit: 'rolls',
    note: `${valleysPenetrationsLF} LF / ${config.iceWaterLFPerRoll} LF per roll = ${rolls} rolls`,
  }
}

/**
 * Calculate ridge cap bundles
 * Formula: (hips + ridges LF) / LF per bundle, rounded up
 */
function calculateRidgeCap(hipsRidgesLF: number, config: MaterialConfig): MaterialItem {
  const bundles = roundUp(hipsRidgesLF / config.ridgeCapLFPerBundle)

  return {
    quantity: bundles,
    unit: 'bundles',
    note: `${hipsRidgesLF} LF / ${config.ridgeCapLFPerBundle} LF per bundle = ${bundles} bundles`,
  }
}

/**
 * Calculate ridge vent bundles/pieces
 * Formula: ridge LF / LF per bundle, rounded up
 */
function calculateRidgeVent(ridgeLF: number, config: MaterialConfig): MaterialItem {
  const bundles = roundUp(ridgeLF / config.ridgeVentLFPerBundle)

  return {
    quantity: bundles,
    unit: 'bundles',
    note: `${ridgeLF} LF / ${config.ridgeVentLFPerBundle} LF per bundle = ${bundles} bundles`,
  }
}

/**
 * Calculate cap nail boxes
 * Formula: effective squares / squares per box, rounded up
 * Cap nails are used for ridge cap and starter
 */
function calculateCapNails(effectiveSquares: number, config: MaterialConfig): MaterialItem {
  const boxes = roundUp(effectiveSquares / config.capNailsSquaresPerBox)

  return {
    quantity: Math.max(1, boxes), // Always need at least 1 box
    unit: 'boxes',
    note: `${roundUp(effectiveSquares, 2)} effective squares / ${config.capNailsSquaresPerBox} sq per box = ${boxes} boxes`,
  }
}

/**
 * Calculate coil nail boxes
 * Formula: effective squares / squares per box, rounded up
 */
function calculateCoilNails(effectiveSquares: number, config: MaterialConfig): MaterialItem {
  const boxes = roundUp(effectiveSquares / config.coilNailsSquaresPerBox)

  return {
    quantity: boxes,
    unit: 'boxes',
    note: `${roundUp(effectiveSquares, 2)} effective squares / ${config.coilNailsSquaresPerBox} sq per box = ${boxes} boxes`,
  }
}

/**
 * Calculate step flashing bundles
 * Formula: step flashing LF / LF per bundle, rounded up
 */
function calculateStepFlashing(stepFlashingLF: number, config: MaterialConfig): MaterialItem {
  const bundles = roundUp(stepFlashingLF / config.stepFlashingLFPerBundle)

  return {
    quantity: bundles,
    unit: 'bundles',
    note: `${stepFlashingLF} LF / ${config.stepFlashingLFPerBundle} LF per bundle = ${bundles} bundles`,
  }
}

/**
 * Calculate pipe boots by size
 * Pipe boots are 1:1 with penetrations
 */
function calculatePipeBoots(pipeBootCount: { small: number; large: number }): {
  small: MaterialItem
  large: MaterialItem
} {
  return {
    small: {
      quantity: pipeBootCount.small,
      unit: 'each',
      note: `${pipeBootCount.small} x 2" pipe boots for venting`,
    },
    large: {
      quantity: pipeBootCount.large,
      unit: 'each',
      note: `${pipeBootCount.large} x 3" pipe boots for plumbing`,
    },
  }
}

/**
 * Calculate drip edge pieces
 * Formula: (rakes + eaves LF) / LF per piece, rounded up
 */
export function calculateDripEdge(rakesEavesLF: number, config: MaterialConfig): MaterialItem {
  const pieces = roundUp(rakesEavesLF / config.dripEdgeLFPerPiece)

  return {
    quantity: pieces,
    unit: 'pieces',
    note: `${rakesEavesLF} LF / ${config.dripEdgeLFPerPiece} LF per piece = ${pieces} pieces`,
  }
}

/**
 * Calculate underlayment rolls
 * Formula: (total squares x 100) / sq ft per roll, rounded up
 */
export function calculateUnderlayment(
  totalSquares: number,
  config: MaterialConfig,
  wasteFactor: number = 1.1
): MaterialItem {
  const sqft = totalSquares * 100 * wasteFactor
  const rolls = roundUp(sqft / config.underlaymentSqftPerRoll)

  return {
    quantity: rolls,
    unit: 'rolls',
    note: `${roundUp(sqft)} sq ft / ${config.underlaymentSqftPerRoll} sq ft per roll = ${rolls} rolls`,
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Round up to the nearest integer (or specified decimal places)
 * Always rounds UP because you can't order partial materials
 */
function roundUp(value: number, decimals: number = 0): number {
  if (decimals === 0) {
    return Math.ceil(value)
  }
  const multiplier = Math.pow(10, decimals)
  return Math.ceil(value * multiplier) / multiplier
}

/**
 * Validate measurements before calculation
 * Throws if measurements are invalid
 */
export function validateMeasurements(measurements: RoofMeasurements): void {
  if (measurements.totalSquares <= 0) {
    throw new Error('Total squares must be greater than 0')
  }

  if (measurements.rakesEavesLF < 0) {
    throw new Error('Rakes/eaves linear feet cannot be negative')
  }

  if (measurements.valleysPenetrationsLF < 0) {
    throw new Error('Valleys/penetrations linear feet cannot be negative')
  }

  if (measurements.hipsRidgesLF < 0) {
    throw new Error('Hips/ridges linear feet cannot be negative')
  }

  if (measurements.ridgeLF < 0) {
    throw new Error('Ridge linear feet cannot be negative')
  }

  if (measurements.ridgeLF > measurements.hipsRidgesLF) {
    throw new Error('Ridge LF cannot exceed hips + ridges LF')
  }

  if (measurements.stepFlashingLF !== undefined && measurements.stepFlashingLF < 0) {
    throw new Error('Step flashing linear feet cannot be negative')
  }

  if (measurements.pipeBootCount) {
    if (measurements.pipeBootCount.small < 0 || measurements.pipeBootCount.large < 0) {
      throw new Error('Pipe boot counts cannot be negative')
    }
  }
}

/**
 * Estimate total material cost
 * Requires unit prices to be set
 */
export function estimateTotalCost(
  lineItems: Omit<QuoteLineItem, 'id'>[]
): number {
  return lineItems.reduce((total, item) => total + item.total_price, 0)
}

/**
 * Convert square footage to squares
 * 1 square = 100 sq ft
 */
export function sqftToSquares(sqft: number): number {
  return sqft / 100
}

/**
 * Convert squares to square footage
 */
export function squaresToSqft(squares: number): number {
  return squares * 100
}
