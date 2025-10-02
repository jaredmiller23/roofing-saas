# Phase 3 - 30-Hour Sprint Plan
**Mobile PWA Completion Sprint**

*Leveraging Claude Sonnet 4.5 Autonomous Operation Capability*

---

## 🎯 Sprint Objective

Complete all remaining Phase 3 (Mobile PWA) features in a single 30-hour autonomous sprint, delivering production-ready offline-first mobile experience with SMS integration.

**Status**: Ready to Execute
**Prerequisites**: ✅ All research completed (Twilio + PWA offline patterns)
**Timeline**: 30 hours continuous development
**Success Criteria**: Phase 3 fully deployable to production

---

## 📊 Sprint Overview

### What We're Building
1. **Offline Photo Queue** - IndexedDB-based queue with Background Sync
2. **PWA Configuration** - Manifest + Service Worker for installable app
3. **Twilio SMS Integration** - TCPA-compliant messaging system
4. **Mobile Optimization** - Gestures, offline mode, responsive design
5. **Production Readiness** - Testing, error handling, monitoring

### Research Foundation
✅ **70-page Twilio SMS research** - Complete TCPA compliance guide
✅ **Comprehensive PWA offline guide** - IndexedDB patterns, code examples
✅ **Tailwind CSS troubleshooting** - Photo UI best practices
✅ **Direct Supabase access** - Validated and working
✅ **Playwright automation** - Browser testing ready

---

## ⏱️ Hour-by-Hour Sprint Breakdown

### **HOURS 0-10: Offline Photo Queue Implementation**
*Core offline-first functionality*

#### Hour 0-2: IndexedDB Setup & Schema
- [ ] Install Dexie.js: `npm install dexie`
- [ ] Create `/lib/db/offline-queue.ts` with schema
- [ ] Initialize database with photo queue table
- [ ] Create TypeScript types for queue items
- [ ] **Checkpoint**: Test database initialization

**Code Foundation** (from subagent research):
```typescript
// /lib/db/offline-queue.ts
import Dexie, { Table } from 'dexie';

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
}

class OfflineQueueDB extends Dexie {
  queuedPhotos!: Table<QueuedPhoto, number>;

  constructor() {
    super('RoofingSaaSOfflineQueue');
    this.version(1).stores({
      queuedPhotos: '++id, localId, status, contactId, createdAt'
    });
  }
}

export const db = new OfflineQueueDB();
export type { QueuedPhoto };
```

#### Hour 2-4: Queue Management Logic
- [ ] Create `/lib/services/photo-queue.ts`
- [ ] Implement `addToQueue(photo)` function
- [ ] Implement `processQueue()` function
- [ ] Add retry logic with exponential backoff
- [ ] **Checkpoint**: Test queue operations

**Key Functions**:
```typescript
// /lib/services/photo-queue.ts
import { db, QueuedPhoto } from '@/lib/db/offline-queue';
import { createClient } from '@/lib/supabase/client';

export async function addPhotoToQueue(
  file: File,
  contactId: string,
  metadata: QueuedPhoto['metadata']
): Promise<string> {
  const localId = `photo_${Date.now()}_${Math.random().toString(36)}`;

  await db.queuedPhotos.add({
    localId,
    file,
    contactId,
    metadata,
    status: 'pending',
    attempts: 0,
    createdAt: new Date().toISOString()
  });

  // Trigger background sync if available
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register('photo-sync');
  } else {
    // Fallback: process immediately if online
    if (navigator.onLine) {
      processPhotoQueue();
    }
  }

  return localId;
}

export async function processPhotoQueue() {
  const pendingPhotos = await db.queuedPhotos
    .where('status')
    .equals('pending')
    .or('status')
    .equals('failed')
    .and(photo => photo.attempts < 3)
    .toArray();

  for (const photo of pendingPhotos) {
    try {
      await uploadQueuedPhoto(photo);
    } catch (error) {
      console.error(`Failed to upload ${photo.localId}:`, error);
    }
  }
}

async function uploadQueuedPhoto(photo: QueuedPhoto) {
  await db.queuedPhotos.update(photo.id!, {
    status: 'syncing',
    lastAttempt: new Date().toISOString()
  });

  try {
    const supabase = createClient();

    // Upload to Supabase Storage
    const fileName = `${photo.contactId}/${photo.localId}_${photo.file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('photos')
      .upload(fileName, photo.file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Insert into photos table
    const { data: photoData, error: dbError } = await supabase
      .from('photos')
      .insert({
        contact_id: photo.contactId,
        project_id: photo.projectId,
        file_url: uploadData.path,
        file_name: photo.file.name,
        file_size: photo.file.size,
        latitude: photo.metadata.latitude,
        longitude: photo.metadata.longitude,
        notes: photo.metadata.notes,
        captured_at: photo.metadata.capturedAt
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // Mark as completed
    await db.queuedPhotos.update(photo.id!, {
      status: 'completed'
    });

    // Clean up completed items after 24 hours
    setTimeout(() => {
      db.queuedPhotos.where('id').equals(photo.id!).delete();
    }, 24 * 60 * 60 * 1000);

  } catch (error) {
    const attempts = photo.attempts + 1;
    await db.queuedPhotos.update(photo.id!, {
      status: attempts >= 3 ? 'failed' : 'pending',
      attempts,
      lastAttempt: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}
```

#### Hour 4-6: Background Sync API Integration
- [ ] Create `/public/sw.js` service worker
- [ ] Register background sync event
- [ ] Implement sync handler
- [ ] Add periodic background sync (if supported)
- [ ] **Checkpoint**: Test background sync

**Service Worker**:
```javascript
// /public/sw.js
const CACHE_NAME = 'roofing-saas-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/offline',
        '/manifest.json'
      ]);
    })
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'photo-sync') {
    event.waitUntil(syncPhotos());
  }
});

async function syncPhotos() {
  try {
    // Open IndexedDB
    const db = await openDB();
    const tx = db.transaction('queuedPhotos', 'readonly');
    const store = tx.objectStore('queuedPhotos');
    const pendingPhotos = await store.getAll();

    // Notify main app to process queue
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_PHOTOS',
        count: pendingPhotos.length
      });
    });
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RoofingSaaSOfflineQueue', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
```

#### Hour 6-8: UI Components for Queue Status
- [ ] Create `/components/photos/OfflineQueueStatus.tsx`
- [ ] Real-time queue count indicator
- [ ] Upload progress UI
- [ ] Failed upload management
- [ ] **Checkpoint**: Test UI updates

**Queue Status Component**:
```typescript
// /components/photos/OfflineQueueStatus.tsx
'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/db/offline-queue';
import { processPhotoQueue } from '@/lib/services/photo-queue';
import { useLiveQuery } from 'dexie-react-hooks';

export default function OfflineQueueStatus() {
  const queuedPhotos = useLiveQuery(
    () => db.queuedPhotos.where('status').notEqual('completed').toArray(),
    []
  );

  const pendingCount = queuedPhotos?.filter(p => p.status === 'pending').length || 0;
  const syncingCount = queuedPhotos?.filter(p => p.status === 'syncing').length || 0;
  const failedCount = queuedPhotos?.filter(p => p.status === 'failed').length || 0;

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processPhotoQueue(); // Auto-sync when coming online
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!queuedPhotos || queuedPhotos.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="font-semibold">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {pendingCount > 0 && (
        <div className="text-sm text-gray-600">
          {pendingCount} photo{pendingCount !== 1 ? 's' : ''} queued for upload
        </div>
      )}

      {syncingCount > 0 && (
        <div className="text-sm text-blue-600">
          Uploading {syncingCount} photo{syncingCount !== 1 ? 's' : ''}...
        </div>
      )}

      {failedCount > 0 && (
        <div className="text-sm text-red-600">
          {failedCount} upload{failedCount !== 1 ? 's' : ''} failed
          <button
            onClick={() => processPhotoQueue()}
            className="ml-2 text-blue-600 underline"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
```

#### Hour 8-10: Camera Integration with Queue
- [ ] Update `/components/photos/PhotoCapture.tsx`
- [ ] Integrate offline queue into capture flow
- [ ] Add optimistic UI updates
- [ ] Test offline photo capture
- [ ] **Checkpoint**: End-to-end offline capture test

---

### **HOURS 10-20: PWA Configuration & Twilio SMS**

#### Hour 10-12: PWA Manifest Configuration
- [ ] Create `/public/manifest.json`
- [ ] Add app icons (generate with https://realfavicongenerator.net)
- [ ] Configure display mode, theme colors
- [ ] Update `layout.tsx` with manifest link
- [ ] **Checkpoint**: Test "Add to Home Screen"

**Manifest.json**:
```json
{
  "name": "Roofing SaaS - Field App",
  "short_name": "RoofingSaaS",
  "description": "Mobile CRM for roofing professionals",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

#### Hour 12-14: Service Worker Enhancement
- [ ] Install `next-pwa`: `npm install next-pwa`
- [ ] Configure `next.config.ts` for PWA
- [ ] Add offline fallback page
- [ ] Implement cache strategies
- [ ] **Checkpoint**: Test offline navigation

**Next.js PWA Config**:
```typescript
// next.config.ts
import withPWA from 'next-pwa';

const config = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
        }
      }
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60 // 5 minutes
        }
      }
    },
    {
      urlPattern: /\.(?:jpg|jpeg|png|svg|gif|webp)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        }
      }
    }
  ]
});

export default config;
```

#### Hour 14-17: Twilio SMS Integration - Core Setup
- [ ] Create Twilio account, get credentials
- [ ] Add environment variables (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)
- [ ] Install Twilio SDK: `npm install twilio`
- [ ] Create `/app/api/sms/send/route.ts`
- [ ] Create `/app/api/sms/webhook/route.ts`
- [ ] **Checkpoint**: Send test SMS

**API Route - Send SMS**:
```typescript
// /app/api/sms/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { createClient } from '@/lib/supabase/server';

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER!;

const client = twilio(accountSid, authToken);

export async function POST(request: NextRequest) {
  try {
    const { contactId, message, templateId } = await request.json();

    const supabase = createClient();

    // Get contact phone number
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('phone, first_name, opt_in_sms')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // TCPA compliance check
    if (!contact.opt_in_sms) {
      return NextResponse.json({
        error: 'Contact has not opted in to SMS communications'
      }, { status: 403 });
    }

    // Send SMS via Twilio
    const twilioMessage = await client.messages.create({
      body: message,
      from: twilioPhone,
      to: contact.phone
    });

    // Log activity
    const { error: activityError } = await supabase
      .from('activities')
      .insert({
        contact_id: contactId,
        type: 'sms',
        subject: 'SMS sent',
        notes: message,
        metadata: {
          twilio_sid: twilioMessage.sid,
          template_id: templateId
        }
      });

    if (activityError) {
      console.error('Failed to log SMS activity:', activityError);
    }

    return NextResponse.json({
      success: true,
      messageSid: twilioMessage.sid,
      status: twilioMessage.status
    });

  } catch (error) {
    console.error('SMS send error:', error);
    return NextResponse.json(
      { error: 'Failed to send SMS' },
      { status: 500 }
    );
  }
}
```

#### Hour 17-19: SMS Templates & Compliance
- [ ] Create SMS templates table migration
- [ ] Seed 8 roofing-specific templates (from research)
- [ ] Add opt-in/opt-out tracking
- [ ] Create `/components/sms/SMSTemplateSelector.tsx`
- [ ] **Checkpoint**: Test template sending

**Templates** (from Twilio research):
1. First Contact Follow-up
2. Appointment Confirmation
3. Inspection Complete
4. Estimate Ready
5. Weather Alert (Storm Damage)
6. Payment Reminder
7. Job Completion Follow-up
8. Referral Request

#### Hour 19-20: SMS UI Components
- [ ] Create `/components/sms/SMSComposer.tsx`
- [ ] Add SMS history view
- [ ] Implement character counter (160 chars)
- [ ] Add delivery status tracking
- [ ] **Checkpoint**: Full SMS workflow test

---

### **HOURS 20-28: Mobile Optimization & Testing**

#### Hour 20-22: Mobile Gestures & Touch Optimization
- [ ] Implement swipe gestures for photo gallery
- [ ] Add pull-to-refresh on contact list
- [ ] Optimize touch targets (min 44x44px)
- [ ] Add haptic feedback where available
- [ ] **Checkpoint**: Test all gestures on mobile device

#### Hour 22-24: Offline Mode UI/UX
- [ ] Create `/components/layout/OfflineIndicator.tsx`
- [ ] Add offline mode banner
- [ ] Disable online-only features when offline
- [ ] Show cached data indicators
- [ ] **Checkpoint**: Simulate offline scenarios

#### Hour 24-26: Comprehensive Testing Suite
- [ ] **Parallel**: Run Playwright tests in background
- [ ] Test offline photo capture → queue → sync
- [ ] Test PWA installation flow
- [ ] Test SMS sending with templates
- [ ] Test mobile responsiveness (320px to 768px)
- [ ] Test different network conditions (3G, 4G, offline)
- [ ] **Checkpoint**: All tests passing

**Playwright Test Examples**:
```typescript
// tests/e2e/offline-queue.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Offline Photo Queue', () => {
  test('should queue photo when offline', async ({ page, context }) => {
    await page.goto('http://localhost:3000/contacts');

    // Go offline
    await context.setOffline(true);

    // Capture photo
    await page.click('[data-testid="add-photo"]');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/test-photo.jpg');

    // Verify queued
    await expect(page.locator('[data-testid="queue-status"]')).toContainText('1 photo queued');

    // Go online
    await context.setOffline(false);

    // Wait for sync
    await page.waitForSelector('[data-testid="queue-status"]', { state: 'hidden', timeout: 10000 });

    // Verify uploaded
    await expect(page.locator('[data-testid="photo-gallery"]')).toContainText('test-photo.jpg');
  });
});
```

#### Hour 26-28: Error Handling & Edge Cases
- [ ] Add comprehensive error boundaries
- [ ] Handle storage quota exceeded
- [ ] Handle network timeout scenarios
- [ ] Add retry mechanisms with exponential backoff
- [ ] Create user-friendly error messages
- [ ] **Checkpoint**: Test failure scenarios

---

### **HOURS 28-30: Polish & Production Readiness**

#### Hour 28-29: Performance Optimization
- [ ] Optimize images (WebP conversion)
- [ ] Add lazy loading for photo gallery
- [ ] Minimize bundle size (analyze with `npm run build`)
- [ ] Add loading skeletons
- [ ] **Checkpoint**: Lighthouse score >90

#### Hour 29-30: Documentation & Deployment Prep
- [ ] Update `/docs/guides/MOBILE_PWA_USAGE.md`
- [ ] Document offline queue behavior
- [ ] Document SMS templates and compliance
- [ ] Update `PROJECT_STATUS.md`
- [ ] Create deployment checklist
- [ ] **Final Checkpoint**: Production readiness review

---

## 🎯 Success Criteria

### Functional Requirements
- [ ] Photos can be captured offline and auto-sync when online
- [ ] PWA can be installed on iOS and Android
- [ ] App works offline with cached data
- [ ] SMS can be sent with TCPA compliance
- [ ] All 8 SMS templates functional
- [ ] Mobile gestures work smoothly

### Performance Requirements
- [ ] Lighthouse PWA score: 90+
- [ ] Lighthouse Performance score: 80+
- [ ] First Contentful Paint: <2s
- [ ] Time to Interactive: <3.5s
- [ ] IndexedDB operations: <100ms

### Quality Requirements
- [ ] All Playwright tests passing
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] RLS policies validated
- [ ] Error handling comprehensive

---

## 🛠️ Leveraging Sonnet 4.5 Features

### Checkpoints Strategy
1. **Major checkpoints** at end of each 2-hour block
2. **Micro checkpoints** before risky operations
3. Use checkpoints to experiment with different implementations
4. Rewind if approach doesn't work, try alternative

### Parallel Execution
1. Run Playwright tests in background (Hour 24-26)
2. Install dependencies while researching next steps
3. Build multiple components simultaneously when independent
4. Generate icons while implementing manifest

### Background Tasks
1. `npm run build` in background during development
2. Test suite execution while coding next feature
3. Icon generation while implementing other features

### Autonomous Operation
1. No user intervention needed for 30 hours
2. Self-validate with checkpoints
3. Self-correct with rewind capability
4. Make architectural decisions based on research

---

## 📋 Pre-Sprint Checklist

### Environment Setup
- [ ] Twilio account created with phone number
- [ ] Environment variables added to `.env.local`
- [ ] Icons generated for PWA (8 sizes)
- [ ] Test photo fixtures prepared
- [ ] Mobile device ready for testing

### Dependencies to Install
```bash
npm install dexie dexie-react-hooks twilio next-pwa
npm install -D @playwright/test
```

### Research Documents Ready
- [x] Twilio SMS Integration (70+ pages)
- [x] PWA Offline Queue Patterns (comprehensive guide)
- [x] Tailwind CSS Troubleshooting
- [x] Supabase direct access validated

---

## 🚀 Execution Commands

### Start Sprint
```bash
# Terminal 1: Development server
cd roofing-saas
npm run dev

# Terminal 2: Background build validation
npm run build -- --watch

# Terminal 3: Playwright tests (when ready)
npx playwright test --ui
```

### During Sprint
- Use Playwright MCP for browser automation
- Use Supabase MCP for direct database operations
- Use checkpoints (Esc×2) before major changes
- Monitor with `PROJECT_STATUS.md` updates

---

## 📊 Progress Tracking

### Hour 0-10: Offline Queue ⏳
- [ ] IndexedDB setup
- [ ] Queue management
- [ ] Background Sync
- [ ] UI components

### Hour 10-20: PWA & SMS ⏳
- [ ] PWA manifest
- [ ] Service Worker
- [ ] Twilio integration
- [ ] SMS templates

### Hour 20-28: Testing ⏳
- [ ] Mobile optimization
- [ ] Offline scenarios
- [ ] Comprehensive testing
- [ ] Error handling

### Hour 28-30: Polish ⏳
- [ ] Performance optimization
- [ ] Documentation
- [ ] Production readiness

---

## 🎬 Post-Sprint Actions

1. **Deploy to Vercel staging**
2. **Mobile device testing** (real iOS + Android)
3. **Client demo preparation**
4. **Update Phase 3 completion status**
5. **Begin Phase 4 research** (AI Voice Assistant)

---

## 💡 Key Implementation Notes

### From Twilio Research
- TCPA compliance is non-negotiable - always check opt_in_sms
- A2P 10DLC registration required for production
- Cost: ~$18/month for 100 contacts with light usage
- Store all SMS in activities table for audit trail

### From PWA Research
- IndexedDB is the only reliable offline storage (5MB+ data)
- Background Sync API has 80% browser support (fallback needed)
- Service Worker caching strategies crucial for performance
- Always handle storage quota exceeded gracefully

### From Tailwind Troubleshooting
- Use inline styles for problematic image layouts
- Avoid aspect-ratio with absolute positioning
- Test mobile responsiveness at 320px minimum
- Keep delete buttons visible with proper z-index

---

## 🏆 Sprint Success = Phase 3 Complete

Upon sprint completion:
- **Phase 3 Status**: 100% complete
- **Production ready**: Mobile PWA fully functional
- **Next phase**: AI Voice Assistant (Phase 4)
- **Timeline**: On track for 16-18 week delivery

---

*Sprint Plan Created: October 2, 2025*
*Leveraging: Claude Sonnet 4.5 + Comprehensive Research*
*Ready for: Autonomous 30-hour execution*
