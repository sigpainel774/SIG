/**
 * Gerenciador de Download e Cache de Mapas Offline (Tiles)
 * SIG - Sapeaçu / BA
 */

export interface DownloadProgress {
  totalTiles: number;
  baixados: number;
  falhas: number;
  porcentagem: number;
  concluido: boolean;
  cancelado: boolean;
  mensagem: string;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

// Bounding box oficial de Sapeaçu - BA abrangendo zona urbana, distritos e todas as escolas rurais
export const SAPEACU_BOUNDS: BoundingBox = {
  minLat: -12.795,
  maxLat: -12.670,
  minLng: -39.260,
  maxLng: -39.110,
};

const MAP_TILES_CACHE_NAME = 'sig-maptiles-v13';

/**
 * Converte latitude/longitude e zoom para coordenadas de tile x/y (Web Mercator)
 */
export function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const latRad = (lat * Math.PI) / 180;
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y };
}

/**
 * Gera todas as URLs de tiles para a região de Sapeaçu nos níveis de zoom desejados (13 ao 16)
 */
export type MapLayerType = 'osm' | 'google_hybrid' | 'both';

/**
 * Gera todas as URLs de tiles para a região de Sapeaçu nos níveis de zoom desejados (13 ao 18)
 * e para a camada selecionada (Google Híbrido, OSM ou Ambos)
 */
export function gerarListaTilesSapeacu(
  bounds: BoundingBox = SAPEACU_BOUNDS,
  minZoom = 13,
  maxZoom = 18,
  layerType: MapLayerType = 'both'
): string[] {
  const urls: string[] = [];

  for (let z = minZoom; z <= maxZoom; z++) {
    const p1 = latLngToTile(bounds.maxLat, bounds.minLng, z);
    const p2 = latLngToTile(bounds.minLat, bounds.maxLng, z);

    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        if (layerType === 'osm' || layerType === 'both') {
          urls.push(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`);
        }
        if (layerType === 'google_hybrid' || layerType === 'both') {
          // Google Maps Híbrido (lyrs=y)
          urls.push(`https://mt1.google.com/vt/lyrs=y&x=${x}&y=${y}&z=${z}`);
        }
      }
    }
  }

  return urls;
}

/**
 * Baixa os tiles de mapa em lote com controle de concorrência e throttle para proteção de rede
 */
export async function baixarMapaOfflineSapeacu(
  onProgress: (progress: DownloadProgress) => void,
  abortSignal?: AbortSignal,
  minZoom = 13,
  maxZoom = 18,
  layerType: MapLayerType = 'both'
): Promise<DownloadProgress> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    throw new Error('Cache Storage não suportado neste navegador.');
  }

  const urls = gerarListaTilesSapeacu(SAPEACU_BOUNDS, minZoom, maxZoom, layerType);
  const totalTiles = urls.length;
  let baixados = 0;
  let falhas = 0;

  const cache = await caches.open(MAP_TILES_CACHE_NAME);

  const CONCURRENCY_LIMIT = 5;
  let currentIndex = 0;

  const emitProgress = (msg?: string) => {
    const porcentagem = totalTiles > 0 ? Math.round(((baixados + falhas) / totalTiles) * 100) : 0;
    onProgress({
      totalTiles,
      baixados,
      falhas,
      porcentagem,
      concluido: baixados + falhas >= totalTiles,
      cancelado: abortSignal?.aborted ?? false,
      mensagem: msg ?? `Baixando blocos do mapa: ${baixados}/${totalTiles} (${porcentagem}%)`,
    });
  };

  emitProgress('Iniciando download do mapa de Sapeaçu...');

  async function worker() {
    while (currentIndex < urls.length) {
      if (abortSignal?.aborted) {
        break;
      }

      const idx = currentIndex++;
      const url = urls[idx];

      try {
        // Verifica se já está em cache
        const match = await cache.match(url);
        if (match) {
          baixados++;
          emitProgress();
          continue;
        }

        const isGoogle = url.includes('google.com');

        // Delay suave para não sobrecarregar a rede
        await new Promise((r) => setTimeout(r, isGoogle ? 10 : 20));

        let res: Response | null = null;

        try {
          res = await fetch(url, {
            mode: isGoogle ? 'no-cors' : 'cors',
            signal: abortSignal,
          });
        } catch (fetchErr: any) {
          if (fetchErr.name === 'AbortError') throw fetchErr;
          // Fallback para no-cors se o modo cors falhar
          res = await fetch(url, {
            mode: 'no-cors',
            signal: abortSignal,
          });
        }

        if (res && (res.ok || res.type === 'opaque')) {
          await cache.put(url, res.clone());
          baixados++;
        } else {
          falhas++;
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          break;
        }
        falhas++;
      }

      emitProgress();
    }
  }

  const workers = Array.from({ length: CONCURRENCY_LIMIT }, () => worker());
  await Promise.all(workers);

  const finalProgress: DownloadProgress = {
    totalTiles,
    baixados,
    falhas,
    porcentagem: totalTiles > 0 ? Math.round(((baixados + falhas) / totalTiles) * 100) : 100,
    concluido: !abortSignal?.aborted,
    cancelado: abortSignal?.aborted ?? false,
    mensagem: abortSignal?.aborted
      ? 'Download do mapa cancelado.'
      : `Mapa offline de Sapeaçu pronto! (${baixados} blocos salvos)`,
  };

  onProgress(finalProgress);
  return finalProgress;
}

/**
 * Calcula a quantidade de tiles já armazenados em cache
 */
export async function verificarStatusMapaOffline(): Promise<{ totalEmCache: number; tamanhoEstimadoMb: number }> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return { totalEmCache: 0, tamanhoEstimadoMb: 0 };
  }

  try {
    const cache = await caches.open(MAP_TILES_CACHE_NAME);
    const keys = await cache.keys();
    // Cada tile PNG tem em média ~15-25 KB
    const tamanhoEstimadoMb = Number(((keys.length * 20) / 1024).toFixed(1));
    return {
      totalEmCache: keys.length,
      tamanhoEstimadoMb,
    };
  } catch {
    return { totalEmCache: 0, tamanhoEstimadoMb: 0 };
  }
}
