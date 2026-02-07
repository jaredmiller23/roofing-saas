/**
 * Cursor-based pagination using keyset pagination pattern
 *
 * Advantages over offset pagination:
 * - Stable results when data changes (no skipped/duplicate records)
 * - Better performance for large datasets (no OFFSET scan)
 * - Efficient for infinite scroll patterns
 *
 * Pattern:
 * - Cursor encodes { value: timestamp/string, id: uuid } as base64 JSON
 * - Uses composite (column, id) comparison for stable ordering
 * - Always includes id as tiebreaker to handle duplicate sort values
 *
 * Limitations:
 * - Cannot jump to arbitrary pages (no "page 50")
 * - Only forward/backward traversal
 * - Sort column must be indexed for performance
 */

export interface CursorPaginationParams {
  cursor?: string | null // base64-encoded cursor from previous page
  limit?: number // page size (default 25, max 100)
  direction?: 'next' | 'prev' // pagination direction (default: 'next')
}

export interface CursorPaginationResult<T> {
  data: T[]
  nextCursor: string | null
  prevCursor: string | null
  hasMore: boolean
}

/**
 * Encode cursor from sort value and id
 * Cursor format: base64({ value: string, id: string })
 */
export function encodeCursor(value: string, id: string): string {
  const cursor = { value, id }
  return Buffer.from(JSON.stringify(cursor)).toString('base64')
}

/**
 * Decode cursor to sort value and id
 * Returns null if cursor is invalid
 */
export function decodeCursor(cursor: string): { value: string; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8')
    const parsed = JSON.parse(decoded)
    if (!parsed.value || !parsed.id) {
      return null
    }
    return { value: parsed.value, id: parsed.id }
  } catch {
    return null
  }
}

/**
 * Parse cursor pagination params from URLSearchParams
 * Validates and normalizes limit (default 25, max 100)
 */
export function parseCursorParams(searchParams: URLSearchParams): CursorPaginationParams {
  const cursor = searchParams.get('cursor')
  const limit = Math.min(
    parseInt(searchParams.get('limit') || '25', 10),
    100 // max page size
  )
  const direction = (searchParams.get('direction') || 'next') as 'next' | 'prev'

  return {
    cursor: cursor || null,
    limit: isNaN(limit) ? 25 : limit,
    direction: direction === 'prev' ? 'prev' : 'next',
  }
}

/**
 * Build Supabase query filter for cursor pagination
 *
 * For "next" page: WHERE (sort_column, id) > (cursor_value, cursor_id)
 * For "prev" page: WHERE (sort_column, id) < (cursor_value, cursor_id)
 *
 * Note: Supabase doesn't support composite row comparisons directly,
 * so we use .or() with explicit logic:
 * - (column > value) OR (column = value AND id > cursor_id)
 *
 * @param cursor - Decoded cursor { value, id }
 * @param sortColumn - Column to sort by (default: created_at)
 * @param direction - 'next' or 'prev'
 * @returns Filter string for .or() clause
 */
export function buildCursorFilter(
  cursor: { value: string; id: string },
  sortColumn: string = 'created_at',
  direction: 'next' | 'prev' = 'next'
): string {
  const operator = direction === 'next' ? 'gt' : 'lt'

  // Pattern: (column > value) OR (column = value AND id > cursor_id)
  // Example: created_at.gt.2026-02-07,and(created_at.eq.2026-02-07,id.gt.abc-123)
  return `${sortColumn}.${operator}.${cursor.value},and(${sortColumn}.eq.${cursor.value},id.${operator}.${cursor.id})`
}

/**
 * Extract cursors from paginated result
 *
 * @param data - Array of records
 * @param sortColumn - Column used for sorting
 * @param limit - Page size (to determine hasMore)
 * @returns Cursor metadata
 */
export function extractCursors<T extends Record<string, unknown>>(
  data: T[],
  sortColumn: string = 'created_at',
  limit: number
): {
  nextCursor: string | null
  prevCursor: string | null
  hasMore: boolean
  trimmedData: T[]
} {
  if (!data || data.length === 0) {
    return {
      nextCursor: null,
      prevCursor: null,
      hasMore: false,
      trimmedData: [],
    }
  }

  // We fetch limit + 1 to determine hasMore
  const hasMore = data.length > limit
  const trimmedData = hasMore ? data.slice(0, limit) : data

  // First record cursor (for prevCursor)
  const firstRecord = trimmedData[0]
  const prevCursor = encodeCursor(
    String(firstRecord[sortColumn]),
    String(firstRecord.id)
  )

  // Last record cursor (for nextCursor)
  const lastRecord = trimmedData[trimmedData.length - 1]
  const nextCursor = hasMore
    ? encodeCursor(String(lastRecord[sortColumn]), String(lastRecord.id))
    : null

  return {
    nextCursor,
    prevCursor,
    hasMore,
    trimmedData,
  }
}
