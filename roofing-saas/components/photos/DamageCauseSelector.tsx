'use client'

import { cn } from '@/lib/utils'
import { type DamageCause, DAMAGE_CAUSE_OPTIONS } from '@/lib/types/photo-labels'
import { Cloud, Wind, Clock, Droplet, AlertTriangle, HelpCircle } from 'lucide-react'

interface DamageCauseSelectorProps {
  value?: DamageCause
  onChange: (cause: DamageCause) => void
  className?: string
}

const ICONS: Record<DamageCause, typeof Cloud> = {
  hail: Cloud,
  wind: Wind,
  wear: Clock,
  water: Droplet,
  impact: AlertTriangle,
  other: HelpCircle,
}

export function DamageCauseSelector({ value, onChange, className }: DamageCauseSelectorProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium text-muted-foreground">Damage Cause</label>
      <div className="grid grid-cols-3 gap-2">
        {DAMAGE_CAUSE_OPTIONS.map(option => {
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
