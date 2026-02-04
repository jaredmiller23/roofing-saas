'use client'

/**
 * FieldWorkerHome Component
 *
 * Mobile-first home screen with 4 large, touch-friendly buttons for the most
 * common field worker actions. Designed to pass the "truck test" - usable
 * while bouncing down a dirt road.
 *
 * P2.5 Polish: Added staggered entry animations, enhanced touch feedback,
 * and reduced motion support for accessibility.
 */

import { useState, useEffect } from 'react'
import { useRouter } from '@/lib/i18n/navigation'
import { Button } from '@/components/ui/button'
import { useUIMode } from '@/hooks/useUIMode'
import {
  UserPlus,
  Map,
  Workflow,
  CheckSquare
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FieldWorkerHomeProps {
  className?: string
}

interface FieldWorkerAction {
  id: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
  ariaLabel: string
}

export function FieldWorkerHome({ className }: FieldWorkerHomeProps) {
  const router = useRouter()
  const { isFieldMode } = useUIMode()
  const [isLoaded, setIsLoaded] = useState(false)
  const [activeButton, setActiveButton] = useState<string | null>(null)

  // Check for reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Check reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)

    // Trigger entry animation after mount
    const timer = setTimeout(() => setIsLoaded(true), 50)

    return () => {
      mediaQuery.removeEventListener('change', handler)
      clearTimeout(timer)
    }
  }, [])

  const handleAction = (action: FieldWorkerAction) => {
    setActiveButton(action.id)
    // Navigate after brief visual feedback
    setTimeout(() => {
      router.push(action.href)
    }, prefersReducedMotion ? 0 : 150)
  }

  const actions: FieldWorkerAction[] = [
    {
      id: 'knock',
      icon: Map,
      label: 'Knock',
      href: '/knocks',
      ariaLabel: 'Start door knocking session'
    },
    {
      id: 'new-contact',
      icon: UserPlus,
      label: 'New Contact',
      href: '/contacts/new',
      ariaLabel: 'Add new contact'
    },
    {
      id: 'pipeline',
      icon: Workflow,
      label: 'Pipeline',
      href: '/projects',
      ariaLabel: 'View sales pipeline and projects'
    },
    {
      id: 'tasks',
      icon: CheckSquare,
      label: 'Tasks',
      href: '/tasks',
      ariaLabel: 'View and manage tasks'
    }
  ]

  // Calculate stagger delay for each button
  const getAnimationDelay = (index: number) => {
    if (prefersReducedMotion) return '0ms'
    return `${index * 75}ms`
  }

  return (
    <div
      className={cn(
        'w-full max-w-2xl mx-auto p-6',
        className
      )}
      role="main"
      aria-label="Field worker quick actions"
    >
      {/* Welcome header with fade-in */}
      <div
        className={cn(
          'text-center mb-6 transition-all duration-300',
          isLoaded && !prefersReducedMotion
            ? 'opacity-100 translate-y-0'
            : prefersReducedMotion
              ? 'opacity-100'
              : 'opacity-0 -translate-y-2'
        )}
      >
        <h1 className="text-2xl font-bold text-foreground">Quick Actions</h1>
        <p className="text-muted-foreground text-sm mt-1">Tap to get started</p>
      </div>

      {/* Grid container for 2x2 button layout */}
      <div
        className="grid grid-cols-2 gap-4 sm:gap-6"
        role="group"
        aria-label="Quick action buttons"
      >
        {actions.map((action, index) => {
          const IconComponent = action.icon
          const isActive = activeButton === action.id

          return (
            <Button
              key={action.id}
              onClick={() => handleAction(action)}
              aria-label={action.ariaLabel}
              aria-pressed={isActive}
              variant="default"
              style={{
                transitionDelay: isLoaded ? '0ms' : getAnimationDelay(index),
              }}
              className={cn(
                // Large touch-friendly size (exceeds 88px minimum)
                'h-32 sm:h-36 lg:h-40',
                'flex flex-col gap-3',
                'text-lg sm:text-xl font-semibold',
                // Ensure good touch targets with proper padding
                'p-4',
                // Enhanced focus for accessibility
                'focus-visible:ring-4 focus-visible:ring-offset-2',
                // Entry animation (staggered)
                'transition-all duration-300 ease-out',
                isLoaded && !prefersReducedMotion
                  ? 'opacity-100 translate-y-0 scale-100'
                  : prefersReducedMotion
                    ? 'opacity-100'
                    : 'opacity-0 translate-y-4 scale-95',
                // Enhanced touch feedback
                !prefersReducedMotion && 'active:scale-[0.97] active:brightness-90',
                // Visual feedback when navigating
                isActive && !prefersReducedMotion && 'scale-[0.95] brightness-75',
                // Shadow and depth
                'shadow-lg hover:shadow-xl',
                'transform-gpu' // Hardware acceleration for smooth animations
              )}
            >
              <IconComponent
                className={cn(
                  'size-8 sm:size-10 lg:size-12',
                  'transition-transform duration-200',
                  !prefersReducedMotion && 'group-hover:scale-110'
                )}
                aria-hidden="true"
              />
              <span className="text-center leading-tight">
                {action.label}
              </span>
            </Button>
          )
        })}
      </div>

      {/* Hint text with fade-in */}
      <div
        className={cn(
          'text-center mt-6 transition-all duration-500 delay-300',
          isLoaded && !prefersReducedMotion
            ? 'opacity-100'
            : prefersReducedMotion
              ? 'opacity-100'
              : 'opacity-0'
        )}
      >
        <p className="text-sm text-muted-foreground">
          Use the menu for more options
        </p>
      </div>

      {/* Debug info in development (only visible in field mode) */}
      {process.env.NODE_ENV === 'development' && isFieldMode && (
        <div className="mt-8 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <p>Field Worker Mode Active</p>
          <p>Button heights: 128px (mobile) / 144px (tablet) / 160px (desktop)</p>
          <p>Reduced motion: {prefersReducedMotion ? 'Yes' : 'No'}</p>
        </div>
      )}
    </div>
  )
}