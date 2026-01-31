#!/usr/bin/env tsx
/**
 * Generate Missing Thumbnails
 *
 * Backfill script to generate thumbnails for existing photos
 * that were uploaded before thumbnail generation was added.
 *
 * Usage:
 *   npm run generate-thumbnails
 *   # or with limit:
 *   npm run generate-thumbnails -- --limit 100
 *   # dry run:
 *   npm run generate-thumbnails -- --dry-run
 */

import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface Photo {
  id: string
  file_url: string
  file_path: string
  thumbnail_url: string | null
  tenant_id: string
}

interface Stats {
  total: number
  processed: number
  success: number
  failed: number
  skipped: number
}

const stats: Stats = {
  total: 0,
  processed: 0,
  success: 0,
  failed: 0,
  skipped: 0,
}

async function generateThumbnail(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize(400, 400, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80 })
    .toBuffer()
}

async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

async function processPhoto(photo: Photo, dryRun: boolean): Promise<boolean> {
  const photoId = photo.id.substring(0, 8)

  try {
    // Skip if already has a different thumbnail URL
    if (photo.thumbnail_url && photo.thumbnail_url !== photo.file_url) {
      console.log(`  [${photoId}] Already has thumbnail, skipping`)
      stats.skipped++
      return true
    }

    console.log(`  [${photoId}] Processing...`)

    if (dryRun) {
      console.log(`  [${photoId}] DRY RUN - would generate thumbnail`)
      stats.success++
      return true
    }

    // Download the original image
    console.log(`  [${photoId}] Downloading original...`)
    const imageBuffer = await downloadImage(photo.file_url)
    console.log(`  [${photoId}] Downloaded ${(imageBuffer.length / 1024).toFixed(1)}KB`)

    // Generate thumbnail
    console.log(`  [${photoId}] Generating thumbnail...`)
    const thumbnailBuffer = await generateThumbnail(imageBuffer)
    console.log(`  [${photoId}] Thumbnail ${(thumbnailBuffer.length / 1024).toFixed(1)}KB`)

    // Generate thumbnail path based on original path
    const originalPath = photo.file_path
    const thumbPath = originalPath.replace(/\/IMG_/, '/thumb_').replace(/\.[^.]+$/, '.jpg')

    // Upload thumbnail
    console.log(`  [${photoId}] Uploading to ${thumbPath}...`)
    const { error: uploadError } = await supabase.storage
      .from('property-photos')
      .upload(thumbPath, thumbnailBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true, // Allow overwrite for re-runs
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('property-photos')
      .getPublicUrl(thumbPath)

    // Update photo record
    const { error: updateError } = await supabase
      .from('project_files')
      .update({ thumbnail_url: urlData.publicUrl })
      .eq('id', photo.id)

    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`)
    }

    console.log(`  [${photoId}] Success!`)
    stats.success++
    return true
  } catch (error) {
    console.error(`  [${photoId}] Failed:`, error instanceof Error ? error.message : error)
    stats.failed++
    return false
  }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const limitArg = args.find(a => a.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 1000

  console.log('='.repeat(60))
  console.log('Generate Missing Thumbnails')
  console.log('='.repeat(60))
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Limit: ${limit}`)
  console.log('')

  // Query photos without thumbnails (or where thumbnail === file_url)
  console.log('Querying photos without thumbnails...')

  const { data: photos, error } = await supabase
    .from('project_files')
    .select('id, file_url, file_path, thumbnail_url, tenant_id')
    .eq('file_type', 'photo')
    .eq('is_deleted', false)
    .or('thumbnail_url.is.null,thumbnail_url.eq.file_url')
    .limit(limit)

  if (error) {
    console.error('Query failed:', error)
    process.exit(1)
  }

  if (!photos || photos.length === 0) {
    console.log('No photos need thumbnails!')
    return
  }

  stats.total = photos.length
  console.log(`Found ${photos.length} photos to process`)
  console.log('')

  // Process each photo
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]
    console.log(`[${i + 1}/${photos.length}] Photo ${photo.id.substring(0, 8)}...`)
    stats.processed++

    await processPhoto(photo, dryRun)

    // Small delay to avoid rate limiting
    if (!dryRun && i < photos.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  // Print summary
  console.log('')
  console.log('='.repeat(60))
  console.log('Summary')
  console.log('='.repeat(60))
  console.log(`Total:     ${stats.total}`)
  console.log(`Processed: ${stats.processed}`)
  console.log(`Success:   ${stats.success}`)
  console.log(`Failed:    ${stats.failed}`)
  console.log(`Skipped:   ${stats.skipped}`)
  console.log('')

  if (stats.failed > 0) {
    console.log('Some photos failed to process. Run again to retry.')
    process.exit(1)
  }

  console.log('Done!')
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
