// SIG Sapeaçu — Service Worker v5
// Estratégia: Network First
// Durante o desenvolvimento, sempre busca na rede.
// Cache é usado APENAS como fallback quando offline.

const CACHE_NAME = 'sig-sapeacu-v5';

// Apenas assets estáticos essenciais para o ícone do PWA e manifest
const STATIC_ASSETS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache apenas os assets estáticos do PWA (ícones e manifest)
      return Promise.allSettled(
        STATIC_ASSETS.map((url) => cache.add(url).catch(() => {}))
      );
    })
  );
  // Ativa imediatamente sem esperar tabs antigas fecharem
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          // Remove caches antigos
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignora: APIs, Supabase, extensões e HMR do Next.js
  if (
    url.pathname.startsWith('/api') ||
    url.hostname.includes('supabase.co') ||
    url.protocol === 'chrome-extension:' ||
    url.pathname.includes('_next/webpack-hmr') ||
    url.pathname.includes('_next/static') && url.pathname.includes('.hot-update.')
  ) {
    return;
  }

  // ESTRATÉGIA: Network First
  // Sempre tenta a rede primeiro. Só usa cache se a rede falhar (modo offline).
  // Isso garante que durante o desenvolvimento você sempre receba o código mais recente.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Salva no cache apenas assets estáticos (ícones, svg, manifest)
        if (
          response.status === 200 &&
          (
            url.pathname.endsWith('.png') ||
            url.pathname.endsWith('.svg') ||
            url.pathname.endsWith('manifest.json')
          )
        ) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(async () => {
        // Fallback offline: busca no cache
        const cached = await caches.match(event.request);
        if (cached) return cached;

        // Para navegação: retorna página de fallback se disponível
        if (event.request.mode === 'navigate') {
          const mainPage = await caches.match('/');
          if (mainPage) return mainPage;
        }

        return new Response(
          JSON.stringify({ error: 'Rede indisponível. Verifique sua conexão.' }),
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
  );
});
