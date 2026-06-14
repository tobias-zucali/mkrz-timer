try {
  importScripts("/sw-precache-manifest.js")
} catch {}

const precacheManifest = self.__PWA_PRECACHE_MANIFEST ?? {
  urls: [],
  version: "missing-manifest",
}

const CACHE_NAME = `mkrz-timer-pwa-${precacheManifest.version}`
const PRECACHE_URLS = precacheManifest.urls

function isCachableAssetRequest(request, url) {
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return false
  }

  if (url.pathname.startsWith("/api/")) {
    return false
  }

  return ["font", "image", "script", "style"].includes(request.destination)
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event

  if (request.method !== "GET") {
    return
  }

  const url = new URL(request.url)

  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone()
            void caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, responseClone))
          }

          return response
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request)

          if (cachedResponse) {
            return cachedResponse
          }

          return caches.match("/")
        }),
    )

    return
  }

  if (!isCachableAssetRequest(request, url)) {
    return
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkResponse = fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone()
            void caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, responseClone))
          }

          return response
        })
        .catch(() => cachedResponse)

      return cachedResponse || networkResponse
    }),
  )
})
