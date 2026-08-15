// SIG Sapeaçu — Service Worker v12
// Estratégia de Alta Performance & Segurança PWA:
// 1. Assets Estáticos Imutáveis (_next/static, fontes, logos): Cache-First / SWR.
// 2. Fotos 3x4 / Avatars Públicos (Supabase Storage): Stale-While-Revalidate (sig-photos-v12).
// 3. Tiles de Mapa (Google, OSM, Esri): Stale-While-Revalidate com suporte a opaque responses (sig-maptiles-v12).
// 4. Navegação HTML e Transições RSC: Network-Only (garante isolamento total entre sessões).
// 5. Fallback Offline: Redireciona para /offline.html somente quando houver falha real de rede.

const CACHE_NAME = 'sig-sapeacu-v12';
const STATIC_CACHE_NAME = 'sig-static-v12';
const MAP_TILES_CACHE_NAME = 'sig-maptiles-v12';
const PHOTOS_CACHE_NAME = 'sig-photos-v12';

// Assets estáticos essenciais do PWA (ícones, manifest e offline shell)
const STATIC_ASSETS = [
  '/manifest.json?v=12',
  '/manifest-portal-pais.json?v=1',
  '/icon-192.png?v=12',
  '/icon-512.png?v=12',
  '/icon.svg?v=12',
  '/portal-pais/icon-192.png?v=1',
  '/portal-pais/icon-512.png?v=1',
  '/portal-pais/apple-touch-icon.png?v=1',
  '/portal-pais/icon.svg?v=1',
  '/offline.html',
  '/img/logo-prefeitura.png',
  '/img/brasaoSapeaçu.png',
  '/img/logo-sidebar-novo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map((url) => cache.add(url).catch(() => {}))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          // Mantém apenas as versões ativas do cache do sistema
          if (
            key !== STATIC_CACHE_NAME &&
            key !== CACHE_NAME &&
            key !== MAP_TILES_CACHE_NAME &&
            key !== PHOTOS_CACHE_NAME
          ) {
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
  // Ignora chamadas que não utilizam o método GET (Server Actions, POSTs, etc.)
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. CACHE DE FOTOS 3x4 / AVATARS DO SUPABASE STORAGE (Stale-While-Revalidate)
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
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            // Aceita 200 OK ou resposta opaque (cross-origin sem CORS explícito)
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
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Ignora endpoints de API, Supabase genérico (Auth/DB), extensões do Chrome, dev HMR e Server Actions
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

  // 3. Assets estáticos versionados do Next.js, imagens institucionais e fontes -> Cache-First / SWR
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
        const fetchPromise = fetch(event.request)
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

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 4. Navegação HTML e payloads RSC -> Network-Only
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

// 5. LISTENER DE PUSH NATIVO (Celular / Tablet / Desktop)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch (err) {
    payload = { title: 'SIG Sapeaçu', body: event.data.text() };
  }

  const title = payload.title || 'SIG Sapeaçu';
  const bodyText = payload.body ? (payload.body.length > 140 ? payload.body.slice(0, 140) + '...' : payload.body) : '';

  const options = {
    body: bodyText,
    icon: payload.icon || '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.tag || 'sig-push-notification',
    data: {
      url: payload.link || '/home',
    },
    vibrate: [100, 50, 100],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 6. LISTENER DE CLIQUE NA NOTIFICAÇÃO NATIVA
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/home';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Procura se o SIG já está aberto em alguma aba do navegador
      for (const client of clientList) {
        if (client.url && client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Se não houver janela aberta, abre uma nova janela no link da notificação
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

