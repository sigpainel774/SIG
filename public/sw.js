// SIG Sapeaçu — Service Worker v15 (Offline-First Alpha Engine)
// Estratégia de Alta Performance, Blindagem Offline & PWA:
// 1. Alpha App Shell: Pre-caching no install e Stale-While-Revalidate resiliente para rotas /alpha/* e /visitas.
// 2. Blindagem RSC (React Server Components): Suporte a requisições Next.js _rsc quando offline.
// 3. Tiles de Mapa: Cache seguro compartilhado (Google, OSM, Esri, sig-offline-tiles-v1).
// 4. Assets Estáticos (_next/static, fontes, logos): Cache-First com revalidação silenciosa.
// 5. Fotos e Avatars (Supabase Storage): Cache-First / SWR.
// 6. Preservação Total de Mapas Baixados (sig-offline-tiles-v1 nunca é expurgado).

const CACHE_NAME = 'sig-sapeacu-v15';
const STATIC_CACHE_NAME = 'sig-static-v15';
const MAP_TILES_CACHE_NAME = 'sig-maptiles-v15';
const OFFLINE_TILES_CACHE_NAME = 'sig-offline-tiles-v1'; // Mapas baixados para uso em campo
const PHOTOS_CACHE_NAME = 'sig-photos-v15';
const PHOTOS_CACHE_V1 = 'sig-photos-v1';
const ALPHA_CACHE_NAME = 'sig-alpha-v15';

// Assets estáticos essenciais do PWA
const STATIC_ASSETS = [
  '/manifest.json?v=15',
  '/manifest-portal-pais.json?v=15',
  '/icon-192.png?v=15',
  '/icon-512.png?v=15',
  '/icon.svg?v=15',
  '/portal-pais/icon-192.png?v=15',
  '/portal-pais/icon-512.png?v=15',
  '/portal-pais/apple-touch-icon.png?v=15',
  '/portal-pais/icon.svg?v=15',
  '/offline.html',
  '/img/logo-prefeitura.png',
  '/img/brasaoSapeaçu.png',
  '/img/logo-sidebar-novo.png',
  '/img/logo-login-novo.png',
];

// Rotas prioritárias do App Shell do Alpha para uso instantâneo offline
const ALPHA_APP_SHELL_ASSETS = [
  '/alpha',
  '/alpha/visitas',
  '/visitas',
  '/alpha/rotas-escolas',
  '/alpha/login',
  '/alpha/validador-dados',
  '/alpha/compressor-imagens',
  '/alpha/conversor-imagens',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.allSettled([
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        return Promise.allSettled(STATIC_ASSETS.map((url) => cache.add(url).catch(() => {})));
      }),
      caches.open(ALPHA_CACHE_NAME).then((cache) => {
        return Promise.allSettled(ALPHA_APP_SHELL_ASSETS.map((url) => cache.add(url).catch(() => {})));
      }),
    ])
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const ALLOWED_CACHES = new Set([
    STATIC_CACHE_NAME,
    CACHE_NAME,
    MAP_TILES_CACHE_NAME,
    OFFLINE_TILES_CACHE_NAME,
    PHOTOS_CACHE_NAME,
    PHOTOS_CACHE_V1,
    ALPHA_CACHE_NAME,
  ]);

  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (!ALLOWED_CACHES.has(key)) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Listener para acionamento de skipWaiting sob demanda
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  // Ignora requisições não-GET (Server Actions, POSTs, mutations)
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. CACHE DE FOTOS DO SUPABASE STORAGE (Stale-While-Revalidate)
  const isSupabasePublicStorage =
    url.hostname.includes('supabase.co') &&
    url.pathname.includes('/storage/v1/object/public/');

  if (isSupabasePublicStorage) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(PHOTOS_CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 2. CACHE DE TILES DE MAPA (Google Maps, OpenStreetMap, Esri)
  const isMapTile =
    url.hostname.includes('mt1.google.com') ||
    url.hostname.includes('mt0.google.com') ||
    url.hostname.includes('mt2.google.com') ||
    url.hostname.includes('mt3.google.com') ||
    url.hostname.includes('tile.openstreetmap.org') ||
    url.hostname.includes('arcgisonline.com');

  if (isMapTile) {
    event.respondWith(
      (async () => {
        // Primeiro busca nos caches de mapa
        const match = await caches.match(event.request);
        if (match) return match;

        const offlineTilesCache = await caches.open(OFFLINE_TILES_CACHE_NAME).catch(() => null);
        if (offlineTilesCache) {
          const offlineMatch = await offlineTilesCache.match(event.request);
          if (offlineMatch) return offlineMatch;
        }

        try {
          const networkResponse = await fetch(event.request);
          if (
            networkResponse &&
            (networkResponse.status === 200 || networkResponse.type === 'opaque')
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(MAP_TILES_CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        } catch (err) {
          return match || new Response('', { status: 408, statusText: 'Tile Offline Indisponível' });
        }
      })()
    );
    return;
  }

  // 3. CACHE DEDICADO DO SISTEMA ALPHA (Rotas /alpha/* e /visitas)
  const isAlphaRoute = url.pathname.startsWith('/alpha') || url.pathname === '/visitas';

  if (isAlphaRoute && !url.pathname.startsWith('/api')) {
    event.respondWith(
      (async () => {
        const alphaCache = await caches.open(ALPHA_CACHE_NAME);
        const isRscRequest = url.searchParams.has('_rsc') || event.request.headers.get('rsc') === '1';

        // Se offline, serve imediatamente do cache local
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          // 1. Tenta correspondência exata
          const cachedExact = await alphaCache.match(event.request);
          if (cachedExact) return cachedExact;

          // 2. Tenta correspondência ignorando query parameters (?_rsc=...)
          const cachedClean = await alphaCache.match(url.pathname, { ignoreSearch: true });
          if (cachedClean) return cachedClean;

          // 3. Fallbacks do App Shell
          if (url.pathname.includes('visita')) {
            const visitasShell = await alphaCache.match('/alpha/visitas');
            if (visitasShell) return visitasShell;
          }

          const alphaShell = await alphaCache.match('/alpha');
          if (alphaShell) return alphaShell;
        }

        // Se online, tenta a rede e atualiza o cache
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            alphaCache.put(event.request, networkResponse.clone());
            // Se for requisição limpa sem _rsc, garante que o cache base também está atualizado
            if (!isRscRequest) {
              alphaCache.put(url.pathname, networkResponse.clone());
            }
          }
          return networkResponse;
        } catch (networkError) {
          const cachedResponse = (await alphaCache.match(event.request)) || 
                                 (await alphaCache.match(url.pathname, { ignoreSearch: true }));
          if (cachedResponse) return cachedResponse;

          if (url.pathname.includes('visita')) {
            const visitasShell = await alphaCache.match('/alpha/visitas');
            if (visitasShell) return visitasShell;
          }

          const alphaShell = await alphaCache.match('/alpha');
          if (alphaShell) return alphaShell;

          const offlinePage = await caches.match('/offline.html');
          if (offlinePage) return offlinePage;

          return new Response('Offline', { status: 503, statusText: 'Offline' });
        }
      })()
    );
    return;
  }

  // Ignora endpoints de API, chamadas de autenticação do Supabase, HMR e dev
  if (
    url.pathname.startsWith('/api') ||
    url.hostname.includes('supabase.co') ||
    url.protocol === 'chrome-extension:' ||
    url.pathname.includes('_next/webpack-hmr') ||
    (url.pathname.includes('_next/static') && url.pathname.includes('.hot-update.')) ||
    event.request.headers.has('Next-Action')
  ) {
    return;
  }

  // 4. Assets estáticos versionados do Next.js, imagens institucionais e fontes -> Cache-First
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('manifest.json')
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Revalida em background quando online
          if (typeof navigator !== 'undefined' && navigator.onLine) {
            fetch(event.request)
              .then((netRes) => {
                if (netRes && netRes.status === 200) {
                  caches.open(STATIC_CACHE_NAME).then((cache) => cache.put(event.request, netRes));
                }
              })
              .catch(() => {});
          }
          return cachedResponse;
        }

        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(STATIC_CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);
      })
    );
    return;
  }

  // 5. Navegação HTML padrão em outras rotas normais -> Network com fallback offline
  const isHtmlNavigation =
    event.request.mode === 'navigate' &&
    event.request.headers.get('accept')?.includes('text/html');

  if (isHtmlNavigation) {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const offlinePage = await caches.match('/offline.html');
        if (offlinePage) return offlinePage;

        return new Response(
          '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sem Conexão - SIG</title><style>body{background:#0f1117;color:#e8eaf6;font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center}h1{font-size:1.5rem}p{color:#8a8fa8;margin-top:.5rem}</style></head><body><div><h1>🔌 Sem Conexão com a Internet</h1><p>Não foi possível carregar a página. Verifique sua rede e tente novamente.</p><br><button onclick="location.reload()" style="background:#3b6cf4;color:#fff;border:none;border-radius:8px;padding:.6rem 1.5rem;cursor:pointer;font-size:.9rem">Tentar Novamente</button></div></body></html>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      })
    );
    return;
  }
});

// 6. Push Notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch (err) {
    payload = { title: 'SIG Sapeaçu', body: event.data.text() };
  }

  const title = payload.title || 'SIG Sapeaçu';
  const bodyText = payload.body
    ? payload.body.length > 140
      ? payload.body.slice(0, 140) + '...'
      : payload.body
    : '';

  const options = {
    body: bodyText,
    icon: payload.icon || '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.tag || 'sig-push-notification',
    data: {
      url: payload.link || '/alpha',
    },
    vibrate: [100, 50, 100],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 7. Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/alpha';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
