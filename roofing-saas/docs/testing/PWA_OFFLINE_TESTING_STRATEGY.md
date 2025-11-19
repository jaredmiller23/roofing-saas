# PWA Offline Mode Testing Strategy

**Date**: November 18, 2025
**Status**: Infrastructure Analysis Complete - Manual Testing Required
**Priority**: MEDIUM - Critical PWA Feature for Field Operations

---

## Executive Summary

### Infrastructure Status: ✅ **IMPLEMENTED**

All core offline infrastructure is in place and ready for testing:
- ✅ next-pwa with workbox caching strategies
- ✅ IndexedDB storage with idb library
- ✅ Dexie.js for photo queue management
- ✅ Sync queue with retry logic
- ✅ Online/offline event listeners
- ✅ Offline fallback UI

### Testing Status: ❌ **UNTESTED**

**No evidence of end-to-end offline testing.** Infrastructure is present but actual offline functionality has never been validated.

### Recommendation: **Manual Testing Required**

This document provides comprehensive testing scenarios for **user-driven manual testing** of offline capabilities.

---

## 1. Infrastructure Analysis

### 1.1 PWA Configuration (`/next.config.ts`)

**Status**: ✅ Fully Configured

```typescript
const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
  },
  runtimeCaching: [/* 14 caching strategies */]
})
```

**Caching Strategies Configured**:
- ✅ **Fonts**: CacheFirst (Google Fonts - 365 days)
- ✅ **Images**: StaleWhileRevalidate (24 hours)
- ✅ **Static Assets**: StaleWhileRevalidate (JS/CSS - 24 hours)
- ✅ **Next.js Data**: StaleWhileRevalidate (24 hours)
- ✅ **API Calls**: NetworkFirst with 10s timeout (24 hours cache)
- ✅ **Audio/Video**: CacheFirst with range requests

**Note**: PWA is **disabled in development** to avoid Turbopack conflicts. Testing must be done in production build.

---

### 1.2 IndexedDB Storage (`/lib/db/indexeddb.ts`)

**Status**: ✅ Fully Implemented with idb Library

**Schema**:
- `contacts` - Offline contact cache (by tenant_id, updated_at)
- `projects` - Offline project cache (by tenant_id, contact_id, updated_at)
- `pending_uploads` - Photo upload queue
- `pending_actions` - CRUD operation queue (create, update, delete)

**Key Features**:
- ✅ Multi-tenant isolation via indexes
- ✅ Cache staleness tracking (`cached_at`, `synced` flags)
- ✅ Retry counters for failed syncs
- ✅ Transaction support for batch operations

**API Functions**:
```typescript
// Contacts
cacheContact(contact)
cacheContacts(contacts[])
getCachedContact(id)
getCachedContacts(tenantId)

// Projects
cacheProject(project)
getCachedProjects(tenantId)
getCachedProjectsByContact(contactId)

// Sync Queue
addPendingAction(action)
addPendingUpload(upload)
getPendingActions(tenantId)
getPendingUploads(tenantId)
```

---

### 1.3 Photo Queue (`/lib/db/offline-queue.ts`)

**Status**: ✅ Fully Implemented with Dexie.js

**Schema**:
```typescript
interface QueuedPhoto {
  id: number
  localId: string
  file: File
  contactId: string
  projectId?: string
  metadata: { latitude, longitude, notes, capturedAt }
  status: 'pending' | 'syncing' | 'failed' | 'completed'
  attempts: number
  lastAttempt?: string
  error?: string
  tenantId: string
}
```

**Features**:
- ✅ Auto-cleanup of completed items (7+ days old)
- ✅ Storage quota monitoring (`getStorageQuota()`)
- ✅ Queue statistics (`getQueueStats()`)

---

### 1.4 Sync Queue (`/lib/sync/queue.ts`)

**Status**: ✅ Fully Implemented

**Core Functions**:
```typescript
syncPendingActions(tenantId)  // Process queued CRUD operations
syncPendingUploads(tenantId)  // Process queued photo uploads
syncAll(tenantId)             // Sync everything
checkAndSync(tenantId)        // Check online status and sync
setupSyncListeners(tenantId)  // Auto-sync on online/visibility change
```

**Retry Logic**:
- ✅ Max 3 retries per action/upload
- ✅ 1-second delay between requests (rate limiting)
- ✅ Error tracking (`last_error` field)
- ✅ Exponential backoff via retry counter

**Event Listeners**:
- ✅ `online` event → Trigger sync
- ✅ `offline` event → Log offline status
- ✅ `visibilitychange` event → Sync when tab becomes active + online

---

### 1.5 Offline Fallback UI (`/app/offline/page.tsx`)

**Status**: ✅ Implemented

**Features**:
- ✅ User-friendly offline message
- ✅ Lists available offline capabilities:
  - Take photos (sync later)
  - View cached contacts
  - View territory maps (if previously loaded)
- ✅ "Try Again" button to reload
- ✅ Auto-refresh on reconnect message

---

## 2. Testing Scenarios

### Scenario 1: Offline Data Access (Read Operations)

**Objective**: Verify cached data is accessible when offline

**Prerequisites**:
1. User logged in with active session
2. User has previously loaded:
   - Contact list
   - Project list
   - Territory map (if applicable)

**Test Steps**:
1. **Online**: Navigate to Contacts page
2. **Online**: Wait for contacts to load and cache
3. **Enable Airplane Mode** on device
4. **Offline**: Refresh the page or navigate away and back
5. **Offline**: Attempt to view contacts

**Expected Behavior**:
- ✅ Contacts page loads from cache
- ✅ Contact data displays correctly
- ✅ UI shows "You're Offline" indicator (if implemented)
- ✅ Data is read-only (no create/edit buttons active)

**How to Verify**:
- Open DevTools → Network tab → Verify 0 network requests
- Open DevTools → Application → IndexedDB → `roofing-saas-db` → `contacts` → Verify cached data

---

### Scenario 2: Offline Data Creation (Write Operations)

**Objective**: Verify new data is queued when offline

**Test Steps**:
1. **Enable Airplane Mode**
2. **Offline**: Navigate to Territories page
3. **Offline**: Click on map to drop a pin
4. **Offline**: Fill in knock data (disposition, notes)
5. **Offline**: Check "Create Lead" checkbox
6. **Offline**: Fill in contact info (name, phone, email)
7. **Offline**: Click "Save"

**Expected Behavior**:
- ✅ Data saved to IndexedDB `pending_actions` queue
- ✅ Success toast shows "Saved (will sync when online)"
- ✅ UI shows pending sync indicator (e.g., cloud icon with up arrow)
- ✅ Data appears in UI immediately (optimistic update)

**How to Verify**:
- DevTools → Application → IndexedDB → `roofing-saas-db` → `pending_actions`
- Should see entry with:
  - `action_type: 'create'`
  - `entity_type: 'contact'`
  - `retry_count: 0`
  - `data: { first_name, last_name, phone, email, ... }`

---

### Scenario 3: Offline Photo Capture

**Objective**: Verify photos are queued for upload when offline

**Test Steps**:
1. **Enable Airplane Mode**
2. **Offline**: Navigate to contact or project
3. **Offline**: Click "Take Photo" or "Upload Photo"
4. **Offline**: Capture or select photo
5. **Offline**: Add notes/metadata (optional)
6. **Offline**: Confirm upload

**Expected Behavior**:
- ✅ Photo saved to IndexedDB `pending_uploads` queue (as Blob)
- ✅ Success toast shows "Photo queued for upload"
- ✅ Photo appears in UI with "Pending" badge
- ✅ Offline queue count increments (e.g., "3 pending uploads")

**How to Verify**:
- DevTools → Application → IndexedDB → `RoofingSaaSOfflineQueue` → `queuedPhotos`
- Should see entry with:
  - `status: 'pending'`
  - `file: Blob { size: X, type: 'image/jpeg' }`
  - `attempts: 0`
  - `metadata: { ... }`

---

### Scenario 4: Sync When Online (Happy Path)

**Objective**: Verify queued items sync successfully when reconnected

**Prerequisites**:
- At least 1 queued action in `pending_actions`
- At least 1 queued upload in `pending_uploads`

**Test Steps**:
1. **Offline**: Verify pending items exist (DevTools → IndexedDB)
2. **Disable Airplane Mode** (go online)
3. **Wait for Auto-Sync** (should trigger on `online` event)

**Expected Behavior**:
- ✅ `online` event listener triggers `checkAndSync()`
- ✅ Pending actions sync successfully (HTTP 200 responses)
- ✅ Pending uploads complete successfully
- ✅ Items removed from IndexedDB queues
- ✅ Success notification: "X items synced successfully"
- ✅ Data appears in Supabase database
- ✅ UI updates with server-generated IDs

**How to Verify**:
- DevTools → Console → Look for:
  - "Device is back online, starting sync"
  - "Action synced successfully"
  - "Upload synced successfully"
  - "Sync completed"
- DevTools → Network → Verify API calls:
  - POST/PATCH/DELETE to `/api/contacts`, `/api/projects`, etc.
  - POST to `/api/photos/upload`
- Supabase → Database → Verify new records exist

---

### Scenario 5: Sync Retry Logic

**Objective**: Verify retry mechanism for failed syncs

**Test Steps**:
1. **Offline**: Queue a contact creation
2. **Online**: Temporarily break API (e.g., invalid auth token, or server error)
3. **Wait for Sync Attempt** → Should fail
4. **Wait 1 Second** → Should retry
5. **Fix API** (restore valid auth)
6. **Wait for Next Retry** → Should succeed

**Expected Behavior**:
- ✅ First sync attempt fails (HTTP error)
- ✅ Item remains in queue with `retry_count: 1`
- ✅ `last_error` field populated with error message
- ✅ Auto-retry after 1 second delay
- ✅ Max 3 retries before giving up
- ✅ Success on valid retry
- ✅ Item removed from queue on success

**How to Verify**:
- DevTools → Console → Look for:
  - "Action sync failed" (1st attempt)
  - "Action synced successfully" (2nd attempt)
- DevTools → IndexedDB → Watch `retry_count` increment

---

### Scenario 6: Edge Case - Network Drops Mid-Request

**Objective**: Verify graceful handling of network interruption during sync

**Test Steps**:
1. **Online**: Queue multiple items (5-10 actions + uploads)
2. **Online**: Trigger sync
3. **Mid-Sync**: Enable airplane mode (while items are syncing)

**Expected Behavior**:
- ✅ In-flight requests fail gracefully (no crashes)
- ✅ Partially synced items: Success items removed, failed items remain
- ✅ `retry_count` incremented for failed items
- ✅ Sync pauses when offline detected
- ✅ Sync resumes automatically when back online

---

### Scenario 7: Edge Case - Large Queue (100+ Items)

**Objective**: Verify performance with large sync queue

**Test Steps**:
1. **Offline**: Create 100+ knock logs with photos
2. **Online**: Trigger sync

**Expected Behavior**:
- ✅ Sync processes all items (not just first batch)
- ✅ Progress indicator shows X of Y items synced
- ✅ No UI freeze (sync runs in background)
- ✅ Rate limiting prevents server overload (1s delay between requests)
- ✅ All items eventually sync (may take 100+ seconds)

---

### Scenario 8: Conflict Resolution (CRITICAL GAP)

**Objective**: Test what happens when same data modified online and offline

**Test Steps**:
1. **Online**: Load contact "John Smith" (ID: abc-123)
2. **Offline**: Update contact phone to "555-1111"
3. **Online (Different Device)**: Update same contact phone to "555-2222"
4. **Back Online (Original Device)**: Trigger sync

**Expected Behavior**:
- ⚠️ **UNCLEAR** - No conflict resolution strategy identified in code
- Possible outcomes:
  - Last-write-wins (offline update overwrites online update) ❌ Data loss
  - Server rejects (HTTP 409 Conflict) ❌ Sync fails permanently
  - Merge strategy (prompt user to resolve) ✅ Ideal

**Current Behavior**: **UNKNOWN** - Needs Testing & Implementation

**Recommendation**: Implement last-modified timestamp comparison:
```typescript
if (localUpdatedAt > serverUpdatedAt) {
  // Apply offline update
} else {
  // Reject and show conflict notification
  // Prompt user to manually resolve
}
```

---

## 3. Testing Checklist

### 3.1 Pre-Test Setup

- [ ] Build production version: `npm run build`
- [ ] Run production server: `npm start`
- [ ] Open in browser: `http://localhost:3000`
- [ ] Login with test account
- [ ] Open DevTools (F12)
- [ ] Open DevTools → Application → Service Workers
- [ ] Verify service worker is registered and active

### 3.2 Core Offline Functionality

- [ ] **Test 1**: Offline data access (cached contacts)
- [ ] **Test 2**: Offline data creation (queue contact)
- [ ] **Test 3**: Offline photo capture (queue upload)
- [ ] **Test 4**: Sync when online (happy path)
- [ ] **Test 5**: Sync retry logic (failed → retry → success)
- [ ] **Test 6**: Network drops mid-sync
- [ ] **Test 7**: Large queue (100+ items)
- [ ] **Test 8**: Conflict resolution (MANUAL INTERVENTION REQUIRED)

### 3.3 Mobile PWA Testing

- [ ] Install PWA on Android (Chrome)
- [ ] Install PWA on iOS (Safari → Add to Home Screen)
- [ ] Test offline mode on mobile (airplane mode)
- [ ] Test photo capture offline on mobile
- [ ] Test sync on mobile when back online

---

## 4. Current Gaps & Recommendations

### 4.1 CRITICAL Gaps

#### ❌ **Gap #1: No Conflict Resolution Strategy**

**Impact**: HIGH - Data loss or sync failures on conflicts

**Current State**: No conflict detection or resolution logic found

**Recommendation**:
1. Add `updated_at` timestamp comparison
2. Implement conflict detection in sync queue
3. Add UI for manual conflict resolution
4. Consider CRDT (Conflict-free Replicated Data Types) for automatic resolution

**Estimated Effort**: 8-12 hours

---

#### ❌ **Gap #2: No Online/Offline Status Indicator**

**Impact**: MEDIUM - Users don't know when offline mode is active

**Current State**: Offline fallback page exists, but no persistent indicator

**Recommendation**:
Add persistent online/offline status banner:
```typescript
// components/layout/OnlineStatusBanner.tsx
<div className={isOnline ? 'hidden' : 'bg-yellow-500 p-2 text-center'}>
  ⚠️ You're offline. Changes will sync when reconnected.
  {pendingCount > 0 && ` (${pendingCount} items pending)`}
</div>
```

**Estimated Effort**: 2-4 hours

---

#### ❌ **Gap #3: No API Fallback to IndexedDB**

**Impact**: MEDIUM - API calls fail silently when offline

**Current State**: API routes don't check IndexedDB before returning errors

**Recommendation**:
Implement fallback pattern in data-fetching hooks:
```typescript
async function getContacts(tenantId: string) {
  if (!navigator.onLine) {
    // Return cached data from IndexedDB
    return await getCachedContacts(tenantId)
  }

  try {
    // Try network first
    const response = await fetch(`/api/contacts?tenant_id=${tenantId}`)
    const contacts = await response.json()

    // Cache for offline use
    await cacheContacts(contacts)

    return contacts
  } catch (error) {
    // Fallback to cache on network error
    return await getCachedContacts(tenantId)
  }
}
```

**Estimated Effort**: 6-8 hours (across all data-fetching hooks)

---

### 4.2 MEDIUM Gaps

#### ⚠️ **Gap #4: No Background Sync API**

**Impact**: MEDIUM - Sync only happens when app is open

**Current State**: Sync triggered on `online` event and `visibilitychange`

**Recommendation**:
Use Background Sync API for better offline experience:
```typescript
// Register background sync
if ('serviceWorker' in navigator && 'sync' in registration) {
  registration.sync.register('sync-queue')
}

// Service worker handles sync in background
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queue') {
    event.waitUntil(syncAllPendingItems())
  }
})
```

**Estimated Effort**: 4-6 hours

---

#### ⚠️ **Gap #5: No Sync Progress UI**

**Impact**: LOW - Users don't see sync progress

**Current State**: Sync happens silently in background

**Recommendation**:
Add sync progress notification:
```typescript
// components/sync/SyncProgressToast.tsx
<Toast>
  Syncing {current} of {total} items...
  <ProgressBar value={(current / total) * 100} />
</Toast>
```

**Estimated Effort**: 3-4 hours

---

### 4.3 LOW Priority Improvements

#### 💡 **Gap #6: No Cache Invalidation Strategy**

**Impact**: LOW - Stale data may persist

**Current State**: Cache staleness checked via `isCacheStale()` but not automatically invalidated

**Recommendation**:
Implement automatic cache invalidation:
- On logout → Clear all cache
- On tenant switch → Clear cache
- On data update → Invalidate related cache

**Estimated Effort**: 2-3 hours

---

#### 💡 **Gap #7: No Storage Quota Warnings**

**Impact**: LOW - Users may hit storage limits

**Current State**: `getStorageQuota()` exists but not used

**Recommendation**:
Add storage quota warning when >80%:
```typescript
const { percentage } = await getStorageQuota()
if (percentage > 80) {
  showWarning('Storage almost full. Please sync and clear old photos.')
}
```

**Estimated Effort**: 1-2 hours

---

## 5. Manual Testing Instructions

### For User/QA Tester:

1. **Build Production**:
   ```bash
   npm run build
   npm start
   ```

2. **Open Production App**:
   - Navigate to `http://localhost:3000`
   - Login with test account

3. **Test Offline Mode**:
   - Load contacts page (let it fully load)
   - Enable airplane mode
   - Refresh page or navigate away and back
   - Verify contacts still display

4. **Test Offline Creation**:
   - While offline, try to create a new contact
   - Verify it saves to queue
   - Check DevTools → IndexedDB → `pending_actions`

5. **Test Sync**:
   - Disable airplane mode
   - Wait ~5 seconds
   - Check DevTools console for "Sync completed"
   - Verify new contact appears in Supabase

6. **Test Photos**:
   - Go offline
   - Take a photo
   - Verify it queues
   - Go online
   - Verify it uploads

### For Developer:

Use this document as a reference for implementing missing features:
1. Conflict resolution (#Gap #1)
2. Online/offline status indicator (#Gap #2)
3. API fallback to IndexedDB (#Gap #3)
4. Background Sync API (#Gap #4)
5. Sync progress UI (#Gap #5)

---

## 6. Success Criteria

### Minimum Viable Offline Mode (MVP):

- ✅ Users can view cached contacts/projects when offline
- ✅ Users can create knock logs when offline
- ✅ Users can capture photos when offline
- ✅ All queued items sync automatically when back online
- ✅ Retry logic handles temporary network failures
- ✅ Users see visual indicator when offline

### Full Offline Support:

- ✅ All MVP criteria met
- ✅ Conflict resolution implemented
- ✅ Background Sync API integrated
- ✅ Sync progress visible to users
- ✅ Storage quota warnings
- ✅ Automatic cache invalidation

---

## 7. Next Steps

### Immediate Actions (User):

1. **Manual Testing**: Follow testing checklist above
2. **Document Findings**: Note any failures or unexpected behaviors
3. **Report Issues**: Create GitHub issues for any bugs found

### Developer Actions (After Testing):

1. **Fix Critical Gaps**: Implement conflict resolution
2. **Add Status Indicator**: Show online/offline status
3. **Implement API Fallback**: Check IndexedDB before erroring
4. **Add E2E Tests**: Automate offline testing with Playwright (see below)

---

## 8. Automated Testing Strategy (Future)

**Note**: Offline testing is difficult to automate, but here's a strategy:

### Using Playwright for E2E Offline Tests:

```typescript
import { test, expect } from '@playwright/test'

test('offline mode - cached data access', async ({ page, context }) => {
  // 1. Load page while online
  await page.goto('http://localhost:3000/contacts')
  await page.waitForSelector('[data-testid="contact-list"]')

  // 2. Go offline
  await context.setOffline(true)

  // 3. Reload page
  await page.reload()

  // 4. Verify contacts still display from cache
  await expect(page.locator('[data-testid="contact-list"]')).toBeVisible()
  await expect(page.locator('[data-testid="contact-item"]')).toHaveCount(5) // Cached count
})

test('offline mode - queue creation', async ({ page, context }) => {
  // 1. Go offline
  await context.setOffline(true)

  // 2. Create new contact
  await page.goto('http://localhost:3000/contacts/new')
  await page.fill('[name="first_name"]', 'John')
  await page.fill('[name="last_name"]', 'Smith')
  await page.fill('[name="phone"]', '555-1234')
  await page.click('button[type="submit"]')

  // 3. Verify queued in IndexedDB
  const queueCount = await page.evaluate(async () => {
    const { getPendingActions } = await import('@/lib/db/indexeddb')
    const actions = await getPendingActions('tenant-id-here')
    return actions.length
  })

  expect(queueCount).toBeGreaterThan(0)
})

test('offline mode - sync when online', async ({ page, context }) => {
  // 1. Queue item while offline
  await context.setOffline(true)
  await page.goto('http://localhost:3000/contacts/new')
  await page.fill('[name="first_name"]', 'Jane')
  await page.click('button[type="submit"]')

  // 2. Go back online
  await context.setOffline(false)

  // 3. Wait for sync
  await page.waitForTimeout(2000) // Wait for auto-sync

  // 4. Verify item synced (queue empty)
  const queueCount = await page.evaluate(async () => {
    const { getPendingActions } = await import('@/lib/db/indexeddb')
    const actions = await getPendingActions('tenant-id-here')
    return actions.length
  })

  expect(queueCount).toBe(0)
})
```

**Estimated Effort for E2E Tests**: 16-20 hours

---

## Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| PWA Configuration | ✅ Complete | Comprehensive caching strategies |
| IndexedDB Storage | ✅ Complete | Full schema with multi-tenant support |
| Photo Queue (Dexie) | ✅ Complete | Retry logic, auto-cleanup |
| Sync Queue | ✅ Complete | Event listeners, retry logic |
| Offline Fallback UI | ✅ Complete | User-friendly message |
| **E2E Testing** | ❌ **UNTESTED** | **Requires manual testing** |
| Conflict Resolution | ❌ Missing | **Critical gap** |
| Online/Offline Indicator | ❌ Missing | Medium priority |
| API Fallback | ❌ Missing | Medium priority |
| Background Sync API | ❌ Missing | Low priority |
| Sync Progress UI | ❌ Missing | Low priority |

---

**Overall Assessment**: Infrastructure is **production-ready** pending manual testing and critical gap fixes (conflict resolution).

**Estimated Effort to Complete**:
- Manual Testing: 4-6 hours (user)
- Critical Gaps: 10-16 hours (developer)
- Nice-to-Haves: 10-15 hours (developer)
- E2E Automation: 16-20 hours (developer)

**Total**: ~40-57 hours to full production-ready offline mode
