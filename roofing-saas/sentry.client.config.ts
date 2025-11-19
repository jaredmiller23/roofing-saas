// =============================================
// Sentry Client Configuration
// =============================================
// Purpose: Error tracking and performance monitoring for browser/client
// Author: Claude Code
// Date: 2025-11-18
// =============================================

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  // Sentry DSN - get from Sentry dashboard
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment (development, staging, production)
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || 'development',

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  // We recommend adjusting this value in production to reduce costs.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Trace propagation targets - controls which requests get trace headers
  tracePropagationTargets: [
    'localhost',
    /^https:\/\/.*\.vercel\.app/,
    process.env.NEXT_PUBLIC_APP_URL || '',
  ],

  // Capture Replay for 10% of all sessions,
  // plus 100% of sessions with an error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Enable session replay
  integrations: [
    Sentry.replayIntegration({
      // Mask all text content and user input for privacy
      maskAllText: true,
      blockAllMedia: true,

      // Network details
      networkDetailAllowUrls: [
        // Allow network details for your API
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      ],

      // Ignore specific URLs from replay
      networkDetailDenyUrls: [
        // Don't record sensitive endpoints
        /\/api\/auth\//,
        /\/api\/profile\/upload-photo/,
      ],
    }),

    // Browser tracing for performance
    Sentry.browserTracingIntegration({
      // Enable Interaction to Next Paint (INP) tracking
      enableInp: true,
    }),
  ],

  // Ignore specific errors that aren't actionable
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',

    // Network errors
    'Network request failed',
    'NetworkError',
    'Failed to fetch',
    'Load failed',

    // Random plugins/extensions
    'atomicFindClose',
    'conduitPage',

    // Safari specific
    'safari-extension',

    // User cancellations
    'AbortError',
    'cancelled',
  ],

  // Before sending error to Sentry
  beforeSend(event, hint) {
    // Filter out errors from browser extensions
    if (event.exception) {
      const error = hint.originalException
      if (error && typeof error === 'object' && 'message' in error) {
        const message = error.message as string
        if (
          message.includes('chrome-extension://') ||
          message.includes('moz-extension://') ||
          message.includes('safari-extension://')
        ) {
          return null // Don't send to Sentry
        }
      }
    }

    // Scrub sensitive data from event
    if (event.request) {
      // Remove auth headers
      if (event.request.headers) {
        delete event.request.headers['Authorization']
        delete event.request.headers['Cookie']
      }

      // Remove query params that might contain sensitive data
      if (event.request.query_string && typeof event.request.query_string === 'string') {
        event.request.query_string = event.request.query_string
          .replace(/token=[^&]+/g, 'token=[REDACTED]')
          .replace(/api_key=[^&]+/g, 'api_key=[REDACTED]')
          .replace(/password=[^&]+/g, 'password=[REDACTED]')
      }
    }

    return event
  },

  // Add custom tags to all events
  initialScope: {
    tags: {
      app: 'roofing-saas',
      layer: 'client',
    },
  },

  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',

  // Release tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Dist for source maps
  dist: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
})
