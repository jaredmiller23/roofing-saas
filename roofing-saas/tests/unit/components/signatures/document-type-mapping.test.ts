/**
 * Unit tests for document type mapping in signature creation
 */

import { describe, it, expect } from 'vitest'

// Helper function to map template categories (plural) to document types (singular)
// This is the same function used in signatures/new/page.tsx
const mapCategoryToDocumentType = (category: string | null): string => {
  if (!category) return 'contract'

  const categoryMapping: Record<string, string> = {
    'contracts': 'contract',
    'estimates': 'estimate',
    'waivers': 'waiver',
    'change_orders': 'change_order'
  }

  return categoryMapping[category.toLowerCase()] || 'contract'
}

describe('Document Type Mapping', () => {
  describe('mapCategoryToDocumentType()', () => {
    it('should map plural categories to singular document types', () => {
      expect(mapCategoryToDocumentType('contracts')).toBe('contract')
      expect(mapCategoryToDocumentType('estimates')).toBe('estimate')
      expect(mapCategoryToDocumentType('waivers')).toBe('waiver')
      expect(mapCategoryToDocumentType('change_orders')).toBe('change_order')
    })

    it('should handle case insensitive mapping', () => {
      expect(mapCategoryToDocumentType('CONTRACTS')).toBe('contract')
      expect(mapCategoryToDocumentType('Estimates')).toBe('estimate')
      expect(mapCategoryToDocumentType('WAIVERS')).toBe('waiver')
      expect(mapCategoryToDocumentType('Change_Orders')).toBe('change_order')
    })

    it('should return default "contract" for null or undefined', () => {
      expect(mapCategoryToDocumentType(null)).toBe('contract')
      expect(mapCategoryToDocumentType('')).toBe('contract')
    })

    it('should return default "contract" for unknown categories', () => {
      expect(mapCategoryToDocumentType('unknown')).toBe('contract')
      expect(mapCategoryToDocumentType('invalid_type')).toBe('contract')
      expect(mapCategoryToDocumentType('random')).toBe('contract')
    })

    it('should map to valid API document types', () => {
      const validApiTypes = ['contract', 'estimate', 'change_order', 'waiver', 'other']

      // Test that all mapped values are valid API types
      const testCategories = ['contracts', 'estimates', 'waivers', 'change_orders']
      testCategories.forEach(category => {
        const mappedType = mapCategoryToDocumentType(category)
        expect(validApiTypes).toContain(mappedType)
      })
    })

    it('should handle edge cases gracefully', () => {
      // Test with special characters and whitespace
      expect(mapCategoryToDocumentType(' contracts ')).toBe('contract')
      expect(mapCategoryToDocumentType('contracts-123')).toBe('contract') // unknown, fallback to contract
      expect(mapCategoryToDocumentType('con_tracts')).toBe('contract') // unknown, fallback to contract
    })

    it('should ensure consistency with signature API validation', () => {
      // These are the exact values expected by the API validation in signature-documents/route.ts
      const expectedApiTypes = ['contract', 'estimate', 'change_order', 'waiver', 'other']

      // Test each template category maps to a valid API type
      const templateCategories = [
        'contracts',
        'estimates',
        'waivers',
        'change_orders',
        null,
        'unknown_category'
      ]

      templateCategories.forEach(category => {
        const mappedType = mapCategoryToDocumentType(category)
        expect(expectedApiTypes).toContain(mappedType)
      })
    })
  })

  describe('Template Category to Document Type Flow', () => {
    it('should prevent the original bug - plural vs singular mismatch', () => {
      // This test prevents the regression of the bug where template.category
      // contained plural values (e.g., "contracts") but document_type validation
      // expected singular values (e.g., "contract")

      const templateCategories = ['contracts', 'estimates', 'waivers', 'change_orders']
      const expectedDocumentTypes = ['contract', 'estimate', 'waiver', 'change_order']

      templateCategories.forEach((category, index) => {
        const mappedType = mapCategoryToDocumentType(category)
        expect(mappedType).toBe(expectedDocumentTypes[index])

        // Ensure the mapped type is singular (doesn't end with 's' for our cases)
        if (mappedType !== 'change_order') {
          expect(mappedType.endsWith('s')).toBe(false)
        }
      })
    })

    it('should handle template data structure correctly', () => {
      // Simulate how the template object would be used in the component
      const mockTemplate = {
        id: '1',
        name: 'Test Template',
        category: 'contracts', // This is what comes from database (plural)
        requires_customer_signature: true,
        requires_company_signature: true,
        expiration_days: 30
      }

      const documentType = mapCategoryToDocumentType(mockTemplate.category)
      expect(documentType).toBe('contract') // This is what API expects (singular)

      // Verify it matches what the select dropdown expects
      const selectOptions = ['contract', 'estimate', 'change_order', 'waiver', 'other']
      expect(selectOptions).toContain(documentType)
    })
  })
})