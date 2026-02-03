'use client'

/**
 * FieldWorkerBottomNav Component
 *
 * Instagram-style bottom navigation bar for field workers.
 * Features:
 * - Fixed bottom position
 * - 5 tabs: Pipeline, Signatures, Voice (center, prominent), Knock, Claims
 * - Voice tab activates AI assistant with animation and feedback
 * - Haptic feedback on tap (via navigator.vibrate)
 * - Active state indicators
 * - Smooth transitions
 * - Voice AI integration with permissions handling
 * - Enhanced design system integration with consistent button patterns
 * - Improved accessibility and error handling
 *
 * Reference: Instagram app bottom navigation
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  GitBranch,
  PenTool,
  Mic,
  MicOff,
  DoorClosed,
  ClipboardList,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
// Business workflow: Pipeline → Signatures → VOICE → Knock → Claims
const navTabs: NavTab[] = [
  { href: '/projects', label: 'Pipeline', icon: GitBranch },
  { href: '/signatures', label: 'Signatures', icon: PenTool },
  { label: 'Voice', icon: Mic, isSpecial: true, isVoice: true },
  { href: '/knocks', label: 'Knock', icon: DoorClosed },
  { href: '/claims', label: 'Claims', icon: ClipboardList },
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
      {/* Navigation container - flex with equal distribution */}
      <div className="flex items-center justify-evenly px-1 py-1 w-full">
        {navTabs.map((tab, index) => {
          // Handle voice tab specially (no navigation, just activation)
          if (tab.isVoice) {
            const VoiceIcon = getVoiceIcon(voiceSessionStatus)
            const isVoiceActive = voiceSessionStatus === 'connected'
            const isVoiceLoading = voiceSessionStatus === 'connecting'

            return (
              <Button
                key={`voice-${index}`}
                onClick={() => handleTabPress(tab)}
                variant={
                  isVoiceActive
                    ? "default"
                    : voiceSessionStatus === 'error'
                    ? "destructive"
                    : "ghost"
                }
                size="icon"
                className={cn(
                  // Base styles for voice tab - flex-1 ensures equal distribution
                  "flex-1 flex flex-col items-center justify-center relative h-auto min-h-[56px] max-w-[72px] p-2 rounded-2xl",
                  "transition-all duration-300 ease-out",
                  // Special styling for Voice tab states
                  isVoiceActive && [
                    "bg-green-600 text-primary-foreground shadow-lg shadow-green-600/25",
                    !prefersReducedMotion && "animate-pulse"
                  ],
                  voiceSessionStatus === 'error' && [
                    "bg-red-600 text-primary-foreground shadow-lg shadow-red-600/25"
                  ],
                  voiceSessionStatus === 'idle' && [
                    "bg-primary/10 text-primary hover:bg-primary/20",
                    "dark:bg-primary/10 dark:text-primary dark:hover:bg-primary/20"
                  ],
                  // Animation scale effect
                  !prefersReducedMotion && "active:scale-95 hover:scale-105",
                  // Enhanced focus styles
                  "focus-visible:ring-2 focus-visible:ring-offset-2",
                  isVoiceActive && "focus-visible:ring-green-500/50",
                  voiceSessionStatus === 'error' && "focus-visible:ring-red-500/50"
                )}
                aria-label={
                  voiceSessionStatus === 'error'
                    ? "Voice Assistant Error - Tap to retry"
                    : isVoiceActive
                    ? "Voice Assistant Active - Tap to open controls"
                    : voiceSessionStatus === 'connecting'
                    ? "Voice Assistant Connecting..."
                    : "Activate Voice Assistant"
                }
                aria-describedby={!canView('voice_assistant') ? "voice-permission-error" : undefined}
                disabled={!canView('voice_assistant')}
                data-testid="voice-assistant-button"
              >
                {/* Icon container with enhanced animation */}
                <div className="relative flex items-center justify-center transition-transform duration-200 mb-1">
                  <VoiceIcon
                    className={cn(
                      "h-7 w-7 transition-all duration-200",
                      isVoiceLoading && "animate-spin",
                      voiceSessionStatus === 'error' && "text-primary-foreground"
                    )}
                    aria-hidden="true"
                  />

                  {/* Voice activity indicator with improved animation */}
                  {isVoiceActive && !prefersReducedMotion && (
                    <div className="absolute inset-0 rounded-full bg-green-400/30 animate-ping" />
                  )}

                  {/* Error indicator */}
                  {voiceSessionStatus === 'error' && (
                    <div className="absolute -top-1 -right-1">
                      <AlertCircle className="h-3 w-3 text-primary-foreground" aria-hidden="true" />
                    </div>
                  )}
                </div>

                {/* Tab label with improved contrast */}
                <span className={cn(
                  "text-xs font-medium transition-all duration-200 leading-tight",
                  isVoiceActive && "text-primary-foreground font-semibold",
                  voiceSessionStatus === 'error' && "text-primary-foreground font-semibold",
                  voiceSessionStatus === 'idle' && "text-blue-600 dark:text-blue-400"
                )}>
                  {tab.label}
                </span>
              </Button>
            )
          }

          // Regular navigation tabs
          const Icon = tab.icon
          const active = isActive(tab.href)

          return (
            <Button
              key={tab.href}
              asChild
              variant="ghost"
              size="icon"
              onClick={() => handleTabPress(tab)}
              className={cn(
                // Base styles for regular navigation tabs - flex-1 ensures equal distribution
                "flex-1 flex flex-col items-center justify-center relative h-auto min-h-[56px] max-w-[72px] p-2 rounded-xl",
                "transition-all duration-300 ease-out",
                // Enhanced styling with design system integration
                active && [
                  "text-primary bg-primary/5 hover:bg-primary/10",
                  "dark:bg-primary/10 dark:hover:bg-primary/15"
                ],
                !active && [
                  "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  "dark:hover:bg-muted/30"
                ],
                // Touch feedback with improved scaling
                !prefersReducedMotion && "active:scale-95 hover:scale-[1.02]",
                // Enhanced focus styles
                "focus-visible:ring-2 focus-visible:ring-offset-2",
                active && "focus-visible:ring-primary/50"
              )}
              aria-label={`Navigate to ${tab.label}`}
              aria-current={active ? 'page' : undefined}
              data-testid={`nav-tab-${tab.label.toLowerCase()}`}
            >
              <Link
                href={tab.href!}
                className="flex flex-col items-center justify-center w-full h-full"
              >
                {/* Icon container with enhanced animation */}
                <div className="relative flex items-center justify-center transition-transform duration-200 mb-1">
                  <Icon
                    className={cn(
                      "h-6 w-6 transition-all duration-200",
                      active && [
                        "text-primary",
                        !prefersReducedMotion && "animate-pulse"
                      ]
                    )}
                    aria-hidden="true"
                  />

                  {/* Enhanced active indicator */}
                  {active && (
                    <div
                      className={cn(
                        "absolute -bottom-1 h-1.5 w-1.5 rounded-full bg-primary shadow-sm",
                        "transition-all duration-300",
                        !prefersReducedMotion && "animate-pulse"
                      )}
                      aria-hidden="true"
                    />
                  )}
                </div>

                {/* Tab label with improved typography */}
                <span
                  className={cn(
                    "text-xs font-medium transition-all duration-200 leading-tight",
                    active
                      ? "text-primary font-semibold"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  {tab.label}
                </span>
              </Link>
            </Button>
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
              <Button
                onClick={handleVoiceSessionEnd}
                variant="ghost"
                size="icon"
                className="hover:bg-muted/50"
                aria-label="Close voice assistant"
              >
                <X className="h-5 w-5" />
              </Button>
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

      {/* Hidden accessibility description for voice permissions */}
      <div id="voice-permission-error" className="sr-only">
        You don&apos;t have permission to use the voice assistant. Please contact your administrator.
      </div>
    </nav>
  )
}