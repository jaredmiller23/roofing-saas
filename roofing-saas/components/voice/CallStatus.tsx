'use client'

/**
 * CallStatus Component
 *
 * Displays the current state of a voice call with visual indicators.
 * Follows the state machine: idle → initiating → connecting → ringing → in-progress → completed/failed
 */

import { useEffect, useState } from 'react'
import { Phone, PhoneCall, PhoneOff, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CallState =
  | 'idle'
  | 'initiating'
  | 'connecting'
  | 'ringing'
  | 'in-progress'
  | 'completed'
  | 'failed'
  | 'blocked'

interface CallStatusProps {
  state: CallState
  duration?: number // seconds, for in-progress calls
  errorMessage?: string
  className?: string
}

const STATE_CONFIG: Record<CallState, {
  label: string
  icon: typeof Phone
  color: string
  animate?: boolean
}> = {
  idle: {
    label: 'Ready to call',
    icon: Phone,
    color: 'text-muted-foreground',
  },
  initiating: {
    label: 'Initiating call...',
    icon: Loader2,
    color: 'text-primary',
    animate: true,
  },
  connecting: {
    label: 'Connecting...',
    icon: Loader2,
    color: 'text-primary',
    animate: true,
  },
  ringing: {
    label: 'Ringing...',
    icon: PhoneCall,
    color: 'text-yellow-600',
    animate: true,
  },
  'in-progress': {
    label: 'Call in progress',
    icon: PhoneCall,
    color: 'text-green-600',
  },
  completed: {
    label: 'Call completed',
    icon: CheckCircle,
    color: 'text-green-600',
  },
  failed: {
    label: 'Call failed',
    icon: XCircle,
    color: 'text-red-600',
  },
  blocked: {
    label: 'Call blocked',
    icon: PhoneOff,
    color: 'text-red-600',
  },
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function CallStatus({ state, duration, errorMessage, className }: CallStatusProps) {
  const config = STATE_CONFIG[state]
  const Icon = config.icon

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {/* Status icon */}
      <div className={cn(
        'w-16 h-16 rounded-full flex items-center justify-center',
        state === 'in-progress' && 'bg-green-100 dark:bg-green-900/30',
        state === 'ringing' && 'bg-yellow-100 dark:bg-yellow-900/30',
        (state === 'initiating' || state === 'connecting') && 'bg-primary/10',
        (state === 'failed' || state === 'blocked') && 'bg-red-100 dark:bg-red-900/30',
        state === 'completed' && 'bg-green-100 dark:bg-green-900/30',
        state === 'idle' && 'bg-muted',
      )}>
        <Icon className={cn(
          'h-8 w-8',
          config.color,
          config.animate && 'animate-spin',
          state === 'ringing' && 'animate-pulse',
        )} />
      </div>

      {/* Status label */}
      <p className={cn('text-lg font-medium', config.color)}>
        {config.label}
      </p>

      {/* Duration (for in-progress calls) */}
      {state === 'in-progress' && duration !== undefined && (
        <p className="text-2xl font-mono text-foreground">
          {formatDuration(duration)}
        </p>
      )}

      {/* Error message */}
      {errorMessage && (state === 'failed' || state === 'blocked') && (
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          {errorMessage}
        </p>
      )}
    </div>
  )
}

/**
 * Hook to track call duration
 */
export function useCallDuration(isActive: boolean): number {
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    if (!isActive) {
      setDuration(0)
      return
    }

    const interval = setInterval(() => {
      setDuration(d => d + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive])

  return duration
}
