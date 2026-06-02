const CACHE_VERSION = 1
const STATIC_CACHE = `waynest-static-v${CACHE_VERSION}`
const API_CACHE = `waynest-api-v${CACHE_VERSION}`
const FONT_CACHE = `waynest-fonts-v${CACHE_VERSION}`
const DEFAULT_TITLE = 'Waynest'
const DEFAULT_ICON = '/images/waynest-icon.svg'
const DEFAULT_HREF = '/notifications'

const normalizePushPayload = (raw) => {
  if (!raw || typeof raw !== 'object') {
    return { title: DEFAULT_TITLE, body: '', href: DEFAULT_HREF, tag: undefined, data: {} }
  }
  const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : DEFAULT_TITLE
  const body = typeof raw.body === 'string' ? raw.body : ''
  const href = typeof raw.href === 'string' && raw.href.trim() ? raw.href : DEFAULT_HREF
  const tag = typeof raw.notificationId === 'string' && raw.notificationId
    ? `notif:${raw.notificationId}`
    : typeof raw.tag === 'string' && raw.tag
      ? raw.tag
      : undefined
  return { title, body, href, tag, data: raw }
}

const cacheAsset = async (cacheName, request, response) => {
  try {
    const cache = await caches.open(cacheName)
    await cache.put(request, response.clone())
  } catch {}
}

const cacheFirst = async (request, cacheName) => {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) cacheAsset(cacheName, request, response)
    return response
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

const networkFirst = async (request, cacheName) => {
  try {
    const response = await fetch(request)
    if (response.ok) cacheAsset(cacheName, request, response)
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    return new Response(JSON.stringify({ offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      await self.skipWaiting()
      const urls = (self.__WB_MANIFEST || []).map((e) =>
        typeof e === 'string' ? e : e.url || e.src,
      ).filter(Boolean)
      if (urls.length === 0) return
      const cache = await caches.open(STATIC_CACHE)
      for (const url of urls) {
        try {
          const req = new Request(url, { credentials: 'same-origin' })
          const res = await fetch(req)
          if (res.ok) await cache.put(req, res)
        } catch {}
      }
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      const active = [STATIC_CACHE, API_CACHE, FONT_CACHE]
      await Promise.all(keys.filter((k) => !active.includes(k)).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.protocol.startsWith('chrome') || url.protocol.startsWith('moz')) return

  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, FONT_CACHE))
    return
  }

  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE))
    return
  }

  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
  }
})

self.addEventListener('push', (event) => {
  const payload = normalizePushPayload(event.data ? event.data.json() : { title: DEFAULT_TITLE })
  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const hasVisible = clientsList.some((c) => c.visibilityState === 'visible')
      if (hasVisible) {
        clientsList.forEach((c) => c.postMessage({ type: 'push:notification', payload }))
        return
      }
      await self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: DEFAULT_ICON,
        badge: DEFAULT_ICON,
        tag: payload.tag,
        data: { href: payload.href, payload: payload.data },
      })
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const href = event.notification?.data?.href || DEFAULT_HREF
  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of clientsList) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) await client.navigate(href)
          return
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(href)
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
