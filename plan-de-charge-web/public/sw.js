// Service Worker pour PWA
const CACHE_NAME = 'plan-de-charge-v1'
const urlsToCache = [
  '/',
  '/planning2',
  '/dashboard',
  '/affaires',
  '/ressources',
  '/absences',
  '/alertes',
  '/manifest.json'
]

// Installation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache ouvert')
        return cache.addAll(urlsToCache)
      })
      .catch((err) => {
        console.error('[SW] Erreur cache:', err)
      })
  )
  self.skipWaiting()
})

// Activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Suppression ancien cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  return self.clients.claim()
})

// Fetch - Stratégie Network First avec fallback Cache
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Vérifier si la réponse est valide
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response
        }

        // Cloner la réponse
        const responseToCache = response.clone()

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache)
        })

        return response
      })
      .catch(() => {
        // En cas d'erreur réseau, utiliser le cache
        return caches.match(event.request).then((response) => {
          if (response) {
            return response
          }
          // Si pas dans le cache, retourner une page offline
          if (event.request.destination === 'document') {
            return caches.match('/')
          }
        })
      })
  )
})

// Gestion des messages depuis l'app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
