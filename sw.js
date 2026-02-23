/**
 * WebHarvest Pro - Service Worker
 * للعمل بدون إنترنت (PWA)
 */

const CACHE_NAME = 'webharvest-v1';
const STATIC_CACHE = 'webharvest-static-v1';
const DYNAMIC_CACHE = 'webharvest-dynamic-v1';

// Files to cache
const STATIC_FILES = [
    '/',
    '/index.html',
    '/styles/main.css',
    '/src/app.js',
    '/src/config.js',
    '/src/firebase.js',
    '/src/products.js',
    '/src/scraper.js',
    '/src/images.js',
    '/src/translate.js',
    '/src/export.js',
    '/src/utils.js',
    '/src/vision.js',
    '/src/barcode.js',
    '/src/removebg.js',
    '/src/pdf.js',
    '/src/bulk.js',
    '/src/dashboard.js',
    '/src/sync.js',
    '/src/reports.js',
    '/src/offline.js',
    '/src/activity.js',
    '/manifest.json'
];

const EXTERNAL_FILES = [
    'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];

// Install event
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    
    event.waitUntil(
        Promise.all([
            caches.open(STATIC_CACHE).then((cache) => {
                console.log('[SW] Caching static files');
                return cache.addAll(STATIC_FILES);
            }),
            caches.open(DYNAMIC_CACHE).then((cache) => {
                console.log('[SW] Caching external files');
                return cache.addAll(EXTERNAL_FILES);
            })
        ]).then(() => {
            console.log('[SW] Installation complete');
            return self.skipWaiting();
        })
    );
});

// Activate event
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => {
            console.log('[SW] Activation complete');
            return self.clients.claim();
        })
    );
});

// Fetch event
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip API calls
    if (url.pathname.includes('/api/') || 
        url.hostname.includes('firebase') ||
        url.hostname.includes('cloudinary') ||
        url.hostname.includes('googleapis')) {
        return;
    }

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                // Return cached version
                return cachedResponse;
            }

            // Fetch from network
            return fetch(request)
                .then((networkResponse) => {
                    // Cache successful responses
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(DYNAMIC_CACHE).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // Return offline page for navigation requests
                    if (request.mode === 'navigate') {
                        return caches.match('/index.html');
                    }
                    return new Response('Offline', { status: 503 });
                });
        })
    );
});

// Background sync
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);
    
    if (event.tag === 'sync-products') {
        event.waitUntil(syncProducts());
    }
});

// Push notifications
self.addEventListener('push', (event) => {
    const options = {
        body: event.data?.text() || 'New notification',
        icon: '/assets/icons/icon-192.png',
        badge: '/assets/icons/badge.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            { action: 'view', title: 'عرض' },
            { action: 'close', title: 'إغلاق' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('WebHarvest Pro', options)
    );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Helper functions
async function syncProducts() {
    // Get pending changes from IndexedDB
    // Send to server
    console.log('[SW] Syncing products...');
}

// Message handling
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});

console.log('[SW] Service Worker loaded');
