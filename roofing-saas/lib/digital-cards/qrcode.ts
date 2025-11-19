// =============================================
// Digital Cards - QR Code Generation Utility
// =============================================
// Purpose: Generate QR codes for business card URLs
// Library: qrcode (npm install qrcode @types/qrcode)
// Author: Claude Code
// Date: 2025-11-18
// =============================================

import type { QRCodeOptions } from './types'
import { getFullCardUrl } from './types'

// =============================================
// QR Code Generation (Browser)
// =============================================

/**
 * Generate QR code as data URL for browser display
 * This function is client-side only (uses canvas)
 */
export async function generateQRCodeDataURL(
  url: string,
  options?: QRCodeOptions
): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('generateQRCodeDataURL can only be used in browser environment')
  }

  // Dynamically import qrcode (client-side only)
  const QRCode = await import('qrcode')

  const qrOptions = {
    errorCorrectionLevel: options?.errorCorrectionLevel || 'M',
    type: 'image/png' as const,
    quality: 1,
    margin: options?.margin || 4,
    width: options?.size || 300,
    color: {
      dark: options?.color?.dark || '#000000',
      light: options?.color?.light || '#FFFFFF',
    },
  }

  return QRCode.toDataURL(url, qrOptions)
}

/**
 * Generate QR code and render to canvas element
 */
export async function renderQRCodeToCanvas(
  canvas: HTMLCanvasElement,
  url: string,
  options?: QRCodeOptions
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('renderQRCodeToCanvas can only be used in browser environment')
  }

  const QRCode = await import('qrcode')

  const qrOptions = {
    errorCorrectionLevel: options?.errorCorrectionLevel || 'M',
    margin: options?.margin || 4,
    width: options?.size || 300,
    color: {
      dark: options?.color?.dark || '#000000',
      light: options?.color?.light || '#FFFFFF',
    },
  }

  await QRCode.toCanvas(canvas, url, qrOptions)
}

// =============================================
// QR Code Generation (Server)
// =============================================

/**
 * Generate QR code as Buffer for server-side use (API routes, Edge Functions)
 * Returns PNG image buffer
 */
export async function generateQRCodeBuffer(
  url: string,
  options?: QRCodeOptions
): Promise<Buffer> {
  // Dynamically import qrcode for server-side use
  const QRCode = await import('qrcode')

  const qrOptions = {
    errorCorrectionLevel: options?.errorCorrectionLevel || 'M',
    type: 'png' as const,
    quality: 1,
    margin: options?.margin || 4,
    width: options?.size || 300,
    color: {
      dark: options?.color?.dark || '#000000',
      light: options?.color?.light || '#FFFFFF',
    },
  }

  return QRCode.toBuffer(url, qrOptions)
}

/**
 * Generate QR code Response for API routes
 * Returns a Response object with PNG image
 */
export async function createQRCodeResponse(
  url: string,
  options?: QRCodeOptions
): Promise<Response> {
  const buffer = await generateQRCodeBuffer(url, options)

  return new Response(buffer as any, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}

// =============================================
// Business Card Specific Functions
// =============================================

/**
 * Generate QR code for a business card URL
 */
export async function generateCardQRCode(
  slug: string,
  baseUrl?: string,
  options?: QRCodeOptions
): Promise<string> {
  const url = getFullCardUrl(slug, baseUrl)
  return generateQRCodeDataURL(url, options)
}

/**
 * Generate QR code with brand color
 * Uses the card's brand color as the QR code color
 */
export async function generateBrandedQRCode(
  slug: string,
  brandColor: string,
  baseUrl?: string,
  options?: Omit<QRCodeOptions, 'color'>
): Promise<string> {
  const url = getFullCardUrl(slug, baseUrl)

  return generateQRCodeDataURL(url, {
    ...options,
    color: {
      dark: brandColor,
      light: '#FFFFFF',
    },
  })
}

/**
 * Download QR code as PNG file
 */
export async function downloadQRCode(
  url: string,
  filename: string,
  options?: QRCodeOptions
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('downloadQRCode can only be used in browser environment')
  }

  const dataUrl = await generateQRCodeDataURL(url, options)

  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename

  document.body.appendChild(link)
  link.click()

  // Cleanup
  document.body.removeChild(link)
}

/**
 * Download business card QR code
 */
export async function downloadCardQRCode(
  slug: string,
  cardName: string,
  baseUrl?: string,
  options?: QRCodeOptions
): Promise<void> {
  const url = getFullCardUrl(slug, baseUrl)
  const filename = `${cardName.replace(/\s+/g, '_')}_QR.png`

  await downloadQRCode(url, filename, options)
}

// =============================================
// Validation
// =============================================

/**
 * Validate QR code options
 */
export function validateQRCodeOptions(options: QRCodeOptions): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (options.size && (options.size < 100 || options.size > 1000)) {
    errors.push('QR code size must be between 100 and 1000 pixels')
  }

  if (options.margin && (options.margin < 0 || options.margin > 10)) {
    errors.push('QR code margin must be between 0 and 10')
  }

  if (
    options.errorCorrectionLevel &&
    !['L', 'M', 'Q', 'H'].includes(options.errorCorrectionLevel)
  ) {
    errors.push('Error correction level must be L, M, Q, or H')
  }

  if (options.color?.dark && !/^#[0-9a-fA-F]{6}$/.test(options.color.dark)) {
    errors.push('Dark color must be a valid hex color')
  }

  if (options.color?.light && !/^#[0-9a-fA-F]{6}$/.test(options.color.light)) {
    errors.push('Light color must be a valid hex color')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// =============================================
// Default Options
// =============================================

export const DEFAULT_QR_OPTIONS: QRCodeOptions = {
  size: 300,
  errorCorrectionLevel: 'M',
  margin: 4,
  color: {
    dark: '#000000',
    light: '#FFFFFF',
  },
}

export const HIGH_QUALITY_QR_OPTIONS: QRCodeOptions = {
  size: 512,
  errorCorrectionLevel: 'H',
  margin: 4,
  color: {
    dark: '#000000',
    light: '#FFFFFF',
  },
}

export const PRINT_QR_OPTIONS: QRCodeOptions = {
  size: 1000,
  errorCorrectionLevel: 'H',
  margin: 6,
  color: {
    dark: '#000000',
    light: '#FFFFFF',
  },
}
