/**
 * Material Calculation Types
 *
 * Types for the roofing material calculator that automates
 * material ordering based on roof measurements.
 */

import type { QuoteLineItem } from '@/lib/types/quote-option'

/**
 * Roof measurements required for material calculation.
 * These can come from AR measurements, manual entry, or imported reports.
 */
export interface RoofMeasurements {
  /** Total roof area in squares (1 square = 100 sq ft) */
  totalSquares: number

  /** Linear feet of rakes (gable edges) + eaves (horizontal edges) - for starter strip */
  rakesEavesLF: number

  /** Linear feet of valleys + penetrations - for ice & water shield */
  valleysPenetrationsLF: number

  /** Linear feet of hips + ridges - for ridge cap */
  hipsRidgesLF: number

  /** Linear feet of ridge only - for ridge vent (subset of hipsRidgesLF) */
  ridgeLF: number

  /** Optional: Linear feet needing step flashing (chimney, sidewall, etc.) */
  stepFlashingLF?: number

  /** Optional: Count of pipe boots by size */
  pipeBootCount?: {
    /** 2" pipe boots (typically for venting) */
    small: number
    /** 3" pipe boots (typically for plumbing) */
    large: number
  }

  /** Optional: Roof pitch (e.g., "6/12") - affects waste factor */
  pitch?: string

  /** Optional: Number of layers to remove */
  layersToRemove?: number
}

/**
 * Individual material calculation result
 */
export interface MaterialItem {
  /** Number of units needed (bundles, rolls, boxes, etc.) */
  quantity: number
  /** Unit of measure */
  unit: string
  /** Human-readable note about the calculation */
  note: string
  /** SKU or product code (optional) */
  sku?: string
  /** Estimated unit price (optional) */
  unitPrice?: number
}

/**
 * Complete material list output from calculator
 */
export interface MaterialList {
  /** Shingle bundles (3 bundles = 1 square) */
  shingles: MaterialItem

  /** Starter strip bundles */
  starter: MaterialItem

  /** Ice & water shield rolls */
  iceWater: MaterialItem

  /** Ridge cap bundles */
  ridgeCap: MaterialItem

  /** Ridge vent bundles */
  ridgeVent: MaterialItem

  /** Cap nails (for ridge cap/starter) */
  capNails: MaterialItem

  /** Coil nails (for shingles) */
  coilNails: MaterialItem

  /** Step flashing (optional, only if stepFlashingLF provided) */
  stepFlashing?: MaterialItem

  /** Pipe boots (optional, only if pipeBootCount provided) */
  pipeBoots?: {
    small: MaterialItem
    large: MaterialItem
  }

  /** Drip edge (optional) */
  dripEdge?: MaterialItem

  /** Felt/underlayment (optional) */
  underlayment?: MaterialItem

  /** Summary metadata */
  summary: {
    totalSquares: number
    wasteFactorApplied: number
    effectiveSquares: number
    calculatedAt: string
  }
}

/**
 * Configuration for material calculations
 * Can be customized per tenant or use defaults
 */
export interface MaterialConfig {
  /** Waste factor multiplier (default: 1.11 = 11% waste) */
  wasteFactor: number

  /** Bundles of shingles per square (typically 3) */
  bundlesPerSquare: number

  /** Linear feet of starter strip per bundle */
  starterLFPerBundle: number

  /** Linear feet covered by one roll of ice & water shield */
  iceWaterLFPerRoll: number

  /** Linear feet of ridge cap per bundle */
  ridgeCapLFPerBundle: number

  /** Linear feet of ridge vent per bundle/piece */
  ridgeVentLFPerBundle: number

  /** Number of squares one box of cap nails covers */
  capNailsSquaresPerBox: number

  /** Number of squares one box of coil nails covers */
  coilNailsSquaresPerBox: number

  /** Linear feet of step flashing per bundle */
  stepFlashingLFPerBundle: number

  /** Linear feet of drip edge per piece */
  dripEdgeLFPerPiece: number

  /** Square feet covered by one roll of underlayment */
  underlaymentSqftPerRoll: number
}

/**
 * Default material configuration based on ASR's workflow
 */
export const DEFAULT_MATERIAL_CONFIG: MaterialConfig = {
  wasteFactor: 1.11,              // 11% waste factor
  bundlesPerSquare: 3,            // 3 bundles = 1 square
  starterLFPerBundle: 116,        // GAF Pro-Start covers 116.66 LF
  iceWaterLFPerRoll: 65,          // 3' x 65' = 195 sq ft, but measuring linear coverage
  ridgeCapLFPerBundle: 30,        // Approximately 30 LF per bundle
  ridgeVentLFPerBundle: 28,       // 4' sections, approximately 7 per bundle
  capNailsSquaresPerBox: 30,      // 3000 count box
  coilNailsSquaresPerBox: 15,     // Based on nail gun specifications
  stepFlashingLFPerBundle: 25,    // 25 pieces at ~1 LF spacing
  dripEdgeLFPerPiece: 10,         // Standard 10' piece
  underlaymentSqftPerRoll: 1000,  // Synthetic underlayment
}

/**
 * Request body for material calculation API
 */
export interface CalculateMaterialsRequest {
  measurements: RoofMeasurements
  config?: Partial<MaterialConfig>
}

/**
 * Response from material calculation API
 */
export interface CalculateMaterialsResponse {
  materials: MaterialList
  lineItems: Omit<QuoteLineItem, 'id'>[]
}

/**
 * Material category for grouping in quotes
 */
export type MaterialCategory = 'roofing' | 'underlayment' | 'flashing' | 'fasteners' | 'ventilation' | 'accessories'

/**
 * Mapping of material items to quote line item categories
 */
export const MATERIAL_TO_CATEGORY: Record<keyof Omit<MaterialList, 'summary' | 'pipeBoots'>, MaterialCategory> = {
  shingles: 'roofing',
  starter: 'roofing',
  iceWater: 'underlayment',
  ridgeCap: 'roofing',
  ridgeVent: 'ventilation',
  capNails: 'fasteners',
  coilNails: 'fasteners',
  stepFlashing: 'flashing',
  dripEdge: 'flashing',
  underlayment: 'underlayment',
}
