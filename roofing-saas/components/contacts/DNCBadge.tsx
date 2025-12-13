'use client'

import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { PhoneOff } from 'lucide-react'
import type { DNCStatus } from '@/lib/compliance/types'

interface DNCBadgeProps {
  status: DNCStatus | null | undefined
  showLabel?: boolean
}

/**
 * Badge component to display DNC (Do Not Call) status
 * Shows colored badge with icon and tooltip explanation
 */
export function DNCBadge({ status, showLabel = true }: DNCBadgeProps) {
  // Don't show anything if status is clear or null
  if (!status || status === 'clear') {
    return null
  }

  // Get badge styling based on status
  const getBadgeConfig = (dncStatus: DNCStatus) => {
    switch (dncStatus) {
      case 'federal':
        return {
          className: 'bg-red-500 text-white border-red-600',
          label: 'Federal DNC',
          description: 'This contact is on the Federal Do Not Call Registry. Calls are prohibited by law.',
        }
      case 'state':
        return {
          className: 'bg-orange-500 text-white border-orange-600',
          label: 'State DNC',
          description: 'This contact is on the State Do Not Call Registry. Calls are prohibited by state law.',
        }
      case 'both':
        return {
          className: 'bg-red-500 text-white border-red-600',
          label: 'Federal & State DNC',
          description: 'This contact is on both Federal and State Do Not Call Registries. Calls are prohibited.',
        }
      case 'internal':
        return {
          className: 'bg-yellow-500 text-white border-yellow-600',
          label: 'Internal DNC',
          description: 'This contact requested not to be called. Respect their preference.',
        }
      default:
        return {
          className: 'bg-muted text-muted-foreground',
          label: 'Unknown',
          description: 'DNC status unknown',
        }
    }
  }

  const config = getBadgeConfig(status)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={config.className}>
            <PhoneOff className="h-3 w-3" />
            {showLabel && <span className="ml-1">{config.label}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
