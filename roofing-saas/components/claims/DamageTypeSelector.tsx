'use client'

import { cn } from '@/lib/utils'

/**
 * Damage types for roofing claim documentation
 */
export const DAMAGE_TYPES = [
  { value: 'overview', label: 'Overview Shot', icon: 'view' },
  { value: 'shingles', label: 'Shingles', icon: 'roof' },
  { value: 'ridge_cap', label: 'Ridge Cap', icon: 'peak' },
  { value: 'flashing', label: 'Flashing', icon: 'edge' },
  { value: 'gutters', label: 'Gutters', icon: 'gutter' },
  { value: 'soffit', label: 'Soffit', icon: 'underside' },
  { value: 'fascia', label: 'Fascia', icon: 'board' },
  { value: 'vents', label: 'Vents', icon: 'vent' },
  { value: 'skylights', label: 'Skylights', icon: 'window' },
  { value: 'chimney', label: 'Chimney', icon: 'chimney' },
  { value: 'siding', label: 'Siding', icon: 'wall' },
  { value: 'windows', label: 'Windows', icon: 'window' },
  { value: 'other', label: 'Other', icon: 'other' },
] as const

export type DamageType = (typeof DAMAGE_TYPES)[number]['value']

export const SEVERITY_LEVELS = [
  { value: 'minor', label: 'Minor', color: 'yellow' },
  { value: 'moderate', label: 'Moderate', color: 'orange' },
  { value: 'severe', label: 'Severe', color: 'red' },
] as const

export type SeverityLevel = (typeof SEVERITY_LEVELS)[number]['value']

interface DamageTypeSelectorProps {
  value?: DamageType
  onChange: (value: DamageType) => void
  className?: string
}

export function DamageTypeSelector({
  value,
  onChange,
  className,
}: DamageTypeSelectorProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium text-muted-foreground">Damage Type</label>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {DAMAGE_TYPES.map(type => (
          <button
            key={type.value}
            type="button"
            onClick={() => onChange(type.value)}
            className={cn(
              'p-2 text-xs rounded-lg border transition-all text-center',
              value === type.value
                ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                : 'border-border hover:border-muted-foreground/20 text-muted-foreground'
            )}
          >
            {type.label}
          </button>
        ))}
      </div>
    </div>
  )
}

interface SeveritySelectorProps {
  value?: SeverityLevel
  onChange: (value: SeverityLevel) => void
  className?: string
}

export function SeveritySelector({
  value,
  onChange,
  className,
}: SeveritySelectorProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium text-muted-foreground">Severity</label>
      <div className="flex gap-2">
        {SEVERITY_LEVELS.map(level => (
          <button
            key={level.value}
            type="button"
            onClick={() => onChange(level.value)}
            className={cn(
              'flex-1 py-2 px-3 text-sm rounded-lg border transition-all',
              value === level.value
                ? level.color === 'yellow'
                  ? 'border-yellow-500 bg-yellow-50 text-yellow-700 font-medium'
                  : level.color === 'orange'
                    ? 'border-orange-500 bg-orange-50 text-orange-700 font-medium'
                    : 'border-red-500 bg-red-50 text-red-700 font-medium'
                : 'border-border hover:border-muted-foreground/20 text-muted-foreground'
            )}
          >
            {level.label}
          </button>
        ))}
      </div>
    </div>
  )
}
