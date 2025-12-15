/**
 * Example integrations for the Realtime Channel Manager
 *
 * These examples demonstrate how to integrate the channel manager
 * with your React components and existing hooks.
 */

import { useEffect, useCallback } from 'react'
import {
  subscribeToEntity,
  joinPresence,
  leavePresence,
  broadcast,
  cleanupAllChannels,
  getChannelManager,
  type PresenceUser,
  type EntitySubscriptionConfig,
} from './channel-manager'

/**
 * Example 1: Hook for entity realtime subscription
 *
 * Usage:
 * ```tsx
 * const { status } = useEntitySubscription({
 *   entityType: 'contact',
 *   entityId: contactId,
 *   onUpdate: (payload) => {
 *     // Refresh data
 *     mutate('/api/contacts/' + contactId)
 *   }
 * })
 * ```
 */
export function useEntitySubscription<T extends { [key: string]: unknown } = { [key: string]: unknown }>(
  config: Omit<EntitySubscriptionConfig<T>, 'onStatusChange'> & {
    enabled?: boolean
  }
) {
  const { enabled = true, entityType, entityId, tenantId, ...restConfig } = config

  useEffect(() => {
    if (!enabled) return

    const subscriptionConfig = { entityType, entityId, tenantId, ...restConfig }

    const setupSubscription = async () => {
      try {
        await subscribeToEntity(subscriptionConfig)
      } catch (error) {
        console.error('Failed to setup realtime subscription:', error)
      }
    }

    setupSubscription()

    // Cleanup handled by manager, but we can explicitly unsubscribe
    return () => {
      const manager = getChannelManager()
      if (tenantId) {
        manager.unsubscribe('subscription', entityType, entityId, tenantId)
      } else {
        manager.unsubscribe('subscription', entityType, entityId)
      }
    }
  }, [enabled, entityType, entityId, tenantId, restConfig])
}

/**
 * Example 2: Hook for presence tracking with state
 *
 * Usage:
 * ```tsx
 * const { presentUsers, isTracking } = useEntityPresence({
 *   entityType: 'project',
 *   entityId: projectId,
 *   user: currentUser,
 *   enabled: !!currentUser
 * })
 * ```
 */
export function useEntityPresence(config: {
  entityType: string
  entityId: string
  user: {
    id: string
    name?: string
    email?: string
    avatar?: string
  }
  metadata?: Record<string, unknown>
  tenantId?: string
  enabled?: boolean
  onUserJoin?: (user: PresenceUser) => void
  onUserLeave?: (user: PresenceUser) => void
}) {
  const { enabled = true, onUserJoin, onUserLeave, entityType, entityId, user, tenantId, metadata } = config
  const [presentUsers, setPresentUsers] = React.useState<PresenceUser[]>([])
  const [isTracking, setIsTracking] = React.useState(false)

  useEffect(() => {
    if (!enabled || !user.id) return

    const setupPresence = async () => {
      try {
        await joinPresence({
          entityType,
          entityId,
          user,
          tenantId,
          metadata,
          onSync: (users) => {
            setPresentUsers(users)
            setIsTracking(true)
          },
          onJoin: (joinedUser) => {
            setPresentUsers((prev) => [...prev, joinedUser])
            onUserJoin?.(joinedUser)
          },
          onLeave: (leftUser) => {
            setPresentUsers((prev) => prev.filter((u) => u.userId !== leftUser.userId))
            onUserLeave?.(leftUser)
          },
          onError: (error) => {
            console.error('Presence error:', error)
            setIsTracking(false)
          },
        })
      } catch (error) {
        console.error('Failed to setup presence:', error)
      }
    }

    setupPresence()

    return () => {
      leavePresence(entityType, entityId, tenantId)
      setPresentUsers([])
      setIsTracking(false)
    }
  }, [enabled, entityType, entityId, user, tenantId, metadata, onUserJoin, onUserLeave])

  return {
    presentUsers,
    isTracking,
    count: presentUsers.length,
  }
}

/**
 * Example 3: Utility for broadcasting with debounce
 *
 * Usage:
 * ```tsx
 * const sendCursorUpdate = useDebouncedBroadcast({
 *   entityType: 'document',
 *   entityId: documentId,
 *   event: 'cursor',
 *   delay: 50
 * })
 *
 * // In event handler
 * sendCursorUpdate({ x: e.clientX, y: e.clientY })
 * ```
 */
export function useDebouncedBroadcast(config: {
  entityType: string
  entityId: string
  event: string
  tenantId?: string
  delay?: number
}) {
  const { delay = 100, entityType, entityId, event, tenantId } = config
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const debouncedBroadcast = useCallback(
    (payload: Record<string, unknown>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        broadcast({
          entityType,
          entityId,
          event,
          tenantId,
          payload,
        }).catch((error) => {
          console.error('Broadcast failed:', error)
        })
      }, delay)
    },
    [entityType, entityId, event, tenantId, delay]
  )

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return debouncedBroadcast
}

/**
 * Example 4: Cleanup effect for logout
 *
 * Usage:
 * ```tsx
 * // In your auth provider or logout handler
 * useCleanupOnLogout(isAuthenticated)
 * ```
 */
export function useCleanupOnLogout(isAuthenticated: boolean) {
  const previousAuthRef = React.useRef(isAuthenticated)

  useEffect(() => {
    // If user just logged out (was authenticated, now is not)
    if (previousAuthRef.current && !isAuthenticated) {
      cleanupAllChannels()
    }
    previousAuthRef.current = isAuthenticated
  }, [isAuthenticated])
}

/**
 * Example 5: Multi-entity subscription
 *
 * Usage:
 * ```tsx
 * useMultiEntitySubscription([
 *   { entityType: 'contact', entityId: contact1.id },
 *   { entityType: 'contact', entityId: contact2.id },
 *   { entityType: 'project', entityId: project1.id }
 * ], {
 *   onUpdate: (payload) => {
 *     console.log('Something updated:', payload)
 *   }
 * })
 * ```
 */
export function useMultiEntitySubscription(
  entities: Array<{ entityType: string; entityId: string; table?: string }>,
  callbacks: {
    onInsert?: (payload: unknown) => void
    onUpdate?: (payload: unknown) => void
    onDelete?: (payload: unknown) => void
  }
) {
  // Create stable references for the dependency array
  const entitiesString = React.useMemo(
    () => JSON.stringify(entities.map((e) => ({ t: e.entityType, i: e.entityId }))),
    [entities]
  )

  useEffect(() => {
    const setupSubscriptions = async () => {
      for (const entity of entities) {
        try {
          await subscribeToEntity({
            ...entity,
            ...callbacks,
          })
        } catch (error) {
          console.error(
            `Failed to subscribe to ${entity.entityType}:${entity.entityId}`,
            error
          )
        }
      }
    }

    setupSubscriptions()

    return () => {
      const manager = getChannelManager()
      entities.forEach((entity) => {
        manager.unsubscribe('subscription', entity.entityType, entity.entityId)
      })
    }
  }, [entities, callbacks, entitiesString])
}

/**
 * Example 6: Monitor channel health
 *
 * Usage:
 * ```tsx
 * const stats = useChannelStats()
 * // stats = { total: 5, byType: {...}, byStatus: {...} }
 * ```
 */
export function useChannelStats() {
  const [stats, setStats] = React.useState({
    total: 0,
    byType: { subscription: 0, presence: 0, broadcast: 0 } as Record<string, number>,
    byStatus: { connecting: 0, connected: 0, disconnected: 0, error: 0 } as Record<string, number>,
  })

  useEffect(() => {
    const updateStats = () => {
      const manager = getChannelManager()
      setStats(manager.getChannelStats() as typeof stats)
    }

    // Update immediately
    updateStats()

    // Update every 5 seconds
    const interval = setInterval(updateStats, 5000)

    return () => clearInterval(interval)
  }, [])

  return stats
}

/**
 * React import helper (add this to the top of your files that use these hooks)
 */
import React from 'react'
