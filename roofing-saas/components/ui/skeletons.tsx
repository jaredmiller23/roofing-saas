'use client'

/**
 * Skeleton Components
 *
 * Standardized loading state components that match the shape of content.
 * Use instead of spinners for better perceived performance and reduced layout shift.
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card'

/**
 * Generic card skeleton with configurable line count
 */
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 bg-muted rounded w-1/3 animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-4 bg-muted rounded animate-pulse"
            style={{ width: `${100 - i * 15}%` }}
          />
        ))}
      </CardContent>
    </Card>
  )
}

/**
 * Metric card skeleton for dashboard KPIs
 */
export function MetricCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="h-4 bg-muted rounded w-24 animate-pulse" />
        <div className="h-4 w-4 bg-muted rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-8 bg-muted rounded w-32 mb-2 animate-pulse" />
        <div className="h-3 bg-muted rounded w-20 animate-pulse" />
      </CardContent>
    </Card>
  )
}

/**
 * List item skeleton for lists and tables
 */
export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
        <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
      </div>
    </div>
  )
}

/**
 * Tab content skeleton for tabbed interfaces
 */
export function TabContentSkeleton() {
  return (
    <div className="space-y-6">
      <CardSkeleton lines={4} />
      <CardSkeleton lines={3} />
    </div>
  )
}

/**
 * Full page skeleton for initial page loads
 */
export function PageSkeleton() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        <div className="h-4 bg-muted rounded w-32 animate-pulse" />
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <CardSkeleton lines={4} />
          <CardSkeleton lines={3} />
        </div>
        <div className="space-y-6">
          <CardSkeleton lines={2} />
          <CardSkeleton lines={3} />
        </div>
      </div>
    </div>
  )
}

/**
 * Wizard skeleton for multi-step flows
 */
export function WizardSkeleton() {
  return (
    <div className="min-h-screen bg-muted">
      {/* Progress header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="h-6 w-6 bg-muted rounded animate-pulse" />
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-4 w-12 bg-muted rounded animate-pulse" />
          </div>
          <div className="w-full bg-muted-foreground/20 rounded-full h-1">
            <div className="bg-primary/50 h-1 rounded-full w-1/3 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="text-center space-y-2">
          <div className="h-6 bg-muted rounded w-48 mx-auto animate-pulse" />
          <div className="h-4 bg-muted rounded w-64 mx-auto animate-pulse" />
        </div>
        <CardSkeleton lines={3} />
        <div className="flex gap-2">
          <div className="h-12 bg-muted rounded flex-1 animate-pulse" />
          <div className="h-12 bg-muted rounded w-24 animate-pulse" />
        </div>
      </div>
    </div>
  )
}

/**
 * Table skeleton for data tables
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="border rounded-lg">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b bg-muted/50">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-4 bg-muted rounded animate-pulse"
            style={{ width: `${25 - i * 5}%` }}
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b last:border-b-0">
          {[1, 2, 3, 4].map((j) => (
            <div
              key={j}
              className="h-4 bg-muted rounded animate-pulse"
              style={{ width: `${25 - j * 3}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
