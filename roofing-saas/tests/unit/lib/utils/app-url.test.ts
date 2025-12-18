/**
 * Unit tests for application URL utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getAppBaseUrl } from '@/lib/utils'

// Mock process.env and window
const originalProcess = process
const originalWindow = global.window

describe('getAppBaseUrl()', () => {
  beforeEach(() => {
    // Reset environment
    vi.stubGlobal('process', { ...originalProcess, env: {} })
    vi.stubGlobal('window', undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should use NEXT_PUBLIC_APP_URL when available', () => {
    vi.stubGlobal('process', {
      ...originalProcess,
      env: {
        NEXT_PUBLIC_APP_URL: 'https://roofing-saas.vercel.app'
      }
    })

    const result = getAppBaseUrl()

    expect(result).toBe('https://roofing-saas.vercel.app')
  })

  it('should prefer NEXT_PUBLIC_APP_URL over window.location.origin', () => {
    vi.stubGlobal('process', {
      ...originalProcess,
      env: {
        NEXT_PUBLIC_APP_URL: 'https://roofing-saas.vercel.app'
      }
    })
    vi.stubGlobal('window', {
      location: {
        origin: 'http://localhost:3000'
      }
    })

    const result = getAppBaseUrl()

    expect(result).toBe('https://roofing-saas.vercel.app')
  })

  it('should fallback to window.location.origin when NEXT_PUBLIC_APP_URL is not set', () => {
    vi.stubGlobal('window', {
      location: {
        origin: 'http://localhost:3000'
      }
    })

    const result = getAppBaseUrl()

    expect(result).toBe('http://localhost:3000')
  })

  it('should fallback to localhost:3000 when neither env var nor window is available', () => {
    const result = getAppBaseUrl()

    expect(result).toBe('http://localhost:3000')
  })

  it('should handle production URLs correctly', () => {
    vi.stubGlobal('process', {
      ...originalProcess,
      env: {
        NEXT_PUBLIC_APP_URL: 'https://production-site.com'
      }
    })

    const result = getAppBaseUrl()

    expect(result).toBe('https://production-site.com')
  })

  it('should handle localhost URLs correctly', () => {
    vi.stubGlobal('process', {
      ...originalProcess,
      env: {
        NEXT_PUBLIC_APP_URL: 'http://localhost:3000'
      }
    })

    const result = getAppBaseUrl()

    expect(result).toBe('http://localhost:3000')
  })

  it('should handle empty NEXT_PUBLIC_APP_URL by falling back to window', () => {
    vi.stubGlobal('process', {
      ...originalProcess,
      env: {
        NEXT_PUBLIC_APP_URL: ''
      }
    })
    vi.stubGlobal('window', {
      location: {
        origin: 'http://localhost:4000'
      }
    })

    const result = getAppBaseUrl()

    expect(result).toBe('http://localhost:4000')
  })

  it('should handle undefined NEXT_PUBLIC_APP_URL by falling back to window', () => {
    vi.stubGlobal('process', {
      ...originalProcess,
      env: {
        NEXT_PUBLIC_APP_URL: undefined
      }
    })
    vi.stubGlobal('window', {
      location: {
        origin: 'http://localhost:5000'
      }
    })

    const result = getAppBaseUrl()

    expect(result).toBe('http://localhost:5000')
  })
})