# Channel Manager Architecture

## Overview

The Realtime Channel Manager acts as a coordination layer between your application and Supabase Realtime, preventing duplicate subscriptions and managing channel lifecycle.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Your Application                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   usePresence │  │useRealtimeSub│  │ Custom Components    │  │
│  │     Hook     │  │  scription   │  │ (Contact, Project)   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
│         └─────────────────┼──────────────────────┘              │
│                           │                                     │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              RealtimeChannelManager (Singleton)                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Channel Registry                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐   │   │
│  │  │Subscription │  │  Presence   │  │  Broadcast   │   │   │
│  │  │  Channels   │  │  Channels   │  │   Channels   │   │   │
│  │  └─────────────┘  └─────────────┘  └──────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Presence State Cache                       │   │
│  │  { channelName: Map<userId, PresenceUser> }            │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         Reconnection & Error Handling                   │   │
│  │  - Auto-retry with exponential backoff                  │   │
│  │  - Max 5 attempts per channel                           │   │
│  │  - Error callbacks & logging                            │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Supabase Client (@/lib/supabase/client)        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Supabase Realtime SDK                      │   │
│  │  - WebSocket connections                                │   │
│  │  - Channel multiplexing                                 │   │
│  │  - Presence tracking                                    │   │
│  │  - Postgres change detection                            │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Supabase Backend                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  PostgreSQL  │  │   Realtime   │  │   Broadcast          │  │
│  │  Database    │  │   Presence   │  │   Messages           │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Flow

### 1. Subscription Flow

```typescript
// Component requests subscription
usePresence({ entityType: 'contact', entityId: '123', user })
    ↓
// Manager checks for duplicate
hasChannel('presence', 'contact', '123') → false
    ↓
// Manager creates new channel
supabase.channel('presence:contact:123')
    ↓
// Manager attaches listeners
channel.on('presence', { event: 'sync' }, callback)
channel.on('presence', { event: 'join' }, callback)
channel.on('presence', { event: 'leave' }, callback)
    ↓
// Manager subscribes & tracks
channel.subscribe() → channel.track(userPresence)
    ↓
// Manager stores in registry
channels.set('presence:contact:123', channelInfo)
presenceStates.set('presence:contact:123', Map<userId, PresenceUser>)
```

### 2. Duplicate Prevention Flow

```typescript
// Second component requests same subscription
usePresence({ entityType: 'contact', entityId: '123', user: user2 })
    ↓
// Manager checks for duplicate
hasChannel('presence', 'contact', '123') → true
    ↓
// Manager returns existing channel
return existingChannel
    ↓
// Both components share the same channel
// No duplicate WebSocket connection created
```

### 3. Error & Reconnection Flow

```typescript
// Connection fails
channel.subscribe() → status: 'CHANNEL_ERROR'
    ↓
// Manager catches error
onStatusChange('error')
    ↓
// Manager schedules reconnect
setTimeout(reconnect, 3000) → attempt 1/5
    ↓
// If reconnect fails
attempt 2/5 → setTimeout(reconnect, 3000)
    ↓
// Continue until max attempts or success
attempt 5/5 → max reached → log error, stop retrying
```

## Data Structures

### ChannelInfo

```typescript
interface ChannelInfo {
  channel: RealtimeChannel           // Supabase channel instance
  type: 'subscription' | 'presence' | 'broadcast'
  entityType: string                 // e.g., 'contact', 'project'
  entityId: string                   // Entity ID
  tenantId?: string                  // Optional tenant scoping
  status: ChannelStatus              // 'connecting' | 'connected' | 'disconnected' | 'error'
  createdAt: Date                    // Creation timestamp
  reconnectTimeout?: NodeJS.Timeout  // Active reconnect timer
  reconnectAttempts: number          // Current attempt count
  maxReconnectAttempts: number       // Max retries (default: 5)
}
```

### Channel Registry

```typescript
// Map of channel names to channel info
Map<string, ChannelInfo>

// Example entries:
{
  'presence:contact:123': { channel, type: 'presence', ... },
  'subscription:project:456': { channel, type: 'subscription', ... },
  'tenant:abc:presence:contact:789': { channel, type: 'presence', tenantId: 'abc', ... }
}
```

### Presence State Cache

```typescript
// Map of channel names to presence maps
Map<string, Map<string, PresenceUser>>

// Example structure:
{
  'presence:contact:123': Map {
    'user-1' => { userId: 'user-1', userName: 'John', ... },
    'user-2' => { userId: 'user-2', userName: 'Jane', ... }
  },
  'presence:project:456': Map {
    'user-3' => { userId: 'user-3', userName: 'Bob', ... }
  }
}
```

## Channel Naming Convention

Channels are named using a consistent pattern:

```
[tenant:TENANT_ID:]TYPE:ENTITY_TYPE:ENTITY_ID

Examples:
- presence:contact:123
- subscription:project:456
- broadcast:document:789
- tenant:abc:presence:contact:123
```

This naming convention:
- Prevents collisions between channel types
- Enables tenant isolation in multi-tenant apps
- Makes debugging easier
- Allows for efficient lookups

## Integration Points

### 1. With usePresence Hook

```typescript
// Hook creates subscription via manager
usePresence({ entityType, entityId, user })
  ↓ calls
joinPresence({ entityType, entityId, user })
  ↓ creates
RealtimeChannel + presence tracking
  ↓ updates
Component state on presence changes
```

### 2. With useRealtimeSubscription Hook

```typescript
// Hook creates subscription via manager
useRealtimeSubscription({ table, filter })
  ↓ can use
subscribeToEntity({ entityType, entityId, onUpdate })
  ↓ creates
RealtimeChannel + postgres_changes listener
  ↓ triggers
Callback on database changes
```

### 3. With Logger

```typescript
// All operations are logged
logger.info('Creating new presence channel', { channelName })
logger.debug('Received postgres change', { eventType })
logger.error('Channel error', { channelName, error })
  ↓ sends to
Console (development) + Sentry (production)
  ↓ enables
Easy debugging of realtime issues
```

## Lifecycle Management

### Component Mount

```
Component mounts
  → usePresence/useRealtimeSubscription called
    → Manager creates/reuses channel
      → Channel subscribes to Supabase
        → Presence tracked / Changes listened
```

### Component Unmount

```
Component unmounts
  → Hook cleanup function called
    → Manager keeps channel alive (optional)
      OR
    → Manager unsubscribes channel
      → Channel removed from registry
        → Presence untracked
          → WebSocket connection freed
```

### App Logout

```
User logs out
  → cleanupAllChannels() called
    → All channels unsubscribed
      → Registry cleared
        → Presence states cleared
          → All WebSocket connections closed
```

## Performance Considerations

### 1. Channel Reuse
- Multiple components subscribing to same entity share one channel
- Reduces WebSocket connections
- Lowers bandwidth usage

### 2. Automatic Cleanup
- Channels persist until explicitly cleaned up
- Prevents reconnection thrashing
- Reduces server load

### 3. Debounced Broadcasts
- Use `useDebouncedBroadcast` for high-frequency events
- Prevents flooding the network
- Improves responsiveness

### 4. Presence State Caching
- Local cache reduces repeated API calls
- Instant access to current viewers
- Syncs automatically on changes

## Security

### 1. Row Level Security (RLS)
- All database changes respect RLS policies
- Users only see data they're authorized for
- Enforced at the database level

### 2. Tenant Isolation
- Optional `tenantId` parameter
- Prevents cross-tenant data leaks
- Channel names include tenant ID

### 3. Authentication
- Uses existing Supabase auth
- JWT tokens validated server-side
- Presence tied to authenticated users

## Monitoring & Debugging

### Channel Statistics

```typescript
const stats = getChannelStats()
// {
//   total: 8,
//   byType: { subscription: 3, presence: 4, broadcast: 1 },
//   byStatus: { connected: 7, connecting: 1, error: 0, disconnected: 0 }
// }
```

### Active Channels

```typescript
const channels = getActiveChannels()
// [
//   { name: 'presence:contact:123', type: 'presence', status: 'connected', ... },
//   { name: 'subscription:project:456', type: 'subscription', status: 'connected', ... }
// ]
```

### Logs

All operations are logged with structured data:

```
[INFO] RealtimeChannelManager initialized
[INFO] Creating new presence channel { channelName: 'presence:contact:123' }
[DEBUG] Presence synced { channelName: 'presence:contact:123', userCount: 2 }
[DEBUG] User joined presence { channelName: 'presence:contact:123', userId: 'user-2' }
[ERROR] Channel error { channelName: 'subscription:project:456', error: 'TIMED_OUT' }
[INFO] Scheduling reconnect { channelName: 'subscription:project:456', attempt: 1 }
```

## Best Practices

1. **Always cleanup on logout**: Call `cleanupAllChannels()` when users log out
2. **Use tenantId in multi-tenant apps**: Ensure proper channel isolation
3. **Handle errors gracefully**: Provide `onError` callbacks for user feedback
4. **Monitor channel health**: Periodically check `getChannelStats()` in development
5. **Debounce high-frequency events**: Use `useDebouncedBroadcast` for cursors, etc.
6. **Test reconnection logic**: Simulate network failures to verify recovery
7. **Limit simultaneous channels**: Each WebSocket has limits (~100 channels)

## Future Enhancements

Potential improvements for the channel manager:

1. **Persistent listener configs**: Allow reconnection to restore event listeners
2. **Channel pooling**: Limit max channels per entity type
3. **Metrics collection**: Track connection duration, error rates, etc.
4. **Custom reconnect strategies**: Exponential backoff, circuit breaker patterns
5. **Cross-tab synchronization**: Coordinate channels across browser tabs
6. **Offline queue**: Buffer changes when disconnected
7. **Message compression**: Reduce bandwidth for large payloads
8. **Rate limiting**: Prevent broadcast flooding
