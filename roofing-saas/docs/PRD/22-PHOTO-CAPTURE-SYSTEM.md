# Photo Capture System

## Overview

The Photo Capture System is a comprehensive, offline-first solution for capturing, compressing, storing, and managing property photos in the Roofing SAAS application. It enables field representatives to document property conditions, damage assessments, and project progress even when working in areas with poor network connectivity. The system automatically compresses images to reduce storage costs and upload times, queues photos for upload when offline, and syncs them to Supabase Storage when connectivity is restored.

## User Stories

### Field Representatives
- As a field rep, I want to take photos directly from my mobile device so that I can document property conditions during site visits
- As a field rep, I want photos to be automatically saved when I'm offline so that I don't lose documentation work
- As a field rep, I want to see my queued photos and their sync status so that I know what has been uploaded
- As a field rep, I want photos to sync automatically when I'm back online so that I don't have to manually upload them

### Office Staff
- As an office staff member, I want to view all photos for a contact/project so that I can assess property conditions
- As an office staff member, I want to view photos in a full-screen gallery with navigation so that I can review documentation in detail
- As an office staff member, I want to delete photos that are no longer needed so that I can keep records clean

### Business Owners
- As a business owner, I want photos to be compressed before upload so that I can reduce storage costs
- As a business owner, I want photos organized by tenant so that I can maintain data isolation
- As a business owner, I want activity tracking on photo uploads so that I can monitor team productivity

## Features

### 1. PhotoUpload Component

A versatile photo capture component supporting both camera capture and file picker modes.

**Capabilities:**
- Native camera access with back-facing camera preference for mobile
- File picker for selecting existing photos
- Real-time image preview before upload
- File validation (image type, 20MB max before compression)
- Upload mode selection: `immediate` (upload now) or `queue` (save for later)
- Geolocation capture for location-aware photo documentation

**Implementation:**
- File: `components/photos/PhotoUpload.tsx` (451 lines)
- Uses `navigator.mediaDevices.getUserMedia()` for camera access
- Canvas capture for video frame extraction
- Supports `capture="environment"` for mobile back camera

### 2. Image Compression

Client-side image compression to reduce file sizes before upload/storage.

**Configuration:**
| Setting | Value |
|---------|-------|
| Max file size | 10 MB (after compression) |
| Max dimension | 1920 pixels (width or height) |
| Quality | 0.8 (80%) |
| Supported formats | JPEG, PNG, WebP |

**Implementation:**
- File: `lib/storage/photos.ts` (296 lines)
- Uses `browser-image-compression` library (v2.0.2)
- Web Worker support for non-blocking compression
- Fallback to original file if compression fails

```typescript
// Compression options
const options = {
  maxSizeMB: 10,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/jpeg' | 'image/png' | 'image/webp',
  initialQuality: 0.8,
}
```

### 3. PhotoGallery Component

Grid-based photo display with inline delete functionality.

**Features:**
- Responsive grid layout (auto-fill, minmax 200px)
- Lazy loading with Next.js `Image` component
- Date formatting and display
- Delete button with confirmation
- Photo count display
- Refresh functionality
- Empty state handling

**Implementation:**
- File: `components/photos/PhotoGallery.tsx` (259 lines)
- Fetches from `/api/photos` endpoint
- Supports filtering by `contact_id` or `project_id`
- 50-photo default limit with pagination

### 4. PhotoViewer Component

Full-screen lightbox viewer with navigation and metadata display.

**Features:**
- Full-screen overlay display
- Swipe navigation (touch support)
- Keyboard navigation (Arrow keys, Escape)
- Photo metadata panel (size, compression ratio, date)
- In-viewer delete with navigation handling
- Loading states and progress indicators

**Implementation:**
- File: `components/photos/PhotoViewer.tsx` (318 lines)
- Touch gesture handling with minimum 50px swipe distance
- Circular navigation through photo set
- Real-time photo count (N/M display)

### 5. PhotoManager Component

Integrated wrapper combining upload, gallery, and viewer functionality.

**Features:**
- Combines PhotoUpload, PhotoGallery, and PhotoViewer
- Automatic gallery refresh after uploads
- Delete propagation across components
- Configurable upload mode and visibility

**Implementation:**
- File: `components/photos/PhotoManager.tsx` (121 lines)
- Used in Contact detail page for property photos
- Refresh trigger system for state synchronization

### 6. Offline Photo Queue (Dexie.js)

IndexedDB-based offline storage using Dexie.js for type-safe access.

**Queue Schema:**
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

**Implementation:**
- File: `lib/db/offline-queue.ts` (122 lines)
- Database name: `RoofingSaaSOfflineQueue`
- Indexes: `++id, localId, status, contactId, tenantId, createdAt`
- Auto-cleanup of completed items after 7 days

### 7. Photo Queue Service

Background sync service for processing offline photo uploads.

**Features:**
- Automatic queue processing on network restore
- Exponential backoff retry (max 3 attempts)
- Background Sync API integration (where supported)
- Queue status reporting (pending/syncing/failed counts)
- Network listener auto-sync

**Implementation:**
- File: `lib/services/photo-queue.ts` (298 lines)
- Retry delays: 1s, 2s, 4s (exponential backoff)
- 24-hour cleanup timer for completed items

**Queue Processing Flow:**
```
1. Check pending/failed photos with attempts < 3
2. Update status to 'syncing'
3. Upload to Supabase Storage
4. Insert record to photos table
5. Mark as 'completed' or increment attempts
```

### 8. OfflineQueueStatus Component

Real-time queue status display widget with sync controls.

**Features:**
- Live query with Dexie React hooks
- Network status indicator (Online/Offline)
- Queue counts (pending/syncing/failed)
- Manual "Sync Now" and "Retry Failed" buttons
- Progress indicator during sync
- Dismissible notification style

**Implementation:**
- File: `components/photos/OfflineQueueStatus.tsx` (208 lines)
- Uses `useLiveQuery` from `dexie-react-hooks`
- Lucide icons (Wifi, WifiOff, Upload, AlertCircle, RefreshCw)
- Fixed position (bottom-right corner)

## Technical Implementation

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Photo Capture UI                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │PhotoUpload  │  │PhotoGallery │  │    PhotoViewer          │  │
│  │- Camera     │  │- Grid       │  │    - Lightbox           │  │
│  │- FilePicker │  │- Delete     │  │    - Navigation         │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                 │
│         ▼                ▼                      ▼                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                      PhotoManager                          │  │
│  │                   (State Coordination)                     │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
         ┌────────────────────────────────────────┐
         │           Processing Layer              │
         │  ┌──────────────────┐  ┌────────────┐  │
         │  │ Image Compression │  │ Geolocation │  │
         │  │ (browser-image-  │  │  Capture    │  │
         │  │  compression)    │  │             │  │
         │  └────────┬─────────┘  └──────┬──────┘  │
         └───────────┼────────────────────┼────────┘
                     │                    │
                     ▼                    ▼
    ┌────────────────────────────────────────────────────┐
    │              Mode Detection (Online/Offline)        │
    └──────────────┬───────────────────────┬─────────────┘
                   │                       │
         ┌─────────▼─────────┐   ┌─────────▼─────────┐
         │   ONLINE MODE      │   │   OFFLINE MODE    │
         │                    │   │                   │
         │ /api/photos/upload │   │ Dexie IndexedDB   │
         │       │            │   │   Queue           │
         │       ▼            │   │       │           │
         │ Supabase Storage   │   │       ▼           │
         │       │            │   │ Background Sync   │
         │       ▼            │   │   (when online)   │
         │ photos Table       │   │       │           │
         │       │            │   │       ▼           │
         │       ▼            │   │ Same as online    │
         │ Gamification       │   └───────────────────┘
         │ Points Award       │
         └────────────────────┘
```

### Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `components/photos/PhotoUpload.tsx` | Camera/file upload component | 451 |
| `components/photos/PhotoGallery.tsx` | Grid display component | 259 |
| `components/photos/PhotoViewer.tsx` | Full-screen lightbox | 318 |
| `components/photos/PhotoManager.tsx` | Integration wrapper | 121 |
| `components/photos/OfflineQueueStatus.tsx` | Queue status widget | 208 |
| `components/photos/index.ts` | Module exports | 5 |
| `lib/storage/photos.ts` | Storage helpers & compression | 296 |
| `lib/services/photo-queue.ts` | Queue processing service | 298 |
| `lib/db/offline-queue.ts` | Dexie IndexedDB schema | 122 |
| `app/api/photos/route.ts` | GET/DELETE endpoints | 157 |
| `app/api/photos/upload/route.ts` | POST upload endpoint | 164 |

### Data Flow

**Online Upload Flow:**
```
1. User captures/selects photo
2. File validated (type, size)
3. Image compressed (browser-image-compression)
4. Geolocation captured (if available)
5. FormData sent to /api/photos/upload
6. File uploaded to Supabase Storage (property-photos bucket)
7. Metadata inserted to photos table
8. Gamification points awarded (PHOTO_UPLOADED: 5 pts)
9. Bonus points for 5+ photo sets (PHOTO_SET_COMPLETED: 25 pts)
10. Success response with photo ID
```

**Offline Queue Flow:**
```
1. User captures/selects photo
2. File validated and compressed
3. Geolocation captured
4. Photo added to Dexie IndexedDB queue
5. Background Sync registered (if available)
6. When online: processPhotoQueue() triggered
7. Photos uploaded with retry logic
8. Status updated: pending → syncing → completed/failed
9. Completed items cleaned up after 24 hours
```

## API Endpoints

### GET /api/photos

List photos with optional filtering.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| contact_id | string | Filter by contact UUID |
| project_id | string | Filter by project UUID |
| limit | number | Max results (default: 50) |
| offset | number | Pagination offset (default: 0) |

**Response:**
```json
{
  "success": true,
  "data": {
    "photos": [
      {
        "id": "uuid",
        "file_url": "https://...",
        "thumbnail_url": "https://...",
        "metadata": {
          "originalSize": 5242880,
          "compressedSize": 1048576,
          "compressionRatio": 80
        },
        "created_at": "2024-01-15T10:30:00Z",
        "contact_id": "uuid",
        "project_id": "uuid"
      }
    ],
    "total": 100,
    "limit": 50,
    "offset": 0
  }
}
```

### POST /api/photos/upload

Upload a photo with metadata.

**Request (multipart/form-data):**
| Field | Type | Description |
|-------|------|-------------|
| file | File | Image file (required) |
| contact_id | string | Associated contact UUID |
| project_id | string | Associated project UUID |
| metadata | JSON | Additional metadata |

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Photo uploaded successfully",
    "photo": {
      "id": "uuid",
      "file_path": "user_id/2024/01/IMG_timestamp_random.jpg",
      "file_url": "https://...",
      "metadata": {...}
    }
  }
}
```

### DELETE /api/photos

Soft delete a photo.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Photo UUID (required) |

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Photo deleted successfully"
  }
}
```

## Data Models

### photos Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Tenant reference (FK) |
| contact_id | UUID | Contact reference (FK, nullable) |
| project_id | UUID | Project reference (FK, nullable) |
| file_path | TEXT | Storage path |
| file_url | TEXT | Public URL |
| thumbnail_url | TEXT | Thumbnail URL (nullable) |
| metadata | JSONB | Compression stats, original name, etc. |
| uploaded_by | UUID | User reference (FK) |
| is_deleted | BOOLEAN | Soft delete flag (default: false) |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### Database Indexes

```sql
CREATE INDEX idx_photos_tenant_id ON photos(tenant_id);
CREATE INDEX idx_photos_contact_id ON photos(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_photos_project_id ON photos(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_photos_uploaded_by ON photos(uploaded_by);
CREATE INDEX idx_photos_created_at ON photos(created_at DESC);
CREATE INDEX idx_photos_is_deleted ON photos(is_deleted) WHERE is_deleted = FALSE;
```

### RLS Policies

| Policy | Operation | Rule |
|--------|-----------|------|
| View tenant photos | SELECT | `tenant_id IN (user's tenants) AND is_deleted = FALSE` |
| Upload photos | INSERT | `tenant_id IN (user's tenants) AND uploaded_by = auth.uid()` |
| Update own photos | UPDATE | `tenant_id IN (user's tenants)` |
| Soft delete | UPDATE | `tenant_id IN (user's tenants) AND is_deleted = TRUE` |

### Storage Bucket Policies

**Bucket:** `property-photos` (public)

| Policy | Operation | Rule |
|--------|-----------|------|
| Upload to own folder | INSERT | `auth.uid() = folder owner` |
| Public read | SELECT | All (public bucket) |
| Update own photos | UPDATE | `auth.uid() = folder owner` |
| Delete own photos | DELETE | `auth.uid() = folder owner` |

## Integration Points

### Contact Management
- PhotoManager embedded in Contact detail page (`/contacts/[id]`)
- Photos linked via `contact_id` foreign key
- Property photos section in contact view

### Gamification System
- `PHOTO_UPLOADED`: 5 points per photo
- `PHOTO_SET_COMPLETED`: 25 bonus points for every 5 photos
- Points awarded via `awardPointsSafe()` (non-blocking)

### PWA Architecture
- Service Worker registration for Background Sync
- IndexedDB persistence via Dexie.js
- Network status listeners for auto-sync
- Offline indicator integration

### Supabase Storage
- Bucket: `property-photos`
- Path format: `{user_id}/{year}/{month}/IMG_{timestamp}_{random}.{ext}`
- 1-hour cache control
- Public read access

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anonymous key |

### Compression Settings

| Setting | Value | Location |
|---------|-------|----------|
| MAX_FILE_SIZE_MB | 10 | `lib/storage/photos.ts` |
| MAX_DIMENSION | 1920 | `lib/storage/photos.ts` |
| COMPRESSION_QUALITY | 0.8 | `lib/storage/photos.ts` |
| MAX_RETRY_ATTEMPTS | 3 | `lib/services/photo-queue.ts` |
| RETRY_DELAY_BASE | 1000ms | `lib/services/photo-queue.ts` |

## Security

### Authentication
- All API endpoints require authenticated user
- Tenant ID extracted from user session
- Photos scoped to user's tenant

### Storage Security
- User-specific folder structure enforces ownership
- RLS policies prevent cross-tenant access
- Soft delete preserves audit trail

### Input Validation
- File type validation (image/* only)
- File size limits (20MB pre-compression)
- Zod schemas for API responses

## Testing

### E2E Tests

- File: `e2e/offline-workflow.spec.ts`
- Test helpers: `e2e/utils/test-helpers.ts`

**Test Coverage:**
- Service Worker registration
- Offline indicator display
- Photo queueing when offline
- Automatic upload on network restore
- Queue status UI updates

**Test Utilities:**
- `goOffline(page)` - Simulate network disconnection
- `goOnline(page)` - Restore network
- `waitForServiceWorker(page)` - Wait for SW ready
- `clearIndexedDB(page, dbName)` - Clean queue
- `getIndexedDBData(page, dbName, store)` - Read queue state
- `mockGeolocation(page, lat, lng)` - Mock location

## Performance Considerations

### Image Compression
- Web Worker for non-blocking compression
- ~80% size reduction typical
- Original quality fallback on compression failure

### Storage Optimization
- Organized folder structure for efficient listing
- Conditional indexes for filtered queries
- Soft delete to avoid orphaned storage files

### Offline Performance
- Dexie.js indexed queries for queue status
- Live query subscription for real-time updates
- Batch processing with Promise.allSettled

## Future Enhancements

1. **Thumbnail Generation** - Server-side thumbnail generation for faster gallery loading
2. **Image Editing** - Crop, rotate, and annotate photos before upload
3. **Bulk Upload** - Multi-file selection and batch upload
4. **Photo Categories** - Tag photos by type (damage, before/after, etc.)
5. **AI Analysis** - Automatic damage detection and classification
6. **Storage Cleanup** - Automatic cleanup of soft-deleted photos from storage

---

## Validation Record

### Files Examined
- `/Users/ccai/roofing saas/roofing-saas/components/photos/PhotoUpload.tsx` - 451 lines, verified camera capture, file validation, compression flow, queue integration
- `/Users/ccai/roofing saas/roofing-saas/components/photos/PhotoGallery.tsx` - 259 lines, verified grid layout, delete functionality, API integration
- `/Users/ccai/roofing saas/roofing-saas/components/photos/PhotoViewer.tsx` - 318 lines, verified lightbox, swipe navigation, metadata display
- `/Users/ccai/roofing saas/roofing-saas/components/photos/PhotoManager.tsx` - 121 lines, verified component integration, refresh triggers
- `/Users/ccai/roofing saas/roofing-saas/components/photos/OfflineQueueStatus.tsx` - 208 lines, verified live query, sync controls, network listeners
- `/Users/ccai/roofing saas/roofing-saas/components/photos/index.ts` - 5 lines, verified exports
- `/Users/ccai/roofing saas/roofing-saas/lib/storage/photos.ts` - 296 lines, verified compression config, upload/delete functions
- `/Users/ccai/roofing saas/roofing-saas/lib/services/photo-queue.ts` - 298 lines, verified queue processing, retry logic, network listeners
- `/Users/ccai/roofing saas/roofing-saas/lib/db/offline-queue.ts` - 122 lines, verified Dexie schema, IndexedDB config
- `/Users/ccai/roofing saas/roofing-saas/app/api/photos/route.ts` - 157 lines, verified GET/DELETE handlers
- `/Users/ccai/roofing saas/roofing-saas/app/api/photos/upload/route.ts` - 164 lines, verified POST handler, gamification integration
- `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/archive/phase3/20251002_create_photos_table.sql` - 98 lines, verified table schema, indexes, RLS policies
- `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/archive/phase3/20251002_storage_bucket_policies.sql` - 63 lines, verified storage policies
- `/Users/ccai/roofing saas/roofing-saas/e2e/offline-workflow.spec.ts` - 150+ lines, verified offline testing patterns
- `/Users/ccai/roofing saas/roofing-saas/package.json` - Verified dependencies: browser-image-compression@2.0.2, dexie@4.2.0, dexie-react-hooks@4.2.0
- `/Users/ccai/roofing saas/roofing-saas/lib/gamification/award-points.ts` - Verified PHOTO_UPLOADED (5 pts), PHOTO_SET_COMPLETED (25 pts)
- `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/contacts/[id]/page.tsx` - Verified PhotoManager usage in contact detail page

### Archon RAG Queries
- Query: "browser image compression library" - Found Vercel storage docs (limited relevance)

### Verification Steps
1. Confirmed all 6 photo components exist in components/photos/ directory
2. Verified compression settings (10MB, 1920px, 0.8 quality) in lib/storage/photos.ts
3. Confirmed Dexie.js schema matches QueuedPhoto interface in offline-queue.ts
4. Verified gamification point values (5 pts upload, 25 pts set) in award-points.ts
5. Confirmed RLS policies in database migration match documentation
6. Verified API endpoint paths and response formats match code
7. Confirmed E2E test patterns for offline workflow exist

### Validated By
PRD Documentation Agent - Session 24
Date: 2025-12-11T15:43:00Z
