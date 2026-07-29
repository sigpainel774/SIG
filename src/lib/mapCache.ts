/**
 * Utilitários de Cache e Pre-loading para o Mapa Logístico e Fotos 3x4
 */

// Memory Cache para URLs de imagens pré-carregadas
const imagePreloadCache = new Set<string>();

/**
 * Pré-carrega uma lista de URLs de fotos 3x4 na memória RAM do navegador
 * para que quando os marcadores/popups do Leaflet forem inseridos no DOM,
 * as imagens apareçam instantaneamente sem flickering ou atraso de rede.
 */
export function preloadFotos(urls: (string | undefined | null)[]) {
  if (typeof window === 'undefined') return;

  const validUrls = urls.filter((url): url is string => Boolean(url && url.trim() !== ''));

  validUrls.forEach((url) => {
    if (imagePreloadCache.has(url)) return;

    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      imagePreloadCache.add(url);
    };
    img.onerror = () => {
      // Ignora erro sem quebrar a UI
    };
    img.src = url;
  });
}

/**
 * Coordenadas Centrais de Sapeaçu - BA e bounding box aproximada
 */
export const SAPEACU_CENTER: [number, number] = [-12.7299932, -39.1858195];

/**
 * Converte latitude, longitude e zoom em coordenadas de Tile (x, y) do OpenStreetMap / Google
 */
function lng2tile(lng: number, zoom: number) {
  return Math.floor(((lng + 180) / 360) * Math.pow(2, zoom));
}

function lat2tile(lat: number, zoom: number) {
  return Math.floor(
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
      ) /
        Math.PI) /
      2) *
      Math.pow(2, zoom)
  );
}

/**
 * Pré-aquece os tiles de mapa na região central de Sapeaçu - BA (zooms 13 a 15)
 * de forma silenciosa e em segundo plano para que o Service Worker popule o cache.
 */
export function prewarmSapeacuTiles() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  const centerLat = SAPEACU_CENTER[0];
  const centerLng = SAPEACU_CENTER[1];

  // Zooms 13, 14, 15 cobrem toda a área urbana e rural principal de Sapeaçu
  const zooms = [13, 14, 15];

  zooms.forEach((zoom) => {
    const tileX = lng2tile(centerLng, zoom);
    const tileY = lat2tile(centerLat, zoom);

    // Raio de 1 tile ao redor do centro para pré-carregar
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const x = tileX + dx;
        const y = tileY + dy;

        // Pré-carrega o tile Híbrido do Google Maps (padrão do sistema)
        const googleTileUrl = `https://mt1.google.com/vt/lyrs=y&x=${x}&y=${y}&z=${zoom}`;
        fetch(googleTileUrl, { mode: 'no-cors' }).catch(() => {});
      }
    }
  });
}
