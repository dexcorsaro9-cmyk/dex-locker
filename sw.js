// Service worker di Lokr
// Obiettivo: rendere l'app installabile come vera PWA e avviabile anche
// offline, mettendo in cache SOLO lo "scheletro" dell'app (HTML, manifest,
// icone). Le chiamate ai dati (Overpass, Supabase, InPost, Nominatim,
// tile della mappa) passano sempre dritte in rete: i locker devono restare
// aggiornati, non vanno mai serviti da una cache vecchia.

const CACHE_NAME = 'lokr-shell-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './lokr-wordmark-transparent.png',
  './lokr-wordmark-solid-navy.png',
  './avatar-1-turista.png',
  './avatar-2-esploratore.png',
  './avatar-3-sentinella.png',
  './avatar-4-veterano.png',
  './avatar-5-leggenda.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .catch(() => {})   // se un file manca non blocchiamo l'installazione
  );
  // Niente skipWaiting automatico: il nuovo service worker resta "in attesa"
  // finché l'utente non conferma dal banner "Nuova versione disponibile".
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // API esterne: sempre in rete, non toccarle

  // Scheletro dell'app: rispondi dalla cache se disponibile (avvio istantaneo,
  // funziona anche offline), aggiornandola in background per la volta dopo.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
