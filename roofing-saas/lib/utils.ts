import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the application base URL for building absolute URLs
 * Uses NEXT_PUBLIC_APP_URL if available, otherwise falls back to window.location.origin
 * This ensures consistent URL generation between development and production
 */
export function getAppBaseUrl(): string {
  // In client-side code, prefer NEXT_PUBLIC_APP_URL if configured
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  // Fallback to window.location.origin if available (client-side)
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  // Final fallback for SSR/build time
  return 'http://localhost:3000'
}

/**
 * Wrap a promise with a timeout.
 * Rejects with an Error if the promise doesn't resolve within the specified time.
 *
 * @template T - The type of the resolved value
 * @param promise - The promise to wrap with a timeout
 * @param timeoutMs - Maximum time to wait in milliseconds
 * @param errorMessage - Custom error message to use on timeout (default: 'Operation timed out')
 * @returns A promise that resolves with the original value or rejects on timeout
 *
 * @example
 * // Basic usage
 * const result = await withTimeout(fetch(url), 5000, 'Request timed out')
 *
 * @example
 * // With HEIC conversion
 * const converted = await withTimeout(
 *   heic2any({ blob: file, toType: 'image/jpeg' }),
 *   30000,
 *   'HEIC conversion timed out'
 * )
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMessage))
    }, timeoutMs)

    promise
      .then(result => {
        clearTimeout(timer)
        resolve(result)
      })
      .catch(error => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

/**
 * Valid HEIC/HEIF brand identifiers per ISO base media file format.
 * These appear at bytes 8-11 after the 'ftyp' marker.
 */
const VALID_HEIC_BRANDS = ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'] as const

/**
 * Validate that a file is a genuine HEIC/HEIF image by checking its magic bytes.
 *
 * HEIC files follow the ISO base media file format with:
 * - Bytes 4-7: 'ftyp' (file type box marker)
 * - Bytes 8-11: Brand identifier (heic, heix, hevc, hevx, mif1, msf1)
 *
 * This validation prevents the heic2any library from hanging on files that
 * have a .heic extension but aren't actually HEIC format (e.g., renamed JPEGs).
 *
 * @param file - The File object to validate
 * @returns Promise<boolean> - true if the file has valid HEIC magic bytes
 *
 * @example
 * const isValid = await validateHeicFile(selectedFile)
 * if (!isValid) {
 *   throw new Error('File is not a valid HEIC image')
 * }
 */
export async function validateHeicFile(file: File): Promise<boolean> {
  try {
    // Read first 12 bytes which contain the ftyp box header
    const buffer = await file.slice(0, 12).arrayBuffer()
    const bytes = new Uint8Array(buffer)

    // Need at least 12 bytes for validation
    if (bytes.length < 12) return false

    // Check for 'ftyp' at offset 4
    const ftyp = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7])
    if (ftyp !== 'ftyp') return false

    // Check for valid HEIC brand at offset 8
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11])
    return VALID_HEIC_BRANDS.includes(brand as typeof VALID_HEIC_BRANDS[number])
  } catch {
    // If we can't read the file, assume it's not valid
    return false
  }
}
