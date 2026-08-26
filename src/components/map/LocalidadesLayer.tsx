'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useMap, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Localidade, TipoLocalidade } from '@/types/localidades';
import { useLocalidades } from '@/hooks/useLocalidades';

interface LocalidadesLayerProps {
  /**
   * Lista customizada de localidades (útil para preview em tempo real no editor).
   * Se não fornecida, carrega automaticamente do banco via useLocalidades(true).
   */
  localidadesCustom?: Localidade[];
  /**
   * Callback ao clicar em um rótulo de localidade.
   */
  onSelectLocalidade?: (loc: Localidade) => void;
  /**
   * ID da localidade que deve receber destaque visual (pulso/borda dourada).
   */
  highlightId?: string | null;
  /**
   * Se true, desativa a ocultação por colisão (útil para debug ou visão completa).
   */
  desativarAnticolisao?: boolean;
}

// Ícones descritivos e badges por tipo de localidade
export const ICONES_TIPO_LOCALIDADE: Record<TipoLocalidade, string> = {
  RURAL: '🌾',
  POVOADO: '🏘️',
  DISTRITO: '🏛️',
  ASSENTAMENTO: '🚜',
  QUILOMBO: '🛖',
  URBANA: '🏢',
  OUTRO: '📍',
};

export const ROTULOS_TIPO_LOCALIDADE: Record<TipoLocalidade, string> = {
  RURAL: 'Zona Rural',
  POVOADO: 'Povoado',
  DISTRITO: 'Distrito',
  ASSENTAMENTO: 'Assentamento',
  QUILOMBO: 'Comunidade Quilombola',
  URBANA: 'Área Urbana',
  OUTRO: 'Localidade',
};

interface BoundingBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export default function LocalidadesLayer({
  localidadesCustom,
  onSelectLocalidade,
  highlightId,
  desativarAnticolisao = false,
}: LocalidadesLayerProps) {
  const map = useMap();
  const { localidades: localidadesDb } = useLocalidades(true);
  const localidades = localidadesCustom ?? localidadesDb;

  const [visibleLocs, setVisibleLocs] = useState<Localidade[]>([]);
  const iconCacheRef = useRef<Map<string, L.DivIcon>>(new Map());
  const rAFRef = useRef<number | null>(null);

  // Limpeza de cache de ícones no unmount
  useEffect(() => {
    return () => {
      iconCacheRef.current.clear();
      if (rAFRef.current) {
        cancelAnimationFrame(rAFRef.current);
      }
    };
  }, []);

  // Algoritmo matemático de projeção de tela e detecção de colisão AABB
  const calcularVisibilidade = useCallback(() => {
    if (!map) return;

    if (rAFRef.current) {
      cancelAnimationFrame(rAFRef.current);
    }

    rAFRef.current = requestAnimationFrame(() => {
      const zoom = map.getZoom();
      const bounds = map.getBounds().pad(0.12); // Buffer de 12% para transição suave nas bordas

      // 1. Filtra localidades ativas dentro dos limites visíveis e com zoom suficiente
      const candidatas = localidades.filter((loc) => {
        if (!loc.ativo) return false;
        if (loc.id === highlightId) return true; // Localidade em destaque sempre visível
        if (zoom < loc.min_zoom) return false;
        return bounds.contains([loc.latitude, loc.longitude]);
      });

      if (desativarAnticolisao) {
        setVisibleLocs(candidatas);
        return;
      }

      // 2. Ordena por Prioridade (1 = Principal primeiro) e depois por Tamanho de Fonte (maiores primeiro)
      candidatas.sort((a, b) => {
        if (a.id === highlightId) return -1;
        if (b.id === highlightId) return 1;
        if (a.prioridade !== b.prioridade) {
          return a.prioridade - b.prioridade;
        }
        return (b.tamanho_fonte ?? 14) - (a.tamanho_fonte ?? 14);
      });

      // 3. Detecção de Colisão em Espaço de Tela (Screen-space AABB)
      const caixasOcupadas: BoundingBox[] = [];
      const aceitas: Localidade[] = [];
      const MARGEM_SEGURANCA = 8; // Pixels de folga entre textos para legibilidade

      for (const loc of candidatas) {
        // Converte Lat/Lng em Pixels CSS do container do mapa
        const ponto = map.latLngToContainerPoint([loc.latitude, loc.longitude]);

        // Estima a largura e altura do badge do texto
        const fontSize = loc.tamanho_fonte ?? 14;
        const charWidth = fontSize * 0.58;
        const larguraTexto = loc.nome.length * charWidth + 24;
        const alturaTexto = fontSize + 12;

        const box: BoundingBox = {
          left: ponto.x - larguraTexto / 2 - MARGEM_SEGURANCA,
          right: ponto.x + larguraTexto / 2 + MARGEM_SEGURANCA,
          top: ponto.y - alturaTexto / 2 - MARGEM_SEGURANCA,
          bottom: ponto.y + alturaTexto / 2 + MARGEM_SEGURANCA,
        };

        if (loc.id === highlightId) {
          caixasOcupadas.push(box);
          aceitas.push(loc);
          continue;
        }

        // Verifica colisão com todas as caixas já aprovadas
        const colide = caixasOcupadas.some((ocupada) => {
          return !(
            box.right < ocupada.left ||
            box.left > ocupada.right ||
            box.bottom < ocupada.top ||
            box.top > ocupada.bottom
          );
        });

        if (!colide) {
          caixasOcupadas.push(box);
          aceitas.push(loc);
        }
      }

      setVisibleLocs(aceitas);
    });
  }, [map, localidades, highlightId, desativarAnticolisao]);

  // Registra os listeners de eventos do Leaflet (moveend, zoomend, viewreset)
  useEffect(() => {
    if (!map) return;

    calcularVisibilidade();

    map.on('zoomend', calcularVisibilidade);
    map.on('moveend', calcularVisibilidade);
    map.on('viewreset', calcularVisibilidade);

    return () => {
      map.off('zoomend', calcularVisibilidade);
      map.off('moveend', calcularVisibilidade);
      map.off('viewreset', calcularVisibilidade);
    };
  }, [map, calcularVisibilidade]);

  // Função criadora de DivIcon estilizado e memoizado
  const obterIconeLocalidade = useCallback(
    (loc: Localidade, isHighlighted: boolean) => {
      const cacheKey = `${loc.id}_${loc.nome}_${loc.cor_texto}_${loc.cor_fundo}_${loc.tamanho_fonte}_${loc.peso_fonte}_${isHighlighted ? 'hl' : 'norm'}`;

      if (iconCacheRef.current.has(cacheKey)) {
        return iconCacheRef.current.get(cacheKey)!;
      }

      const iconeEmoji = ICONES_TIPO_LOCALIDADE[loc.tipo] || '📍';
      const fontSize = loc.tamanho_fonte || 14;
      const fontWeight = loc.peso_fonte === 'normal' ? '400' : loc.peso_fonte === 'semibold' ? '600' : '700';
      const textColor = loc.cor_texto || '#ffffff';
      const bgColor = loc.cor_fundo || 'rgba(15, 23, 42, 0.85)';

      const ringStyle = isHighlighted
        ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 animate-pulse scale-105 border-amber-400'
        : 'border-white/20 hover:border-white/50 hover:scale-105';

      const html = `
        <div class="group/loc cursor-pointer select-none transition-all duration-200" style="display: flex; flex-direction: column; align-items: center; pointer-events: auto;">
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg backdrop-blur-md shadow-lg border ${ringStyle}" style="
            background: ${bgColor};
            color: ${textColor};
            font-size: ${fontSize}px;
            font-weight: ${fontWeight};
            line-height: 1.2;
            white-space: nowrap;
            text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
          ">
            <span style="font-size: ${Math.max(11, fontSize - 2)}px;" class="shrink-0 drop-shadow">${iconeEmoji}</span>
            <span class="tracking-wide">${loc.nome.replace(/"/g, '&quot;')}</span>
          </div>
          <div style="
            width: 0;
            height: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-top: 6px solid ${isHighlighted ? '#fbbf24' : 'rgba(15, 23, 42, 0.85)'};
            margin-top: -1px;
            filter: drop-shadow(0 2px 2px rgba(0,0,0,0.4));
          "></div>
        </div>
      `;

      // Estima dimensões para centralização do ícone no ponto de ancoragem
      const charWidth = fontSize * 0.58;
      const w = Math.max(60, loc.nome.length * charWidth + 30);
      const h = fontSize + 16;

      const divIcon = L.divIcon({
        className: 'localidade-marker-icon',
        html,
        iconSize: [w, h],
        iconAnchor: [w / 2, h], // Ancorado na ponta inferior da seta
        popupAnchor: [0, -h],
      });

      iconCacheRef.current.set(cacheKey, divIcon);
      return divIcon;
    },
    []
  );

  return (
    <>
      {visibleLocs.map((loc) => {
        const isHighlighted = loc.id === highlightId;
        const icon = obterIconeLocalidade(loc, isHighlighted);

        return (
          <Marker
            key={loc.id}
            position={[loc.latitude, loc.longitude]}
            icon={icon}
            eventHandlers={{
              click: () => {
                if (onSelectLocalidade) {
                  onSelectLocalidade(loc);
                }
              },
            }}
          >
            <Tooltip direction="top" offset={[0, -(loc.tamanho_fonte + 8)]} opacity={0.95}>
              <div className="text-xs font-medium text-slate-100 bg-slate-950 px-2 py-1 rounded shadow-md border border-slate-700">
                <span className="font-bold text-amber-400 block">{loc.nome}</span>
                <span className="text-[10px] text-slate-400 block">{ROTULOS_TIPO_LOCALIDADE[loc.tipo]}</span>
                {loc.descricao && <span className="text-[10px] text-slate-300 block mt-0.5">{loc.descricao}</span>}
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </>
  );
}
