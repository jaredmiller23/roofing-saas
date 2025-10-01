import { createBrowserClient } from '@supabase/ssr'

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
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
