/**
 * Material Calculation Module
 *
 * Automates material ordering for roofing jobs.
 * Turns a 10+ minute manual process into one click.
 *
 * @example
 * ```typescript
 * import { calculateMaterials, generateMaterialLineItems } from '@/lib/materials'
 *
 * const measurements = {
 *   totalSquares: 25,
 *   rakesEavesLF: 180,
 *   valleysPenetrationsLF: 45,
 *   hipsRidgesLF: 60,
 *   ridgeLF: 35,
 * }
 *
 * const materials = calculateMaterials(measurements)
 * // materials.shingles.quantity = 84 bundles
 * // materials.summary.effectiveSquares = 27.75
 *
 * const lineItems = generateMaterialLineItems(measurements)
 * // Ready to add to quote
 * ```
 */

// Types
export type {
  RoofMeasurements,
  MaterialList,
  MaterialItem,
  MaterialConfig,
  CalculateMaterialsRequest,
  CalculateMaterialsResponse,
  MaterialCategory,
} from './types'

export { DEFAULT_MATERIAL_CONFIG, MATERIAL_TO_CATEGORY } from './types'

// Calculator functions
export {
  calculateMaterials,
  generateMaterialLineItems,
  calculateMaterialsWithLineItems,
  validateMeasurements,
  estimateTotalCost,
  sqftToSquares,
  squaresToSqft,
  calculateDripEdge,
  calculateUnderlayment,
} from './calculator'
