// Offline helper (service worker) for the installed app.
//
// Network first: when the device is online every file comes fresh from the
// server (skipping the browser's own 10-minute cache), and a copy is saved.
// The saved copy is only used when there is no connection.
//
// BUILD is replaced with the commit id by .github/workflows/pages.yml on every
// deploy, so each release is a new offline copy and old copies are deleted.
//
// Off switch: set OFFLINE to false and merge. Each device then deletes its
// saved copy and removes this helper the next time it opens the game online.
'use strict';

const OFFLINE = true;
const BUILD = '__BUILD__';
const PREFIX = 'roversa-';
const CACHE = PREFIX + BUILD;
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
// Saved on install. Everything else is saved as the game loads it.
const CORE = ['./', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/favicon-32.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  if (!OFFLINE) return;
  event.waitUntil(caches.open(CACHE).then((cache) => Promise.all(
    CORE.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => {})))));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith(PREFIX) && (!OFFLINE || n !== CACHE)).map((n) => caches.delete(n)));
    if (!OFFLINE) {
      await self.registration.unregister();
      return;
    }
    await self.clients.claim();
  })());
});

// The page sends the files it loaded before this helper was running
// (the very first visit), so the game also works offline after one visit.
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (!OFFLINE || data.type !== 'cache-urls' || !Array.isArray(data.urls)) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(data.urls.filter(wanted).map(async (url) => {
      if (await cache.match(url)) return;
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (res.ok) await cache.put(url, res);
      } catch (e) { /* offline or blocked: it will be saved next time */ }
    }));
  })());
});

function wanted(href) {
  try {
    const url = new URL(href, self.location.href);
    return url.origin === self.location.origin || FONT_HOSTS.includes(url.hostname);
  } catch (e) {
    return false;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (!OFFLINE || req.method !== 'GET' || !wanted(req.url)) return;
  event.respondWith(networkFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req, { cache: 'no-cache' });
    if (res.ok) {
      const copy = res.clone();
      cache.put(req, copy).catch(() => {});
      if (req.mode === 'navigate') cache.put('./', res.clone()).catch(() => {});
    }
    return res;
  } catch (err) {
    const saved = await cache.match(req, { ignoreSearch: req.mode === 'navigate' })
      || (req.mode === 'navigate' ? await cache.match('./') : undefined);
    if (saved) return saved;
    throw err;
  }
}
