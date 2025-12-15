# Quick Start Guide

Get started with the Realtime Channel Manager in 5 minutes.

## Step 1: Import

```typescript
import { subscribeToEntity, joinPresence, cleanupAllChannels } from '@/lib/realtime'
```

## Step 2: Subscribe to Database Changes

```typescript
'use client'

import { useEffect } from 'react'
import { subscribeToEntity } from '@/lib/realtime'

export function ContactPage({ contactId }: { contactId: string }) {
  useEffect(() => {
    // Subscribe to contact updates
    subscribeToEntity({
      entityType: 'contact',
      entityId: contactId,
      
      onUpdate: (payload) => {
        console.log('Contact updated!', payload.new)
        // Refresh your data here
      }
    })
  }, [contactId])

  return <div>Contact Page</div>
}
```

## Step 3: Track User Presence

```typescript
'use client'

import { useEffect, useState } from 'react'
import { joinPresence, type PresenceUser } from '@/lib/realtime'

export function ProjectPage({ projectId, currentUser }: Props) {
  const [viewers, setViewers] = useState<PresenceUser[]>([])

  useEffect(() => {
    // Track who's viewing this project
    joinPresence({
      entityType: 'project',
      entityId: projectId,
      
      user: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email
      },
      
      onSync: (users) => setViewers(users)
    })
  }, [projectId])

  return (
    <div>
      <h1>Project</h1>
      {viewers.length > 0 && (
        <p>{viewers.length} others viewing</p>
      )}
    </div>
  )
}
```

## Step 4: Cleanup on Logout

```typescript
import { cleanupAllChannels } from '@/lib/realtime'

async function handleLogout() {
  // Clean up all realtime connections
  cleanupAllChannels()
  
  // Then logout
  await supabase.auth.signOut()
}
```

## That's it!

You're now using the channel manager. For more advanced usage, see:
- [README.md](./README.md) - Full documentation
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [examples.ts](./examples.ts) - React hook patterns

## Common Patterns

### Pattern 1: Auto-refresh on changes

```typescript
import { useSWR } from 'swr'
import { subscribeToEntity } from '@/lib/realtime'

export function useContact(contactId: string) {
  const { data, mutate } = useSWR(`/api/contacts/${contactId}`)

  useEffect(() => {
    subscribeToEntity({
      entityType: 'contact',
      entityId: contactId,
      onUpdate: () => mutate() // Refresh data
    })
  }, [contactId])

  return data
}
```

### Pattern 2: Show who's viewing

```typescript
import { joinPresence } from '@/lib/realtime'

export function ViewersList({ entityType, entityId, currentUser }: Props) {
  const [viewers, setViewers] = useState<PresenceUser[]>([])

  useEffect(() => {
    joinPresence({
      entityType,
      entityId,
      user: currentUser,
      onSync: setViewers
    })
  }, [entityType, entityId])

  return (
    <div className="flex -space-x-2">
      {viewers.map(user => (
        <img
          key={user.userId}
          src={user.userAvatar}
          alt={user.userName}
          className="w-8 h-8 rounded-full border-2 border-white"
          title={user.userName}
        />
      ))}
    </div>
  )
}
```

### Pattern 3: Broadcast events

```typescript
import { broadcast, subscribeToEntity } from '@/lib/realtime'

// Send
await broadcast({
  entityType: 'document',
  entityId: documentId,
  event: 'selection-changed',
  payload: { text: selectedText, userId: currentUser.id }
})

// Receive
const channel = await subscribeToEntity({
  entityType: 'document',
  entityId: documentId
})

channel.on('broadcast', { event: 'selection-changed' }, ({ payload }) => {
  console.log('User selected:', payload.text)
})
```

## Troubleshooting

### Issue: Changes not appearing

**Solution**: Make sure Realtime is enabled on your Supabase table:
1. Go to Supabase Dashboard → Table Editor
2. Select your table → Enable Realtime

### Issue: Presence not working

**Solution**: Check that you're passing the user object correctly:
```typescript
joinPresence({
  entityType: 'contact',
  entityId: contactId,
  user: {
    id: currentUser.id,  // Required
    name: currentUser.name,
    email: currentUser.email
  }
})
```

### Issue: Too many connections

**Solution**: The manager reuses channels automatically, but make sure you're not creating new subscriptions on every render:

```typescript
// ❌ Bad - creates new subscription on every render
function MyComponent({ id }) {
  subscribeToEntity({ entityType: 'contact', entityId: id })
  return <div>...</div>
}

// ✅ Good - only subscribes once
function MyComponent({ id }) {
  useEffect(() => {
    subscribeToEntity({ entityType: 'contact', entityId: id })
  }, [id])
  return <div>...</div>
}
```

## Next Steps

- Read the [full documentation](./README.md)
- Check out [example integrations](./examples.ts)
- Review the [architecture](./ARCHITECTURE.md)
- Integrate with your existing `usePresence` and `useRealtimeSubscription` hooks
