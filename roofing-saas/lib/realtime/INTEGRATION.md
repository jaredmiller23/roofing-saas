# Integration with Existing Hooks

This guide shows how the Channel Manager integrates with your existing `usePresence` and `useRealtimeSubscription` hooks.

## Current Architecture

You already have these hooks:
- `/lib/hooks/usePresence.ts` - Presence tracking hook
- `/lib/hooks/useRealtimeSubscription.ts` - Database change subscription hook

## Integration Strategy

The Channel Manager works **alongside** these hooks as a coordination layer. You have two options:

### Option 1: Use Both (Recommended for Migration)

Keep your existing hooks working as-is, and gradually adopt the Channel Manager for new features:

```typescript
// Existing code continues to work
import { usePresence } from '@/lib/hooks/usePresence'

export function ContactPage({ contactId, currentUser }) {
  const { presentUsers } = usePresence({
    entityType: 'contact',
    entityId: contactId,
    user: currentUser
  })
  
  // ... rest of component
}

// New code uses Channel Manager
import { joinPresence } from '@/lib/realtime'

export function ProjectPage({ projectId, currentUser }) {
  useEffect(() => {
    joinPresence({
      entityType: 'project',
      entityId: projectId,
      user: currentUser,
      onSync: (users) => console.log('Present:', users)
    })
  }, [projectId])
}
```

### Option 2: Refactor Existing Hooks (Recommended Long-term)

Update your hooks to use the Channel Manager internally:

#### Updated usePresence Hook

```typescript
// lib/hooks/usePresence.ts
"use client"

import { useEffect, useRef, useState } from 'react'
import { getChannelManager, type PresenceUser } from '@/lib/realtime'

// Keep existing types for backward compatibility
export interface UsePresenceConfig {
  entityType: string
  entityId: string
  user: {
    id: string
    name?: string
    email?: string
    avatar?: string
  }
  metadata?: Record<string, any>
  onPresenceChange?: (users: PresenceUser[]) => void
  onUserJoin?: (user: PresenceUser) => void
  onUserLeave?: (user: PresenceUser) => void
  enabled?: boolean
}

export interface UsePresenceReturn {
  presentUsers: PresenceUser[]
  count: number
  isTracking: boolean
  error: Error | null
  updateMetadata: (metadata: Record<string, any>) => void
}

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

  useEffect(() => {
    if (!enabled || !entityType || !entityId || !user.id) {
      return
    }

    // Use Channel Manager instead of direct Supabase client
    const manager = getChannelManager()

    const setupPresence = async () => {
      try {
        await manager.joinPresence({
          entityType,
          entityId,
          user,
          metadata,
          onSync: (users) => {
            setPresentUsers(users)
            setIsTracking(true)
            if (onPresenceChange) onPresenceChange(users)
          },
          onJoin: (user) => {
            setPresentUsers((prev) => [...prev, user])
            if (onUserJoin) onUserJoin(user)
          },
          onLeave: (user) => {
            setPresentUsers((prev) => prev.filter((u) => u.userId !== user.userId))
            if (onUserLeave) onUserLeave(user)
          },
          onError: (err) => {
            setError(err)
            setIsTracking(false)
          },
        })
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
      }
    }

    setupPresence()

    return () => {
      // Cleanup handled by manager
      manager.leavePresence(entityType, entityId)
      setPresentUsers([])
      setIsTracking(false)
    }
  }, [enabled, entityType, entityId, user.id])

  const updateMetadata = (newMetadata: Record<string, any>) => {
    const manager = getChannelManager()
    manager.updatePresenceMetadata(entityType, entityId, newMetadata)
  }

  return {
    presentUsers,
    count: presentUsers.length,
    isTracking,
    error,
    updateMetadata,
  }
}

// Keep existing helper functions for backward compatibility
export function createEntityPresence(entityType: string) {
  return (config: Omit<UsePresenceConfig, 'entityType'>) => {
    return usePresence({
      ...config,
      entityType,
    })
  }
}

export const useContactPresence = createEntityPresence('contact')
export const useProjectPresence = createEntityPresence('project')
export const useEstimatePresence = createEntityPresence('estimate')
export const useMessagePresence = createEntityPresence('message')
```

#### Updated useRealtimeSubscription Hook

```typescript
// lib/hooks/useRealtimeSubscription.ts
"use client"

import { useEffect, useState } from 'react'
import { getChannelManager, type PostgresChangeEvent } from '@/lib/realtime'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// Keep existing types for backward compatibility
export interface RealtimeSubscriptionConfig<T = any> {
  channelName: string
  table: string
  event?: PostgresChangeEvent
  schema?: string
  filter?: string
  onPayload?: (payload: RealtimePostgresChangesPayload<T>) => void
  onError?: (error: Error) => void
  autoReconnect?: boolean
  reconnectDelay?: number
}

export interface RealtimeSubscriptionReturn {
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
  error: Error | null
  unsubscribe: () => void
  reconnect: () => void
}

export function useRealtimeSubscription<T = any>(
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

  useEffect(() => {
    const manager = getChannelManager()

    // Extract entity info from filter if possible
    const entityId = filter?.match(/id=eq\.(.+)/)?.[1] || 'unknown'

    const setupSubscription = async () => {
      try {
        setStatus('connecting')
        
        await manager.subscribeToEntity({
          entityType: table.replace(/s$/, ''), // Remove trailing 's'
          entityId,
          table,
          schema,
          event,
          onChange: onPayload,
          onStatusChange: (channelStatus) => {
            setStatus(channelStatus)
          },
          onError: (err) => {
            setError(err)
            if (onError) onError(err)
          },
          autoReconnect,
          reconnectDelay,
        })
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        setStatus('error')
        if (onError) onError(error)
      }
    }

    setupSubscription()

    return () => {
      // Cleanup handled by manager
    }
  }, [channelName, table, event, schema, filter])

  const unsubscribe = () => {
    const manager = getChannelManager()
    const entityId = filter?.match(/id=eq\.(.+)/)?.[1] || 'unknown'
    manager.unsubscribe('subscription', table.replace(/s$/, ''), entityId)
    setStatus('disconnected')
  }

  const reconnect = () => {
    // Reconnection handled automatically by manager
  }

  return {
    status,
    error,
    unsubscribe,
    reconnect,
  }
}

// Keep existing helper functions for backward compatibility
export function createTableSubscription<T = any>(table: string) {
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

export const useContactsSubscription = createTableSubscription('contacts')
export const useProjectsSubscription = createTableSubscription('projects')
export const useEstimatesSubscription = createTableSubscription('estimates')
export const useMessagesSubscription = createTableSubscription('messages')
```

## Benefits of Integration

### 1. Duplicate Prevention

**Before (without Channel Manager):**
```typescript
// Two components create duplicate channels
function Component1({ contactId }) {
  usePresence({ entityType: 'contact', entityId: contactId, user })
  // Creates channel: 'presence:contact:123'
}

function Component2({ contactId }) {
  usePresence({ entityType: 'contact', entityId: contactId, user })
  // Creates ANOTHER channel: 'presence:contact:123' (duplicate!)
}
```

**After (with Channel Manager):**
```typescript
// Two components share the same channel
function Component1({ contactId }) {
  usePresence({ entityType: 'contact', entityId: contactId, user })
  // Creates channel: 'presence:contact:123'
}

function Component2({ contactId }) {
  usePresence({ entityType: 'contact', entityId: contactId, user })
  // Reuses existing channel (no duplicate!)
}
```

### 2. Centralized Cleanup

**Before:**
```typescript
// Each hook manages its own cleanup
useEffect(() => {
  const channel = supabase.channel('...')
  return () => channel.unsubscribe()
}, [])
```

**After:**
```typescript
// Single cleanup for all channels
function handleLogout() {
  cleanupAllChannels() // Closes ALL channels at once
  await supabase.auth.signOut()
}
```

### 3. Better Debugging

**Before:**
```typescript
// Hard to see all active channels
console.log('Channel status:', status)
```

**After:**
```typescript
// Easy visibility into all channels
const stats = getChannelStats()
console.log('Active channels:', stats)
// { total: 5, byType: {...}, byStatus: {...} }

const channels = getActiveChannels()
console.log('Channel details:', channels)
```

## Migration Path

### Phase 1: Install alongside existing hooks (Week 1)
- ✅ Add Channel Manager to codebase
- ✅ Test with new features only
- ✅ Keep existing hooks unchanged

### Phase 2: Refactor hooks to use manager (Week 2)
- ✅ Update `usePresence` internally
- ✅ Update `useRealtimeSubscription` internally
- ✅ Test all existing components
- ✅ Verify no breaking changes

### Phase 3: Adopt new patterns (Week 3+)
- ✅ Use direct Channel Manager for new features
- ✅ Add multi-tenancy support where needed
- ✅ Implement broadcast features
- ✅ Add monitoring/debugging

## Testing Integration

### Test 1: Verify No Duplicates

```typescript
import { getChannelManager } from '@/lib/realtime'

// In your test component
useEffect(() => {
  const manager = getChannelManager()
  const stats = manager.getChannelStats()
  
  console.log('Active channels:', stats.total)
  // Should NOT increase with multiple components
}, [])
```

### Test 2: Verify Cleanup

```typescript
// Before logout
const before = getChannelStats()
console.log('Channels before:', before.total)

// Logout
cleanupAllChannels()

// After logout
const after = getChannelStats()
console.log('Channels after:', after.total) // Should be 0
```

### Test 3: Verify Reconnection

```typescript
// Simulate network failure
// (disconnect WiFi or throttle in DevTools)

// Watch logs for automatic reconnection
// [INFO] Scheduling reconnect { attempt: 1 }
// [INFO] Channel reconnected successfully
```

## Backward Compatibility

All existing code continues to work:

```typescript
// Old code - still works!
import { usePresence } from '@/lib/hooks/usePresence'
import { useRealtimeSubscription } from '@/lib/hooks/useRealtimeSubscription'

// Now powered by Channel Manager behind the scenes
const { presentUsers } = usePresence({ ... })
const { status } = useRealtimeSubscription({ ... })
```

New code can use either pattern:

```typescript
// New pattern - direct Channel Manager
import { joinPresence, subscribeToEntity } from '@/lib/realtime'

// Or keep using hooks
import { usePresence } from '@/lib/hooks/usePresence'
```

## Support

For questions or issues:
1. Check [README.md](./README.md) for detailed documentation
2. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
3. See [examples.ts](./examples.ts) for React patterns
4. Check browser console for debug logs
