'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import type { TourStep } from '@/lib/tours/tour-definitions'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'completed-tours'
const SPOTLIGHT_PADDING = 8
const TOOLTIP_GAP = 12
const TRANSITION_DURATION = 200

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

function getCompletedTours(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as string[]
    return []
  } catch {
    return []
  }
}

function markTourCompleted(tourId: string): void {
  const tours = getCompletedTours()
  if (!tours.includes(tourId)) {
    tours.push(tourId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tours))
  }
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

interface Rect {
  top: number
  left: number
  width: number
  height: number
  bottom: number
  right: number
}

function getElementRect(el: Element): Rect {
  const r = el.getBoundingClientRect()
  return {
    top: r.top + window.scrollY,
    left: r.left + window.scrollX,
    width: r.width,
    height: r.height,
    bottom: r.bottom + window.scrollY,
    right: r.right + window.scrollX,
  }
}

function getViewportRect(el: Element): DOMRect {
  return el.getBoundingClientRect()
}

interface TooltipPosition {
  top: number
  left: number
  actualPlacement: TourStep['placement']
}

/**
 * Calculate tooltip position relative to the viewport.
 * Falls back to alternative placements if the preferred one clips the viewport.
 */
function computeTooltipPosition(
  targetViewport: DOMRect,
  tooltipWidth: number,
  tooltipHeight: number,
  preferred: TourStep['placement']
): TooltipPosition {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const gap = TOOLTIP_GAP

  const candidates: TourStep['placement'][] = [preferred]
  // Build fallback order based on preferred placement
  const allPlacements: TourStep['placement'][] = ['bottom', 'top', 'right', 'left']
  for (const p of allPlacements) {
    if (!candidates.includes(p)) candidates.push(p)
  }

  for (const placement of candidates) {
    let top = 0
    let left = 0

    switch (placement) {
      case 'bottom':
        top = targetViewport.bottom + gap
        left = targetViewport.left + targetViewport.width / 2 - tooltipWidth / 2
        break
      case 'top':
        top = targetViewport.top - tooltipHeight - gap
        left = targetViewport.left + targetViewport.width / 2 - tooltipWidth / 2
        break
      case 'right':
        top = targetViewport.top + targetViewport.height / 2 - tooltipHeight / 2
        left = targetViewport.right + gap
        break
      case 'left':
        top = targetViewport.top + targetViewport.height / 2 - tooltipHeight / 2
        left = targetViewport.left - tooltipWidth - gap
        break
    }

    // Clamp to viewport bounds with 8px margin
    left = Math.max(8, Math.min(left, vw - tooltipWidth - 8))
    top = Math.max(8, Math.min(top, vh - tooltipHeight - 8))

    // Check if tooltip fits without being pushed too far from the target
    const fits =
      top >= 0 &&
      top + tooltipHeight <= vh &&
      left >= 0 &&
      left + tooltipWidth <= vw

    if (fits) {
      return { top, left, actualPlacement: placement }
    }
  }

  // Absolute fallback: center in viewport
  return {
    top: Math.max(8, (vh - tooltipHeight) / 2),
    left: Math.max(8, (vw - tooltipWidth) / 2),
    actualPlacement: preferred,
  }
}

// ---------------------------------------------------------------------------
// Component Props
// ---------------------------------------------------------------------------

interface GuidedTourProps {
  /** Unique identifier for this tour (used for localStorage tracking) */
  tourId: string
  /** Ordered list of steps to present */
  steps: TourStep[]
  /** Callback invoked when the tour finishes (completed or skipped) */
  onComplete?: () => void
}

// ---------------------------------------------------------------------------
// GuidedTour Component
// ---------------------------------------------------------------------------

export function GuidedTour({ tourId, steps, onComplete }: GuidedTourProps) {
  const [isActive, setIsActive] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [spotlightRect, setSpotlightRect] = useState<Rect | null>(null)
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null)
  const [mounted, setMounted] = useState(false)

  const tooltipRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<Element | null>(null)

  const currentStep = steps[currentIndex]

  // ---------------------------------------------------------------------------
  // Mount detection (portal requires document.body)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    setMounted(true)
  }, [])

  // ---------------------------------------------------------------------------
  // Auto-start when component mounts and tour not yet completed
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!mounted) return
    const completed = getCompletedTours()
    if (!completed.includes(tourId) && steps.length > 0) {
      // Small delay to let the page fully render
      const timer = setTimeout(() => {
        previousFocusRef.current = document.activeElement
        setIsActive(true)
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [mounted, tourId, steps.length])

  // ---------------------------------------------------------------------------
  // Position the spotlight and tooltip whenever step changes or window resizes
  // ---------------------------------------------------------------------------

  const positionElements = useCallback(() => {
    if (!isActive || !currentStep) return

    const targetEl = document.querySelector(currentStep.target)
    if (!targetEl) {
      // Target not found: skip this step
      if (currentIndex < steps.length - 1) {
        setCurrentIndex((prev) => prev + 1)
      } else {
        closeTour(true)
      }
      return
    }

    // Scroll target into view smoothly
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })

    // After scrolling settles, compute positions
    const computeAfterScroll = () => {
      const rect = getElementRect(targetEl)
      setSpotlightRect(rect)

      const viewportRect = getViewportRect(targetEl)

      // Measure tooltip dimensions
      const tooltip = tooltipRef.current
      const tooltipWidth = tooltip?.offsetWidth ?? 320
      const tooltipHeight = tooltip?.offsetHeight ?? 200

      const pos = computeTooltipPosition(
        viewportRect,
        tooltipWidth,
        tooltipHeight,
        currentStep.placement
      )
      setTooltipPos(pos)

      // Trigger the fade-in
      setIsVisible(true)
    }

    // Short delay for scrolling
    const scrollTimer = setTimeout(computeAfterScroll, 350)
    return () => clearTimeout(scrollTimer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, currentIndex, currentStep])

  useEffect(() => {
    const cleanup = positionElements()
    return cleanup
  }, [positionElements])

  // Reposition on resize and scroll
  useEffect(() => {
    if (!isActive) return

    const handleResize = () => {
      setIsVisible(false)
      positionElements()
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleResize, true)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleResize, true)
    }
  }, [isActive, positionElements])

  // ---------------------------------------------------------------------------
  // Keyboard handling
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          closeTour(false)
          break
        case 'ArrowRight':
        case 'Enter':
          e.preventDefault()
          goNext()
          break
        case 'ArrowLeft':
          e.preventDefault()
          goPrev()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, currentIndex])

  // ---------------------------------------------------------------------------
  // Focus management
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (isActive && isVisible && tooltipRef.current) {
      tooltipRef.current.focus()
    }
  }, [isActive, isVisible, currentIndex])

  // ---------------------------------------------------------------------------
  // Navigation actions
  // ---------------------------------------------------------------------------

  const closeTour = useCallback(
    (completed: boolean) => {
      setIsVisible(false)
      setTimeout(() => {
        if (completed) {
          markTourCompleted(tourId)
        }
        setIsActive(false)
        setCurrentIndex(0)
        setSpotlightRect(null)
        setTooltipPos(null)

        // Restore previous focus
        if (previousFocusRef.current instanceof HTMLElement) {
          previousFocusRef.current.focus()
        }

        onComplete?.()
      }, TRANSITION_DURATION)
    },
    [tourId, onComplete]
  )

  const goNext = useCallback(() => {
    if (currentIndex < steps.length - 1) {
      setIsVisible(false)
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1)
      }, TRANSITION_DURATION)
    } else {
      closeTour(true)
    }
  }, [currentIndex, steps.length, closeTour])

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setIsVisible(false)
      setTimeout(() => {
        setCurrentIndex((prev) => prev - 1)
      }, TRANSITION_DURATION)
    }
  }, [currentIndex])

  // ---------------------------------------------------------------------------
  // Don't render if tour is not active or component hasn't mounted
  // ---------------------------------------------------------------------------

  if (!mounted || !isActive) return null

  // ---------------------------------------------------------------------------
  // Build the overlay clip-path for the spotlight cutout
  // ---------------------------------------------------------------------------

  // We use a box-shadow approach: the overlay covers the viewport, but the
  // spotlight area is "cut out" using a massive box-shadow on a transparent
  // element. This avoids clip-path compatibility issues.

  const spotlightStyle: React.CSSProperties = spotlightRect
    ? {
        position: 'fixed',
        top: spotlightRect.top - window.scrollY - SPOTLIGHT_PADDING,
        left: spotlightRect.left - window.scrollX - SPOTLIGHT_PADDING,
        width: spotlightRect.width + SPOTLIGHT_PADDING * 2,
        height: spotlightRect.height + SPOTLIGHT_PADDING * 2,
        borderRadius: 8,
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
        pointerEvents: 'none' as const,
        zIndex: 70,
        transition: `all ${TRANSITION_DURATION}ms ease-in-out`,
      }
    : {}

  const overlayContent = (
    <div
      className={cn(
        'fixed inset-0 transition-opacity',
        isVisible ? 'opacity-100' : 'opacity-0'
      )}
      style={{
        zIndex: 70,
        transitionDuration: `${TRANSITION_DURATION}ms`,
      }}
      aria-hidden="true"
    >
      {/* Clickable backdrop that skips the tour */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 70 }}
        onClick={() => closeTour(false)}
        role="presentation"
      />

      {/* Spotlight cutout */}
      {spotlightRect && <div style={spotlightStyle} />}

      {/* Tooltip */}
      {tooltipPos && currentStep && (
        <div
          ref={tooltipRef}
          role="dialog"
          aria-label={`Tour step ${currentIndex + 1} of ${steps.length}: ${currentStep.title}`}
          aria-modal="true"
          tabIndex={-1}
          className={cn(
            'fixed bg-card border border-border rounded-lg shadow-xl',
            'w-[min(320px,calc(100vw-32px))] outline-none',
            'transition-opacity',
            isVisible ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
            zIndex: 71,
            transitionDuration: `${TRANSITION_DURATION}ms`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-4 pb-2">
            <h3 className="text-sm font-semibold text-foreground pr-4">
              {currentStep.title}
            </h3>
            <button
              type="button"
              onClick={() => closeTour(false)}
              className="shrink-0 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="px-4 pb-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {currentStep.content}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 pb-4 pt-1">
            <span className="text-xs text-muted-foreground">
              Step {currentIndex + 1} of {steps.length}
            </span>

            <div className="flex items-center gap-2">
              {currentIndex === 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => closeTour(false)}
                  className="text-xs h-8"
                  aria-label="Skip tour"
                >
                  Skip Tour
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goPrev}
                  className="text-xs h-8"
                  aria-label="Previous step"
                >
                  Previous
                </Button>
              )}

              <Button
                size="sm"
                onClick={goNext}
                className="text-xs h-8"
                aria-label={
                  currentIndex === steps.length - 1
                    ? 'Finish tour'
                    : 'Next step'
                }
              >
                {currentIndex === steps.length - 1 ? 'Finish' : 'Next'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return createPortal(overlayContent, document.body)
}
