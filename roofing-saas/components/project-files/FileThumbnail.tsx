'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { FileIconFallback } from './FileIconFallback'
import { PdfThumbnailLazy } from './PdfThumbnailLazy'
import type { ProjectFile } from '@/lib/types/file'

const SIZE_MAP = { sm: 40, md: 64, lg: 128 } as const

interface FileThumbnailProps {
  file: ProjectFile
  size?: keyof typeof SIZE_MAP
  className?: string
}

function isImage(file: ProjectFile): boolean {
  if (file.mime_type?.startsWith('image/')) return true
  if (file.file_type === 'photo') return true
  const ext = file.file_extension?.toLowerCase().replace(/^\./, '')
  return !!ext && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'bmp', 'svg'].includes(ext)
}

function isPdf(file: ProjectFile): boolean {
  if (file.mime_type === 'application/pdf') return true
  const ext = file.file_extension?.toLowerCase().replace(/^\./, '')
  return ext === 'pdf'
}

export function FileThumbnail({ file, size = 'sm', className }: FileThumbnailProps) {
  const [imgError, setImgError] = useState(false)
  const dim = SIZE_MAP[size]

  // Path 1: Has a thumbnail URL that loads successfully
  const thumbnailSrc = file.thumbnail_url && !imgError ? file.thumbnail_url : null

  if (thumbnailSrc) {
    return (
      <div
        className={cn('relative flex-shrink-0 rounded overflow-hidden bg-muted', className)}
        style={{ width: dim, height: dim }}
      >
        <Image
          src={thumbnailSrc}
          alt={file.file_name}
          width={dim}
          height={dim}
          className="object-cover"
          style={{ width: dim, height: dim }}
          onError={() => setImgError(true)}
          loading="lazy"
          sizes={`${dim}px`}
          unoptimized
        />
      </div>
    )
  }

  // Path 2: Image file without stored thumbnail — show file_url directly
  if (isImage(file) && !imgError) {
    return (
      <div
        className={cn('relative flex-shrink-0 rounded overflow-hidden bg-muted', className)}
        style={{ width: dim, height: dim }}
      >
        <Image
          src={file.file_url}
          alt={file.file_name}
          width={dim}
          height={dim}
          className="object-cover"
          style={{ width: dim, height: dim }}
          onError={() => setImgError(true)}
          loading="lazy"
          sizes={`${dim}px`}
          unoptimized
        />
      </div>
    )
  }

  // Path 3: PDF without thumbnail — lazy-load PDF page preview
  if (isPdf(file)) {
    return <PdfThumbnailLazy file={file} size={size} className={className} />
  }

  // Path 4: Everything else — file-type-specific icon
  return <FileIconFallback file={file} size={size} className={className} />
}
