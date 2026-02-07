import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')

    // T1.8: Capture unhandled promise rejections and uncaught exceptions
    // Background jobs (workflow triggers, email notifications, SMS sends) use
    // fire-and-forget patterns that can fail silently without these handlers.
    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled Promise Rejection:', reason)
      Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)), {
        tags: { type: 'unhandled_rejection' },
      })
    })

    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error)
      Sentry.captureException(error, {
        tags: { type: 'uncaught_exception' },
      })
    })
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
