const CACHE_NAME = 'sp630e-led-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
];

// Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache açıldı');
        return cache.addAll(urlsToCache).catch(() => {
          // Bazı dosyalar cache'lenemezse devam et
          console.log('Bazı dosyalar cache edilemedi');
        });
      })
  );
  self.skipWaiting();
});

// Fetch
self.addEventListener('fetch', (event) => {
  // BLE ve API isteklerini cache'leme
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('bluetooth')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((response) => {
          // Sadece başarılı yanıtları cache'le
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        }).catch(() => {
          // Offline ise cache'ten dön
          return caches.match('/');
        });
      })
  );
});

// Activate - eski cache'leri temizle
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});
