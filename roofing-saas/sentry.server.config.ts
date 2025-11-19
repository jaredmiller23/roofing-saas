// =============================================
// Sentry Server Configuration
// =============================================
// Purpose: Error tracking and performance monitoring for Node.js/server
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
  // We recommend adjusting this value in production to reduce costs.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Integrations for server-side
  integrations: [
    // HTTP integration for tracking HTTP requests
    Sentry.httpIntegration({
      // Filter outgoing HTTP requests - don't track certain URLs
      ignoreOutgoingRequests: (url) => {
        const ignoredPatterns = [
          /\/health$/,
          /\/api\/health$/,
          /\/metrics$/,
          /localhost/,
        ]
        return ignoredPatterns.some(pattern => pattern.test(url))
      },
    }),

    // Node profiling (optional, advanced)
    // NOTE: Temporarily disabled - nodeProfilingIntegration not available in current Sentry version
    // Sentry.nodeProfilingIntegration(),
  ],

  // Ignore specific errors
  ignoreErrors: [
    // Expected errors
    'AbortError',
    'CancelledError',

    // Supabase connection timeouts (transient)
    'Connection timeout',
    'ECONNRESET',

    // Next.js build-time errors
    'NEXT_NOT_FOUND',
  ],

  // Before sending error to Sentry
  beforeSend(event, hint) {
    // Scrub sensitive data
    if (event.request) {
      // Remove sensitive headers
      if (event.request.headers) {
        delete event.request.headers['authorization']
        delete event.request.headers['cookie']
        delete event.request.headers['x-api-key']
      }

      // Remove sensitive environment variables
      if (event.contexts?.runtime?.env) {
        const env = event.contexts.runtime.env as Record<string, unknown>
        Object.keys(env).forEach((key) => {
          if (
            key.includes('KEY') ||
            key.includes('SECRET') ||
            key.includes('TOKEN') ||
            key.includes('PASSWORD')
          ) {
            env[key] = '[REDACTED]'
          }
        })
      }
    }

    // Add custom context for API errors
    if (hint.originalException) {
      const error = hint.originalException as Error & { statusCode?: number; endpoint?: string }

      if (error.statusCode) {
        Sentry.setTag('http.status_code', error.statusCode)
      }

      if (error.endpoint) {
        Sentry.setTag('api.endpoint', error.endpoint)
      }
    }

    return event
  },

  // Before sending breadcrumb
  beforeBreadcrumb(breadcrumb) {
    // Don't log database query details (might contain sensitive data)
    if (breadcrumb.category === 'query' && breadcrumb.data) {
      breadcrumb.data.query = '[REDACTED]'
    }

    // Don't log console.log breadcrumbs in production
    if (process.env.NODE_ENV === 'production' && breadcrumb.category === 'console') {
      return null
    }

    return breadcrumb
  },

  // Add custom tags to all events
  initialScope: {
    tags: {
      app: 'roofing-saas',
      layer: 'server',
      runtime: 'nodejs',
    },
  },

  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',

  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  // Dist for source maps
  dist: process.env.VERCEL_GIT_COMMIT_SHA,

  // Max breadcrumbs to keep
  maxBreadcrumbs: 50,

  // Attach stack traces to all messages
  attachStacktrace: true,
})
