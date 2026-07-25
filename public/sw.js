// SIG Sapeaçu — Service Worker v10
// Estratégia de Alta Performance & Segurança PWA:
// 1. Assets Estáticos Imutáveis (_next/static, fontes, logos institucionais): Cache-First / SWR.
// 2. Navegação HTML e Transições RSC: Network-Only (garante isolamento total entre sessões de usuários).
// 3. Fallback Offline: Redireciona para /offline.html somente quando houver falha real de conexão de rede.

const CACHE_NAME = 'sig-sapeacu-v10';
const STATIC_CACHE_NAME = 'sig-static-v10';

// Assets estáticos essenciais do PWA (ícones, manifest e offline shell)
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
          // Deleta versões obsoletas de cache, incluindo caches de páginas antigas (sig-pages-*)
          if (key !== STATIC_CACHE_NAME && key !== CACHE_NAME) {
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

  // Ignora endpoints de API, Supabase, extensões do Chrome, dev HMR e Server Actions
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

  // 1. Assets estáticos versionados do Next.js, imagens institucionais e fontes -> Cache-First / SWR
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

  // 2. Navegação HTML e payloads RSC -> Network-Only (Sem armazenar dados de sessão em cache)
  const isHtmlNavigation =
    event.request.mode === 'navigate' &&
    event.request.headers.get('accept')?.includes('text/html');

  if (isHtmlNavigation) {
    event.respondWith(
      fetch(event.request).catch(async () => {
        // Se estiver completamente offline, tenta retornar a página offline graciosa do PWA
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
