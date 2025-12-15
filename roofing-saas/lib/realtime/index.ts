/**
 * Realtime module exports
 *
 * Central export point for all realtime-related utilities and types.
 */

export {
  RealtimeChannelManager,
  getChannelManager,
  subscribeToEntity,
  joinPresence,
  leavePresence,
  broadcast,
  cleanupAllChannels,
} from './channel-manager'

export type {
  PostgresChangeEvent,
  ChannelStatus,
  PresenceUser,
  EntitySubscriptionConfig,
  PresenceConfig,
  BroadcastConfig,
} from './channel-manager'
