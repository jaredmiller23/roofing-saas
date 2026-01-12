'use client'

import { Badge } from '@/components/ui/badge'
import type {
  AdjusterPatternType,
  CarrierPatternType,
  PatternFrequency,
} from '@/lib/claims/intelligence-types'

interface PatternBadgeProps {
  type: AdjusterPatternType | CarrierPatternType
  frequency?: PatternFrequency
  showFrequency?: boolean
}

/**
 * Human-readable labels and variants for pattern types
 */
const PATTERN_CONFIG: Record<
  string,
  { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }
> = {
  // Adjuster patterns - negative
  omits_line_item: { label: 'Omits Items', variant: 'destructive' },
  disputes_item: { label: 'Disputes', variant: 'destructive' },
  slow_response: { label: 'Slow Response', variant: 'secondary' },
  unreachable: { label: 'Unreachable', variant: 'secondary' },
  low_balls: { label: 'Low-balls', variant: 'destructive' },
  // Adjuster patterns - positive
  thorough: { label: 'Thorough', variant: 'default' },
  reasonable: { label: 'Reasonable', variant: 'default' },
  fair: { label: 'Fair', variant: 'default' },
  // Carrier patterns - negative
  denies_coverage: { label: 'Denies Coverage', variant: 'destructive' },
  disputes_line_item: { label: 'Disputes Items', variant: 'destructive' },
  slow_payment: { label: 'Slow Payment', variant: 'secondary' },
  requires_inspection: { label: 'Requires Reinspection', variant: 'secondary' },
  fights_matching: { label: 'Fights Matching', variant: 'destructive' },
  fights_code_upgrade: { label: 'Fights Code Upgrade', variant: 'destructive' },
  // Carrier patterns - positive
  accepts_supplements: { label: 'Accepts Supplements', variant: 'default' },
}

/**
 * Frequency display config
 */
const FREQUENCY_CONFIG: Record<PatternFrequency, { label: string; className: string }> = {
  always: { label: 'Always', className: 'border-red-500 text-red-500' },
  often: { label: 'Often', className: 'border-orange-500 text-orange-500' },
  sometimes: { label: 'Sometimes', className: 'border-yellow-500 text-yellow-500' },
  rarely: { label: 'Rarely', className: 'border-muted-foreground text-muted-foreground' },
}

/**
 * PatternBadge - Display pattern type with optional frequency
 *
 * @example
 * <PatternBadge type="omits_line_item" frequency="often" showFrequency />
 */
export function PatternBadge({
  type,
  frequency,
  showFrequency = true,
}: PatternBadgeProps) {
  const config = PATTERN_CONFIG[type] || { label: type, variant: 'outline' as const }
  const freqConfig = frequency ? FREQUENCY_CONFIG[frequency] : null

  return (
    <div className="flex items-center gap-1">
      <Badge variant={config.variant}>{config.label}</Badge>
      {showFrequency && freqConfig && (
        <Badge variant="outline" className={freqConfig.className}>
          {freqConfig.label}
        </Badge>
      )}
    </div>
  )
}

/**
 * Get human-readable label for a pattern type
 */
export function getPatternLabel(type: AdjusterPatternType | CarrierPatternType): string {
  return PATTERN_CONFIG[type]?.label || type
}

/**
 * FrequencyBadge - Standalone frequency indicator
 */
export function FrequencyBadge({ frequency }: { frequency: PatternFrequency }) {
  const config = FREQUENCY_CONFIG[frequency]
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  )
}
