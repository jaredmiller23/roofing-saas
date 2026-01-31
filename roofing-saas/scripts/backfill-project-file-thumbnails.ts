#!/usr/bin/env tsx
/**
 * Backfill Project File Thumbnails
 *
 * Generates 200x200 thumbnails for existing image files in the `files` bucket
 * that don't have a thumbnail_url set yet.
 *
 * Usage:
 *   npx tsx scripts/backfill-project-file-thumbnails.ts
 *   npx tsx scripts/backfill-project-file-thumbnails.ts --limit=100
 *   npx tsx scripts/backfill-project-file-thumbnails.ts --dry-run
 */

import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface FileRecord {
  id: string
  file_url: string
  file_name: string
  mime_type: string | null
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
    .resize(200, 200, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 75 })
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

function extractStorageFileName(fileUrl: string): string | null {
  // Extract the filename from a Supabase public URL
  // URL format: https://host/storage/v1/object/public/files/project-files/timestamp_random.ext
  const match = fileUrl.match(/project-files\/([^?]+)/)
  return match ? match[1] : null
}

async function processFile(file: FileRecord, dryRun: boolean): Promise<boolean> {
  const shortId = file.id.substring(0, 8)

  try {
    console.log(`  [${shortId}] Processing ${file.file_name}...`)

    if (dryRun) {
      console.log(`  [${shortId}] DRY RUN - would generate thumbnail`)
      stats.success++
      return true
    }

    // Download the original image
    const imageBuffer = await downloadImage(file.file_url)
    console.log(`  [${shortId}] Downloaded ${(imageBuffer.length / 1024).toFixed(1)}KB`)

    // Generate thumbnail
    const thumbnailBuffer = await generateThumbnail(imageBuffer)
    console.log(`  [${shortId}] Thumbnail ${(thumbnailBuffer.length / 1024).toFixed(1)}KB`)

    // Derive thumbnail storage path from original URL
    const originalFileName = extractStorageFileName(file.file_url)
    if (!originalFileName) {
      console.warn(`  [${shortId}] Could not extract storage path from URL, skipping`)
      stats.skipped++
      return false
    }

    const thumbFileName = originalFileName.replace(/\.[^.]+$/, '.jpg')
    const thumbPath = `project-files/thumbs/${thumbFileName}`

    // Upload thumbnail
    const { error: uploadError } = await supabase.storage
      .from('files')
      .upload(thumbPath, thumbnailBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('files')
      .getPublicUrl(thumbPath)

    // Update file record
    const { error: updateError } = await supabase
      .from('project_files')
      .update({ thumbnail_url: urlData.publicUrl })
      .eq('id', file.id)

    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`)
    }

    console.log(`  [${shortId}] Done`)
    stats.success++
    return true
  } catch (error) {
    console.error(`  [${shortId}] Failed:`, error instanceof Error ? error.message : error)
    stats.failed++
    return false
  }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const limitArg = args.find((a) => a.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 500

  console.log('='.repeat(60))
  console.log('Backfill Project File Thumbnails')
  console.log('='.repeat(60))
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Limit: ${limit}`)
  console.log('')

  // Query image files without thumbnails
  console.log('Querying image files without thumbnails...')

  const { data: files, error } = await supabase
    .from('project_files')
    .select('id, file_url, file_name, mime_type, tenant_id')
    .is('thumbnail_url', null)
    .eq('is_deleted', false)
    .or('file_type.eq.photo,mime_type.ilike.image/%')
    .limit(limit)

  if (error) {
    console.error('Query failed:', error)
    process.exit(1)
  }

  if (!files || files.length === 0) {
    console.log('No files need thumbnails!')
    return
  }

  stats.total = files.length
  console.log(`Found ${files.length} files to process`)
  console.log('')

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    console.log(`[${i + 1}/${files.length}] ${file.file_name}`)
    stats.processed++

    await processFile(file, dryRun)

    // Rate limit
    if (!dryRun && i < files.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

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
    console.log('Some files failed. Run again to retry.')
    process.exit(1)
  }

  console.log('Done!')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
