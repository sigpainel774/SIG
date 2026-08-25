'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { TILE_CACHE_NAME } from '@/lib/visitas/visitasMapTileCacheService';

interface OfflineTileLayerProps {
  url?: string;
  attribution?: string;
  maxZoom?: number;
  minZoom?: number;
  className?: string;
}

/**
 * Camada TileLayer com suporte transparente a Offline Cache (Cache API).
 * 1. Tenta servir do cache 'sig-offline-tiles-v1' imediatamente (mesmo sem internet).
 * 2. Se online e não cacheado, busca da rede e grava no cache em segundo plano.
 * 3. Faz revogação automática de Object URLs no evento 'tileunload' para eliminar memory leaks.
 */
export function OfflineTileLayer({
  url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom = 19,
  minZoom = 2,
  className,
}: OfflineTileLayerProps) {
  const map = useMap();
  const layerRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    if (!map) return;

    // Criamos uma classe derivada de L.TileLayer customizada
    const CustomOfflineTileLayer = L.TileLayer.extend({
      createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
        const tile = document.createElement('img');

        L.DomEvent.on(tile, 'load', L.Util.bind((this as any)._tileOnLoad, this, done, tile));
        L.DomEvent.on(tile, 'error', L.Util.bind((this as any)._tileOnError, this, done, tile));

        if (this.options.crossOrigin || this.options.crossOrigin === '') {
          tile.crossOrigin = this.options.crossOrigin === true ? '' : this.options.crossOrigin;
        }

        tile.alt = '';
        tile.setAttribute('role', 'presentation');

        const tileUrl = (this as any).getTileUrl(coords);

        // Se a Cache API estiver disponível no navegador
        if (typeof window !== 'undefined' && 'caches' in window) {
          caches
            .open(TILE_CACHE_NAME)
            .then(async (cache) => {
              const matched = await cache.match(tileUrl);
              if (matched) {
                const blob = await matched.blob();
                const objectUrl = URL.createObjectURL(blob);
                // Guardamos a URL gerada no próprio elemento para revogar depois
                (tile as any)._objectUrl = objectUrl;
                tile.src = objectUrl;
                return;
              }

              // Se não estiver no cache e houver internet, carrega da rede e guarda no cache
              if (navigator.onLine) {
                tile.src = tileUrl;
                // Busca em background para popular o cache
                fetch(tileUrl, { mode: 'cors' })
                  .then((res) => {
                    if (res.ok) {
                      cache.put(tileUrl, res);
                    }
                  })
                  .catch(() => {});
              } else {
                // Totalmente offline e sem cache: renderiza placeholder limpo sem quebrar layout
                tile.style.backgroundColor = '#18181b';
                done(undefined, tile);
              }
            })
            .catch(() => {
              tile.src = tileUrl;
            });
        } else {
          tile.src = tileUrl;
        }

        return tile;
      },
    });

    const instance = new (CustomOfflineTileLayer as any)(url, {
      attribution,
      maxZoom,
      minZoom,
      className,
      crossOrigin: true,
    }) as L.TileLayer;

    // Blindagem de Memory Leak: Revoga Object URLs quando a quadrícula é descartada
    instance.on('tileunload', (e: any) => {
      const tile = e.tile as HTMLImageElement;
      if (tile && (tile as any)._objectUrl) {
        URL.revokeObjectURL((tile as any)._objectUrl);
        delete (tile as any)._objectUrl;
      }
    });

    layerRef.current = instance;
    instance.addTo(map);

    return () => {
      if (layerRef.current && map.hasLayer(layerRef.current)) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [map, url, attribution, maxZoom, minZoom, className]);

  return null;
}
