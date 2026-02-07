/**
 * Standardized API Response Helpers
 *
 * Provides consistent response formatting across all API routes
 */

import { NextResponse } from 'next/server'
import { ApiError } from './errors'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  pagination?: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
  cursor?: {
    nextCursor: string | null
    prevCursor: string | null
    hasMore: boolean
  }
}

export interface PaginationParams {
  page: number
  limit: number
  total: number
}

export interface CursorPaginationParams {
  nextCursor: string | null
  prevCursor: string | null
  hasMore: boolean
}

/**
 * Success response helper
 */
export function successResponse<T>(
  data: T,
  status = 200,
  headers?: HeadersInit
): NextResponse<ApiResponse<T>> {
  // Only include headers in options if actually provided (avoid passing undefined)
  const options = headers ? { status, headers } : { status }
  return NextResponse.json(
    {
      success: true,
      data,
    },
    options
  )
}

/**
 * Success response with pagination
 */
export function paginatedResponse<T>(
  data: T,
  pagination: PaginationParams,
  status = 200
): NextResponse<ApiResponse<T>> {
  const { page, limit, total } = pagination

  return NextResponse.json(
    {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    },
    { status }
  )
}

/**
 * Cursor-based paginated response
 */
export function cursorPaginatedResponse<T>(
  data: T,
  cursor: CursorPaginationParams,
  status = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      cursor,
    },
    { status }
  )
}

/**
 * Error response helper
 */
export function errorResponse(
  error: ApiError | Error,
  status?: number
): NextResponse<ApiResponse> {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.statusCode }
    )
  }

  // Generic error fallback
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred',
      },
    },
    { status: status || 500 }
  )
}

/**
 * Created response (201)
 */
export function createdResponse<T>(data: T): NextResponse<ApiResponse<T>> {
  return successResponse(data, 201)
}

/**
 * No content response (204)
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

/**
 * Accepted response (202) - for async operations
 */
export function acceptedResponse<T>(data?: T): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status: 202 }
  )
}
