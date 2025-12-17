'use client'

/**
 * FieldWorkerHome Component
 *
 * Mobile-first home screen with 4 large, touch-friendly buttons for the most
 * common field worker actions. Designed to pass the "truck test" - usable
 * while bouncing down a dirt road.
 */

import { Button } from '@/components/ui/button'
import { useUIMode } from '@/hooks/useUIMode'
import {
  UserPlus,
  Calendar,
  FileText,
  Camera
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FieldWorkerHomeProps {
  className?: string
}

interface FieldWorkerAction {
  id: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  ariaLabel: string
}

export function FieldWorkerHome({ className }: FieldWorkerHomeProps) {
  const { isFieldMode } = useUIMode()

  // Placeholder onClick handlers - these would connect to actual functionality
  const handleNewLead = () => {
    console.log('Navigate to new lead form')
    // TODO: Navigate to new lead creation
  }

  const handleSchedule = () => {
    console.log('Navigate to schedule/calendar')
    // TODO: Navigate to calendar view
  }

  const handleEstimates = () => {
    console.log('Navigate to estimates')
    // TODO: Navigate to estimates/quotes
  }

  const handleReports = () => {
    console.log('Navigate to reports/photos')
    // TODO: Navigate to photo capture/reports
  }

  const actions: FieldWorkerAction[] = [
    {
      id: 'new-lead',
      icon: UserPlus,
      label: 'New Lead',
      onClick: handleNewLead,
      ariaLabel: 'Add new customer lead'
    },
    {
      id: 'schedule',
      icon: Calendar,
      label: 'Schedule',
      onClick: handleSchedule,
      ariaLabel: 'View schedule and appointments'
    },
    {
      id: 'estimates',
      icon: FileText,
      label: 'Estimates',
      onClick: handleEstimates,
      ariaLabel: 'Create or view estimates and quotes'
    },
    {
      id: 'reports',
      icon: Camera,
      label: 'Reports',
      onClick: handleReports,
      ariaLabel: 'Capture photos and create reports'
    }
  ]

  return (
    <div
      className={cn(
        'w-full max-w-2xl mx-auto p-6',
        className
      )}
    >
      {/* Grid container for 2x2 button layout */}
      <div className="grid grid-cols-2 gap-4 sm:gap-6">
        {actions.map((action) => {
          const IconComponent = action.icon

          return (
            <Button
              key={action.id}
              onClick={action.onClick}
              aria-label={action.ariaLabel}
              variant="default"
              className={cn(
                // Large touch-friendly size (exceeds 88px minimum)
                'h-32 sm:h-36 lg:h-40',
                'flex flex-col gap-3',
                'text-lg sm:text-xl font-semibold',
                // Ensure good touch targets with proper padding
                'p-4',
                // Enhanced focus for accessibility
                'focus-visible:ring-4'
              )}
            >
              <IconComponent className="size-8 sm:size-10 lg:size-12" />
              <span className="text-center leading-tight">
                {action.label}
              </span>
            </Button>
          )
        })}
      </div>

      {/* Debug info in development (only visible in field mode) */}
      {process.env.NODE_ENV === 'development' && isFieldMode && (
        <div className="mt-8 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <p>Field Worker Mode Active</p>
          <p>Button heights: 128px (mobile) / 144px (tablet) / 160px (desktop)</p>
        </div>
      )}
    </div>
  )
}