/* שפת הנשמה — Service Worker
   נותן התקנה כאפליקציה + טעינה מהירה/אופליין של שלד המערכת.
   אסטרטגיה: שלד מקומי = cache-first (מהיר ועובד אופליין);
   ניווט = network-first עם נפילה ל-cache; שאר = נסה רשת, שמור ב-cache. */
const CACHE = 'shfat-hanshama-v7';
self.addEventListener('message', (e) => { if (e.data === 'skip') self.skipWaiting(); });
const SHELL = [
  './',
  './index.html',
  './logo-data.js',
  './manifest.webmanifest',
  './assets/logo.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-192.png',
  './assets/icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return; // לא מתערבים בקריאות API (POST וכו')

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // ניווט (פתיחת הדף) — network-first, נפילה לשלד מה-cache (אופליין)
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((res) => { cachePut(req, res.clone()); return res; })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // שלד מקומי — cache-first (מהיר)
  if (sameOrigin) {
    e.respondWith(
      caches.match(req).then((cached) =>
        cached || fetch(req).then((res) => { cachePut(req, res.clone()); return res; }).catch(() => cached)
      )
    );
    return;
  }

  // משאבים חיצוניים (ספריות CDN, פונטים) — נסה רשת, שמור, נפילה ל-cache
  e.respondWith(
    fetch(req)
      .then((res) => { cachePut(req, res.clone()); return res; })
      .catch(() => caches.match(req))
  );
});

function cachePut(req, res) {
  try {
    if (res && (res.ok || res.type === 'opaque')) {
      caches.open(CACHE).then((c) => c.put(req, res)).catch(() => {});
    }
  } catch (e) {}
}
