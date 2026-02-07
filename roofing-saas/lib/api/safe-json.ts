/**
 * Safe JSON Parsing Utilities
 *
 * Prevents unhandled SyntaxError when clients send malformed JSON.
 * Use these instead of raw `request.json()` in API route handlers.
 *
 * @example
 * // Option 1: Simple null return (handle missing body yourself)
 * const body = await safeJson<CreateContactInput>(request)
 * if (!body) {
 *   return NextResponse.json(
 *     { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON' } },
 *     { status: 400 }
 *   )
 * }
 *
 * @example
 * // Option 2: Result pattern with built-in error response
 * const result = await parseJsonBody<CreateContactInput>(request)
 * if ('error' in result) return result.error
 * const data = result.data
 */

import { NextResponse } from 'next/server'

/**
 * Safely parse JSON from a Request, returning null on failure.
 *
 * Use when you want to handle the error yourself or when the body
 * is optional (e.g., some PUT routes accept empty bodies).
 */
export async function safeJson<T = unknown>(request: Request): Promise<T | null> {
  try {
    return await request.json() as T
  } catch {
    return null
  }
}

/**
 * Parse JSON from a Request, returning either { data } or { error }.
 *
 * The error is a pre-built NextResponse with a 400 status and the
 * standard API error envelope, ready to return directly from a handler.
 *
 * @example
 * export const POST = withAuth(async (request, { tenantId }) => {
 *   const result = await parseJsonBody<CreateInput>(request)
 *   if ('error' in result) return result.error
 *   const { name, email } = result.data
 *   // ...
 * })
 */
export async function parseJsonBody<T = unknown>(
  request: Request
): Promise<{ data: T } | { error: NextResponse }> {
  try {
    const data = await request.json() as T
    return { data }
  } catch {
    return {
      error: NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid JSON in request body',
          },
        },
        { status: 400 }
      ),
    }
  }
}
