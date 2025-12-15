"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js'

// Type for presence payload
interface _PresencePayload {
  userId: string
  userName?: string
  userEmail?: string
  userAvatar?: string
  joinedAt: string
  metadata?: Record<string, unknown>
}

/**
 * Represents a user's presence information
 */
export interface PresenceUser {
  /**
   * User ID
   */
  userId: string

  /**
   * User's display name
   */
  userName?: string

  /**
   * User's email
   */
  userEmail?: string

  /**
   * User's avatar URL
   */
  userAvatar?: string

  /**
   * Timestamp when user joined
   */
  joinedAt: string

  /**
   * Additional metadata
   */
  metadata?: Record<string, unknown>
}

/**
 * Configuration for presence tracking
 */
export interface UsePresenceConfig {
  /**
   * Entity type (e.g., 'contact', 'project', 'estimate')
   */
  entityType: string

  /**
   * Entity ID
   */
  entityId: string

  /**
   * Current user information
   */
  user: {
    id: string
    name?: string
    email?: string
    avatar?: string
  }

  /**
   * Additional metadata to track with presence
   */
  metadata?: Record<string, unknown>

  /**
   * Callback when presence list changes
   */
  onPresenceChange?: (users: PresenceUser[]) => void

  /**
   * Callback when a user joins
   */
  onUserJoin?: (user: PresenceUser) => void

  /**
   * Callback when a user leaves
   */
  onUserLeave?: (user: PresenceUser) => void

  /**
   * Enable tracking (default: true)
   */
  enabled?: boolean
}

/**
 * Return type for usePresence hook
 */
export interface UsePresenceReturn {
  /**
   * List of users currently present
   */
  presentUsers: PresenceUser[]

  /**
   * Number of users present
   */
  count: number

  /**
   * Whether the current user is successfully tracking presence
   */
  isTracking: boolean

  /**
   * Latest error if unknown
   */
  error: Error | null

  /**
   * Manually update presence metadata
   */
  updateMetadata: (metadata: Record<string, unknown>) => void
}

/**
 * Hook for tracking user presence on specific pages/entities
 *
 * Uses Supabase presence to show who else is currently viewing the same entity.
 * Automatically joins on mount and leaves on unmount.
 *
 * @example
 * ```tsx
 * const { presentUsers, count, isTracking } = usePresence({
 *   entityType: 'contact',
 *   entityId: contactId,
 *   user: {
 *     id: currentUser.id,
 *     name: currentUser.name,
 *     email: currentUser.email,
 *     avatar: currentUser.avatar
 *   },
 *   onUserJoin: (user) => {
 *     toast.info(`${user.userName} started viewing this contact`)
 *   }
 * })
 * ```
 */
export function usePresence(config: UsePresenceConfig): UsePresenceReturn {
  const {
    entityType,
    entityId,
    user,
    metadata,
    onPresenceChange,
    onUserJoin,
    onUserLeave,
    enabled = true,
  } = config

  const [presentUsers, setPresentUsers] = useState<PresenceUser[]>([])
  const [isTracking, setIsTracking] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const isMountedRef = useRef(true)
  const previousPresenceRef = useRef<Map<string, PresenceUser>>(new Map())

  // Generate channel name based on entity
  const channelName = `presence:${entityType}:${entityId}`

  // Convert Supabase presence state to our PresenceUser array
  const parsePresenceState = useCallback((state: RealtimePresenceState<Record<string, unknown>>): PresenceUser[] => {
    const users: PresenceUser[] = []

    Object.keys(state).forEach((key) => {
      const presences = state[key]
      if (presences && presences.length > 0) {
        // Take the first presence for each key (user can have multiple connections)
        const presence = presences[0]
        const presenceData = presence as unknown as _PresencePayload
        users.push({
          userId: presenceData.userId,
          userName: presenceData.userName,
          userEmail: presenceData.userEmail,
          userAvatar: presenceData.userAvatar,
          joinedAt: presenceData.joinedAt,
          metadata: presenceData.metadata,
        })
      }
    })

    // Filter out current user
    return users.filter(u => u.userId !== user.id)
  }, [user.id])

  // Update metadata function
  const updateMetadata = (newMetadata: Record<string, unknown>) => {
    if (channelRef.current && isTracking) {
      const presencePayload = {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userAvatar: user.avatar,
        joinedAt: new Date().toISOString(),
        metadata: { ...metadata, ...newMetadata },
      }

      channelRef.current.track(presencePayload)
    }
  }

  // Setup presence tracking
  useEffect(() => {
    if (!enabled || !entityType || !entityId || !user.id) {
      return
    }

    isMountedRef.current = true
    setError(null)

    const supabase = createClient()
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: user.id,
        },
      },
    })

    // Listen for presence sync
    channel.on('presence', { event: 'sync' }, () => {
      if (!isMountedRef.current) return

      const state = channel.presenceState()
      const users = parsePresenceState(state)

      // Detect joins and leaves
      const currentPresenceMap = new Map(users.map(u => [u.userId, u]))
      const previousPresenceMap = previousPresenceRef.current

      // Check for new joins
      users.forEach(user => {
        if (!previousPresenceMap.has(user.userId) && onUserJoin) {
          onUserJoin(user)
        }
      })

      // Check for leaves
      previousPresenceMap.forEach((user, userId) => {
        if (!currentPresenceMap.has(userId) && onUserLeave) {
          onUserLeave(user)
        }
      })

      previousPresenceRef.current = currentPresenceMap
      setPresentUsers(users)

      if (onPresenceChange) {
        onPresenceChange(users)
      }
    })

    // Listen for presence join events
    channel.on('presence', { event: 'join' }, ({ key: _key, newPresences }) => {
      if (!isMountedRef.current) return

      newPresences.forEach((presence: unknown) => {
        const presenceData = presence as PresenceUser
        if (presenceData.userId !== user.id && onUserJoin) {
          const presenceUser: PresenceUser = {
            userId: presenceData.userId,
            userName: presenceData.userName,
            userEmail: presenceData.userEmail,
            userAvatar: presenceData.userAvatar,
            joinedAt: presenceData.joinedAt,
            metadata: presenceData.metadata,
          }
          onUserJoin(presenceUser)
        }
      })
    })

    // Listen for presence leave events
    channel.on('presence', { event: 'leave' }, ({ key: _key, leftPresences }) => {
      if (!isMountedRef.current) return

      leftPresences.forEach((presence: unknown) => {
        const presenceData = presence as PresenceUser
        if (presenceData.userId !== user.id && onUserLeave) {
          const presenceUser: PresenceUser = {
            userId: presenceData.userId,
            userName: presenceData.userName,
            userEmail: presenceData.userEmail,
            userAvatar: presenceData.userAvatar,
            joinedAt: presenceData.joinedAt,
            metadata: presenceData.metadata,
          }
          onUserLeave(presenceUser)
        }
      })
    })

    // Subscribe and track presence
    channel
      .subscribe(async (status) => {
        if (!isMountedRef.current) return

        if (status === 'SUBSCRIBED') {
          // Track our presence
          const presencePayload = {
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            userAvatar: user.avatar,
            joinedAt: new Date().toISOString(),
            metadata: metadata || {},
          }

          await channel.track(presencePayload)
          setIsTracking(true)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          const errorObj = new Error(`Presence channel ${status}`)
          setError(errorObj)
          setIsTracking(false)
        } else if (status === 'CLOSED') {
          setIsTracking(false)
        }
      })

    channelRef.current = channel

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false

      if (channelRef.current) {
        channelRef.current.untrack()
        channelRef.current.unsubscribe()
        channelRef.current = null
      }

      previousPresenceRef.current.clear()
    }
  }, [enabled, entityType, entityId, user.id, user.name, user.email, user.avatar, channelName, metadata, onPresenceChange, onUserJoin, onUserLeave, parsePresenceState])

  return {
    presentUsers,
    count: presentUsers.length,
    isTracking,
    error,
    updateMetadata,
  }
}

/**
 * Helper function to create entity-specific presence hooks
 *
 * @example
 * ```tsx
 * const useContactPresence = createEntityPresence('contact')
 *
 * function ContactPage({ contactId, currentUser }) {
 *   const { presentUsers, count } = useContactPresence({
 *     entityId: contactId,
 *     user: currentUser
 *   })
 * }
 * ```
 */
export function createEntityPresence(entityType: string) {
  return (
    config: Omit<UsePresenceConfig, 'entityType'>
  ) => {
    return usePresence({
      ...config,
      entityType,
    })
  }
}

/**
 * Pre-configured presence hooks for common entities
 */
export const useContactPresence = createEntityPresence('contact')
export const useProjectPresence = createEntityPresence('project')
export const useEstimatePresence = createEntityPresence('estimate')
export const useMessagePresence = createEntityPresence('message')
