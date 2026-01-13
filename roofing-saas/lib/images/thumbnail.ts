/**
 * Server-Side Thumbnail Generation
 *
 * Generates optimized thumbnails from image buffers using sharp.
 * Sharp is well-supported on Vercel serverless functions.
 */

import sharp from 'sharp'
import { logger } from '@/lib/logger'

export interface ThumbnailResult {
  buffer: Buffer
  width: number
  height: number
  format: string
}

export interface ThumbnailOptions {
  /** Maximum width or height in pixels (default: 400) */
  maxDimension?: number
  /** JPEG quality 1-100 (default: 80) */
  quality?: number
  /** Output format (default: 'jpeg') */
  format?: 'jpeg' | 'webp' | 'png'
}

const DEFAULT_OPTIONS: Required<ThumbnailOptions> = {
  maxDimension: 400,
  quality: 80,
  format: 'jpeg',
}

/**
 * Generate a thumbnail from an image buffer.
 *
 * Uses sharp for fast, reliable image processing.
 * Maintains aspect ratio while constraining to max dimension.
 *
 * @param inputBuffer - The source image buffer (JPEG, PNG, WebP, etc.)
 * @param options - Thumbnail generation options
 * @returns Thumbnail result with buffer and dimensions
 *
 * @example
 * const thumb = await generateThumbnail(imageBuffer, { maxDimension: 200 })
 * // thumb.buffer is a 200x200 (max) JPEG
 */
export async function generateThumbnail(
  inputBuffer: Buffer,
  options?: ThumbnailOptions
): Promise<ThumbnailResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const startTime = Date.now()

  try {
    logger.info('[Thumbnail] Starting generation', {
      inputSize: inputBuffer.length,
      maxDimension: opts.maxDimension,
      format: opts.format,
    })

    let pipeline = sharp(inputBuffer).resize(opts.maxDimension, opts.maxDimension, {
      fit: 'inside',
      withoutEnlargement: true,
    })

    // Apply format-specific encoding
    switch (opts.format) {
      case 'webp':
        pipeline = pipeline.webp({ quality: opts.quality })
        break
      case 'png':
        pipeline = pipeline.png({ compressionLevel: 9 })
        break
      case 'jpeg':
      default:
        pipeline = pipeline.jpeg({ quality: opts.quality })
        break
    }

    const result = await pipeline.toBuffer({ resolveWithObject: true })

    const duration = Date.now() - startTime

    logger.info('[Thumbnail] Generation complete', {
      inputSize: inputBuffer.length,
      outputSize: result.data.length,
      width: result.info.width,
      height: result.info.height,
      format: result.info.format,
      durationMs: duration,
    })

    return {
      buffer: result.data,
      width: result.info.width,
      height: result.info.height,
      format: result.info.format,
    }
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('[Thumbnail] Generation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      inputSize: inputBuffer.length,
      durationMs: duration,
    })
    throw error
  }
}

/**
 * Get the MIME type for a thumbnail format.
 *
 * @param format - The thumbnail format
 * @returns The corresponding MIME type
 */
export function getThumbnailMimeType(format: ThumbnailOptions['format'] = 'jpeg'): string {
  switch (format) {
    case 'webp':
      return 'image/webp'
    case 'png':
      return 'image/png'
    case 'jpeg':
    default:
      return 'image/jpeg'
  }
}
