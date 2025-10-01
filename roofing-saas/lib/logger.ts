/**
 * Application Logger
 *
 * Centralized logging with structured data and log levels
 * In production, this should integrate with a service like Sentry, LogRocket, or Datadog
 */

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
    const contextStr = context ? ` ${JSON.stringify(context)}` : ''
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
        // In production, send to error tracking service
        if (process.env.NODE_ENV === 'production') {
          // TODO: Send to Sentry or similar
          // Sentry.captureException(new Error(message), { extra: context })
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
}

// Export singleton instance
export const logger = new Logger()

// Export types
export type { LogContext }
