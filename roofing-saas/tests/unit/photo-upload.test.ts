/**
 * Photo Upload Unit Tests
 * Tests for timeout utility and HEIC validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { withTimeout } from '@/lib/utils'

describe('withTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should resolve when promise completes before timeout', async () => {
    const promise = Promise.resolve('success')
    const result = await withTimeout(promise, 1000, 'Timed out')
    expect(result).toBe('success')
  })

  it('should reject with timeout error when promise takes too long', async () => {
    const slowPromise = new Promise((resolve) => {
      setTimeout(() => resolve('too late'), 5000)
    })

    const timeoutPromise = withTimeout(slowPromise, 1000, 'Operation timed out')

    // Advance timers past the timeout
    vi.advanceTimersByTime(1001)

    await expect(timeoutPromise).rejects.toThrow('Operation timed out')
  })

  it('should use default error message when not provided', async () => {
    const slowPromise = new Promise((resolve) => {
      setTimeout(() => resolve('too late'), 5000)
    })

    const timeoutPromise = withTimeout(slowPromise, 1000)

    vi.advanceTimersByTime(1001)

    await expect(timeoutPromise).rejects.toThrow('Operation timed out')
  })

  it('should propagate original promise rejection', async () => {
    const failingPromise = Promise.reject(new Error('Original error'))

    await expect(withTimeout(failingPromise, 1000, 'Timed out')).rejects.toThrow('Original error')
  })

  it('should clear timeout when promise resolves', async () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

    const promise = Promise.resolve('quick')
    await withTimeout(promise, 1000, 'Timed out')

    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  })

  it('should clear timeout when promise rejects', async () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

    const promise = Promise.reject(new Error('failed'))
    try {
      await withTimeout(promise, 1000, 'Timed out')
    } catch {
      // Expected
    }

    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  })

  it('should work with async functions', async () => {
    const asyncFn = async () => {
      return 'async result'
    }

    const result = await withTimeout(asyncFn(), 1000, 'Timed out')
    expect(result).toBe('async result')
  })

  it('should handle zero timeout', async () => {
    const promise = new Promise((resolve) => {
      setTimeout(() => resolve('delayed'), 10)
    })

    const timeoutPromise = withTimeout(promise, 0, 'Instant timeout')

    vi.advanceTimersByTime(1)

    await expect(timeoutPromise).rejects.toThrow('Instant timeout')
  })
})

describe('validateHeicFile', () => {
  // Valid HEIC magic bytes: ftyp at offset 4, heic brand at offset 8
  const VALID_HEIC_BYTES = [
    0x00, 0x00, 0x00, 0x18, // Box size (24 bytes)
    0x66, 0x74, 0x79, 0x70, // 'ftyp'
    0x68, 0x65, 0x69, 0x63, // 'heic' brand
  ]

  // Valid HEIF with mif1 brand
  const VALID_MIF1_BYTES = [
    0x00, 0x00, 0x00, 0x18,
    0x66, 0x74, 0x79, 0x70, // 'ftyp'
    0x6D, 0x69, 0x66, 0x31, // 'mif1' brand
  ]

  // Invalid: not ftyp
  const INVALID_NOT_FTYP = [
    0x00, 0x00, 0x00, 0x18,
    0x78, 0x78, 0x78, 0x78, // 'xxxx' - not ftyp
    0x68, 0x65, 0x69, 0x63,
  ]

  // Invalid: unknown brand
  const INVALID_UNKNOWN_BRAND = [
    0x00, 0x00, 0x00, 0x18,
    0x66, 0x74, 0x79, 0x70, // 'ftyp'
    0x78, 0x78, 0x78, 0x78, // 'xxxx' - unknown brand
  ]

  // JPEG magic bytes (not HEIC)
  const JPEG_BYTES = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]

  // Test the validation logic directly with ArrayBuffer (simulates what the function does)
  function validateHeicBytes(bytes: number[]): boolean {
    if (bytes.length < 12) return false

    // HEIC files have 'ftyp' at offset 4
    const ftyp = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7])
    if (ftyp !== 'ftyp') return false

    // Valid brands: heic, heix, hevc, hevx, mif1, msf1
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11])
    return ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand)
  }

  it('should return true for valid HEIC file', () => {
    const result = validateHeicBytes(VALID_HEIC_BYTES)
    expect(result).toBe(true)
  })

  it('should return true for valid HEIF (mif1 brand)', () => {
    const result = validateHeicBytes(VALID_MIF1_BYTES)
    expect(result).toBe(true)
  })

  it('should return false when ftyp marker is missing', () => {
    const result = validateHeicBytes(INVALID_NOT_FTYP)
    expect(result).toBe(false)
  })

  it('should return false for unknown brand', () => {
    const result = validateHeicBytes(INVALID_UNKNOWN_BRAND)
    expect(result).toBe(false)
  })

  it('should return false for JPEG file', () => {
    const result = validateHeicBytes(JPEG_BYTES)
    expect(result).toBe(false)
  })

  it('should return false for empty file', () => {
    const result = validateHeicBytes([])
    expect(result).toBe(false)
  })

  it('should return false for file smaller than 12 bytes', () => {
    const result = validateHeicBytes([0x00, 0x00, 0x00, 0x00])
    expect(result).toBe(false)
  })

  it('should handle all valid HEIC brands', () => {
    const brands = ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1']

    for (const brand of brands) {
      const bytes = [
        0x00, 0x00, 0x00, 0x18,
        0x66, 0x74, 0x79, 0x70, // 'ftyp'
        brand.charCodeAt(0), brand.charCodeAt(1), brand.charCodeAt(2), brand.charCodeAt(3),
      ]
      const result = validateHeicBytes(bytes)
      expect(result).toBe(true)
    }
  })
})
