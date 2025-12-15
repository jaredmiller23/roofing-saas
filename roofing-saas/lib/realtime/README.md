# Realtime Channel Manager

A singleton service for coordinating Supabase realtime channels across the application. This manager prevents duplicate subscriptions, manages channel lifecycle, and provides centralized presence tracking and broadcast capabilities.

## Features

- **Singleton Pattern**: Ensures one instance coordinates all realtime operations
- **Duplicate Prevention**: Automatically reuses existing channels for the same entity
- **Presence Tracking**: Track which users are viewing specific entities
- **Auto-Reconnection**: Handles connection failures with exponential backoff
- **Multi-Tenancy Support**: Optional tenant scoping for channel isolation
- **Comprehensive Logging**: Built-in debugging with structured logs
- **TypeScript Support**: Full type safety for all methods and interfaces

## Installation

The channel manager is already set up and ready to use. Simply import from `@/lib/realtime`:

```typescript
import { getChannelManager, subscribeToEntity, joinPresence } from '@/lib/realtime'
```

## Usage

### 1. Subscribe to Entity Changes

Listen for INSERT, UPDATE, and DELETE events on database tables:

```typescript
import { subscribeToEntity } from '@/lib/realtime'

// Subscribe to contact changes
const channel = await subscribeToEntity({
  entityType: 'contact',
  entityId: '123',
  table: 'contacts', // Optional, defaults to entityType + 's'
  
  onInsert: (payload) => {
    console.log('New record:', payload.new)
  },
  
  onUpdate: (payload) => {
    console.log('Updated:', payload.old, '->', payload.new)
  },
  
  onDelete: (payload) => {
    console.log('Deleted:', payload.old)
  },
  
  onChange: (payload) => {
    // Called for any change event
    console.log('Change detected:', payload)
  },
  
  onStatusChange: (status) => {
    console.log('Connection status:', status)
  },
  
  onError: (error) => {
    console.error('Channel error:', error)
  }
})
```

### 2. Track Presence

Show which users are currently viewing an entity:

```typescript
import { joinPresence, getChannelManager } from '@/lib/realtime'

// Join presence for a project
await joinPresence({
  entityType: 'project',
  entityId: 'project-456',
  
  user: {
    id: currentUser.id,
    name: currentUser.name,
    email: currentUser.email,
    avatar: currentUser.avatar_url
  },
  
  metadata: {
    role: 'editor',
    color: '#3b82f6'
  },
  
  onSync: (users) => {
    console.log('Currently viewing:', users)
    // users = [{ userId: 'user-2', userName: 'Jane', ... }]
  },
  
  onJoin: (user) => {
    console.log(`${user.userName} started viewing`)
  },
  
  onLeave: (user) => {
    console.log(`${user.userName} stopped viewing`)
  }
})

// Get current presence state
const manager = getChannelManager()
const presentUsers = manager.getPresenceState('project', 'project-456')
```

### 3. Broadcast Messages

Send real-time messages between users viewing the same entity:

```typescript
import { broadcast } from '@/lib/realtime'

// Broadcast a cursor position
await broadcast({
  entityType: 'document',
  entityId: 'doc-789',
  event: 'cursor-move',
  payload: {
    x: 100,
    y: 200,
    userId: currentUser.id
  }
})

// Listen for broadcasts
const channel = await subscribeToEntity({
  entityType: 'document',
  entityId: 'doc-789'
})

channel.on('broadcast', { event: 'cursor-move' }, ({ payload }) => {
  console.log('Cursor moved:', payload)
})
```

### 4. Integration with React Hooks

Works seamlessly with existing hooks:

```typescript
'use client'

import { useEffect } from 'react'
import { subscribeToEntity, joinPresence, cleanupAllChannels } from '@/lib/realtime'
import { useAuth } from '@/lib/auth'

export function ContactPage({ contactId }: { contactId: string }) {
  const { user } = useAuth()

  useEffect(() => {
    // Subscribe to contact changes
    subscribeToEntity({
      entityType: 'contact',
      entityId: contactId,
      onUpdate: (payload) => {
        // Refresh UI with new data
        mutate('/api/contacts/' + contactId)
      }
    })

    // Track presence
    if (user) {
      joinPresence({
        entityType: 'contact',
        entityId: contactId,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      })
    }

    // Cleanup is handled automatically by the manager
    // But you can explicitly cleanup on unmount if needed
    return () => {
      // Optional: channels persist until cleanupAll() is called
    }
  }, [contactId, user])

  return <div>Contact Page</div>
}
```

### 5. Cleanup on Logout

Clean up all channels when a user logs out:

```typescript
import { cleanupAllChannels } from '@/lib/realtime'

function handleLogout() {
  // Clean up all realtime channels
  cleanupAllChannels()
  
  // Then proceed with logout
  await supabase.auth.signOut()
}
```

## API Reference

### `getChannelManager()`

Returns the singleton instance of the RealtimeChannelManager.

```typescript
const manager = getChannelManager()
```

### `subscribeToEntity<T>(config: EntitySubscriptionConfig<T>)`

Subscribe to database changes for a specific entity.

**Config Options:**
- `entityType` (string): Entity type (e.g., 'contact', 'project')
- `entityId` (string): Entity ID
- `table` (string, optional): Database table name (defaults to `entityType + 's'`)
- `schema` (string, optional): Database schema (defaults to 'public')
- `event` (PostgresChangeEvent, optional): Event filter ('INSERT', 'UPDATE', 'DELETE', or '*')
- `onInsert` (callback, optional): Called on INSERT events
- `onUpdate` (callback, optional): Called on UPDATE events
- `onDelete` (callback, optional): Called on DELETE events
- `onChange` (callback, optional): Called on any change
- `onStatusChange` (callback, optional): Called when connection status changes
- `onError` (callback, optional): Called on errors
- `tenantId` (string, optional): Tenant ID for multi-tenancy
- `autoReconnect` (boolean, optional): Enable auto-reconnect (default: true)
- `reconnectDelay` (number, optional): Reconnect delay in ms (default: 3000)

### `joinPresence(config: PresenceConfig)`

Join presence tracking for an entity.

**Config Options:**
- `entityType` (string): Entity type
- `entityId` (string): Entity ID
- `user` (object): Current user info (id, name, email, avatar)
- `metadata` (object, optional): Additional metadata
- `onSync` (callback, optional): Called when presence syncs
- `onJoin` (callback, optional): Called when a user joins
- `onLeave` (callback, optional): Called when a user leaves
- `onError` (callback, optional): Called on errors
- `tenantId` (string, optional): Tenant ID for multi-tenancy

### `leavePresence(entityType, entityId, tenantId?)`

Leave presence tracking for an entity.

```typescript
await leavePresence('contact', '123')
```

### `broadcast(config: BroadcastConfig)`

Broadcast a message to all users on a channel.

**Config Options:**
- `entityType` (string): Entity type
- `entityId` (string): Entity ID
- `event` (string): Event name
- `payload` (object): Message payload
- `tenantId` (string, optional): Tenant ID

### `cleanupAllChannels()`

Unsubscribe from all channels and clean up resources.

```typescript
cleanupAllChannels()
```

### Manager Methods

Additional methods available on the manager instance:

```typescript
const manager = getChannelManager()

// Check if a channel exists
const exists = manager.hasChannel('presence', 'contact', '123')

// Get presence state
const users = manager.getPresenceState('contact', '123')

// Update presence metadata
await manager.updatePresenceMetadata('contact', '123', { status: 'editing' })

// Get active channels
const channels = manager.getActiveChannels()
// [{ name: '...', type: 'presence', status: 'connected', ... }]

// Get channel statistics
const stats = manager.getChannelStats()
// { total: 5, byType: { subscription: 2, presence: 3 }, byStatus: { ... } }

// Unsubscribe from specific channel
await manager.unsubscribe('presence', 'contact', '123')
```

## Multi-Tenancy

The channel manager supports tenant isolation by prefixing channel names:

```typescript
await joinPresence({
  entityType: 'contact',
  entityId: '123',
  tenantId: 'tenant-abc', // Optional tenant scoping
  user: currentUser
})

// Channel name will be: "tenant:tenant-abc:presence:contact:123"
```

This ensures channels are isolated between tenants even for the same entity IDs.

## Error Handling

The manager includes comprehensive error handling:

1. **Automatic Reconnection**: Retries failed connections up to 5 times
2. **Error Callbacks**: Get notified of errors via `onError` callbacks
3. **Status Tracking**: Monitor connection status with `onStatusChange`
4. **Graceful Degradation**: Failures are logged but don't crash the app

```typescript
await subscribeToEntity({
  entityType: 'contact',
  entityId: '123',
  
  onError: (error) => {
    // Handle error (show toast, log to Sentry, etc.)
    console.error('Realtime error:', error)
  },
  
  onStatusChange: (status) => {
    if (status === 'error') {
      // Show connection error UI
    } else if (status === 'connected') {
      // Hide error UI
    }
  },
  
  autoReconnect: true,
  reconnectDelay: 5000 // Wait 5s between retries
})
```

## Debugging

The manager includes comprehensive logging via the application logger:

```typescript
// Logs include:
// - Channel creation/destruction
// - Connection status changes
// - Presence join/leave events
// - Error details
// - Reconnection attempts

// View logs in browser console (filtered by log level)
// Production: INFO and above
// Development: DEBUG and above
```

To debug realtime issues:

1. Check browser console for realtime logs
2. Use `getChannelStats()` to see active channels
3. Use `getActiveChannels()` to inspect individual channels
4. Check Supabase dashboard for realtime quota/issues

## Best Practices

1. **Use with Hooks**: Integrate with React hooks for automatic cleanup
2. **Handle Errors**: Always provide `onError` callbacks
3. **Cleanup on Logout**: Call `cleanupAllChannels()` when users log out
4. **Debounce Presence**: Don't join/leave presence too frequently
5. **Tenant Isolation**: Use `tenantId` in multi-tenant applications
6. **Monitor Stats**: Periodically check `getChannelStats()` for leaks

## Examples

### Example 1: Live Contact Updates

```typescript
'use client'

import { useEffect, useState } from 'react'
import { subscribeToEntity } from '@/lib/realtime'

export function ContactDetails({ contactId }: { contactId: string }) {
  const [contact, setContact] = useState(null)

  useEffect(() => {
    // Subscribe to contact changes
    subscribeToEntity({
      entityType: 'contact',
      entityId: contactId,
      
      onUpdate: (payload) => {
        // Update local state with new data
        setContact(payload.new)
      }
    })
  }, [contactId])

  return <div>{/* Render contact */}</div>
}
```

### Example 2: Who's Viewing Indicator

```typescript
'use client'

import { useEffect, useState } from 'react'
import { joinPresence, type PresenceUser } from '@/lib/realtime'

export function ProjectHeader({ projectId, currentUser }: Props) {
  const [viewers, setViewers] = useState<PresenceUser[]>([])

  useEffect(() => {
    joinPresence({
      entityType: 'project',
      entityId: projectId,
      user: currentUser,
      
      onSync: (users) => setViewers(users),
      onJoin: (user) => setViewers(prev => [...prev, user]),
      onLeave: (user) => setViewers(prev => prev.filter(u => u.userId !== user.userId))
    })
  }, [projectId])

  return (
    <div>
      <h1>Project</h1>
      {viewers.length > 0 && (
        <div className="flex items-center gap-2">
          {viewers.map(user => (
            <img key={user.userId} src={user.userAvatar} alt={user.userName} />
          ))}
          <span>{viewers.length} viewing</span>
        </div>
      )}
    </div>
  )
}
```

### Example 3: Collaborative Cursors

```typescript
'use client'

import { useEffect, useState } from 'react'
import { broadcast, subscribeToEntity } from '@/lib/realtime'

export function CollaborativeEditor({ documentId, currentUser }: Props) {
  const [cursors, setCursors] = useState<Record<string, { x: number, y: number }>>({})

  useEffect(() => {
    // Subscribe to the document channel
    const setupChannel = async () => {
      const channel = await subscribeToEntity({
        entityType: 'document',
        entityId: documentId
      })

      // Listen for cursor broadcasts
      channel.on('broadcast', { event: 'cursor' }, ({ payload }) => {
        setCursors(prev => ({
          ...prev,
          [payload.userId]: { x: payload.x, y: payload.y }
        }))
      })
    }

    setupChannel()
  }, [documentId])

  const handleMouseMove = (e: React.MouseEvent) => {
    // Broadcast cursor position
    broadcast({
      entityType: 'document',
      entityId: documentId,
      event: 'cursor',
      payload: {
        userId: currentUser.id,
        x: e.clientX,
        y: e.clientY
      }
    })
  }

  return (
    <div onMouseMove={handleMouseMove}>
      {/* Render cursors */}
      {Object.entries(cursors).map(([userId, pos]) => (
        <div
          key={userId}
          style={{ left: pos.x, top: pos.y }}
          className="absolute w-4 h-4 bg-blue-500 rounded-full"
        />
      ))}
    </div>
  )
}
```

## License

MIT
