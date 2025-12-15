/**
 * Supabase Realtime Channel Manager
 *
 * Singleton service for coordinating realtime channels across the application.
 * Prevents duplicate subscriptions, manages channel lifecycle, and provides
 * centralized presence tracking and broadcast capabilities.
 *
 * Features:
 * - Singleton pattern for app-wide coordination
 * - Automatic duplicate channel prevention
 * - Presence tracking across entities
 * - Channel cleanup and reconnection logic
 * - Tenant/user scoped channel names
 * - Error handling and retry logic
 * - Comprehensive logging for debugging
 *
 * @example
 * ```typescript
 * const manager = RealtimeChannelManager.getInstance()
 *
 * // Subscribe to entity changes
 * const channel = await manager.subscribeToEntity({
 *   entityType: 'contact',
 *   entityId: '123',
 *   onInsert: (payload) => console.log('New:', payload),
 *   onUpdate: (payload) => console.log('Updated:', payload),
 *   onDelete: (payload) => console.log('Deleted:', payload),
 * })
 *
 * // Join presence for an entity
 * await manager.joinPresence({
 *   entityType: 'project',
 *   entityId: '456',
 *   user: { id: 'user-1', name: 'John' },
 *   onSync: (users) => console.log('Present:', users),
 * })
 *
 * // Cleanup on logout
 * manager.cleanupAll()
 * ```
 */

import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import type {
  RealtimeChannel,
  RealtimeChannelSendResponse,
  RealtimePostgresChangesPayload,
  RealtimePresenceState,
  SupabaseClient,
} from '@supabase/supabase-js'

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
 * Postgres change event types
 */
export type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

/**
 * Channel connection status
 */
export type ChannelStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

/**
 * Presence user information
 */
export interface PresenceUser {
  userId: string
  userName?: string
  userEmail?: string
  userAvatar?: string
  joinedAt: string
  metadata?: Record<string, unknown>
}

/**
 * Configuration for entity subscription
 */
export interface EntitySubscriptionConfig<T extends { [key: string]: unknown } = { [key: string]: unknown }> {
  /**
   * Entity type (e.g., 'contact', 'project', 'estimate')
   */
  entityType: string

  /**
   * Entity ID
   */
  entityId: string

  /**
   * Database table name (defaults to entityType + 's')
   */
  table?: string

  /**
   * Database schema (defaults to 'public')
   */
  schema?: string

  /**
   * Event filter (INSERT, UPDATE, DELETE, or * for all)
   */
  event?: PostgresChangeEvent

  /**
   * Callback for INSERT events
   */
  onInsert?: (payload: RealtimePostgresChangesPayload<T>) => void

  /**
   * Callback for UPDATE events
   */
  onUpdate?: (payload: RealtimePostgresChangesPayload<T>) => void

  /**
   * Callback for DELETE events
   */
  onDelete?: (payload: RealtimePostgresChangesPayload<T>) => void

  /**
   * Callback for unknown change event
   */
  onChange?: (payload: RealtimePostgresChangesPayload<T>) => void

  /**
   * Callback for connection status changes
   */
  onStatusChange?: (status: ChannelStatus) => void

  /**
   * Callback for errors
   */
  onError?: (error: Error) => void

  /**
   * Tenant ID for multi-tenancy (optional)
   */
  tenantId?: string

  /**
   * Enable auto-reconnect on failure (default: true)
   */
  autoReconnect?: boolean

  /**
   * Reconnect delay in milliseconds (default: 3000)
   */
  reconnectDelay?: number
}

/**
 * Configuration for presence tracking
 */
export interface PresenceConfig {
  /**
   * Entity type (e.g., 'contact', 'project')
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
   * Additional metadata to track
   */
  metadata?: Record<string, unknown>

  /**
   * Callback when presence state syncs
   */
  onSync?: (users: PresenceUser[]) => void

  /**
   * Callback when a user joins
   */
  onJoin?: (user: PresenceUser) => void

  /**
   * Callback when a user leaves
   */
  onLeave?: (user: PresenceUser) => void

  /**
   * Callback for errors
   */
  onError?: (error: Error) => void

  /**
   * Tenant ID for multi-tenancy (optional)
   */
  tenantId?: string
}

/**
 * Broadcast message configuration
 */
export interface BroadcastConfig {
  /**
   * Entity type
   */
  entityType: string

  /**
   * Entity ID
   */
  entityId: string

  /**
   * Event name
   */
  event: string

  /**
   * Payload to broadcast
   */
  payload: Record<string, unknown>

  /**
   * Tenant ID for multi-tenancy (optional)
   */
  tenantId?: string
}

/**
 * Internal channel tracking information
 */
interface ChannelInfo {
  channel: RealtimeChannel
  type: 'subscription' | 'presence' | 'broadcast'
  entityType: string
  entityId: string
  tenantId?: string
  status: ChannelStatus
  createdAt: Date
  reconnectTimeout?: NodeJS.Timeout
  reconnectAttempts: number
  maxReconnectAttempts: number
}

/**
 * Singleton Channel Manager for Supabase Realtime
 */
export class RealtimeChannelManager {
  private static instance: RealtimeChannelManager | null = null
  private supabase: SupabaseClient
  private channels: Map<string, ChannelInfo> = new Map()
  private presenceStates: Map<string, Map<string, PresenceUser>> = new Map()
  private readonly MAX_RECONNECT_ATTEMPTS = 5
  private readonly DEFAULT_RECONNECT_DELAY = 3000

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.supabase = createClient()
    logger.info('RealtimeChannelManager initialized')
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): RealtimeChannelManager {
    if (!RealtimeChannelManager.instance) {
      RealtimeChannelManager.instance = new RealtimeChannelManager()
    }
    return RealtimeChannelManager.instance
  }

  /**
   * Reset singleton instance (mainly for testing)
   */
  public static resetInstance(): void {
    if (RealtimeChannelManager.instance) {
      RealtimeChannelManager.instance.cleanupAll()
      RealtimeChannelManager.instance = null
    }
  }

  /**
   * Generate a unique channel name
   */
  private generateChannelName(
    type: 'subscription' | 'presence' | 'broadcast',
    entityType: string,
    entityId: string,
    tenantId?: string
  ): string {
    const parts = [type, entityType, entityId]
    if (tenantId) {
      parts.unshift(`tenant:${tenantId}`)
    }
    return parts.join(':')
  }

  /**
   * Get channel info by name
   */
  private getChannelInfo(channelName: string): ChannelInfo | undefined {
    return this.channels.get(channelName)
  }

  /**
   * Check if a channel already exists
   */
  public hasChannel(
    type: 'subscription' | 'presence' | 'broadcast',
    entityType: string,
    entityId: string,
    tenantId?: string
  ): boolean {
    const channelName = this.generateChannelName(type, entityType, entityId, tenantId)
    return this.channels.has(channelName)
  }

  /**
   * Subscribe to entity changes (INSERT, UPDATE, DELETE)
   */
  public async subscribeToEntity<T extends { [key: string]: unknown } = { [key: string]: unknown }>(
    config: EntitySubscriptionConfig<T>
  ): Promise<RealtimeChannel> {
    const {
      entityType,
      entityId,
      table = `${entityType}s`,
      schema = 'public',
      event = '*',
      onInsert,
      onUpdate,
      onDelete,
      onChange,
      onStatusChange,
      onError,
      tenantId,
      autoReconnect = true,
      reconnectDelay = this.DEFAULT_RECONNECT_DELAY,
    } = config

    const channelName = this.generateChannelName('subscription', entityType, entityId, tenantId)

    // Check for existing channel
    const existingInfo = this.getChannelInfo(channelName)
    if (existingInfo) {
      logger.debug('Reusing existing subscription channel', { channelName })
      return existingInfo.channel
    }

    logger.info('Creating new subscription channel', {
      channelName,
      table,
      event,
      tenantId,
    })

    try {
      const channel = this.supabase.channel(channelName)

      // Configure postgres changes listener
      const changeConfig: {
        event: PostgresChangeEvent
        schema: string
        table: string
        filter: string
      } = {
        event,
        schema,
        table,
        filter: `id=eq.${entityId}`,
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(channel as any).on('postgres_changes', changeConfig, (payload: RealtimePostgresChangesPayload<T>) => {
        logger.debug('Received postgres change', {
          channelName,
          eventType: payload.eventType,
          table: payload.table,
        })

        // Call specific event handlers
        if (payload.eventType === 'INSERT' && onInsert) {
          onInsert(payload)
        } else if (payload.eventType === 'UPDATE' && onUpdate) {
          onUpdate(payload)
        } else if (payload.eventType === 'DELETE' && onDelete) {
          onDelete(payload)
        }

        // Call general change handler
        if (onChange) {
          onChange(payload)
        }
      })

      // Track channel info
      const channelInfo: ChannelInfo = {
        channel,
        type: 'subscription',
        entityType,
        entityId,
        tenantId,
        status: 'connecting',
        createdAt: new Date(),
        reconnectAttempts: 0,
        maxReconnectAttempts: this.MAX_RECONNECT_ATTEMPTS,
      }

      this.channels.set(channelName, channelInfo)

      // Subscribe to the channel
      channel.subscribe(async (status, err) => {
        const currentStatus = this.mapSubscriptionStatus(status)
        channelInfo.status = currentStatus

        logger.debug('Channel status changed', {
          channelName,
          status,
          error: err?.message,
        })

        if (onStatusChange) {
          onStatusChange(currentStatus)
        }

        if (status === 'SUBSCRIBED') {
          channelInfo.reconnectAttempts = 0
          logger.info('Channel subscribed successfully', { channelName })
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          const error = err || new Error(`Channel ${status}`)
          logger.error('Channel error', {
            channelName,
            status,
            error: error.message,
            attempts: channelInfo.reconnectAttempts,
          })

          if (onError) {
            onError(error)
          }

          // Attempt reconnection
          if (
            autoReconnect &&
            channelInfo.reconnectAttempts < channelInfo.maxReconnectAttempts
          ) {
            this.scheduleReconnect(channelName, channelInfo, reconnectDelay)
          } else if (channelInfo.reconnectAttempts >= channelInfo.maxReconnectAttempts) {
            logger.error('Max reconnect attempts reached', {
              channelName,
              attempts: channelInfo.reconnectAttempts,
            })
          }
        } else if (status === 'CLOSED') {
          logger.info('Channel closed', { channelName })
        }
      })

      return channel
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      logger.error('Failed to create subscription channel', {
        channelName,
        error: err.message,
      })

      if (onError) {
        onError(err)
      }

      throw err
    }
  }

  /**
   * Join presence for an entity
   */
  public async joinPresence(config: PresenceConfig): Promise<RealtimeChannel> {
    const { entityType, entityId, user, metadata, onSync, onJoin, onLeave, onError, tenantId } =
      config

    const channelName = this.generateChannelName('presence', entityType, entityId, tenantId)

    // Check for existing channel
    const existingInfo = this.getChannelInfo(channelName)
    if (existingInfo) {
      logger.debug('Reusing existing presence channel', { channelName })
      return existingInfo.channel
    }

    logger.info('Creating new presence channel', {
      channelName,
      userId: user.id,
      tenantId,
    })

    try {
      const channel = this.supabase.channel(channelName, {
        config: {
          presence: {
            key: user.id,
          },
        },
      })

      // Initialize presence state for this channel
      const presenceMap = new Map<string, PresenceUser>()
      this.presenceStates.set(channelName, presenceMap)

      // Helper to parse presence state
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsePresenceState = (state: RealtimePresenceState<Record<string, any>>): PresenceUser[] => {
        const users: PresenceUser[] = []

        Object.keys(state).forEach((key) => {
          const presences = state[key]
          if (presences && presences.length > 0) {
            const presence = presences[0]
            users.push({
              userId: presence.userId,
              userName: presence.userName,
              userEmail: presence.userEmail,
              userAvatar: presence.userAvatar,
              joinedAt: presence.joinedAt,
              metadata: presence.metadata,
            })
          }
        })

        return users.filter((u) => u.userId !== user.id)
      }

      // Listen for presence sync
      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const users = parsePresenceState(state)

        logger.debug('Presence synced', {
          channelName,
          userCount: users.length,
        })

        // Update presence state map
        presenceMap.clear()
        users.forEach((u) => presenceMap.set(u.userId, u))

        if (onSync) {
          onSync(users)
        }
      })

      // Listen for presence join
      channel.on('presence', { event: 'join' }, ({ key: _key, newPresences }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        newPresences.forEach((presence: any) => {
          if (presence.userId !== user.id) {
            const presenceUser: PresenceUser = {
              userId: presence.userId,
              userName: presence.userName,
              userEmail: presence.userEmail,
              userAvatar: presence.userAvatar,
              joinedAt: presence.joinedAt,
              metadata: presence.metadata,
            }

            presenceMap.set(presence.userId, presenceUser)

            logger.debug('User joined presence', {
              channelName,
              userId: presence.userId,
            })

            if (onJoin) {
              onJoin(presenceUser)
            }
          }
        })
      })

      // Listen for presence leave
      channel.on('presence', { event: 'leave' }, ({ key: _key, leftPresences }) => {
        leftPresences.forEach((presence: any) => {
          if (presence.userId !== user.id) {
            const presenceUser: PresenceUser = {
              userId: presence.userId,
              userName: presence.userName,
              userEmail: presence.userEmail,
              userAvatar: presence.userAvatar,
              joinedAt: presence.joinedAt,
              metadata: presence.metadata,
            }

            presenceMap.delete(presence.userId)

            logger.debug('User left presence', {
              channelName,
              userId: presence.userId,
            })

            if (onLeave) {
              onLeave(presenceUser)
            }
          }
        })
      })

      // Track channel info
      const channelInfo: ChannelInfo = {
        channel,
        type: 'presence',
        entityType,
        entityId,
        tenantId,
        status: 'connecting',
        createdAt: new Date(),
        reconnectAttempts: 0,
        maxReconnectAttempts: this.MAX_RECONNECT_ATTEMPTS,
      }

      this.channels.set(channelName, channelInfo)

      // Subscribe and track presence
      channel.subscribe(async (status) => {
        const currentStatus = this.mapSubscriptionStatus(status)
        channelInfo.status = currentStatus

        logger.debug('Presence channel status changed', {
          channelName,
          status,
        })

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
          logger.info('Presence tracked successfully', {
            channelName,
            userId: user.id,
          })
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          const error = new Error(`Presence channel ${status}`)
          logger.error('Presence channel error', {
            channelName,
            status,
          })

          if (onError) {
            onError(error)
          }
        } else if (status === 'CLOSED') {
          logger.info('Presence channel closed', { channelName })
        }
      })

      return channel
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      logger.error('Failed to create presence channel', {
        channelName,
        error: err.message,
      })

      if (onError) {
        onError(err)
      }

      throw err
    }
  }

  /**
   * Leave presence for an entity
   */
  public async leavePresence(
    entityType: string,
    entityId: string,
    tenantId?: string
  ): Promise<void> {
    const channelName = this.generateChannelName('presence', entityType, entityId, tenantId)
    const channelInfo = this.getChannelInfo(channelName)

    if (!channelInfo) {
      logger.warn('Attempted to leave non-existent presence channel', { channelName })
      return
    }

    try {
      await channelInfo.channel.untrack()
      logger.info('Left presence successfully', { channelName })
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      logger.error('Failed to leave presence', {
        channelName,
        error: err.message,
      })
    }
  }

  /**
   * Update presence metadata
   */
  public async updatePresenceMetadata(
    entityType: string,
    entityId: string,
    metadata: Record<string, unknown>,
    tenantId?: string
  ): Promise<void> {
    const channelName = this.generateChannelName('presence', entityType, entityId, tenantId)
    const channelInfo = this.getChannelInfo(channelName)

    if (!channelInfo) {
      logger.warn('Attempted to update metadata for non-existent presence channel', {
        channelName,
      })
      return
    }

    try {
      // Get current presence state
      const state = channelInfo.channel.presenceState()
      const currentPresence = Object.values(state)[0]?.[0] as { presence_ref: string; metadata?: Record<string, unknown> } | undefined

      if (currentPresence) {
        await channelInfo.channel.track({
          ...currentPresence,
          metadata: { ...(currentPresence.metadata || {}), ...metadata },
        })

        logger.debug('Updated presence metadata', {
          channelName,
          metadata,
        })
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      logger.error('Failed to update presence metadata', {
        channelName,
        error: err.message,
      })
    }
  }

  /**
   * Get current presence state for an entity
   */
  public getPresenceState(
    entityType: string,
    entityId: string,
    tenantId?: string
  ): PresenceUser[] {
    const channelName = this.generateChannelName('presence', entityType, entityId, tenantId)
    const presenceMap = this.presenceStates.get(channelName)

    if (!presenceMap) {
      return []
    }

    return Array.from(presenceMap.values())
  }

  /**
   * Broadcast a message to a channel
   */
  public async broadcast(config: BroadcastConfig): Promise<RealtimeChannelSendResponse> {
    const { entityType, entityId, event, payload, tenantId } = config

    const channelName = this.generateChannelName('broadcast', entityType, entityId, tenantId)

    try {
      // Get or create broadcast channel
      let channelInfo = this.getChannelInfo(channelName)

      if (!channelInfo) {
        logger.debug('Creating new broadcast channel', { channelName })

        const channel = this.supabase.channel(channelName)
        await channel.subscribe()

        channelInfo = {
          channel,
          type: 'broadcast',
          entityType,
          entityId,
          tenantId,
          status: 'connected',
          createdAt: new Date(),
          reconnectAttempts: 0,
          maxReconnectAttempts: this.MAX_RECONNECT_ATTEMPTS,
        }

        this.channels.set(channelName, channelInfo)
      }

      // Send broadcast
      const response = await channelInfo.channel.send({
        type: 'broadcast',
        event,
        payload,
      })

      logger.debug('Broadcast sent', {
        channelName,
        event,
        status: response,
      })

      return response
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      logger.error('Failed to broadcast message', {
        channelName,
        event,
        error: err.message,
      })
      throw err
    }
  }

  /**
   * Unsubscribe from a specific channel
   */
  public async unsubscribe(
    type: 'subscription' | 'presence' | 'broadcast',
    entityType: string,
    entityId: string,
    tenantId?: string
  ): Promise<void> {
    const channelName = this.generateChannelName(type, entityType, entityId, tenantId)
    const channelInfo = this.getChannelInfo(channelName)

    if (!channelInfo) {
      logger.warn('Attempted to unsubscribe from non-existent channel', { channelName })
      return
    }

    try {
      // Clear unknown pending reconnect
      if (channelInfo.reconnectTimeout) {
        clearTimeout(channelInfo.reconnectTimeout)
        channelInfo.reconnectTimeout = undefined
      }

      // Untrack if presence channel
      if (type === 'presence') {
        await channelInfo.channel.untrack()
      }

      // Unsubscribe
      await channelInfo.channel.unsubscribe()

      // Remove from tracking
      this.channels.delete(channelName)
      this.presenceStates.delete(channelName)

      logger.info('Unsubscribed from channel', { channelName })
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      logger.error('Failed to unsubscribe from channel', {
        channelName,
        error: err.message,
      })
    }
  }

  /**
   * Cleanup all channels (e.g., on logout)
   */
  public cleanupAll(): void {
    logger.info('Cleaning up all channels', {
      channelCount: this.channels.size,
    })

    const channelNames = Array.from(this.channels.keys())

    for (const channelName of channelNames) {
      const channelInfo = this.channels.get(channelName)
      if (channelInfo) {
        // Clear reconnect timeout
        if (channelInfo.reconnectTimeout) {
          clearTimeout(channelInfo.reconnectTimeout)
        }

        // Unsubscribe
        try {
          channelInfo.channel.unsubscribe()
        } catch (error) {
          logger.warn('Error during channel cleanup', {
            channelName,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }

    this.channels.clear()
    this.presenceStates.clear()

    logger.info('All channels cleaned up')
  }

  /**
   * Get all active channels
   */
  public getActiveChannels(): Array<{
    name: string
    type: string
    status: ChannelStatus
    entityType: string
    entityId: string
    tenantId?: string
    createdAt: Date
  }> {
    return Array.from(this.channels.entries()).map(([name, info]) => ({
      name,
      type: info.type,
      status: info.status,
      entityType: info.entityType,
      entityId: info.entityId,
      tenantId: info.tenantId,
      createdAt: info.createdAt,
    }))
  }

  /**
   * Get channel count by type
   */
  public getChannelStats(): {
    total: number
    byType: Record<string, number>
    byStatus: Record<ChannelStatus, number>
  } {
    const byType: Record<string, number> = {
      subscription: 0,
      presence: 0,
      broadcast: 0,
    }

    const byStatus: Record<ChannelStatus, number> = {
      connecting: 0,
      connected: 0,
      disconnected: 0,
      error: 0,
    }

    for (const info of this.channels.values()) {
      byType[info.type]++
      byStatus[info.status]++
    }

    return {
      total: this.channels.size,
      byType,
      byStatus,
    }
  }

  /**
   * Schedule a reconnect attempt
   */
  private scheduleReconnect(
    channelName: string,
    channelInfo: ChannelInfo,
    delay: number
  ): void {
    if (channelInfo.reconnectTimeout) {
      clearTimeout(channelInfo.reconnectTimeout)
    }

    channelInfo.reconnectAttempts++

    logger.info('Scheduling reconnect', {
      channelName,
      attempt: channelInfo.reconnectAttempts,
      delay,
    })

    channelInfo.reconnectTimeout = setTimeout(() => {
      this.reconnectChannel(channelName, channelInfo)
    }, delay)
  }

  /**
   * Reconnect a channel
   */
  private async reconnectChannel(channelName: string, channelInfo: ChannelInfo): Promise<void> {
    logger.info('Attempting to reconnect channel', {
      channelName,
      attempt: channelInfo.reconnectAttempts,
    })

    try {
      // Unsubscribe old channel
      await channelInfo.channel.unsubscribe()

      // Create new channel with same name
      const newChannel = this.supabase.channel(channelName)

      // TODO: Re-attach event listeners based on channel type
      // This would require storing listener configs, which could be added in future

      // Update channel info
      channelInfo.channel = newChannel
      channelInfo.status = 'connecting'

      // Subscribe
      await newChannel.subscribe()

      logger.info('Channel reconnected successfully', {
        channelName,
        attempt: channelInfo.reconnectAttempts,
      })
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      logger.error('Failed to reconnect channel', {
        channelName,
        attempt: channelInfo.reconnectAttempts,
        error: err.message,
      })

      // Schedule another retry if under max attempts
      if (channelInfo.reconnectAttempts < channelInfo.maxReconnectAttempts) {
        this.scheduleReconnect(channelName, channelInfo, this.DEFAULT_RECONNECT_DELAY)
      }
    }
  }

  /**
   * Map Supabase subscription status to our ChannelStatus
   */
  private mapSubscriptionStatus(status: string): ChannelStatus {
    switch (status) {
      case 'SUBSCRIBED':
        return 'connected'
      case 'CHANNEL_ERROR':
      case 'TIMED_OUT':
        return 'error'
      case 'CLOSED':
        return 'disconnected'
      default:
        return 'connecting'
    }
  }
}

/**
 * Export singleton instance getter
 */
export const getChannelManager = () => RealtimeChannelManager.getInstance()

/**
 * Export convenience methods
 */
export const subscribeToEntity = <T extends { [key: string]: unknown } = { [key: string]: unknown }>(config: EntitySubscriptionConfig<T>) =>
  getChannelManager().subscribeToEntity(config)

export const joinPresence = (config: PresenceConfig) => getChannelManager().joinPresence(config)

export const leavePresence = (entityType: string, entityId: string, tenantId?: string) =>
  getChannelManager().leavePresence(entityType, entityId, tenantId)

export const broadcast = (config: BroadcastConfig) => getChannelManager().broadcast(config)

export const cleanupAllChannels = () => getChannelManager().cleanupAll()
