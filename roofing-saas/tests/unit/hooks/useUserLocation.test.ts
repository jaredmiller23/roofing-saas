/**
 * Unit tests for useUserLocation hook with enhanced error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { getGeolocationInstructions, getSystemDescription } from '@/lib/utils/browser-detection'

// Mock console methods to reduce noise in tests
const consoleMethods = ['log', 'error', 'warn'] as const

describe('useUserLocation enhanced error handling integration', () => {
  beforeEach(() => {
    // Mock console methods
    consoleMethods.forEach(method => {
      vi.spyOn(console, method).mockImplementation(() => {})
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('browser-specific geolocation error messages', () => {
    it('should generate appropriate error instructions for macOS Safari', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15'
      })

      const instructions = getGeolocationInstructions()
      const description = getSystemDescription()

      expect(description).toBe('macOS desktop with Safari')
      expect(instructions).toContain('Check System Settings > Privacy & Security > Location Services > Safari')
      expect(instructions).toHaveLength(3)
    })

    it('should generate appropriate error instructions for Windows Chrome', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
      })

      const instructions = getGeolocationInstructions()
      const description = getSystemDescription()

      expect(description).toBe('Windows desktop with Chrome')
      expect(instructions).toContain('Check chrome://settings/content/location in Chrome')
      expect(instructions).toHaveLength(3)
    })

    it('should generate appropriate error instructions for iOS Safari', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
      })

      const instructions = getGeolocationInstructions()
      const description = getSystemDescription()

      expect(description).toBe('iOS mobile with Safari')
      expect(instructions).toContain('Go to Settings > Privacy & Security > Location Services > Safari')
      expect(instructions).toHaveLength(3)
    })

    it('should generate appropriate error instructions for Android Chrome', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.6045.66 Mobile Safari/537.36'
      })

      const instructions = getGeolocationInstructions()
      const description = getSystemDescription()

      expect(description).toBe('Android mobile with Chrome')
      expect(instructions).toContain('Go to Settings > Apps > Chrome > Permissions > Location')
      expect(instructions).toHaveLength(3)
    })

    it('should handle unknown browsers gracefully', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Unknown Browser'
      })

      const instructions = getGeolocationInstructions()
      const description = getSystemDescription()

      expect(description).toBe('your device')
      expect(instructions).toContain('Check that Location Services are enabled for your browser')
      expect(instructions).toHaveLength(2)
    })

    it('should handle server-side rendering', () => {
      vi.stubGlobal('window', undefined)

      const instructions = getGeolocationInstructions()
      const description = getSystemDescription()

      expect(description).toBe('your device')
      expect(instructions).toContain('Check that Location Services are enabled for your browser')
    })
  })

  describe('geolocation error scenario simulations', () => {
    it('should provide system-specific instructions for permission denied errors', () => {
      // Simulate a permission denied scenario on macOS Safari
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15',
        geolocation: {
          getCurrentPosition: vi.fn(),
          watchPosition: vi.fn(),
          clearWatch: vi.fn()
        }
      })

      const instructions = getGeolocationInstructions()

      // Verify that the instructions are specific to macOS Safari
      expect(instructions).toEqual([
        'Check System Settings > Privacy & Security > Location Services > Safari',
        'Ensure Safari is allowed to access your location',
        'Try refreshing the page to see the permission prompt again'
      ])
    })

    it('should provide different instructions for different browser/OS combinations', () => {
      // Test Windows Edge
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.2151.58'
      })

      const edgeInstructions = getGeolocationInstructions()
      expect(edgeInstructions).toContain('Check edge://settings/content/location in Edge')

      // Test macOS Chrome
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
      })

      const chromeInstructions = getGeolocationInstructions()
      expect(chromeInstructions).toContain('Check System Settings > Privacy & Security > Location Services > Chrome')
      expect(chromeInstructions).toContain('Then check chrome://settings/content/location in Chrome')

      // Instructions should be different
      expect(edgeInstructions).not.toEqual(chromeInstructions)
    })
  })
})