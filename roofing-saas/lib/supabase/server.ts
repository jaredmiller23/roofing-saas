import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { ImpersonationCookie } from '@/lib/impersonation/types'
import { IMPERSONATION_COOKIE_NAME } from '@/lib/impersonation/types'
import type { Database } from '@/lib/types/database.types'

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

  // Trim env vars to handle potential trailing newlines (common copy-paste issue)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ''

  const client = createServerClient<Database>(supabaseUrl, supabaseKey, {
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

  // Check for active impersonation session and set Postgres session variables
  // This allows RLS policies to use get_effective_user_id() function
  const impersonationCookie = cookieStore.get(IMPERSONATION_COOKIE_NAME)

  if (impersonationCookie) {
    try {
      const sessionData: ImpersonationCookie = JSON.parse(impersonationCookie.value)

      // Verify session hasn't expired
      const expiresAt = new Date(sessionData.expires_at)
      const now = new Date()

      if (now <= expiresAt) {
        // Set Postgres session variables for RLS
        // These are read by the get_effective_user_id() function
        try {
          await client.rpc('set_impersonation_session', {
            p_admin_user_id: sessionData.admin_user_id,
            p_impersonated_user_id: sessionData.impersonated_user_id,
          })
        } catch (error) {
          // Log error but don't throw - allow normal auth to proceed
          console.error('Failed to set impersonation session variables:', error)
        }
      }
    } catch (error) {
      // Silently fail - if impersonation setup fails, continue with normal auth
      console.error('Error setting up impersonation session:', error)
    }
  }

  return client
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

  // Trim env vars to handle potential trailing newlines
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || ''

  return createServerClient<Database>(supabaseUrl, serviceRoleKey, {
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
