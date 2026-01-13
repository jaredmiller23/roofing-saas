/**
 * Type declarations for heic-convert
 *
 * heic-convert is a pure JavaScript HEIC/HEIF image converter.
 * It converts HEIC images to JPEG or PNG format.
 */

declare module 'heic-convert' {
  interface ConvertOptions {
    /** Input buffer containing HEIC/HEIF image data */
    buffer: Buffer
    /** Output format: 'JPEG' or 'PNG' */
    format: 'JPEG' | 'PNG'
    /** Quality for JPEG output (0-1). Default: 0.92 */
    quality?: number
  }

  /**
   * Convert HEIC/HEIF image to JPEG or PNG
   *
   * @param options - Conversion options
   * @returns Promise resolving to ArrayBuffer containing converted image
   */
  function heicConvert(options: ConvertOptions): Promise<ArrayBuffer>

  export = heicConvert
}
