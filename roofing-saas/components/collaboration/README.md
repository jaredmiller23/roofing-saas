# Collaboration Components

Real-time collaboration components for showing user presence, handling edit conflicts, and displaying real-time notifications.

## Components

### 1. PresenceIndicator

Displays avatars of users currently viewing the same entity.

**Features:**
- Compact horizontal layout with overlapping avatars
- User names shown on hover via tooltips
- Green online indicator dot on each avatar
- Supports max display limit with "+X more" overflow
- Uses the `usePresence` hook for real-time tracking
- Customizable sizes: xs, sm, md, lg
- Optional view count display

**Usage:**

```tsx
import { PresenceIndicator } from "@/components/collaboration/PresenceIndicator"

function ContactHeader({ contactId, currentUser }) {
  return (
    <div className="flex items-center justify-between">
      <h1>Contact Details</h1>
      <PresenceIndicator
        entityType="contact"
        entityId={contactId}
        user={currentUser}
        maxDisplay={3}
        size="sm"
        showCount={false}
      />
    </div>
  )
}
```

### 2. EditConflictDialog

Modal dialog shown when edit conflicts are detected.

**Features:**
- Shows which fields are being edited by whom
- Three resolution options: Save anyway, Reload, Cancel
- Warning styling with destructive alerts
- Clear messaging about consequences
- Loading states for async operations
- Time-ago display for when fields were locked

**Usage:**

```tsx
import { EditConflictDialog } from "@/components/collaboration/EditConflictDialog"
import { useState } from "react"

function ContactForm({ contactId }) {
  const [conflicts, setConflicts] = useState([])
  const [showConflictDialog, setShowConflictDialog] = useState(false)

  const handleSave = async () => {
    // Check for conflicts before saving
    const conflictCheck = await checkForConflicts(contactId)
    
    if (conflictCheck.hasConflicts) {
      setConflicts(conflictCheck.conflicts)
      setShowConflictDialog(true)
      return
    }
    
    // Save normally
    await saveContact()
  }

  return (
    <>
      <form onSubmit={handleSave}>
        {/* Form fields */}
      </form>

      <EditConflictDialog
        open={showConflictDialog}
        onOpenChange={setShowConflictDialog}
        conflicts={conflicts}
        entityName="Contact"
        onSaveAnyway={async () => {
          await saveContact({ force: true })
          setShowConflictDialog(false)
        }}
        onReload={async () => {
          await reloadContact()
          setShowConflictDialog(false)
        }}
        onCancel={() => {
          setShowConflictDialog(false)
        }}
      />
    </>
  )
}
```

### 3. RealtimeToast

Toast notifications for real-time updates.

**Features:**
- Multiple notification types: user-joined, user-left, data-updated, conflict, success, info, warning
- Auto-dismiss with configurable duration
- User avatars for join/leave notifications
- Appropriate icons for each notification type
- Smooth animations (slide in from top)
- Optional manual dismiss
- Preset configurations for common scenarios

**Usage with sonner:**

```tsx
import { toast } from "sonner"
import { RealtimeToast, realtimeToastPresets } from "@/components/collaboration/RealtimeToast"

function ContactPage({ contactId, currentUser }) {
  const { presentUsers } = usePresence({
    entityType: "contact",
    entityId: contactId,
    user: currentUser,
    onUserJoin: (user) => {
      toast.custom(() => (
        <RealtimeToast {...realtimeToastPresets.userJoined(
          user.userName || "A user",
          user.userAvatar
        )} />
      ))
    },
    onUserLeave: (user) => {
      toast.custom(() => (
        <RealtimeToast {...realtimeToastPresets.userLeft(
          user.userName || "A user",
          user.userAvatar
        )} />
      ))
    }
  })

  const handleFieldUpdate = (fieldName: string, updatedBy: string) => {
    toast.custom(() => (
      <RealtimeToast {...realtimeToastPresets.dataUpdated(fieldName, updatedBy)} />
    ))
  }

  return <div>{/* Page content */}</div>
}
```

**Direct usage (standalone):**

```tsx
import { RealtimeToast } from "@/components/collaboration/RealtimeToast"

function MyComponent() {
  const [notifications, setNotifications] = useState([])

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <RealtimeToast
          key={notification.id}
          type={notification.type}
          title={notification.title}
          description={notification.description}
          user={notification.user}
          onDismiss={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  )
}
```

## Complete Example

Here's a complete example combining all three components:

```tsx
"use client"

import { useState } from "react"
import { toast } from "sonner"
import { PresenceIndicator } from "@/components/collaboration/PresenceIndicator"
import { EditConflictDialog } from "@/components/collaboration/EditConflictDialog"
import { RealtimeToast, realtimeToastPresets } from "@/components/collaboration/RealtimeToast"
import { usePresence } from "@/lib/hooks/usePresence"

export default function ContactDetailPage({ 
  contactId,
  currentUser 
}: {
  contactId: string
  currentUser: { id: string; name?: string; email?: string; avatar?: string }
}) {
  const [conflicts, setConflicts] = useState([])
  const [showConflictDialog, setShowConflictDialog] = useState(false)

  // Track presence and show notifications
  const { presentUsers, count } = usePresence({
    entityType: "contact",
    entityId: contactId,
    user: currentUser,
    onUserJoin: (user) => {
      toast.custom(() => (
        <RealtimeToast {...realtimeToastPresets.userJoined(
          user.userName || user.userEmail || "A user",
          user.userAvatar
        )} />
      ))
    },
    onUserLeave: (user) => {
      toast.custom(() => (
        <RealtimeToast {...realtimeToastPresets.userLeft(
          user.userName || user.userEmail || "A user",
          user.userAvatar
        )} />
      ))
    }
  })

  const handleSaveContact = async (data: any) => {
    // Simulate conflict detection
    const hasConflict = presentUsers.some(u => 
      u.metadata?.editingFields?.includes("status")
    )

    if (hasConflict) {
      setConflicts([
        {
          field: "Status",
          user: presentUsers[0].user,
          lockedAt: new Date().toISOString()
        }
      ])
      setShowConflictDialog(true)
      return
    }

    // Save contact
    await saveContact(data)
    
    toast.custom(() => (
      <RealtimeToast {...realtimeToastPresets.syncSuccess()} />
    ))
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Presence Indicator */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contact Details</h1>
        <PresenceIndicator
          entityType="contact"
          entityId={contactId}
          user={currentUser}
          maxDisplay={3}
          size="sm"
        />
      </div>

      {/* Contact Form */}
      <form onSubmit={(e) => {
        e.preventDefault()
        handleSaveContact(new FormData(e.currentTarget))
      }}>
        {/* Form fields */}
        <button type="submit">Save Changes</button>
      </form>

      {/* Edit Conflict Dialog */}
      <EditConflictDialog
        open={showConflictDialog}
        onOpenChange={setShowConflictDialog}
        conflicts={conflicts}
        entityName="Contact"
        onSaveAnyway={async () => {
          await saveContact({ force: true })
          setShowConflictDialog(false)
        }}
        onReload={async () => {
          window.location.reload()
        }}
        onCancel={() => {
          setShowConflictDialog(false)
        }}
      />
    </div>
  )
}
```

## TypeScript Types

All components are fully typed with TypeScript. Import types as needed:

```tsx
import type { PresenceIndicatorProps } from "@/components/collaboration/PresenceIndicator"
import type { EditConflictDialogProps, ConflictingField } from "@/components/collaboration/EditConflictDialog"
import type { RealtimeToastProps, RealtimeToastType } from "@/components/collaboration/RealtimeToast"
```

## Integration with usePresence Hook

These components are designed to work seamlessly with the `usePresence` hook located at `/lib/hooks/usePresence.ts`. The hook provides:

- Real-time presence tracking via Supabase Realtime
- User join/leave detection
- Metadata tracking for field-level locking
- Automatic cleanup on unmount

See the hook documentation for more details on configuration options.
