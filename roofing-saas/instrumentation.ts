// =============================================
// Next.js Instrumentation
// =============================================
// Purpose: Initialize Sentry for server and edge runtimes
// Author: Claude Code
// Date: 2025-11-18
// =============================================
// This file is used to initialize monitoring and instrumentation for Next.js
// See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  // Initialize Sentry for Node.js server runtime
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }

  // Initialize Sentry for Edge runtime
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}
