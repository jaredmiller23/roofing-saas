'use client'

/**
 * FieldWorkerBottomNav Component
 *
 * Instagram-style bottom navigation bar for field workers.
 * Features:
 * - Fixed bottom position
 * - 5 tabs: Home, Search/Map, Voice (center, prominent), Activity, Profile
 * - Voice tab has special styling (larger, centered, blue accent)
 * - Haptic feedback on tap (via navigator.vibrate)
 * - Active state indicators
 * - Smooth transitions
 *
 * Reference: Instagram app bottom navigation
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Search,
  Mic,
  Activity,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavTab {
  href: string
  label: string
  icon: React.ElementType
  isSpecial?: boolean
}

interface FieldWorkerBottomNavProps {
  className?: string
}

// Navigation tabs - Instagram style with Voice as center special tab
const navTabs: NavTab[] = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/voice', label: 'Voice', icon: Mic, isSpecial: true },
  { href: '/activity', label: 'Activity', icon: Activity },
  { href: '/profile', label: 'Profile', icon: User },
]

export function FieldWorkerBottomNav({ className }: FieldWorkerBottomNavProps) {
  const pathname = usePathname()
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)

    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  const isActive = (href: string) => {
    // Match exact path or if we're on a sub-path of the tab
    return pathname === href || pathname.startsWith(href + '/')
  }

  const handleTabPress = (href: string) => {
    // Haptic feedback on tap
    if ('vibrate' in navigator) {
      navigator.vibrate(10) // Short, subtle vibration
    }

    // Additional haptic feedback for the special Voice tab
    if (href === '/voice' && 'vibrate' in navigator) {
      navigator.vibrate([10, 50, 10]) // Double tap pattern for voice
    }
  }

  return (
    <nav
      className={cn(
        // Fixed positioning at bottom
        "fixed bottom-0 left-0 right-0 z-50",
        // Instagram-style background with backdrop blur
        "bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80",
        // Border and shadow for depth
        "border-t border-border/40 shadow-lg shadow-black/5",
        // Safe area padding for mobile devices
        "pb-safe-bottom",
        className
      )}
      aria-label="Bottom navigation"
    >
      {/* Navigation container */}
      <div className="flex items-center justify-around px-2 py-1">
        {navTabs.map((tab) => {
          const Icon = tab.icon
          const active = isActive(tab.href)

          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={() => handleTabPress(tab.href)}
              className={cn(
                // Base styles
                "flex flex-col items-center justify-center relative",
                "transition-all duration-300 ease-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                // Special styling for Voice tab (center, prominent)
                tab.isSpecial
                  ? cn(
                      // Larger size and blue accent for voice tab
                      "p-2 rounded-2xl",
                      active
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                        : "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-400 dark:hover:bg-blue-900",
                      // Animation scale effect
                      !prefersReducedMotion && "active:scale-95 hover:scale-105"
                    )
                  : cn(
                      // Standard tab styling
                      "p-3 rounded-xl",
                      active
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground",
                      // Touch feedback
                      !prefersReducedMotion && "active:scale-95"
                    )
              )}
              aria-label={`Navigate to ${tab.label}`}
              aria-current={active ? 'page' : undefined}
            >
              {/* Icon container with size variations */}
              <div className={cn(
                "relative flex items-center justify-center transition-transform duration-200",
                tab.isSpecial ? "mb-1" : "mb-1"
              )}>
                <Icon
                  className={cn(
                    "transition-all duration-200",
                    // Size variations
                    tab.isSpecial
                      ? "h-7 w-7"
                      : "h-6 w-6",
                    // Color and animation
                    active && !tab.isSpecial && !prefersReducedMotion && "animate-pulse"
                  )}
                  aria-hidden="true"
                />

                {/* Active indicator dot for non-special tabs */}
                {active && !tab.isSpecial && (
                  <div
                    className={cn(
                      "absolute -bottom-1 h-1 w-1 rounded-full bg-primary",
                      "transition-all duration-300",
                      !prefersReducedMotion && "animate-pulse"
                    )}
                    aria-hidden="true"
                  />
                )}
              </div>

              {/* Tab label */}
              <span
                className={cn(
                  "text-xs font-medium transition-all duration-200",
                  // Special styling for voice tab
                  tab.isSpecial
                    ? active
                      ? "text-white"
                      : "text-blue-600 dark:text-blue-400"
                    : active
                      ? "text-primary font-semibold"
                      : "text-muted-foreground",
                  // Responsive font sizing
                  "leading-tight"
                )}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}