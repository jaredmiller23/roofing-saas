/**
 * Typed Client-Side API Fetch Helper
 *
 * Provides consistent fetch + unwrap logic for all internal API calls.
 * Expects the standard {success, data, error?, pagination?} response envelope
 * from lib/api/response.ts server helpers.
 *
 * Usage:
 *   // Simple fetch (GET by default)
 *   const contact = await apiFetch<Contact>('/api/contacts/123')
 *
 *   // Paginated fetch
 *   const { data: contacts, pagination } = await apiFetchPaginated<Contact[]>(
 *     '/api/contacts?page=1&limit=20'
 *   )
 *
 *   // Mutation (POST/PUT/PATCH/DELETE)
 *   const result = await apiFetch<{ contact: Contact }>('/api/contacts', {
 *     method: 'POST',
 *     body: { first_name: 'John', last_name: 'Doe' }
 *   })
 *
 *   // Delete (no response body expected)
 *   await apiFetch<void>('/api/contacts/123', { method: 'DELETE' })
 */

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'UNKNOWN_ERROR',
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

export interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  hasMore: boolean
}

export interface PaginatedResult<T> {
  data: T
  pagination: PaginationInfo
}

/** Build RequestInit from our FetchOptions */
function buildInit(options?: FetchOptions): RequestInit {
  const init: RequestInit = {}

  if (options?.method) init.method = options.method
  if (options?.signal) init.signal = options.signal

  if (options?.body !== undefined) {
    init.body = JSON.stringify(options.body)
    init.headers = {
      'Content-Type': 'application/json',
      ...options?.headers,
    }
  } else if (options?.headers) {
    init.headers = options.headers
  }

  return init
}

/**
 * Core fetch that parses the response envelope and throws on error.
 * Returns the parsed {success, data, pagination} object.
 */
async function fetchApi<T>(
  url: string,
  init?: RequestInit
): Promise<{ data: T; pagination?: PaginationInfo }> {
  const res = await fetch(url, init)

  // No-content responses (e.g. 204 from DELETE)
  if (res.status === 204) {
    return { data: undefined as T }
  }

  let json: Record<string, unknown>
  try {
    json = await res.json()
  } catch {
    throw new ApiClientError(
      `Request failed with status ${res.status}`,
      'PARSE_ERROR',
      res.status
    )
  }

  // Error responses: {success: false, error: {code, message, details}}
  if (!res.ok || json.success === false) {
    const err = json.error as
      | { code?: string; message?: string; details?: unknown }
      | undefined
    throw new ApiClientError(
      err?.message || (json.message as string) || `Request failed with status ${res.status}`,
      err?.code || 'REQUEST_FAILED',
      res.status,
      err?.details
    )
  }

  return {
    data: json.data as T,
    pagination: json.pagination as PaginationInfo | undefined,
  }
}

/**
 * Fetch an API endpoint and unwrap the `data` field.
 *
 * @throws {ApiClientError} on non-2xx responses or when success === false
 */
export async function apiFetch<T>(
  url: string,
  options?: FetchOptions
): Promise<T> {
  const response = await fetchApi<T>(url, buildInit(options))
  return response.data
}

/**
 * Fetch a paginated API endpoint. Returns both data and pagination info.
 *
 * @throws {ApiClientError} on non-2xx responses or when success === false
 */
export async function apiFetchPaginated<T>(
  url: string,
  options?: FetchOptions
): Promise<PaginatedResult<T>> {
  const response = await fetchApi<T>(url, buildInit(options))
  return {
    data: response.data,
    pagination: response.pagination ?? { page: 1, limit: 20, total: 0, hasMore: false },
  }
}
