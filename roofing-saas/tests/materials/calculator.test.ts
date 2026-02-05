/**
 * Material Calculator Tests
 *
 * Validates the roofing material calculation logic.
 * Tests based on ASR's Build Operator workflow requirements.
 */

import { describe, it, expect } from 'vitest'
import {
  calculateMaterials,
  generateMaterialLineItems,
  calculateMaterialsWithLineItems,
  validateMeasurements,
  sqftToSquares,
  squaresToSqft,
} from '@/lib/materials/calculator'
import type { RoofMeasurements } from '@/lib/materials/types'
import { DEFAULT_MATERIAL_CONFIG } from '@/lib/materials/types'

describe('Material Calculator', () => {
  // Standard test measurements representing a typical residential roof
  const standardMeasurements: RoofMeasurements = {
    totalSquares: 25,
    rakesEavesLF: 180,
    valleysPenetrationsLF: 45,
    hipsRidgesLF: 60,
    ridgeLF: 35,
  }

  describe('calculateMaterials', () => {
    it('calculates shingles correctly with waste factor', () => {
      const result = calculateMaterials(standardMeasurements)

      // 25 squares * 1.11 waste = 27.75 effective squares
      // 27.75 * 3 bundles/square = 83.25, rounded up = 84
      expect(result.shingles.quantity).toBe(84)
      expect(result.shingles.unit).toBe('bundles')
    })

    it('calculates starter strip correctly', () => {
      const result = calculateMaterials(standardMeasurements)

      // 180 LF / 116 LF per bundle = 1.55, rounded up = 2
      expect(result.starter.quantity).toBe(2)
      expect(result.starter.unit).toBe('bundles')
    })

    it('calculates ice & water shield correctly', () => {
      const result = calculateMaterials(standardMeasurements)

      // 45 LF / 65 LF per roll = 0.69, rounded up = 1
      expect(result.iceWater.quantity).toBe(1)
      expect(result.iceWater.unit).toBe('rolls')
    })

    it('calculates ridge cap correctly', () => {
      const result = calculateMaterials(standardMeasurements)

      // 60 LF / 30 LF per bundle = 2
      expect(result.ridgeCap.quantity).toBe(2)
      expect(result.ridgeCap.unit).toBe('bundles')
    })

    it('calculates ridge vent correctly', () => {
      const result = calculateMaterials(standardMeasurements)

      // 35 LF / 28 LF per bundle = 1.25, rounded up = 2
      expect(result.ridgeVent.quantity).toBe(2)
      expect(result.ridgeVent.unit).toBe('bundles')
    })

    it('calculates cap nails correctly', () => {
      const result = calculateMaterials(standardMeasurements)

      // 27.75 effective squares / 30 squares per box = 0.925, rounded up = 1
      expect(result.capNails.quantity).toBe(1)
      expect(result.capNails.unit).toBe('boxes')
    })

    it('calculates coil nails correctly', () => {
      const result = calculateMaterials(standardMeasurements)

      // 27.75 effective squares / 15 squares per box = 1.85, rounded up = 2
      expect(result.coilNails.quantity).toBe(2)
      expect(result.coilNails.unit).toBe('boxes')
    })

    it('includes summary with correct values', () => {
      const result = calculateMaterials(standardMeasurements)

      expect(result.summary.totalSquares).toBe(25)
      expect(result.summary.wasteFactorApplied).toBe(DEFAULT_MATERIAL_CONFIG.wasteFactor)
      // 25 * 1.11 = 27.75, but due to floating point may be 27.76 when rounded up
      expect(result.summary.effectiveSquares).toBeCloseTo(27.75, 1)
      expect(result.summary.calculatedAt).toBeDefined()
    })

    it('handles optional step flashing', () => {
      const measurementsWithFlashing: RoofMeasurements = {
        ...standardMeasurements,
        stepFlashingLF: 40,
      }

      const result = calculateMaterials(measurementsWithFlashing)

      // 40 LF / 25 LF per bundle = 1.6, rounded up = 2
      expect(result.stepFlashing).toBeDefined()
      expect(result.stepFlashing?.quantity).toBe(2)
      expect(result.stepFlashing?.unit).toBe('bundles')
    })

    it('handles optional pipe boots', () => {
      const measurementsWithPipeBoots: RoofMeasurements = {
        ...standardMeasurements,
        pipeBootCount: { small: 3, large: 2 },
      }

      const result = calculateMaterials(measurementsWithPipeBoots)

      expect(result.pipeBoots).toBeDefined()
      expect(result.pipeBoots?.small.quantity).toBe(3)
      expect(result.pipeBoots?.large.quantity).toBe(2)
    })

    it('uses custom config when provided', () => {
      const customConfig = {
        wasteFactor: 1.15, // 15% waste instead of 11%
      }

      const result = calculateMaterials(standardMeasurements, customConfig)

      // 25 * 1.15 = 28.75 effective squares
      // 28.75 * 3 = 86.25, rounded up = 87
      expect(result.shingles.quantity).toBe(87)
      expect(result.summary.wasteFactorApplied).toBe(1.15)
    })

    it('always rounds up (never partial materials)', () => {
      // Use measurements that result in fractional values
      const measurements: RoofMeasurements = {
        totalSquares: 10.1,
        rakesEavesLF: 100,
        valleysPenetrationsLF: 10,
        hipsRidgesLF: 15,
        ridgeLF: 10,
      }

      const result = calculateMaterials(measurements)

      // All quantities should be whole numbers
      expect(Number.isInteger(result.shingles.quantity)).toBe(true)
      expect(Number.isInteger(result.starter.quantity)).toBe(true)
      expect(Number.isInteger(result.iceWater.quantity)).toBe(true)
      expect(Number.isInteger(result.ridgeCap.quantity)).toBe(true)
      expect(Number.isInteger(result.ridgeVent.quantity)).toBe(true)
      expect(Number.isInteger(result.capNails.quantity)).toBe(true)
      expect(Number.isInteger(result.coilNails.quantity)).toBe(true)
    })
  })

  describe('generateMaterialLineItems', () => {
    it('generates correct number of line items', () => {
      const lineItems = generateMaterialLineItems(standardMeasurements)

      // Core materials: shingles, starter, ice & water, ridge cap, ridge vent, cap nails, coil nails
      expect(lineItems.length).toBe(7)
    })

    it('includes optional items when provided', () => {
      const measurementsWithOptional: RoofMeasurements = {
        ...standardMeasurements,
        stepFlashingLF: 40,
        pipeBootCount: { small: 3, large: 2 },
      }

      const lineItems = generateMaterialLineItems(measurementsWithOptional)

      // 7 core + step flashing + 2 pipe boot sizes = 10
      expect(lineItems.length).toBe(10)

      const descriptions = lineItems.map((item) => item.description)
      expect(descriptions).toContain('Step Flashing')
      expect(descriptions).toContain('Pipe Boot 2"')
      expect(descriptions).toContain('Pipe Boot 3"')
    })

    it('sets all line items as materials category', () => {
      const lineItems = generateMaterialLineItems(standardMeasurements)

      lineItems.forEach((item) => {
        expect(item.category).toBe('materials')
      })
    })

    it('uses provided unit prices', () => {
      const unitPrices = {
        'architectural shingles': 35.99,
        'starter strip': 12.50,
      }

      const lineItems = generateMaterialLineItems(
        standardMeasurements,
        undefined,
        unitPrices
      )

      const shinglesItem = lineItems.find(
        (item) => item.description === 'Architectural Shingles'
      )
      expect(shinglesItem?.unit_price).toBe(35.99)

      const starterItem = lineItems.find(
        (item) => item.description === 'Starter Strip'
      )
      expect(starterItem?.unit_price).toBe(12.50)
    })

    it('calculates total_price correctly', () => {
      const unitPrices = {
        'architectural shingles': 35.99,
      }

      const lineItems = generateMaterialLineItems(
        standardMeasurements,
        undefined,
        unitPrices
      )

      const shinglesItem = lineItems.find(
        (item) => item.description === 'Architectural Shingles'
      )

      expect(shinglesItem?.total_price).toBe(
        shinglesItem!.quantity * shinglesItem!.unit_price
      )
    })
  })

  describe('calculateMaterialsWithLineItems', () => {
    it('returns both materials and line items', () => {
      const result = calculateMaterialsWithLineItems(standardMeasurements)

      expect(result.materials).toBeDefined()
      expect(result.lineItems).toBeDefined()
      expect(result.materials.shingles.quantity).toBe(84)
      expect(result.lineItems.length).toBe(7)
    })
  })

  describe('validateMeasurements', () => {
    it('accepts valid measurements', () => {
      expect(() => validateMeasurements(standardMeasurements)).not.toThrow()
    })

    it('rejects zero total squares', () => {
      const invalid = { ...standardMeasurements, totalSquares: 0 }
      expect(() => validateMeasurements(invalid)).toThrow(
        'Total squares must be greater than 0'
      )
    })

    it('rejects negative total squares', () => {
      const invalid = { ...standardMeasurements, totalSquares: -5 }
      expect(() => validateMeasurements(invalid)).toThrow(
        'Total squares must be greater than 0'
      )
    })

    it('rejects negative rakes/eaves LF', () => {
      const invalid = { ...standardMeasurements, rakesEavesLF: -10 }
      expect(() => validateMeasurements(invalid)).toThrow(
        'Rakes/eaves linear feet cannot be negative'
      )
    })

    it('rejects ridge LF exceeding hips/ridges LF', () => {
      const invalid = { ...standardMeasurements, ridgeLF: 100 } // > 60
      expect(() => validateMeasurements(invalid)).toThrow(
        'Ridge LF cannot exceed hips + ridges LF'
      )
    })

    it('rejects negative pipe boot counts', () => {
      const invalid = {
        ...standardMeasurements,
        pipeBootCount: { small: -1, large: 2 },
      }
      expect(() => validateMeasurements(invalid)).toThrow(
        'Pipe boot counts cannot be negative'
      )
    })
  })

  describe('utility functions', () => {
    it('converts sqft to squares correctly', () => {
      expect(sqftToSquares(2500)).toBe(25)
      expect(sqftToSquares(100)).toBe(1)
      expect(sqftToSquares(150)).toBe(1.5)
    })

    it('converts squares to sqft correctly', () => {
      expect(squaresToSqft(25)).toBe(2500)
      expect(squaresToSqft(1)).toBe(100)
      expect(squaresToSqft(1.5)).toBe(150)
    })
  })

  describe('real-world scenarios', () => {
    it('handles a small residential roof (15 squares)', () => {
      const smallRoof: RoofMeasurements = {
        totalSquares: 15,
        rakesEavesLF: 120,
        valleysPenetrationsLF: 20,
        hipsRidgesLF: 40,
        ridgeLF: 25,
      }

      const result = calculateMaterials(smallRoof)

      // Verify reasonable outputs
      expect(result.shingles.quantity).toBeGreaterThan(0)
      expect(result.shingles.quantity).toBeLessThan(100)
      expect(result.starter.quantity).toBeGreaterThan(0)
    })

    it('handles a large residential roof (50 squares)', () => {
      const largeRoof: RoofMeasurements = {
        totalSquares: 50,
        rakesEavesLF: 350,
        valleysPenetrationsLF: 100,
        hipsRidgesLF: 120,
        ridgeLF: 70,
        stepFlashingLF: 60,
        pipeBootCount: { small: 5, large: 3 },
      }

      const result = calculateMaterials(largeRoof)

      // 50 * 1.11 = 55.5 effective squares
      // 55.5 * 3 = 166.5, rounded up = 167 bundles
      expect(result.shingles.quantity).toBe(167)

      // All optional items should be included
      expect(result.stepFlashing).toBeDefined()
      expect(result.pipeBoots).toBeDefined()
    })

    it('handles a complex roof with many penetrations', () => {
      const complexRoof: RoofMeasurements = {
        totalSquares: 30,
        rakesEavesLF: 200,
        valleysPenetrationsLF: 150, // Many valleys and penetrations
        hipsRidgesLF: 80,
        ridgeLF: 45,
        stepFlashingLF: 100,
        pipeBootCount: { small: 8, large: 4 },
      }

      const result = calculateMaterials(complexRoof)

      // Should need more ice & water shield
      // 150 / 65 = 2.31, rounded up = 3
      expect(result.iceWater.quantity).toBe(3)
    })
  })
})
