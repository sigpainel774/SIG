// SIG Sapeaçu — Service Worker v7
// Estratégia Otimizada: Cache-First / SWR para Assets Estáticos, Network-First com Timeout para Navegação.

const CACHE_NAME = 'sig-sapeacu-v7';
const STATIC_CACHE_NAME = 'sig-static-v7';

// Assets estáticos essenciais para o PWA (ícones, manifest e offline)
const STATIC_ASSETS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon.svg',
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
          if (key !== CACHE_NAME && key !== STATIC_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Listener para skipWaiting sob demanda
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignora chamadas de API, Supabase, extensões do Chrome e HMR de dev
  if (
    url.pathname.startsWith('/api') ||
    url.hostname.includes('supabase.co') ||
    url.protocol === 'chrome-extension:' ||
    url.pathname.includes('_next/webpack-hmr') ||
    (url.pathname.includes('_next/static') && url.pathname.includes('.hot-update.'))
  ) {
    return;
  }

  // 1. Assets estáticos versionados do Next.js e fontes -> Stale While Revalidate
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.jpg') ||
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

  // 2. Navegação de páginas HTML -> Network First com Timeout de 3.5 segundos + Fallback Offline
  const isHtmlNavigation =
    event.request.mode === 'navigate' &&
    event.request.headers.get('accept')?.includes('text/html') &&
    !event.request.headers.get('RSC');

  if (isHtmlNavigation) {
    event.respondWith(
      new Promise((resolve) => {
        let isTimedOut = false;

        const timer = setTimeout(() => {
          isTimedOut = true;
          caches.match('/offline.html').then((offlinePage) => {
            if (offlinePage) {
              resolve(offlinePage);
            }
          });
        }, 3500);

        fetch(event.request)
          .then((networkResponse) => {
            clearTimeout(timer);
            if (!isTimedOut) {
              resolve(networkResponse);
            }
          })
          .catch(async () => {
            clearTimeout(timer);
            const cachedPage = await caches.match(event.request);
            if (cachedPage) return resolve(cachedPage);

            const offlinePage = await caches.match('/offline.html');
            if (offlinePage) return resolve(offlinePage);

            resolve(
              new Response(
                '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sem Conexão</title><style>body{background:#0f1117;color:#e8eaf6;font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center}h1{font-size:1.5rem}p{color:#8a8fa8;margin-top:.5rem}</style></head><body><div><h1>🔌 Conexão Lenta ou Indisponível</h1><p>Verifique sua conexão e tente novamente.</p><br><button onclick="location.reload()" style="background:#3b6cf4;color:#fff;border:none;border-radius:8px;padding:.6rem 1.5rem;cursor:pointer;font-size:.9rem">Tentar novamente</button></div></body></html>',
                { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
              )
            );
          });
      })
    );
    return;
  }
});
