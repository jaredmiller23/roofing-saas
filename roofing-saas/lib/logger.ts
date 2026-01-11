/**
 * Application Logger
 *
 * Centralized logging with structured data and log levels
 * Integrates with Sentry for error tracking and performance monitoring
 *
 * SECURITY: All log contexts are sanitized to prevent PII leakage.
 * Use sanitizeError() for error objects, sanitizeContext() for full contexts.
 */

import * as Sentry from '@sentry/nextjs'
import { sanitizeError, sanitizeContext } from '@/lib/utils/sanitize-error'

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogContext {
  [key: string]: unknown
}

class Logger {
  private minLevel: LogLevel

  constructor() {
    // In production, set to INFO or WARN
    this.minLevel = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR]
    return levels.indexOf(level) >= levels.indexOf(this.minLevel)
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    // Sanitize context before serializing to prevent PII leakage
    const sanitized = context ? sanitizeContext(context) : undefined
    const contextStr = sanitized ? ` ${JSON.stringify(sanitized)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) return

    const formatted = this.formatMessage(level, message, context)

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formatted)
        break
      case LogLevel.INFO:
        console.info(formatted)
        break
      case LogLevel.WARN:
        console.warn(formatted)
        break
      case LogLevel.ERROR:
        console.error(formatted)
        // Send errors to Sentry in all environments
        // Sentry config filters by environment (development/staging/production)
        // SECURITY: Sanitize context before sending to Sentry
        const sanitizedContext = context ? sanitizeContext(context) : undefined
        if (context?.error instanceof Error) {
          // If context has an actual Error object, send it
          // Use sanitizeError to strip PII from error details
          Sentry.captureException(context.error, {
            level: 'error',
            extra: { ...sanitizedContext, message },
          })
        } else {
          // Otherwise create an Error with the message
          Sentry.captureException(new Error(message), {
            level: 'error',
            extra: sanitizedContext,
          })
        }
        break
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context)
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context)
    // Optionally send warnings to Sentry as breadcrumbs
    Sentry.addBreadcrumb({
      message,
      level: 'warning',
      data: context,
    })
  }

  error(message: string, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context)
  }

  // Helper for tracking API requests
  apiRequest(method: string, path: string, context?: LogContext): void {
    this.info(`API ${method} ${path}`, context)
  }

  // Helper for tracking API responses
  apiResponse(method: string, path: string, status: number, duration: number): void {
    this.info(`API ${method} ${path} ${status}`, { duration: `${duration}ms` })
  }

  // Helper for tracking database queries
  dbQuery(table: string, operation: string, context?: LogContext): void {
    this.debug(`DB ${operation} ${table}`, context)
  }

  // ARIA AI Assistant logging
  ariaToolCall(
    functionName: string,
    args: unknown,
    context: { userId?: string; tenantId?: string; conversationId?: string }
  ): void {
    this.info(`ARIA tool called: ${functionName}`, {
      tool: functionName,
      args,
      ...context,
    })
  }

  ariaToolResult(
    functionName: string,
    success: boolean,
    duration: number,
    result?: unknown,
    error?: string
  ): void {
    if (success) {
      this.info(`ARIA tool succeeded: ${functionName}`, {
        tool: functionName,
        success: true,
        duration: `${duration}ms`,
        resultPreview: typeof result === 'object' ? Object.keys(result || {}) : typeof result,
      })
    } else {
      this.error(`ARIA tool failed: ${functionName}`, {
        tool: functionName,
        success: false,
        duration: `${duration}ms`,
        error,
      })
    }
  }

  // Form validation logging
  validationError(
    formName: string,
    errors: Record<string, string>,
    context?: { userId?: string; fieldCount?: number }
  ): void {
    this.warn(`Validation failed: ${formName}`, {
      formName,
      errors,
      errorCount: Object.keys(errors).length,
      ...context,
    })
  }

  // Enhanced API error logging with full context
  // SECURITY: Uses sanitizeError to strip PII from error objects
  apiError(
    method: string,
    path: string,
    status: number,
    error: unknown,
    context?: { userId?: string; tenantId?: string; requestBody?: unknown }
  ): void {
    // Use sanitizeError to properly strip PII from error details
    const errorDetails = sanitizeError(error)

    this.error(`API error: ${method} ${path} ${status}`, {
      method,
      path,
      status,
      error: errorDetails,
      ...context,
    })
  }
}

// Export singleton instance
export const logger = new Logger()

// Export types
export type { LogContext }
