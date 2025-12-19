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

  // Filtrer les requêtes non supportées (chrome-extension, chrome:, etc.)
  const url = new URL(event.request.url)
  if (url.protocol === 'chrome-extension:' || 
      url.protocol === 'chrome:' || 
      url.protocol === 'moz-extension:' ||
      url.protocol === 'edge:' ||
      !url.protocol.startsWith('http')) {
    return // Ignorer ces requêtes
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

        // Mettre en cache seulement les requêtes HTTP/HTTPS valides
        caches.open(CACHE_NAME).then((cache) => {
          try {
            cache.put(event.request, responseToCache)
          } catch (err) {
            // Ignorer les erreurs de cache (ex: chrome-extension)
            console.warn('[SW] Erreur mise en cache (ignorée):', err.message)
          }
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
