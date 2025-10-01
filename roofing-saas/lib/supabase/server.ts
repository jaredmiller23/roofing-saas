import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Server-side Supabase client for Server Components and Server Actions
 *
 * This client automatically handles cookie-based authentication and
 * provides type-safe database access with Row-Level Security (RLS) enabled.
 *
 * Usage in Server Components:
 * ```typescript
 * const supabase = createClient()
 * const { data } = await supabase.from('contacts').select('*')
 * ```
 *
 * Usage in Server Actions:
 * ```typescript
 * 'use server'
 *
 * export async function getContacts() {
 *   const supabase = createClient()
 *   return await supabase.from('contacts').select('*')
 * }
 * ```
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Admin Supabase client with service role access
 *
 * ⚠️ WARNING: This client bypasses Row-Level Security (RLS) policies.
 * Only use this for admin operations that require elevated permissions.
 * Never expose this client to the frontend.
 *
 * Common use cases:
 * - Creating users programmatically
 * - Bulk data operations
 * - System-level queries
 *
 * Usage:
 * ```typescript
 * const admin = createAdminClient()
 * await admin.from('users').update({ role: 'admin' }).eq('id', userId)
 * ```
 */
export async function createAdminClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore
          }
        },
      },
    }
  )
}
