'use client'

/**
 * FieldWorkerBottomNav Component
 *
 * Instagram-style bottom navigation bar for field workers.
 * Features:
 * - Fixed bottom position
 * - 5 tabs: Home, Search/Map, Voice (center, prominent), Activity, Profile
 * - Voice tab activates AI assistant with animation and feedback
 * - Haptic feedback on tap (via navigator.vibrate)
 * - Active state indicators
 * - Smooth transitions
 * - Voice AI integration with permissions handling
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
  MicOff,
  Activity,
  User,
  X,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { VoiceSession } from '@/components/voice/VoiceSession'
import { usePermissions } from '@/hooks/usePermissions'

interface NavTab {
  href?: string
  label: string
  icon: React.ElementType
  isSpecial?: boolean
  isVoice?: boolean
}

interface FieldWorkerBottomNavProps {
  className?: string
}

type VoiceSessionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'

// Navigation tabs - Instagram style with Voice as center special tab
const navTabs: NavTab[] = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { label: 'Voice', icon: Mic, isSpecial: true, isVoice: true },
  { href: '/activity', label: 'Activity', icon: Activity },
  { href: '/profile', label: 'Profile', icon: User },
]

export function FieldWorkerBottomNav({ className }: FieldWorkerBottomNavProps) {
  const pathname = usePathname()
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  // Voice session state
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false)
  const [voiceSessionStatus, setVoiceSessionStatus] = useState<VoiceSessionStatus>('idle')

  // Permissions
  const { canView } = usePermissions()

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)

    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  const isActive = (href?: string) => {
    // Match exact path or if we're on a sub-path of the tab
    if (!href) return false
    return pathname === href || pathname.startsWith(href + '/')
  }

  const handleVoiceActivation = () => {
    // Check permissions first
    const hasVoicePermission = canView('voice_assistant')
    if (!hasVoicePermission) {
      console.warn('User does not have permission to use voice assistant')
      // Could show a toast notification here
      return
    }

    // Haptic feedback for voice activation
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 50, 10, 50, 10]) // Complex pattern for voice activation
    }

    // Open voice modal
    setIsVoiceModalOpen(true)
  }

  const handleTabPress = (tab: NavTab) => {
    // Haptic feedback on tap
    if ('vibrate' in navigator) {
      navigator.vibrate(10) // Short, subtle vibration
    }

    // Handle voice tab specially
    if (tab.isVoice) {
      handleVoiceActivation()
      return
    }

    // Regular navigation for other tabs
    // Navigation handled by Link component
  }

  const handleVoiceSessionEnd = () => {
    setIsVoiceModalOpen(false)
    setVoiceSessionStatus('idle')
  }

  const handleVoiceError = (error: Error) => {
    console.error('Voice session error:', error)
    setVoiceSessionStatus('error')
    // Could show error feedback here
  }

  // Get the appropriate icon based on voice session status
  const getVoiceIcon = (status: VoiceSessionStatus) => {
    switch (status) {
      case 'connecting':
        return Loader2
      case 'connected':
        return Mic
      case 'error':
        return MicOff
      default:
        return Mic
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
        {navTabs.map((tab, index) => {
          // Handle voice tab specially (no navigation, just activation)
          if (tab.isVoice) {
            const VoiceIcon = getVoiceIcon(voiceSessionStatus)
            const isVoiceActive = voiceSessionStatus === 'connected'
            const isVoiceLoading = voiceSessionStatus === 'connecting'

            return (
              <button
                key={`voice-${index}`}
                onClick={() => handleTabPress(tab)}
                className={cn(
                  // Base styles
                  "flex flex-col items-center justify-center relative",
                  "transition-all duration-300 ease-out",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  // Special styling for Voice tab (center, prominent)
                  "p-2 rounded-2xl",
                  isVoiceActive
                    ? "bg-green-600 text-primary-foreground shadow-lg shadow-green-600/25 animate-pulse"
                    : voiceSessionStatus === 'error'
                    ? "bg-red-600 text-primary-foreground shadow-lg shadow-red-600/25"
                    : "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-400 dark:hover:bg-blue-900",
                  // Animation scale effect
                  !prefersReducedMotion && "active:scale-95 hover:scale-105"
                )}
                aria-label={
                  isVoiceActive
                    ? "Voice Assistant Active - Tap to open controls"
                    : "Activate Voice Assistant"
                }
                disabled={!canView('voice_assistant')}
              >
                {/* Icon container with animation */}
                <div className="relative flex items-center justify-center transition-transform duration-200 mb-1">
                  <VoiceIcon
                    className={cn(
                      "h-7 w-7 transition-all duration-200",
                      isVoiceLoading && "animate-spin"
                    )}
                    aria-hidden="true"
                  />

                  {/* Voice activity indicator */}
                  {isVoiceActive && !prefersReducedMotion && (
                    <div className="absolute inset-0 rounded-full bg-green-400/30 animate-ping" />
                  )}
                </div>

                {/* Tab label */}
                <span className={cn(
                  "text-xs font-medium transition-all duration-200",
                  isVoiceActive
                    ? "text-primary-foreground"
                    : voiceSessionStatus === 'error'
                    ? "text-primary-foreground"
                    : "text-blue-600 dark:text-blue-400",
                  "leading-tight"
                )}>
                  {tab.label}
                </span>
              </button>
            )
          }

          // Regular navigation tabs
          const Icon = tab.icon
          const active = isActive(tab.href)

          return (
            <Link
              key={tab.href}
              href={tab.href!}
              onClick={() => handleTabPress(tab)}
              className={cn(
                // Base styles for regular navigation tabs
                "flex flex-col items-center justify-center relative",
                "transition-all duration-300 ease-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                // Standard tab styling
                "p-3 rounded-xl",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
                // Touch feedback
                !prefersReducedMotion && "active:scale-95"
              )}
              aria-label={`Navigate to ${tab.label}`}
              aria-current={active ? 'page' : undefined}
            >
              {/* Icon container */}
              <div className="relative flex items-center justify-center transition-transform duration-200 mb-1">
                <Icon
                  className={cn(
                    "h-6 w-6 transition-all duration-200",
                    active && !prefersReducedMotion && "animate-pulse"
                  )}
                  aria-hidden="true"
                />

                {/* Active indicator dot */}
                {active && (
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
                  active
                    ? "text-primary font-semibold"
                    : "text-muted-foreground",
                  "leading-tight"
                )}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Voice Session Modal */}
      {isVoiceModalOpen && (
        <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm">
          <div className="absolute inset-x-4 top-4 bottom-24 bg-card rounded-2xl shadow-2xl border border-border/20 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/20 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/30 dark:to-green-950/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary rounded-lg">
                  <Mic className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Voice Assistant</h2>
                  <p className="text-sm text-muted-foreground">
                    {voiceSessionStatus === 'connected'
                      ? 'Listening...'
                      : 'AI-powered field assistant'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleVoiceSessionEnd}
                className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
                aria-label="Close voice assistant"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-4">
              <VoiceSession
                provider="openai"
                onSessionEnd={handleVoiceSessionEnd}
                onError={handleVoiceError}
              />
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}