import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database.types'

/**
 * Client-side Supabase client for Client Components
 *
 * This client runs in the browser and automatically handles authentication
 * state via cookies. It provides real-time subscriptions and client-side queries.
 *
 * Usage in Client Components:
 * ```typescript
 * 'use client'
 *
 * import { createClient } from '@/lib/supabase/client'
 * import { useEffect, useState } from 'react'
 *
 * export function MyComponent() {
 *   const [data, setData] = useState([])
 *   const supabase = createClient()
 *
 *   useEffect(() => {
 *     async function loadData() {
 *       const { data } = await supabase.from('contacts').select('*')
 *       setData(data)
 *     }
 *     loadData()
 *   }, [])
 *
 *   // Return your component JSX here
 * }
 * ```
 *
 * Real-time subscriptions:
 * ```typescript
 * const supabase = createClient()
 *
 * supabase
 *   .channel('contacts-changes')
 *   .on('postgres_changes', {
 *     event: '*',
 *     schema: 'public',
 *     table: 'contacts'
 *   }, (payload) => {
 *     console.log('Change received!', payload)
 *   })
 *   .subscribe()
 * ```
 */
export function createClient() {
  // Trim env vars to handle potential trailing newlines (common copy-paste issue)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ''

  return createBrowserClient<Database>(supabaseUrl, supabaseKey)
}
