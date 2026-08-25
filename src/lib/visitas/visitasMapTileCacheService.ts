/**
 * Gerenciador de Cache de Tiles de Mapas para Uso 100% Offline (Módulo Visitas - Alpha)
 * Utiliza a Cache API do Navegador ('sig-offline-tiles-v1') com suporte a download em lote,
 * cálculo de BBOX/zoom, estimativa de tamanho e proteção contra memory leaks e rate-limiting.
 */

export interface OfflineMapPackage {
  id: string;
  nome: string;
  descricao?: string;
  bbox: [number, number, number, number]; // [minLat, minLng, maxLat, maxLng]
  minZoom: number;
  maxZoom: number;
  totalTiles: number;
  tamanhoBytes: number;
  baixadoEm: string;
}

export interface DownloadProgress {
  total: number;
  concluidos: number;
  erros: number;
  percentual: number;
  bytesEstimados: number;
  status: 'ocioso' | 'calculando' | 'baixando' | 'concluido' | 'cancelado' | 'erro';
  mensagem?: string;
}

export const TILE_CACHE_NAME = 'sig-offline-tiles-v1';
const METADATA_STORAGE_KEY = 'sig_offline_map_packages';

// Utilitários de conversão Lat/Lng para Tile X/Y do OpenStreetMap
export function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)) };
}

export function tileToLatLng(x: number, y: number, zoom: number): { lat: number; lng: number } {
  const n = Math.pow(2, zoom);
  const lng = (x / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  const lat = (latRad * 180) / Math.PI;
  return { lat, lng };
}

export function getTileUrl(x: number, y: number, z: number, subdomains = ['a', 'b', 'c']): string {
  const s = subdomains[(x + y) % subdomains.length];
  return `https://${s}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

/**
 * Calcula a lista de todas as coordenadas de tiles necessárias para uma BBOX e range de zooms
 */
export function calcularTilesParaBounds(
  minLat: number,
  minLng: number,
  maxLat: number,
  maxLng: number,
  minZoom: number,
  maxZoom: number
): Array<{ x: number; y: number; z: number; url: string }> {
  const tiles: Array<{ x: number; y: number; z: number; url: string }> = [];

  for (let z = minZoom; z <= maxZoom; z++) {
    const p1 = latLngToTile(maxLat, minLng, z); // topo-esquerdo
    const p2 = latLngToTile(minLat, maxLng, z); // inferior-direito

    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        tiles.push({
          x,
          y,
          z,
          url: getTileUrl(x, y, z),
        });
      }
    }
  }

  return tiles;
}

export const visitasMapTileCacheService = {
  /**
   * Verifica se a Cache API está disponível no navegador
   */
  isCacheDisponivel(): boolean {
    return typeof window !== 'undefined' && 'caches' in window;
  },

  /**
   * Retorna a lista de pacotes de mapa salvos no dispositivo
   */
  async listarPacotes(): Promise<OfflineMapPackage[]> {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(METADATA_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /**
   * Salva metadados do pacote baixado
   */
  async salvarPacoteMetadata(pkg: OfflineMapPackage): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const pacotes = await this.listarPacotes();
      const filtrados = pacotes.filter((p) => p.id !== pkg.id);
      filtrados.unshift(pkg);
      localStorage.setItem(METADATA_STORAGE_KEY, JSON.stringify(filtrados));
    } catch (err) {
      console.warn('Erro ao salvar metadados do pacote de mapa:', err);
    }
  },

  /**
   * Exclui um pacote e limpa seus metadados
   */
  async excluirPacote(pacoteId: string): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const pacotes = await this.listarPacotes();
      const novos = pacotes.filter((p) => p.id !== pacoteId);
      localStorage.setItem(METADATA_STORAGE_KEY, JSON.stringify(novos));
    } catch (err) {
      console.warn('Erro ao excluir metadados do pacote:', err);
    }
  },

  /**
   * Limpa todo o cache de tiles de mapa
   */
  async limparTodoCacheTiles(): Promise<void> {
    if (!this.isCacheDisponivel()) return;
    try {
      await caches.delete(TILE_CACHE_NAME);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(METADATA_STORAGE_KEY);
      }
    } catch (err) {
      console.warn('Erro ao limpar cache de tiles:', err);
    }
  },

  /**
   * Estima o uso de armazenamento total de tiles
   */
  async obterUsoCache(): Promise<{ totalTilesNoCache: number; tamanhoEstimadoMb: number }> {
    if (!this.isCacheDisponivel()) return { totalTilesNoCache: 0, tamanhoEstimadoMb: 0 };
    try {
      const cache = await caches.open(TILE_CACHE_NAME);
      const keys = await cache.keys();
      const count = keys.length;
      // Tamanho médio por tile PNG ~ 20KB
      const mb = Number(((count * 20) / 1024).toFixed(2));
      return { totalTilesNoCache: count, tamanhoEstimadoMb: mb };
    } catch {
      return { totalTilesNoCache: 0, tamanhoEstimadoMb: 0 };
    }
  },

  /**
   * Executa o download concorrente de tiles com controle de vazão (throttling),
   * barra de progresso ao vivo e suporte a cancelamento via AbortController.
   */
  async baixarAreaTiles(
    nomePacote: string,
    minLat: number,
    minLng: number,
    maxLat: number,
    maxLng: number,
    minZoom: number,
    maxZoom: number,
    onProgress: (prog: DownloadProgress) => void,
    abortSignal?: AbortSignal
  ): Promise<OfflineMapPackage | null> {
    if (!this.isCacheDisponivel()) {
      throw new Error('Cache Storage não suportado neste navegador.');
    }

    onProgress({
      total: 0,
      concluidos: 0,
      erros: 0,
      percentual: 0,
      bytesEstimados: 0,
      status: 'calculando',
      mensagem: 'Calculando quadrículas e blocos do mapa...',
    });

    const tiles = calcularTilesParaBounds(minLat, minLng, maxLat, maxLng, minZoom, maxZoom);
    const total = tiles.length;

    if (total === 0) {
      throw new Error('Nenhuma quadrícula encontrada para o intervalo selecionado.');
    }

    // Trava de segurança contra estouro de cota e bloqueio de rede (máximo 4.000 tiles por pacote)
    if (total > 4000) {
      throw new Error(
        `Área muito extensa para o zoom selecionado (${total} blocos). Reduza o zoom máximo ou diminua o retângulo da área.`
      );
    }

    const cache = await caches.open(TILE_CACHE_NAME);
    let concluidos = 0;
    let erros = 0;
    let bytesGravados = 0;

    // Fila concorrente com limite de 4 conexões paralelas
    const CONCURRENCY_LIMIT = 4;
    let index = 0;

    const worker = async () => {
      while (index < tiles.length) {
        if (abortSignal?.aborted) {
          throw new Error('Download cancelado pelo usuário.');
        }

        const currentIndex = index++;
        const item = tiles[currentIndex];

        try {
          // Checa se já existe no cache antes de gastar rede
          const cacheMatch = await cache.match(item.url);
          if (cacheMatch) {
            concluidos++;
            bytesGravados += 20480; // ~20KB
          } else {
            const resp = await fetch(item.url, {
              mode: 'cors',
              headers: { 'User-Agent': 'SIG-Alpha-Field/1.0' },
              signal: abortSignal,
            });

            if (resp.ok) {
              const blob = await resp.clone().blob();
              bytesGravados += blob.size;
              await cache.put(item.url, resp);
              concluidos++;
            } else {
              erros++;
            }

            // Micro-delay de proteção contra rate-limit (15ms)
            await new Promise((r) => setTimeout(r, 15));
          }
        } catch (err: any) {
          if (err?.name === 'AbortError' || abortSignal?.aborted) {
            throw err;
          }
          erros++;
        }

        const percentual = Math.min(100, Math.round(((concluidos + erros) / total) * 100));
        onProgress({
          total,
          concluidos,
          erros,
          percentual,
          bytesEstimados: bytesGravados,
          status: 'baixando',
          mensagem: `Baixando quadrículas: ${concluidos + erros}/${total} (${percentual}%)`,
        });
      }
    };

    try {
      const workers = Array.from({ length: CONCURRENCY_LIMIT }, () => worker());
      await Promise.all(workers);

      const novoPacote: OfflineMapPackage = {
        id: crypto.randomUUID(),
        nome: nomePacote || 'Pacote de Mapa Local',
        bbox: [minLat, minLng, maxLat, maxLng],
        minZoom,
        maxZoom,
        totalTiles: concluidos,
        tamanhoBytes: bytesGravados,
        baixadoEm: new Date().toISOString(),
      };

      await this.salvarPacoteMetadata(novoPacote);

      onProgress({
        total,
        concluidos,
        erros,
        percentual: 100,
        bytesEstimados: bytesGravados,
        status: 'concluido',
        mensagem: `Download concluído! ${concluidos} quadrículas salvas para uso offline.`,
      });

      return novoPacote;
    } catch (err: any) {
      if (err?.name === 'AbortError' || abortSignal?.aborted) {
        onProgress({
          total,
          concluidos,
          erros,
          percentual: Math.round(((concluidos + erros) / total) * 100),
          bytesEstimados: bytesGravados,
          status: 'cancelado',
          mensagem: 'Download cancelado pelo usuário.',
        });
        return null;
      }
      onProgress({
        total,
        concluidos,
        erros,
        percentual: Math.round(((concluidos + erros) / total) * 100),
        bytesEstimados: bytesGravados,
        status: 'erro',
        mensagem: err?.message || 'Falha ao baixar blocos do mapa.',
      });
      throw err;
    }
  },
};
