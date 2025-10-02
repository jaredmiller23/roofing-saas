/**
 * Custom Service Worker for Roofing SaaS PWA
 * Handles background sync for offline photo uploads
 */

const CACHE_NAME = 'roofing-saas-v1';
const OFFLINE_URL = '/offline';

// Assets to cache on install
const STATIC_CACHE_URLS = [
  '/',
  '/offline',
  '/manifest.json',
];

/**
 * Service Worker Installation
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

/**
 * Service Worker Activation
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        return self.clients.claim();
      })
  );
});

/**
 * Background Sync Event Handler
 * Triggered when network becomes available
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event triggered:', event.tag);

  if (event.tag === 'photo-sync') {
    event.waitUntil(syncPhotos());
  }
});

/**
 * Sync photos from IndexedDB queue
 */
async function syncPhotos() {
  console.log('[SW] Starting photo sync...');

  try {
    // Open IndexedDB
    const db = await openIndexedDB();

    // Get pending photos
    const tx = db.transaction('queuedPhotos', 'readonly');
    const store = tx.objectStore('queuedPhotos');
    const index = store.index('status');
    const pendingPhotos = await getAllFromIndex(index, 'pending');

    console.log(`[SW] Found ${pendingPhotos.length} pending photos`);

    if (pendingPhotos.length === 0) {
      return;
    }

    // Notify all clients to process queue
    const clients = await self.clients.matchAll({ type: 'window' });

    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_PHOTOS',
        count: pendingPhotos.length,
        timestamp: new Date().toISOString(),
      });
    });

    console.log('[SW] Photo sync notification sent to clients');

  } catch (error) {
    console.error('[SW] Photo sync failed:', error);

    // Retry sync after delay
    setTimeout(() => {
      self.registration.sync.register('photo-sync').catch(console.error);
    }, 5000);
  }
}

/**
 * Open IndexedDB database
 */
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RoofingSaaSOfflineQueue', 1);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('queuedPhotos')) {
        const store = db.createObjectStore('queuedPhotos', {
          keyPath: 'id',
          autoIncrement: true,
        });

        store.createIndex('localId', 'localId', { unique: true });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('contactId', 'contactId', { unique: false });
        store.createIndex('tenantId', 'tenantId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

/**
 * Get all items from an index
 */
function getAllFromIndex(index, query) {
  return new Promise((resolve, reject) => {
    const request = index.getAll(query);

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Fetch Event Handler
 * Network-first strategy with offline fallback
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // API requests: Network-first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return new Response(
            JSON.stringify({ error: 'Offline - API unavailable' }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        })
    );
    return;
  }

  // Navigation requests: Network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return caches.match(OFFLINE_URL)
            .then((response) => {
              return response || new Response('Offline', { status: 503 });
            });
        })
    );
    return;
  }

  // Static assets: Cache-first
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {
            // Cache successful responses
            if (networkResponse.ok) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseClone);
                });
            }
            return networkResponse;
          });
      })
  );
});

/**
 * Message Event Handler
 * Handle commands from client
 */
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'SYNC_NOW') {
    syncPhotos().catch(console.error);
  }
});

/**
 * Periodic Background Sync (if supported)
 */
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync event:', event.tag);

  if (event.tag === 'photo-sync-periodic') {
    event.waitUntil(syncPhotos());
  }
});

console.log('[SW] Service worker script loaded');
