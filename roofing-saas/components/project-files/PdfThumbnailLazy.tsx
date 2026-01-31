'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import { FileIconFallback } from './FileIconFallback'
import type { ProjectFile } from '@/lib/types/file'

const SIZE_MAP = { sm: 40, md: 64, lg: 128 } as const

const PdfPagePreview = dynamic(
  () => import('./PdfPagePreview').then((mod) => ({ default: mod.PdfPagePreview })),
  { ssr: false, loading: () => null }
)

interface PdfThumbnailLazyProps {
  file: ProjectFile
  size?: keyof typeof SIZE_MAP
  className?: string
}

export function PdfThumbnailLazy({ file, size = 'sm', className }: PdfThumbnailLazyProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const dim = SIZE_MAP[size]

  if (status === 'error') {
    return <FileIconFallback file={file} size={size} className={className} />
  }

  return (
    <div
      className={`relative flex-shrink-0 rounded overflow-hidden bg-muted ${className ?? ''}`}
      style={{ width: dim, height: dim }}
    >
      {status === 'loading' && (
        <Skeleton className="absolute inset-0" style={{ width: dim, height: dim }} />
      )}
      <PdfPagePreview
        fileUrl={file.file_url}
        width={dim}
        onLoadSuccess={() => setStatus('loaded')}
        onLoadError={() => setStatus('error')}
      />
    </div>
  )
}
