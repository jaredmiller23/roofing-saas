'use client'

import { cn } from '@/lib/utils'
import { type PhotoType, PHOTO_TYPE_OPTIONS } from '@/lib/types/photo-labels'
import { Clock, Camera, CheckCircle, ZoomIn, Maximize, Ruler } from 'lucide-react'

interface PhotoTypeSelectorProps {
  value?: PhotoType
  onChange: (type: PhotoType) => void
  className?: string
}

const ICONS: Record<PhotoType, typeof Clock> = {
  before: Clock,
  during: Camera,
  after: CheckCircle,
  detail: ZoomIn,
  overview: Maximize,
  measurement: Ruler,
}

export function PhotoTypeSelector({ value, onChange, className }: PhotoTypeSelectorProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium text-muted-foreground">Photo Type</label>
      <div className="grid grid-cols-3 gap-2">
        {PHOTO_TYPE_OPTIONS.map(option => {
          const Icon = ICONS[option.value]
          const isSelected = value === option.value

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                'flex flex-col items-center gap-1 p-3 rounded-lg border transition-all',
                isSelected
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card hover:border-primary/50 text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
