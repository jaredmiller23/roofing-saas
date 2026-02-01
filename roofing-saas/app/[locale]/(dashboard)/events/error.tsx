'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface EventsErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Local error boundary for the Events page.
 *
 * This catches errors at the page level before they propagate to the
 * dashboard error boundary, preventing the brief "dashboard error" flash
 * that users were seeing.
 */
export default function EventsError({ error, reset }: EventsErrorProps) {
  useEffect(() => {
    // Log the error for debugging
    console.error('Events page error:', error)
  }, [error])

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Calendar Error
            </CardTitle>
            <CardDescription>
              Something went wrong loading the calendar. This might be a temporary issue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {error.message || 'An unexpected error occurred'}
            </p>
            <Button onClick={reset} className="w-full sm:w-auto">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
