/**
 * Unit tests for browser and OS detection utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { detectBrowserAndOS, getGeolocationInstructions, getSystemDescription, BrowserInfo } from '@/lib/utils/browser-detection'

// Mock navigator.userAgent
const originalNavigator = global.navigator
const originalWindow = global.window

describe('browser-detection', () => {
  beforeEach(() => {
    // Reset to a default state
    vi.stubGlobal('window', { ...originalWindow })
    vi.stubGlobal('navigator', { ...originalNavigator })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('detectBrowserAndOS()', () => {
    it('should return unknown values when window is undefined', () => {
      vi.stubGlobal('window', undefined)

      const result = detectBrowserAndOS()

      expect(result).toEqual({
        os: 'unknown',
        browser: 'unknown',
        isMobile: false
      })
    })

    it('should return unknown values when navigator.userAgent is undefined', () => {
      vi.stubGlobal('navigator', { userAgent: undefined })

      const result = detectBrowserAndOS()

      expect(result).toEqual({
        os: 'unknown',
        browser: 'unknown',
        isMobile: false
      })
    })

    it('should detect macOS Safari', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15'
      })

      const result = detectBrowserAndOS()

      expect(result.os).toBe('macOS')
      expect(result.browser).toBe('Safari')
      expect(result.isMobile).toBe(false)
    })

    it('should detect macOS Chrome', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
      })

      const result = detectBrowserAndOS()

      expect(result.os).toBe('macOS')
      expect(result.browser).toBe('Chrome')
      expect(result.isMobile).toBe(false)
    })

    it('should detect Windows Chrome', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
      })

      const result = detectBrowserAndOS()

      expect(result.os).toBe('Windows')
      expect(result.browser).toBe('Chrome')
      expect(result.isMobile).toBe(false)
    })

    it('should detect Windows Edge', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.2151.58'
      })

      const result = detectBrowserAndOS()

      expect(result.os).toBe('Windows')
      expect(result.browser).toBe('Edge')
      expect(result.isMobile).toBe(false)
    })

    it('should detect iOS Safari', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
      })

      const result = detectBrowserAndOS()

      expect(result.os).toBe('iOS')
      expect(result.browser).toBe('Safari')
      expect(result.isMobile).toBe(true)
    })

    it('should detect Android Chrome', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.6045.66 Mobile Safari/537.36'
      })

      const result = detectBrowserAndOS()

      expect(result.os).toBe('Android')
      expect(result.browser).toBe('Chrome')
      expect(result.isMobile).toBe(true)
    })

    it('should detect Firefox', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0'
      })

      const result = detectBrowserAndOS()

      expect(result.os).toBe('Windows')
      expect(result.browser).toBe('Firefox')
      expect(result.isMobile).toBe(false)
    })

    it('should detect Linux', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
      })

      const result = detectBrowserAndOS()

      expect(result.os).toBe('Linux')
      expect(result.browser).toBe('Chrome')
      expect(result.isMobile).toBe(false)
    })

    it('should detect iPad as iOS mobile', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
      })

      const result = detectBrowserAndOS()

      expect(result.os).toBe('iOS')
      expect(result.browser).toBe('Safari')
      expect(result.isMobile).toBe(true)
    })
  })

  describe('getGeolocationInstructions()', () => {
    it('should return macOS Safari instructions', () => {
      const browserInfo: BrowserInfo = { os: 'macOS', browser: 'Safari', isMobile: false }

      const instructions = getGeolocationInstructions(browserInfo)

      expect(instructions).toContain('Check System Settings > Privacy & Security > Location Services > Safari')
      expect(instructions).toHaveLength(3)
    })

    it('should return macOS Chrome instructions', () => {
      const browserInfo: BrowserInfo = { os: 'macOS', browser: 'Chrome', isMobile: false }

      const instructions = getGeolocationInstructions(browserInfo)

      expect(instructions).toContain('Check System Settings > Privacy & Security > Location Services > Chrome')
      expect(instructions).toContain('Then check chrome://settings/content/location in Chrome')
      expect(instructions).toHaveLength(3)
    })

    it('should return Windows Chrome instructions', () => {
      const browserInfo: BrowserInfo = { os: 'Windows', browser: 'Chrome', isMobile: false }

      const instructions = getGeolocationInstructions(browserInfo)

      expect(instructions).toContain('Check chrome://settings/content/location in Chrome')
      expect(instructions).toContain('You may also need to enable Location Services in Windows Settings')
      expect(instructions).toHaveLength(3)
    })

    it('should return Windows Edge instructions', () => {
      const browserInfo: BrowserInfo = { os: 'Windows', browser: 'Edge', isMobile: false }

      const instructions = getGeolocationInstructions(browserInfo)

      expect(instructions).toContain('Check edge://settings/content/location in Edge')
      expect(instructions).toHaveLength(3)
    })

    it('should return iOS Safari instructions', () => {
      const browserInfo: BrowserInfo = { os: 'iOS', browser: 'Safari', isMobile: true }

      const instructions = getGeolocationInstructions(browserInfo)

      expect(instructions).toContain('Go to Settings > Privacy & Security > Location Services > Safari')
      expect(instructions).toHaveLength(3)
    })

    it('should return Android Chrome instructions', () => {
      const browserInfo: BrowserInfo = { os: 'Android', browser: 'Chrome', isMobile: true }

      const instructions = getGeolocationInstructions(browserInfo)

      expect(instructions).toContain('Go to Settings > Apps > Chrome > Permissions > Location')
      expect(instructions).toHaveLength(3)
    })

    it('should return Linux instructions', () => {
      const browserInfo: BrowserInfo = { os: 'Linux', browser: 'Firefox', isMobile: false }

      const instructions = getGeolocationInstructions(browserInfo)

      expect(instructions).toContain('Check location permissions in your Firefox browser settings')
      expect(instructions).toContain('Some Linux distributions may require additional system-level location service setup')
      expect(instructions).toHaveLength(3)
    })

    it('should return default instructions for unknown systems', () => {
      const browserInfo: BrowserInfo = { os: 'unknown', browser: 'unknown', isMobile: false }

      const instructions = getGeolocationInstructions(browserInfo)

      expect(instructions).toContain('Check that Location Services are enabled for your browser')
      expect(instructions).toContain('Try refreshing the page and allowing location access when prompted')
      expect(instructions).toHaveLength(2)
    })

    it('should auto-detect browser info if not provided', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15'
      })

      const instructions = getGeolocationInstructions()

      expect(instructions).toContain('Check System Settings > Privacy & Security > Location Services > Safari')
    })
  })

  describe('getSystemDescription()', () => {
    it('should return description for known systems', () => {
      const browserInfo: BrowserInfo = { os: 'macOS', browser: 'Safari', isMobile: false }

      const description = getSystemDescription(browserInfo)

      expect(description).toBe('macOS desktop with Safari')
    })

    it('should return description for mobile systems', () => {
      const browserInfo: BrowserInfo = { os: 'iOS', browser: 'Safari', isMobile: true }

      const description = getSystemDescription(browserInfo)

      expect(description).toBe('iOS mobile with Safari')
    })

    it('should return "your device" for unknown systems', () => {
      const browserInfo: BrowserInfo = { os: 'unknown', browser: 'Chrome', isMobile: false }

      const description = getSystemDescription(browserInfo)

      expect(description).toBe('your device')
    })

    it('should return "your device" for unknown browser', () => {
      const browserInfo: BrowserInfo = { os: 'Windows', browser: 'unknown', isMobile: false }

      const description = getSystemDescription(browserInfo)

      expect(description).toBe('your device')
    })

    it('should auto-detect browser info if not provided', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
      })

      const description = getSystemDescription()

      expect(description).toBe('Windows desktop with Chrome')
    })
  })

  describe('Edge cases', () => {
    it('should handle Chrome iOS user agent', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/119.0.6045.109 Mobile/15E148 Safari/604.1'
      })

      const result = detectBrowserAndOS()

      expect(result.os).toBe('iOS')
      expect(result.browser).toBe('Chrome')
      expect(result.isMobile).toBe(true)
    })

    it('should handle Firefox iOS user agent', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/119.0.0.12345 Mobile/15E148 Safari/605.1.15'
      })

      const result = detectBrowserAndOS()

      expect(result.os).toBe('iOS')
      expect(result.browser).toBe('Firefox')
      expect(result.isMobile).toBe(true)
    })

    it('should prioritize Edge detection over Chrome', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.2151.58'
      })

      const result = detectBrowserAndOS()

      expect(result.browser).toBe('Edge')
    })

    it('should handle tablet detection', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-X900) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.6045.66 Safari/537.36'
      })

      const result = detectBrowserAndOS()

      expect(result.os).toBe('Android')
      expect(result.isMobile).toBe(true)
    })
  })
})