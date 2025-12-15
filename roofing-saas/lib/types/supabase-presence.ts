/**
 * Supabase Presence Payload Types
 *
 * Proper TypeScript interfaces for Supabase realtime presence functionality
 * to replace `any` types in channel-manager.ts
 */

/**
 * Supabase presence payload structure for tracking user presence
 */
export interface SupabasePresencePayload {
  userId: string
  userName?: string
  userEmail?: string
  userAvatar?: string
  joinedAt: string
  metadata?: Record<string, unknown>
}

/**
 * Supabase presence state structure returned by presenceState()
 */
export interface SupabasePresenceState {
  [key: string]: SupabasePresencePayload[]
}

/**
 * Presence event data structure for join/leave events
 */
export interface SupabasePresenceEvent {
  key: string
  newPresences?: SupabasePresencePayload[]
  leftPresences?: SupabasePresencePayload[]
}