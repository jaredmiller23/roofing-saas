// =============================================
// Sentry Edge Configuration
// =============================================
// Purpose: Error tracking for Vercel Edge Functions and middleware
// Author: Claude Code
// Date: 2025-11-18
// =============================================

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  // Sentry DSN - get from Sentry dashboard
  dsn: process.env.SENTRY_DSN,

  // Environment (development, staging, production)
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  // Edge functions have stricter resource limits, so sample more aggressively in production.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

  // Ignore specific errors
  ignoreErrors: [
    // Expected errors
    'AbortError',
    'CancelledError',

    // Middleware redirects
    'NEXT_REDIRECT',
    'NEXT_NOT_FOUND',
  ],

  // Before sending error to Sentry
  beforeSend(event) {
    // Scrub sensitive data from requests
    if (event.request) {
      // Remove sensitive headers
      if (event.request.headers) {
        delete event.request.headers['authorization']
        delete event.request.headers['cookie']
        delete event.request.headers['x-api-key']
      }
    }

    return event
  },

  // Add custom tags to all events
  initialScope: {
    tags: {
      app: 'roofing-saas',
      layer: 'edge',
      runtime: 'edge',
    },
  },

  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',

  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  // Dist for source maps
  dist: process.env.VERCEL_GIT_COMMIT_SHA,

  // Reduced breadcrumbs for edge runtime (memory constraints)
  maxBreadcrumbs: 20,

  // Attach stack traces to all messages
  attachStacktrace: true,
})
