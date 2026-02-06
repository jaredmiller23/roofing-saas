'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { AlertCircle, RefreshCw, LayoutDashboard } from 'lucide-react'

export default function FieldError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Field Operations Error Boundary caught error:', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    })
    Sentry.captureException(error, {
      level: 'error',
      tags: { errorBoundary: 'field', section: 'field' },
      extra: { digest: error.digest, errorMessage: error.message },
    })
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-xl">Field Operations Error</CardTitle>
          <CardDescription>
            We&apos;ve encountered an issue loading this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === 'development' && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md">
              <p className="text-xs font-mono text-red-800 dark:text-red-200 break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}
          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm text-muted-foreground">
              <strong>What happened?</strong> An unexpected error occurred while loading this section.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              <strong>What to do?</strong> Try reloading the page. If the problem persists, please contact support.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-2">
          <Button onClick={reset} variant="default" className="w-full sm:w-auto">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reload Page
          </Button>
          <Button onClick={() => (window.location.href = '/dashboard')} variant="outline" className="w-full sm:w-auto">
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Return to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
