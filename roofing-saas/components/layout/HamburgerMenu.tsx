'use client'

/**
 * HamburgerMenu Component
 *
 * A reusable hamburger menu component with Instagram-style animations.
 * Features:
 * - Animated hamburger icon (transforms to X when open)
 * - Smooth transitions with reduced motion support
 * - Accessible with proper ARIA attributes
 * - Touch-friendly with haptic feedback
 * - Customizable styling through className
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface HamburgerMenuProps {
  /** CSS class name for custom styling */
  className?: string
  /** Whether the menu is currently open */
  isOpen?: boolean
  /** Callback when the menu button is clicked */
  onClick?: () => void
  /** Custom aria-label for the button */
  ariaLabel?: string
  /** Size of the hamburger icon */
  size?: 'sm' | 'md' | 'lg'
  /** Button variant */
  variant?: 'ghost' | 'outline' | 'secondary'
}

export function HamburgerMenu({
  className,
  isOpen = false,
  onClick,
  ariaLabel = 'Toggle navigation menu',
  size = 'md',
  variant = 'ghost',
}: HamburgerMenuProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)

    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  // Handle haptic feedback for mobile interactions
  const handleHapticFeedback = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10) // Short, subtle vibration
    }
  }

  const handleClick = () => {
    handleHapticFeedback()
    onClick?.()
  }

  // Size variants
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }

  const lineHeight = {
    sm: 'h-0.5',
    md: 'h-0.5',
    lg: 'h-1',
  }

  const iconSize = sizeClasses[size]
  const lineHeightClass = lineHeight[size]

  return (
    <Button
      variant={variant}
      size="icon"
      onClick={handleClick}
      className={cn(
        "relative transition-all duration-200",
        "hover:bg-accent/50 focus-visible:bg-accent/50",
        !prefersReducedMotion && "hover:scale-105 active:scale-95",
        className
      )}
      aria-label={ariaLabel}
      aria-expanded={isOpen}
    >
      {/* Custom hamburger icon with animation */}
      <div className={cn("flex flex-col justify-center items-center", iconSize)}>
        {/* Top line */}
        <span
          className={cn(
            "bg-current transition-all duration-300 ease-in-out rounded-full",
            lineHeightClass,
            size === 'sm' ? 'w-3' : size === 'md' ? 'w-4' : 'w-5',
            isOpen
              ? `translate-y-${size === 'sm' ? '1' : size === 'md' ? '1.5' : '2'} rotate-45`
              : '-translate-y-1'
          )}
          style={{
            transform: isOpen
              ? `translateY(${size === 'sm' ? '4px' : size === 'md' ? '6px' : '8px'}) rotate(45deg)`
              : 'translateY(-2px)',
          }}
        />

        {/* Middle line */}
        <span
          className={cn(
            "bg-current transition-all duration-300 ease-in-out rounded-full",
            lineHeightClass,
            size === 'sm' ? 'w-3' : size === 'md' ? 'w-4' : 'w-5',
            isOpen ? 'opacity-0 scale-x-0' : 'opacity-100 scale-x-100'
          )}
        />

        {/* Bottom line */}
        <span
          className={cn(
            "bg-current transition-all duration-300 ease-in-out rounded-full",
            lineHeightClass,
            size === 'sm' ? 'w-3' : size === 'md' ? 'w-4' : 'w-5',
            isOpen
              ? `translate-y-${size === 'sm' ? '1' : size === 'md' ? '1.5' : '2'} -rotate-45`
              : 'translate-y-1'
          )}
          style={{
            transform: isOpen
              ? `translateY(-${size === 'sm' ? '4px' : size === 'md' ? '6px' : '8px'}) rotate(-45deg)`
              : 'translateY(2px)',
          }}
        />
      </div>
    </Button>
  )
}