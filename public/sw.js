const CACHE_NAME = 'garza-crm-v3';

// Shell mínimo para fallback offline
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png'
];

// Install: precache del shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Escuchar mensajes para forzar activación inmediata
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

// Activate: limpiar caches viejos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network-First para todo (garantiza actualizaciones en producción)
// Con fallback a Cache si no hay red (modo offline).
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Ignorar esquemas que no sean http o https
  if (!request.url.startsWith('http:') && !request.url.startsWith('https:')) {
    return;
  }

  const url = new URL(request.url);

  // Excluir llamadas al API y subidas de archivos (siempre a red, nunca cachear)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Network-First con fallback a Caché para todos los assets y HTML de navegación
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Si la respuesta es válida, clonar y guardar en caché
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Si falla la red, intentar responder desde la caché
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Si es una petición de navegación y no hay caché, retornar el index.html base
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});
