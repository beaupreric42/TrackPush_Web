const CACHE = 'pushup-tracker-v145';
const SHELL = [
  '/', '/styles.css', '/app.js', '/manifest.json', '/store.js', '/local-api.js', '/sync.js',
  '/icons/inventory-icon-medium.png', '/icons/inventory-icon-small.png',
  '/icons/inventory-mythic-icon-medium.png', '/icons/icon-192.png', '/icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/photos/')) return;

  // Cache-first, stale-while-revalidate. This is the priority ordering
  // that matches how the app is actually used: reliable offline access
  // (no Tailscale route, on a plane, etc.) matters far more than shaving
  // staleness down to zero, and a pure cache-first response has no
  // network dependency at all — nothing to time out, nothing to reject.
  // Every response is still quietly re-fetched in the background and
  // written back to the cache, so a reload shortly after a real
  // deployment picks up the new version; the cache version above is
  // also bumped with every deploy so a fresh install/activate clears
  // out anything older in one step.
  e.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(e.request).then((cached) => {
        const networkFetch = fetch(e.request)
          .then((res) => {
            if (res && res.ok) cache.put(e.request, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    )
  );
});
