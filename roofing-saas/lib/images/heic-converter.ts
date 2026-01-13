/**
 * Server-Side HEIC Conversion
 *
 * Converts HEIC/HEIF images to JPEG on the server using heic-convert.
 * This replaces unreliable client-side conversion with heic2any.
 *
 * Why server-side?
 * - heic2any hangs indefinitely on large/complex HEIC files
 * - Server environment is controlled and reliable
 * - heic-convert is a pure JS implementation that works consistently
 */

import heicConvert from 'heic-convert'
import { logger } from '@/lib/logger'

export interface ConversionResult {
  buffer: Buffer
  originalMime: string
  convertedMime: string
  wasConverted: boolean
}

/**
 * Valid HEIC/HEIF brand identifiers per ISO base media file format.
 * These appear at bytes 8-11 after the 'ftyp' marker.
 */
const VALID_HEIC_BRANDS = ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'] as const

/**
 * Detect if a buffer contains HEIC data by checking magic bytes.
 *
 * HEIC files follow the ISO base media file format:
 * - Bytes 4-7: 'ftyp' (file type box marker)
 * - Bytes 8-11: Brand identifier (heic, heix, hevc, hevx, mif1, msf1)
 *
 * @param buffer - The file buffer to check
 * @returns true if the buffer appears to be HEIC format
 */
export function isHeicBuffer(buffer: Buffer): boolean {
  if (buffer.length < 12) return false

  const ftyp = buffer.toString('ascii', 4, 8)
  if (ftyp !== 'ftyp') return false

  const brand = buffer.toString('ascii', 8, 12)
  return VALID_HEIC_BRANDS.includes(brand as typeof VALID_HEIC_BRANDS[number])
}

/**
 * Convert HEIC buffer to JPEG on the server.
 *
 * Uses heic-convert which is a pure JavaScript HEIC decoder.
 * Much more reliable than client-side heic2any library.
 *
 * @param buffer - The HEIC file buffer
 * @param quality - JPEG quality (0-1), default 0.9
 * @returns Conversion result with JPEG buffer
 *
 * @example
 * const result = await convertHeicToJpeg(heicBuffer, 0.9)
 * // result.buffer is now a JPEG
 */
export async function convertHeicToJpeg(
  buffer: Buffer,
  quality: number = 0.9
): Promise<ConversionResult> {
  const startTime = Date.now()

  try {
    logger.info('[HEIC] Starting conversion', {
      inputSize: buffer.length,
      quality,
    })

    const jpegArrayBuffer = await heicConvert({
      buffer,
      format: 'JPEG',
      quality,
    })

    // Convert ArrayBuffer to Buffer
    const outputBuffer = Buffer.from(jpegArrayBuffer)
    const duration = Date.now() - startTime

    logger.info('[HEIC] Conversion complete', {
      inputSize: buffer.length,
      outputSize: outputBuffer.length,
      compressionRatio: Math.round((1 - outputBuffer.length / buffer.length) * 100),
      durationMs: duration,
    })

    return {
      buffer: outputBuffer,
      originalMime: 'image/heic',
      convertedMime: 'image/jpeg',
      wasConverted: true,
    }
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('[HEIC] Conversion failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      inputSize: buffer.length,
      durationMs: duration,
    })
    throw error
  }
}

/**
 * Check if a MIME type indicates HEIC/HEIF format.
 *
 * @param mimeType - The MIME type to check
 * @returns true if MIME type is HEIC or HEIF
 */
export function isHeicMimeType(mimeType: string | undefined): boolean {
  if (!mimeType) return false
  return mimeType === 'image/heic' || mimeType === 'image/heif'
}
