# PWA Architecture

## Overview

The Roofing SAAS application is built as a Progressive Web App (PWA), providing native app-like experience with offline-first capabilities. This architecture enables field technicians and sales representatives to capture photos, log door knocks, and access CRM data even in areas with poor or no network connectivity. The system uses `next-pwa` for service worker generation, Dexie.js/idb for IndexedDB storage, and implements a sophisticated sync queue for background synchronization.

## User Stories

### Field Representatives
- As a field rep, I want to capture property photos offline so that I can document damage even without cellular signal
- As a field rep, I want my data to automatically sync when I'm back online so that I don't lose any work
- As a field rep, I want to install the app on my phone so that I can quickly access it from my home screen
- As a field rep, I want to see my queue status so that I know what data is pending upload

### Office Staff
- As an office manager, I want field data to sync automatically so that I can see updates as soon as reps are back online
- As an admin, I want the app to cache essential data so that lookups are fast and reduce API load

### Business Owners
- As a business owner, I want the app to work reliably in the field so that my team never loses valuable data
- As a business owner, I want background sync so that reps can continue working without manual upload steps

## Features

### 1. Service Worker Architecture

The PWA uses `next-pwa` with Workbox for service worker generation, plus a custom service worker for background sync functionality.

**Implementation:**
- File: `next.config.ts` - PWA configuration with runtime caching strategies
- File: `public/sw-custom.js` - Custom service worker for background sync

**Key Capabilities:**
- Automatic service worker registration via `next-pwa`
- Skip waiting and clients claim for immediate activation
- Background Sync API integration for photo uploads
- Periodic sync support for scheduled synchronization

```typescript
// next-pwa configuration
const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  clientsClaim: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [...] // 12 caching strategies
});
```

### 2. Runtime Caching Strategies

The application implements 12 distinct caching strategies optimized for different asset types.

**Cache Types:**

| Cache Name | Strategy | Assets | TTL |
|------------|----------|--------|-----|
| `google-fonts-webfonts` | CacheFirst | Google Fonts WOFF files | 365 days |
| `google-fonts-stylesheets` | StaleWhileRevalidate | Font CSS | 7 days |
| `static-font-assets` | StaleWhileRevalidate | Local fonts | 7 days |
| `static-image-assets` | StaleWhileRevalidate | Images (jpg, png, svg, etc.) | 24 hours |
| `next-image` | StaleWhileRevalidate | Next.js optimized images | 24 hours |
| `static-audio-assets` | CacheFirst | Audio files (mp3, wav) | 24 hours |
| `static-video-assets` | CacheFirst | Video files (mp4) | 24 hours |
| `static-js-assets` | StaleWhileRevalidate | JavaScript files | 24 hours |
| `static-style-assets` | StaleWhileRevalidate | CSS files | 24 hours |
| `next-data` | StaleWhileRevalidate | Next.js data files | 24 hours |
| `static-data-assets` | NetworkFirst | JSON, XML, CSV files | 24 hours |
| `others` | NetworkFirst | Same-origin pages (non-API) | 24 hours |
| `apis` | NetworkFirst | API routes | 24 hours |

### 3. Web App Manifest

Full PWA manifest with icons, shortcuts, and share target configuration.

**Implementation:**
- File: `public/manifest.json`

**Manifest Features:**
- App name: "Roofing SaaS - CRM & Field Management"
- Display mode: `standalone` (native app-like)
- Orientation: `portrait-primary` (optimized for mobile)
- Categories: business, productivity
- 10 icon sizes (72x72 to 512x512, including maskable)
- App shortcuts for quick actions
- Share target for receiving shared photos

**App Shortcuts:**
```json
{
  "shortcuts": [
    { "name": "New Contact", "url": "/contacts/new" },
    { "name": "Take Photo", "url": "/photos/capture" }
  ]
}
```

**Share Target:**
```json
{
  "share_target": {
    "action": "/share",
    "method": "POST",
    "params": {
      "files": [{ "name": "photos", "accept": ["image/*"] }]
    }
  }
}
```

### 4. IndexedDB Storage (idb Library)

General-purpose offline cache for contacts and projects using the `idb` library.

**Implementation:**
- File: `lib/db/indexeddb.ts` (355 lines)

**Database Schema:**

| Store | Key | Indexes | Purpose |
|-------|-----|---------|---------|
| `contacts` | UUID | by-tenant, by-updated | Offline contact cache |
| `projects` | UUID | by-tenant, by-contact, by-updated | Offline project cache |
| `pending_uploads` | temp ID | by-tenant, by-created | File upload queue |
| `pending_actions` | temp ID | by-tenant, by-created, by-entity | CRUD action queue |

**Key Functions:**
- `initDB()` - Initialize database and create stores
- `cacheContact()` / `cacheContacts()` - Store contacts offline
- `cacheProject()` / `cacheProjects()` - Store projects offline
- `addPendingUpload()` / `addPendingAction()` - Queue offline changes
- `getPendingCount()` - Get sync queue counts
- `clearAllCache()` - Clear offline data (logout)

### 5. Dexie.js Photo Queue

Specialized offline queue for photo uploads using Dexie.js for reactive queries.

**Implementation:**
- File: `lib/db/offline-queue.ts` (122 lines)

**Schema:**
```typescript
interface QueuedPhoto {
  id?: number;
  localId: string;
  file: File;
  contactId: string;
  projectId?: string;
  metadata: {
    latitude?: number;
    longitude?: number;
    notes?: string;
    capturedAt: string;
  };
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  attempts: number;
  lastAttempt?: string;
  error?: string;
  createdAt: string;
  tenantId: string;
}
```

**Key Functions:**
- `initializeOfflineQueue()` - Initialize Dexie database
- `getQueueStats()` - Get counts by status
- `clearCompletedItems()` - Cleanup after sync
- `getStorageQuota()` - Check browser storage limits

### 6. Photo Queue Service

Manages offline photo capture and upload with automatic retry.

**Implementation:**
- File: `lib/services/photo-queue.ts` (298 lines)

**Key Functions:**
- `addPhotoToQueue()` - Queue photo for upload
- `processPhotoQueue()` - Upload pending photos
- `uploadQueuedPhoto()` - Upload single photo to Supabase
- `retryFailedPhotos()` - Retry failed uploads
- `setupNetworkListeners()` - Auto-sync on reconnect

**Upload Flow:**
1. Photo added to queue → status: `pending`
2. Network available → status: `syncing`
3. Upload to Supabase Storage
4. Insert metadata to database
5. Success → status: `completed`
6. Failure → status: `failed`, retry with exponential backoff

**Retry Logic:**
- Max 3 retry attempts
- Exponential backoff: 1s, 2s, 4s
- Failed uploads preserved for manual retry

### 7. Sync Queue Service

Handles synchronization of pending CRUD actions and file uploads.

**Implementation:**
- File: `lib/sync/queue.ts` (279 lines)

**Key Functions:**
- `syncPendingActions()` - Process queued CRUD operations
- `syncPendingUploads()` - Process queued file uploads
- `syncAll()` - Sync all pending items
- `checkAndSync()` - Conditional sync if online
- `setupSyncListeners()` - Event listeners for auto-sync

**Sync Triggers:**
- `online` event - Device reconnects to network
- `visibilitychange` event - Tab becomes active
- Manual "Sync Now" button click

### 8. PWA Provider Component

Central provider that initializes all PWA functionality.

**Implementation:**
- File: `components/pwa/PWAProvider.tsx` (64 lines)

**Responsibilities:**
- Initialize IndexedDB (idb)
- Initialize Dexie offline queue
- Setup network listeners
- Setup sync listeners (with tenantId)
- Register service worker
- Render child components (InstallPrompt, OfflineIndicator, SyncStatus)

```tsx
export function PWAProvider({ children, tenantId }) {
  useEffect(() => {
    initDB();
    initializeOfflineQueue();
    setupNetworkListeners();
    if (tenantId) setupSyncListeners(tenantId);
  }, [tenantId]);

  return (
    <>
      {children}
      <InstallPrompt />
      <OfflineIndicator />
      {tenantId && <SyncStatus tenantId={tenantId} />}
    </>
  );
}
```

### 9. Offline Indicator Component

Displays network status to users.

**Implementation:**
- File: `components/pwa/OfflineIndicator.tsx` (62 lines)

**States:**
- Online (hidden) - No indicator shown
- Back online - Green toast "Back online" (3 seconds)
- Offline - Amber banner "You are offline. Some features may be limited."

### 10. Sync Status Component

Shows pending sync queue with manual sync option.

**Implementation:**
- File: `components/pwa/SyncStatus.tsx` (121 lines)

**Features:**
- Polls pending count every 30 seconds
- Shows upload/action counts
- "Sync Now" button when online
- Success/error notifications
- Only visible when items pending

### 11. Install Prompt Component

Custom PWA install prompt with smart dismissal.

**Implementation:**
- File: `components/pwa/InstallPrompt.tsx` (130 lines)

**Features:**
- Intercepts `beforeinstallprompt` event
- Custom branded install banner
- "Install" button triggers native prompt
- Remembers dismissal for 30 days
- Detects if already installed (standalone mode)

### 12. Offline Queue Status (Photo-specific)

Real-time photo queue status with Dexie live queries.

**Implementation:**
- File: `components/photos/OfflineQueueStatus.tsx` (207 lines)

**Features:**
- Live query updates via `useLiveQuery` hook
- Shows pending/syncing/failed counts
- Manual "Retry Failed" button
- Manual "Sync Now" button
- Service worker message listener
- Progress indicator during sync

## Technical Implementation

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   React App  │  │ Service      │  │  IndexedDB   │          │
│  │   (Next.js)  │  │ Worker       │  │              │          │
│  │              │  │              │  │ ┌──────────┐ │          │
│  │ PWAProvider  │  │ next-pwa     │  │ │ contacts │ │          │
│  │ InstallPrompt│  │ generated    │  │ │ projects │ │          │
│  │ OfflineInd.  │  │              │  │ │ pending_ │ │          │
│  │ SyncStatus   │  │ sw-custom.js │  │ │ uploads  │ │          │
│  │ QueueStatus  │  │ (bg sync)    │  │ │ pending_ │ │          │
│  │              │  │              │  │ │ actions  │ │          │
│  └──────┬───────┘  └──────┬───────┘  │ └──────────┘ │          │
│         │                 │          │              │          │
│         │                 │          │ ┌──────────┐ │          │
│         │                 │          │ │ Dexie DB │ │          │
│         │                 │          │ │ (photos) │ │          │
│         │                 │          │ └──────────┘ │          │
│         │                 │          └──────────────┘          │
│         │                 │                   │                │
│         ▼                 ▼                   │                │
│  ┌──────────────────────────────────────────┐│                │
│  │           lib/db/indexeddb.ts            ││                │
│  │           lib/db/offline-queue.ts        ││                │
│  │           lib/sync/queue.ts              ││                │
│  │           lib/services/photo-queue.ts    │◄────────────────┘
│  └──────────────────────────────────────────┘                  │
│                          │                                      │
│                          ▼                                      │
│  ┌──────────────────────────────────────────┐                  │
│  │              Cache Storage               │                  │
│  │  ┌────────────────────────────────────┐  │                  │
│  │  │ google-fonts-webfonts              │  │                  │
│  │  │ static-image-assets                │  │                  │
│  │  │ static-js-assets                   │  │                  │
│  │  │ next-data                          │  │                  │
│  │  │ apis (Network-first)               │  │                  │
│  │  └────────────────────────────────────┘  │                  │
│  └──────────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Network (when available)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Supabase                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Storage   │  │  Database   │  │    Auth     │              │
│  │   (photos)  │  │ (PostgreSQL)│  │             │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `next.config.ts` | 269 | PWA & caching configuration |
| `public/manifest.json` | 131 | Web app manifest |
| `public/sw-custom.js` | 272 | Custom service worker |
| `lib/db/indexeddb.ts` | 355 | IndexedDB wrapper (idb) |
| `lib/db/offline-queue.ts` | 122 | Dexie photo queue schema |
| `lib/sync/queue.ts` | 279 | Sync queue service |
| `lib/services/photo-queue.ts` | 298 | Photo queue service |
| `components/pwa/PWAProvider.tsx` | 64 | PWA initialization provider |
| `components/pwa/OfflineIndicator.tsx` | 62 | Network status indicator |
| `components/pwa/SyncStatus.tsx` | 121 | Sync queue status |
| `components/pwa/InstallPrompt.tsx` | 130 | PWA install banner |
| `components/photos/OfflineQueueStatus.tsx` | 207 | Photo queue status |
| `types/next-pwa.d.ts` | 26 | TypeScript declarations |

### Data Flow

**Photo Capture Offline:**
```
User captures photo
       │
       ▼
addPhotoToQueue()
       │
       ├─► Dexie DB (queuedPhotos)
       │   status: 'pending'
       │
       ▼
Check Background Sync API
       │
       ├─► Supported: registration.sync.register('photo-sync')
       │
       └─► Not Supported: processPhotoQueue() if online
```

**Sync on Reconnect:**
```
'online' event fired
       │
       ▼
setupNetworkListeners()
       │
       ▼
processPhotoQueue()
       │
       ▼
For each pending photo:
  ├─► Update status: 'syncing'
  ├─► Upload to Supabase Storage
  ├─► Insert metadata to photos table
  ├─► Update status: 'completed'
  └─► On error: status: 'failed', retry_count++
```

**Service Worker Background Sync:**
```
Browser triggers 'sync' event
(photo-sync tag)
       │
       ▼
syncPhotos() in sw-custom.js
       │
       ├─► Query IndexedDB for pending photos
       │
       ▼
Post message to all clients
{ type: 'SYNC_PHOTOS', count: N }
       │
       ▼
Client receives message
       │
       ▼
processPhotoQueue()
```

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `next-pwa` | ^5.6.0 | Service worker generation |
| `dexie` | ^4.2.0 | IndexedDB wrapper |
| `dexie-react-hooks` | ^4.2.0 | Live queries in React |
| `idb` | ^8.0.3 | Promise-based IndexedDB |

## Configuration

### Environment Variables

No PWA-specific environment variables required. PWA is disabled in development via `next.config.ts`:

```typescript
disable: process.env.NODE_ENV === 'development'
```

### PWA Icons

The app includes 10 icon sizes in `public/icons/`:

| Icon | Size | Purpose |
|------|------|---------|
| icon-72x72.png | 72x72 | Android legacy |
| icon-96x96.png | 96x96 | Android legacy |
| icon-128x128.png | 128x128 | Android |
| icon-144x144.png | 144x144 | Android |
| icon-152x152.png | 152x152 | iOS |
| icon-192x192.png | 192x192 | Android/Chrome |
| icon-384x384.png | 384x384 | Splash screen |
| icon-512x512.png | 512x512 | Standard |
| icon-192x192-maskable.png | 192x192 | Adaptive icon |
| icon-512x512-maskable.png | 512x512 | Adaptive icon |

## Testing

### E2E Test Coverage

The PWA functionality is tested in three test files:

| Test File | Tests | Focus |
|-----------|-------|-------|
| `e2e/pwa-advanced.spec.ts` | 10 tests | SW registration, install, caching, offline, background sync |
| `e2e/offline-workflow.spec.ts` | 14 tests | Photo queueing, auto-sync, retry logic, geolocation |
| `e2e/offline-queue-unit.spec.ts` | 5 tests | Database initialization, network detection |

**Test Utilities:** (`e2e/utils/test-helpers.ts`)
- `goOffline()` / `goOnline()` - Simulate network changes
- `waitForServiceWorker()` - Wait for SW registration
- `checkPWAInstallable()` - Verify PWA criteria
- `clearIndexedDB()` - Reset database state
- `getIndexedDBData()` - Query offline data
- `mockGeolocation()` - Mock GPS coordinates
- `getQueueStatus()` - Get queue counts

### Key Test Scenarios

1. **Service Worker Registration** - Verifies SW registers on page load
2. **PWA Installability** - Checks manifest and install criteria
3. **Static Asset Caching** - Confirms resources cached by SW
4. **Offline Page Load** - Tests cached page serving
5. **Action Queueing** - Verifies offline actions stored in IndexedDB
6. **Online Sync** - Tests automatic upload on reconnect
7. **Failed Upload Retry** - Tests exponential backoff retry logic
8. **Geolocation Capture** - Verifies GPS data stored with photos

## Security Considerations

### Data Security
- Offline data stored in browser IndexedDB
- Data encrypted by browser security context
- Tenant ID enforced in all offline records
- Photos deleted from queue after 7 days (auto-cleanup)

### Service Worker Security
- HTTPS required for SW registration
- Same-origin policy for cached resources
- No sensitive data cached (API routes use NetworkFirst)
- chrome-extension requests excluded from SW

### Sync Security
- Authentication required before sync
- Tenant validation on server side
- Failed uploads logged with error details
- Rate limiting via retry delay (1s between requests)

## Performance Considerations

### Caching Strategy Selection
- **CacheFirst**: Fonts, audio, video (rarely change)
- **StaleWhileRevalidate**: Images, JS, CSS (balance freshness/speed)
- **NetworkFirst**: API routes, JSON data (prioritize freshness)

### Storage Limits
- `getStorageQuota()` monitors browser storage
- Completed items cleaned after 24 hours
- Old completed photos purged after 7 days
- Manual "clear completed" option available

### Network Optimization
- Retry delay prevents overwhelming server
- Exponential backoff on failures
- Parallel sync disabled (sequential processing)
- Network timeout: 10 seconds for cached requests

## Future Enhancements

1. **Push Notifications** - Notify users of sync completion
2. **Selective Sync** - User-controlled sync priorities
3. **Conflict Resolution** - Handle concurrent edits
4. **Storage Management UI** - Visual quota monitoring
5. **Compression** - Client-side image compression before queue
6. **Delta Sync** - Sync only changed fields

---

## Validation Record

### Files Examined

| File Path | Lines | Verified |
|-----------|-------|----------|
| `/Users/ccai/roofing saas/roofing-saas/next.config.ts` | 269 | PWA config, caching strategies |
| `/Users/ccai/roofing saas/roofing-saas/public/manifest.json` | 131 | Full manifest structure |
| `/Users/ccai/roofing saas/roofing-saas/public/sw-custom.js` | 272 | Background sync implementation |
| `/Users/ccai/roofing saas/roofing-saas/lib/db/indexeddb.ts` | 355 | IndexedDB schema and functions |
| `/Users/ccai/roofing saas/roofing-saas/lib/db/offline-queue.ts` | 122 | Dexie schema |
| `/Users/ccai/roofing saas/roofing-saas/lib/sync/queue.ts` | 279 | Sync queue service |
| `/Users/ccai/roofing saas/roofing-saas/lib/services/photo-queue.ts` | 298 | Photo queue service |
| `/Users/ccai/roofing saas/roofing-saas/components/pwa/PWAProvider.tsx` | 64 | PWA provider |
| `/Users/ccai/roofing saas/roofing-saas/components/pwa/OfflineIndicator.tsx` | 62 | Offline UI |
| `/Users/ccai/roofing saas/roofing-saas/components/pwa/SyncStatus.tsx` | 121 | Sync status UI |
| `/Users/ccai/roofing saas/roofing-saas/components/pwa/InstallPrompt.tsx` | 130 | Install prompt UI |
| `/Users/ccai/roofing saas/roofing-saas/components/photos/OfflineQueueStatus.tsx` | 207 | Queue status UI |
| `/Users/ccai/roofing saas/roofing-saas/e2e/pwa-advanced.spec.ts` | 281 | PWA E2E tests |
| `/Users/ccai/roofing saas/roofing-saas/e2e/offline-workflow.spec.ts` | 390 | Offline E2E tests |
| `/Users/ccai/roofing saas/roofing-saas/e2e/offline-queue-unit.spec.ts` | 74 | Queue unit tests |
| `/Users/ccai/roofing saas/roofing-saas/e2e/utils/test-helpers.ts` | ~200 | Test utilities |
| `/Users/ccai/roofing saas/roofing-saas/types/next-pwa.d.ts` | 26 | TypeScript declarations |
| `/Users/ccai/roofing saas/roofing-saas/lib/claims/inspection-state.ts` | 242 | Offline-first inspection state |

### Archon RAG Queries
- Query: "PWA Progressive Web App service worker offline-first architecture" - Found: web.dev PWA documentation

### Directory Verification
```bash
ls -la "/Users/ccai/roofing saas/roofing-saas/lib/db/" # 2 files verified
ls -la "/Users/ccai/roofing saas/roofing-saas/components/pwa/" # 5 files verified
ls -la "/Users/ccai/roofing saas/roofing-saas/public/icons/" # 12 icons verified
```

### Verification Steps
1. Confirmed `next-pwa` configuration in `next.config.ts` with 12 caching strategies
2. Verified manifest.json contains all required PWA fields (icons, shortcuts, share_target)
3. Confirmed custom service worker implements background sync with IndexedDB
4. Verified IndexedDB schema in `lib/db/indexeddb.ts` with 4 stores
5. Confirmed Dexie photo queue schema with status tracking
6. Verified sync queue processes both uploads and actions
7. Confirmed PWA components exported from `components/pwa/index.ts`
8. Verified E2E test coverage for offline workflows
9. Confirmed package.json dependencies: next-pwa, dexie, idb

### Package.json Dependencies Verified
```json
"next-pwa": "^5.6.0"
"dexie": "^4.2.0"
"dexie-react-hooks": "^4.2.0"
"idb": "^8.0.3"
```

### Validated By
PRD Documentation Agent - Session 22
Date: 2025-12-11T15:31:00Z
