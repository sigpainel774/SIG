// SIG Sapeaçu — Service Worker v9
// Estratégia Otimizada: Cache-First / SWR para Assets Estáticos, Network-First com Cache Fallback para Navegações HTML e Transições RSC.

const CACHE_NAME = 'sig-sapeacu-v9';
const STATIC_CACHE_NAME = 'sig-static-v9';
const PAGES_CACHE_NAME = 'sig-pages-v9';

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
          if (key !== CACHE_NAME && key !== STATIC_CACHE_NAME && key !== PAGES_CACHE_NAME) {
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

  // Identificação de requisição RSC (Next.js App Router internal navigation / prefetch)
  const isRscRequest =
    event.request.headers.get('RSC') === '1' ||
    url.searchParams.has('_rsc') ||
    event.request.headers.get('accept')?.includes('text/x-component');

  // 2. Transições RSC (Next.js App Router) -> Network-First com Cache em PAGES_CACHE_NAME + Fallback de Dados
  if (isRscRequest) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(PAGES_CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // 1º Fallback: Tentar resposta RSC exata em cache
          const cachedRsc = await caches.match(event.request);
          if (cachedRsc) return cachedRsc;

          // 2º Fallback: Tentar buscar no cache ignorando query params dinâmicos se houver
          const pagesCache = await caches.open(PAGES_CACHE_NAME);
          const cachedKeys = await pagesCache.keys();
          const matchedKey = cachedKeys.find(req => {
            const reqUrl = new URL(req.url);
            return reqUrl.pathname === url.pathname && (req.headers.get('RSC') === '1' || reqUrl.searchParams.has('_rsc'));
          });
          if (matchedKey) {
            const matchedResponse = await pagesCache.match(matchedKey);
            if (matchedResponse) return matchedResponse;
          }

          // 3º Fallback: Retornar 503 com Content-Type text/x-component para acionar navegação limpa / hard fallback do Next.js
          return new Response('', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: {
              'Content-Type': 'text/x-component',
              'X-Nextjs-Matched-Path': url.pathname,
            },
          });
        })
    );
    return;
  }

  // 3. Navegação de páginas HTML -> Network-First SEM timeouts falsos quando online + Cache de Páginas + Fallback Offline
  const isHtmlNavigation =
    event.request.mode === 'navigate' &&
    event.request.headers.get('accept')?.includes('text/html');

  if (isHtmlNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(PAGES_CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Se o fetch falhar (verdadeiramente offline ou falha de rede)
          // 1º Tenta a versão em cache desta página específica
          const cachedPage = await caches.match(event.request);
          if (cachedPage) return cachedPage;

          // 2º Fallback para a página offline padrão do PWA
          const offlinePage = await caches.match('/offline.html');
          if (offlinePage) return offlinePage;

          // 3º Fallback HTML inline caso o arquivo offline.html por algum motivo não esteja em cache
          return new Response(
            '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sem Conexão</title><style>body{background:#0f1117;color:#e8eaf6;font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center}h1{font-size:1.5rem}p{color:#8a8fa8;margin-top:.5rem}</style></head><body><div><h1>🔌 Conexão Indisponível</h1><p>Não foi possível carregar a página. Verifique sua conexão e tente novamente.</p><br><button onclick="location.reload()" style="background:#3b6cf4;color:#fff;border:none;border-radius:8px;padding:.6rem 1.5rem;cursor:pointer;font-size:.9rem">Tentar novamente</button></div></body></html>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }
});

