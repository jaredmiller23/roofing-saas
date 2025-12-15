"use client"

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

/**
 * Event types for postgres changes
 */
export type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

/**
 * Configuration for realtime subscription
 */
export interface RealtimeSubscriptionConfig<T extends { [key: string]: any } = { [key: string]: any }> {
  /**
   * Name of the channel (must be unique per subscription)
   */
  channelName: string

  /**
   * Database table to subscribe to
   */
  table: string

  /**
   * Event type to listen for (INSERT, UPDATE, DELETE, or * for all)
   */
  event?: PostgresChangeEvent

  /**
   * Database schema (defaults to 'public')
   */
  schema?: string

  /**
   * Optional filter for the subscription (e.g., 'id=eq.123')
   */
  filter?: string

  /**
   * Callback function when a change is received
   */
  onPayload?: (payload: RealtimePostgresChangesPayload<T>) => void

  /**
   * Callback function when an error occurs
   */
  onError?: (error: Error) => void

  /**
   * Enable automatic reconnection on failure (default: true)
   */
  autoReconnect?: boolean

  /**
   * Delay in milliseconds before attempting reconnection (default: 3000)
   */
  reconnectDelay?: number
}

/**
 * Return type for useRealtimeSubscription hook
 */
export interface RealtimeSubscriptionReturn {
  /**
   * Current connection status
   */
  status: 'connecting' | 'connected' | 'disconnected' | 'error'

  /**
   * Latest error if any
   */
  error: Error | null

  /**
   * Manually unsubscribe from the channel
   */
  unsubscribe: () => void

  /**
   * Manually reconnect to the channel
   */
  reconnect: () => void
}

/**
 * Generic hook for subscribing to Supabase real-time database changes
 *
 * @example
 * ```tsx
 * const { status, error } = useRealtimeSubscription({
 *   channelName: 'contacts-changes',
 *   table: 'contacts',
 *   event: '*',
 *   onPayload: (payload) => {
 *     console.log('Change received:', payload)
 *   }
 * })
 * ```
 */
export function useRealtimeSubscription<T extends { [key: string]: any } = { [key: string]: any }>(
  config: RealtimeSubscriptionConfig<T>
): RealtimeSubscriptionReturn {
  const {
    channelName,
    table,
    event = '*',
    schema = 'public',
    filter,
    onPayload,
    onError,
    autoReconnect = true,
    reconnectDelay = 3000,
  } = config

  const [status, setStatus] = useState<RealtimeSubscriptionReturn['status']>('disconnected')
  const [error, setError] = useState<Error | null>(null)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  // Cleanup function
  const cleanup = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current = null
    }
  }

  // Subscribe function
  const subscribe = () => {
    if (!isMountedRef.current) return

    try {
      setStatus('connecting')
      setError(null)

      const supabase = createClient()
      const channel = supabase.channel(channelName)

      // Configure postgres changes listener
      const changeConfig: any = {
        event,
        schema,
        table,
      }

      if (filter) {
        changeConfig.filter = filter
      }

      channel.on(
        'postgres_changes',
        changeConfig,
        (payload: RealtimePostgresChangesPayload<T>) => {
          if (isMountedRef.current && onPayload) {
            onPayload(payload)
          }
        }
      )

      // Subscribe to the channel
      channel
        .subscribe((status, err) => {
          if (!isMountedRef.current) return

          if (status === 'SUBSCRIBED') {
            setStatus('connected')
            setError(null)
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            const errorObj = err || new Error(`Subscription ${status}`)
            setStatus('error')
            setError(errorObj)

            if (onError) {
              onError(errorObj)
            }

            // Attempt reconnection if enabled
            if (autoReconnect && isMountedRef.current) {
              reconnectTimeoutRef.current = setTimeout(() => {
                if (isMountedRef.current) {
                  cleanup()
                  subscribe()
                }
              }, reconnectDelay)
            }
          } else if (status === 'CLOSED') {
            setStatus('disconnected')
          }
        })

      channelRef.current = channel
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      setStatus('error')
      setError(errorObj)

      if (onError) {
        onError(errorObj)
      }

      // Attempt reconnection if enabled
      if (autoReconnect && isMountedRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            subscribe()
          }
        }, reconnectDelay)
      }
    }
  }

  // Unsubscribe function
  const unsubscribe = () => {
    cleanup()
    setStatus('disconnected')
  }

  // Reconnect function
  const reconnect = () => {
    cleanup()
    subscribe()
  }

  // Subscribe on mount
  useEffect(() => {
    isMountedRef.current = true
    subscribe()

    return () => {
      isMountedRef.current = false
      cleanup()
    }
  }, [channelName, table, event, schema, filter])

  return {
    status,
    error,
    unsubscribe,
    reconnect,
  }
}

/**
 * Helper function to create a table-specific subscription hook
 *
 * @example
 * ```tsx
 * const useContactsSubscription = createTableSubscription('contacts')
 *
 * function MyComponent() {
 *   const { status } = useContactsSubscription({
 *     event: 'INSERT',
 *     onPayload: (payload) => console.log('New contact:', payload.new)
 *   })
 * }
 * ```
 */
export function createTableSubscription<T extends { [key: string]: any } = { [key: string]: any }>(table: string) {
  return (
    config: Omit<RealtimeSubscriptionConfig<T>, 'table' | 'channelName'> & {
      channelName?: string
    }
  ) => {
    const channelName = config.channelName || `${table}-changes`

    return useRealtimeSubscription<T>({
      ...config,
      table,
      channelName,
    })
  }
}

/**
 * Pre-configured hooks for common tables
 */
export const useContactsSubscription = createTableSubscription('contacts')
export const useProjectsSubscription = createTableSubscription('projects')
export const useEstimatesSubscription = createTableSubscription('estimates')
export const useMessagesSubscription = createTableSubscription('messages')
