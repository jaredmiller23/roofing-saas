'use client'

import { cn } from '@/lib/utils'
import { getFileIcon } from '@/lib/files/file-icons'
import type { ProjectFile } from '@/lib/types/file'

const SIZE_MAP = { sm: 40, md: 64, lg: 128 } as const
const ICON_SIZE_MAP = { sm: 20, md: 28, lg: 48 } as const

interface FileIconFallbackProps {
  file: ProjectFile
  size?: keyof typeof SIZE_MAP
  className?: string
}

export function FileIconFallback({ file, size = 'sm', className }: FileIconFallbackProps) {
  const { icon: Icon } = getFileIcon(file.mime_type, file.file_category, file.file_extension)
  const dim = SIZE_MAP[size]
  const iconDim = ICON_SIZE_MAP[size]

  return (
    <div
      className={cn(
        'flex-shrink-0 rounded flex items-center justify-center bg-primary/10',
        className
      )}
      style={{ width: dim, height: dim }}
    >
      <Icon className="text-primary" style={{ width: iconDim, height: iconDim }} />
    </div>
  )
}
