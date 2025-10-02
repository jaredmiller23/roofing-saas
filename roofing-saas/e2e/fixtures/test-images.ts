/**
 * Test Image Fixtures
 * Creates test images for upload testing
 */

import { promises as fs } from 'fs'
import path from 'path'

/**
 * Create a test PNG image
 */
export async function createTestImage(
  outputPath: string,
  width = 800,
  height = 600
): Promise<string> {
  // Create a simple PNG file (1x1 red pixel, base64 encoded)
  const base64PNG =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='

  const buffer = Buffer.from(base64PNG, 'base64')
  const fullPath = path.resolve(outputPath)

  // Ensure directory exists
  await fs.mkdir(path.dirname(fullPath), { recursive: true })

  // Write file
  await fs.writeFile(fullPath, buffer)

  console.log(`✅ Created test image: ${fullPath}`)
  return fullPath
}

/**
 * Create a large test image (for compression testing)
 */
export async function createLargeTestImage(
  outputPath: string
): Promise<string> {
  // For now, just create a regular test image
  // In a real scenario, you'd generate a larger image
  return createTestImage(outputPath, 1920, 1080)
}

/**
 * Clean up test images
 */
export async function cleanupTestImages(directory: string) {
  try {
    const files = await fs.readdir(directory)
    for (const file of files) {
      if (file.startsWith('test-') && file.endsWith('.png')) {
        await fs.unlink(path.join(directory, file))
      }
    }
    console.log(`🗑️ Cleaned up test images in ${directory}`)
  } catch (error) {
    console.error('Error cleaning up test images:', error)
  }
}
