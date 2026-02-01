'use client'

/**
 * UI Patterns
 *
 * Reusable component patterns extracted from best implementations.
 * These represent field-tested solutions for common UI challenges.
 */

import * as React from 'react'
import Link from 'next/link'
import { X, Wifi, WifiOff, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

// ============================================================================
// Status Badge Pattern
// ============================================================================

const STATUS_COLORS = {
  // Pipeline stages
  prospect: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  qualified: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  quote_sent: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  negotiation: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  won: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  lost: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  production: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  complete: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',

  // General statuses
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
} as const

type StatusType = keyof typeof STATUS_COLORS

interface StatusBadgeProps {
  status: StatusType | string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colorClass = STATUS_COLORS[status as StatusType] || 'bg-muted text-muted-foreground'
  const displayText = status.replace(/_/g, ' ')

  return (
    <span
      className={cn(
        'px-2.5 py-1 rounded-full text-xs font-medium capitalize',
        colorClass,
        className
      )}
    >
      {displayText}
    </span>
  )
}

// ============================================================================
// Quick Action Row Pattern
// ============================================================================

interface QuickAction {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href?: string
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'destructive'
  disabled?: boolean
}

interface QuickActionRowProps {
  actions: QuickAction[]
  className?: string
}

export function QuickActionRow({ actions, className }: QuickActionRowProps) {
  return (
    <div className={cn('flex gap-2', className)}>
      {actions.map((action, i) => {
        const Icon = action.icon
        const buttonClass = cn(
          'flex-1 h-12 flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
          action.variant === 'primary' && 'bg-primary text-primary-foreground hover:bg-primary/90',
          action.variant === 'secondary' && 'bg-muted hover:bg-muted/80',
          action.variant === 'destructive' && 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-200',
          !action.variant && 'bg-muted hover:bg-muted/80',
          action.disabled && 'opacity-50 cursor-not-allowed'
        )

        if (action.href && !action.disabled) {
          return (
            <Link key={i} href={action.href} className={buttonClass}>
              <Icon className="h-5 w-5" />
              <span className="hidden sm:inline">{action.label}</span>
            </Link>
          )
        }

        return (
          <button
            key={i}
            onClick={action.onClick}
            disabled={action.disabled}
            className={buttonClass}
          >
            <Icon className="h-5 w-5" />
            <span className="hidden sm:inline">{action.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ============================================================================
// Wizard Pattern
// ============================================================================

interface WizardStep {
  id: string
  label: string
  component: React.ReactNode
}

interface WizardProps {
  steps: WizardStep[]
  currentStep: string
  onStepChange?: (stepId: string) => void
  onComplete?: () => void
  onCancel: () => void
  className?: string
}

export function Wizard({
  steps,
  currentStep,
  onCancel,
  className
}: WizardProps) {
  const currentIndex = steps.findIndex(s => s.id === currentStep)
  const progress = ((currentIndex + 1) / steps.length) * 100

  return (
    <div className={cn('min-h-screen bg-muted', className)}>
      {/* Sticky progress header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={onCancel}
              className="p-2 min-h-11 min-w-11 flex items-center justify-center -ml-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Cancel"
            >
              <X className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium capitalize">
              {steps[currentIndex]?.label}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-1">
            <div
              className="bg-primary h-1 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {steps[currentIndex]?.component}
      </div>
    </div>
  )
}

// ============================================================================
// Queue Status Pattern (Offline-first)
// ============================================================================

interface QueueStatusProps {
  pendingCount: number
  syncingCount: number
  failedCount: number
  isOnline: boolean
  onRetry?: () => void
  onSync?: () => void
  className?: string
}

export function QueueStatus({
  pendingCount,
  syncingCount,
  failedCount,
  isOnline,
  onRetry,
  onSync,
  className
}: QueueStatusProps) {
  const totalCount = pendingCount + syncingCount + failedCount

  // Don't show if everything is synced and we're online
  if (totalCount === 0 && isOnline) return null

  return (
    <div className={cn('fixed bottom-4 right-4 z-50 max-w-sm', className)}>
      <Card className="shadow-lg border-2">
        <CardContent className="p-4">
          {/* Offline indicator */}
          {!isOnline && (
            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 mb-3">
              <WifiOff className="h-5 w-5" />
              <span className="font-medium">You&apos;re offline</span>
            </div>
          )}

          {/* Queue status */}
          {totalCount > 0 && (
            <div className="space-y-2">
              {pendingCount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Pending</span>
                  <span className="font-medium">{pendingCount}</span>
                </div>
              )}

              {syncingCount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Syncing
                  </span>
                  <span className="font-medium">{syncingCount}</span>
                </div>
              )}

              {failedCount > 0 && (
                <div className="flex items-center justify-between text-sm text-red-600 dark:text-red-400">
                  <span className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Failed
                  </span>
                  <span className="font-medium">{failedCount}</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            {failedCount > 0 && onRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="flex-1"
              >
                Retry Failed
              </Button>
            )}
            {isOnline && pendingCount > 0 && onSync && (
              <Button
                size="sm"
                onClick={onSync}
                className="flex-1"
              >
                Sync Now
              </Button>
            )}
          </div>

          {/* Success state */}
          {totalCount === 0 && isOnline && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">All synced</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// Empty State Pattern
// ============================================================================

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  return (
    <div className={cn('text-center py-12', className)}>
      <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
          {description}
        </p>
      )}
      {action && (
        action.href ? (
          <Button asChild>
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : (
          <Button onClick={action.onClick}>{action.label}</Button>
        )
      )}
    </div>
  )
}
