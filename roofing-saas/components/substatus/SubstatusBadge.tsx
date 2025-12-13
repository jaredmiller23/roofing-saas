import { Star } from 'lucide-react'
import type { SubstatusConfig } from '@/lib/substatus/types'

interface SubstatusBadgeProps {
  substatus: SubstatusConfig | null
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

export function SubstatusBadge({
  substatus,
  size = 'md',
  showIcon = false,
  className = ''
}: SubstatusBadgeProps) {
  if (!substatus) {
    return null
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  }

  const dotSizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5'
  }

  const color = substatus.color || '#3B82F6'

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border-2 font-medium ${sizeClasses[size]} ${className}`}
      style={{
        borderColor: color,
        backgroundColor: `${color}15`,
        color: color
      }}
      title={substatus.substatus_description || substatus.substatus_label}
    >
      {/* Color dot */}
      <div
        className={`${dotSizeClasses[size]} rounded-full flex-shrink-0`}
        style={{ backgroundColor: color }}
      />

      {/* Label */}
      <span className="whitespace-nowrap">
        {substatus.substatus_label}
      </span>

      {/* Default indicator */}
      {substatus.is_default && showIcon && (
        <Star className="h-3 w-3 fill-current flex-shrink-0" />
      )}

      {/* Terminal indicator */}
      {substatus.is_terminal && (
        <span className="text-xs opacity-75 flex-shrink-0">[T]</span>
      )}
    </div>
  )
}

interface SubstatusBadgeSkeletonProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function SubstatusBadgeSkeleton({
  size = 'md',
  className = ''
}: SubstatusBadgeSkeletonProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs w-16',
    md: 'px-2.5 py-1 text-sm w-20',
    lg: 'px-3 py-1.5 text-base w-24'
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border-2 border bg-muted ${sizeClasses[size]} ${className} animate-pulse`}
    >
      <div className="w-2 h-2 rounded-full bg-gray-300" />
      <div className="flex-1 h-3 bg-gray-300 rounded" />
    </div>
  )
}
