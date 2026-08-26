'use client';

import React, { useState, useMemo, useEffect, useRef, useDeferredValue } from 'react';
import { createPortal } from 'react-dom';
import { getAvatarUrl } from '@/lib/photoHelper';
import { MapContainer, TileLayer, LayersControl, Marker, Popup, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { Search, MapPin, Filter, Navigation, ZoomIn, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { prewarmSapeacuTiles, preloadFotos, formatPhotoUrlWithTimestamp } from '@/lib/mapCache';
import LocalidadesLayer from './LocalidadesLayer';

// Criador estático de ícone de agrupamento para Servidores/Funcionários (ES-3)
const criarIconeCluster = (cluster: any) => {
  const count = cluster.getChildCount();
  const sizeClass = count > 50 ? 'marker-cluster-custom-large' : '';
  return L.divIcon({
    html: `<div><span>${count}</span></div>`,
    className: `marker-cluster-custom ${sizeClass}`,
    iconSize: L.point(42, 42, true),
  });
};

export interface FuncionarioMapeado {
  id: string;
  nome: string;
  cargo: string;
  escola: string;
  foto_url?: string;
  latitude: number;
  longitude: number;
  modalidade?: string;
  tipo_vinculo?: string | null;
  cidade?: string;
  zona?: string;
}

interface MapaGlobalProps {
  funcionarios: FuncionarioMapeado[];
  isEmaee?: boolean;
}

export default function MapaGlobal({ funcionarios, isEmaee }: MapaGlobalProps) {
  const isAdminGlobalOrRoot = useAuthStore((state) => state.isAdminGlobalOrRoot);
  const isLevel1OrSuperadmin = isAdminGlobalOrRoot();

  const [busca, setBusca] = useState('');
  const buscaDebounced = useDeferredValue(busca);
  const [filtroModalidade, setFiltroModalidade] = useState<'todos' | 'regular' | 'eja'>('todos');
  const [filtroVinculo, setFiltroVinculo] = useState<'todos' | 'contratados' | 'nomeados' | 'efetivos'>('contratados');
  const [filtroCidade, setFiltroCidade] = useState<'todos' | 'sapeacu' | 'outras'>('todos');
  const [filtroZona, setFiltroZona] = useState<'todos' | 'Urbana' | 'Rural'>('todos');
  const [fotoModal, setFotoModal] = useState<FuncionarioMapeado | null>(null);
  const mapRef = useRef<L.Map>(null);

  // Pre-warming dos tiles de Sapeaçu - BA e preloading das fotos 3x4 na montagem
  useEffect(() => {
    prewarmSapeacuTiles();
  }, []);


  // 1. Filtra funcionários baseado no input de pesquisa, modalidade e vínculo
  const funcionariosFiltrados = useMemo(() => {
    const termo = buscaDebounced.toLowerCase().trim();
    return funcionarios.filter((f) => {
      if (isEmaee) {
        if (filtroZona !== 'todos') {
          const fZona = (f.zona || '').toLowerCase();
          const filterZ = filtroZona.toLowerCase();
          if (!fZona.includes(filterZ)) return false;
        }
        if (filtroCidade === 'sapeacu') {
          const cid = (f.cidade || '').toLowerCase().trim();
          if (!cid.includes('sapeaçu') && !cid.includes('sapeacu')) return false;
        } else if (filtroCidade === 'outras') {
          const cid = (f.cidade || '').toLowerCase().trim();
          if (cid.includes('sapeaçu') || cid.includes('sapeacu')) return false;
        }
      } else {
        // Filtro de modalidade
        const isEJA = (f.modalidade ?? '').toString().toUpperCase().includes('EJA');
        if (filtroModalidade === 'eja' && !isEJA) return false;
        if (filtroModalidade === 'regular' && isEJA) return false;
      }

      // Filtro de tipo de vínculo (Visível e ativo apenas para Nível 1 & Superadmin)
      if (isLevel1OrSuperadmin && filtroVinculo !== 'todos') {
        const vinc = (f.tipo_vinculo ?? '').toLowerCase().trim();
        if (filtroVinculo === 'contratados') {
          const isContratado = vinc.includes('contratad') || vinc.includes('substitut') || vinc.includes('prestad') || vinc.includes('reservist');
          if (!isContratado) return false;
        }
        if (filtroVinculo === 'nomeados' && !vinc.includes('nomead')) return false;
        if (filtroVinculo === 'efetivos') {
          const isEfetivo = vinc.includes('efetiv') || vinc.includes('concursad');
          if (!isEfetivo) return false;
        }
      }

      // Filtro de texto
      if (!termo) return true;
      return (
        f.nome.toLowerCase().includes(termo) ||
        f.cargo.toLowerCase().includes(termo) ||
        f.escola.toLowerCase().includes(termo) ||
        (f.modalidade && f.modalidade.toLowerCase().includes(termo))
      );
    });
  }, [buscaDebounced, filtroModalidade, filtroVinculo, filtroCidade, filtroZona, funcionarios, isLevel1OrSuperadmin, isEmaee]);

  // 1.5 Filtro de coordenadas válidas para o mapa (evitar lat/lng 0 ou nulas - ES-4)
  const funcionariosValidos = useMemo(() => {
    return funcionariosFiltrados.filter(
      (f) =>
        f.latitude != null &&
        f.longitude != null &&
        !isNaN(Number(f.latitude)) &&
        !isNaN(Number(f.longitude)) &&
        Number(f.latitude) !== 0 &&
        Number(f.longitude) !== 0
    );
  }, [funcionariosFiltrados]);

  // Pré-carrega fotos 3x4 dos funcionários visíveis
  useEffect(() => {
    if (funcionariosValidos.length > 0) {
      const urls = funcionariosValidos.map((f) => getAvatarUrl(f)).filter(Boolean);
      preloadFotos(urls);
    }
  }, [funcionariosValidos]);

  // 2. Coordenadas padrão de Sapeaçu - BA (-12.7299932, -39.1858195)
  const SAPEACU_CENTER: [number, number] = useMemo(() => [-12.7299932, -39.1858195], []);

  // Lógica para centralizar o mapa em Sapeaçu por padrão ou quando a busca for limpa
  useEffect(() => {
    let active = true;
    if (mapRef.current) {
      const timer = setTimeout(() => {
        if (active && mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 100);

      if (buscaDebounced.trim() !== '' && funcionariosFiltrados.length > 0) {
        const primeiro = funcionariosFiltrados[0];
        mapRef.current.setView([primeiro.latitude, primeiro.longitude], 15);
      } else {
        mapRef.current.setView(SAPEACU_CENTER, 14);
      }

      return () => {
        active = false;
        clearTimeout(timer);
      };
    }
  }, [buscaDebounced, funcionariosFiltrados, SAPEACU_CENTER]);

  const recentralizarSapeacu = () => {
    if (mapRef.current) {
      mapRef.current.invalidateSize();
      mapRef.current.setView(SAPEACU_CENTER, 14);
    }
  };

  // 3. Helper para gerar iniciais do nome
  const obterIniciais = (nome: string) => {
    return nome
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const iconCacheRef = useRef<Map<string, L.DivIcon>>(new Map());

  // 4. Criação do Pino DivIcon Customizado usando Leaflet nativo (com memoization de cache)
  const criarIconeCustomizado = (id: string, nome: string, fotoUrl?: string, modalidade?: string, zona?: string) => {
    const cacheKey = `${id}_${modalidade || 'Regular'}_${fotoUrl || 'nofoto'}_${zona || 'nozona'}`;
    if (iconCacheRef.current.has(cacheKey)) {
      return iconCacheRef.current.get(cacheKey)!;
    }

    const iniciais = obterIniciais(nome);
    const safeFotoUrl = formatPhotoUrlWithTimestamp(fotoUrl);
    const imgHtml =
      safeFotoUrl && safeFotoUrl.trim() !== ''
        ? `<img src="${safeFotoUrl}" alt="${nome.replace(/"/g, '&quot;')}" decoding="async" loading="eager" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; position: absolute; inset: 0;" onerror="this.style.display='none'" />`
        : '';
    const isEJA = modalidade === 'EJA';
    const isRural = isEmaee && (zona === 'Rural' || (zona || '').toLowerCase().includes('rural'));
    const bgGradient = isEmaee
      ? (isRural ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #38bdf8, #0284c7)')
      : (isEJA 
          ? 'linear-gradient(135deg, #a855f7, #7e22ce)' 
          : 'linear-gradient(135deg, #38bdf8, #0284c7)');

    const icon = L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div style="
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: ${bgGradient};
          color: #ffffff;
          font-weight: 700;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid #1e293b;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
          overflow: hidden;
          position: relative;
        ">
          ${imgHtml}
          <span>${iniciais}</span>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -20],
    });

    iconCacheRef.current.set(cacheKey, icon);
    return icon;
  };

  // 5. Limpeza de Memória (ES-Leaflet-MemoryLeak)
  useEffect(() => {
    return () => {
      iconCacheRef.current.clear();
    };
  }, []);

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Campo de Filtro Dinâmico, Seletor EJA/Regular e Botão de Recentralizar */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-[#141a27] border border-[#232d42] rounded-xl px-4 py-3 shadow-sm">
        <div className="flex flex-1 items-center gap-2 min-w-[200px]">
          <Search className="w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nome, cargo ou escola..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="bg-transparent border-none text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none w-full"
          />
        </div>
        
        {/* Seletor de Filtro de Modalidade (Todos, Regular, EJA) ou Cidade/Zona (se EMAEE) */}
        {isEmaee ? (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro de Cidade */}
            <div className="flex items-center gap-1 bg-[#1e283b] p-1 rounded-lg border border-[#2d3a54]">
              <span className="text-[11px] font-medium text-slate-400 px-2 flex items-center gap-1 hidden sm:flex">
                <Filter className="w-3 h-3" /> Cidade:
              </span>
              <button
                type="button"
                onClick={() => setFiltroCidade('todos')}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                  filtroCidade === 'todos'
                    ? "bg-sky-500 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setFiltroCidade('sapeacu')}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                  filtroCidade === 'sapeacu'
                    ? "bg-sky-500 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                Sapeaçu
              </button>
              <button
                type="button"
                onClick={() => setFiltroCidade('outras')}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                  filtroCidade === 'outras'
                    ? "bg-sky-500 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                Outras Cidades
              </button>
            </div>

            {/* Filtro de Zona */}
            <div className="flex items-center gap-1 bg-[#1e283b] p-1 rounded-lg border border-[#2d3a54]">
              <span className="text-[11px] font-medium text-slate-400 px-2 flex items-center gap-1 hidden sm:flex">
                <Filter className="w-3 h-3" /> Zona:
              </span>
              <button
                type="button"
                onClick={() => setFiltroZona('todos')}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                  filtroZona === 'todos'
                    ? "bg-sky-500 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setFiltroZona('Urbana')}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                  filtroZona === 'Urbana'
                    ? "bg-sky-500 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                Urbana
              </button>
              <button
                type="button"
                onClick={() => setFiltroZona('Rural')}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                  filtroZona === 'Rural'
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                Rural
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1 bg-[#1e283b] p-1 rounded-lg border border-[#2d3a54]">
            <span className="text-[11px] font-medium text-slate-400 px-2 flex items-center gap-1 hidden sm:flex">
              <Filter className="w-3 h-3" /> Ensino:
            </span>
            <button
              type="button"
              onClick={() => setFiltroModalidade('todos')}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                filtroModalidade === 'todos'
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setFiltroModalidade('regular')}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                filtroModalidade === 'regular'
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              Regular
            </button>
            <button
              type="button"
              onClick={() => setFiltroModalidade('eja')}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                filtroModalidade === 'eja'
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              EJA
            </button>
          </div>
        )}

        {/* Seletor de Tipo de Vínculo (Exclusivo Nível 1 & Superadmin) */}
        {isLevel1OrSuperadmin && (
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 p-1">
            <span className="hidden items-center gap-1 px-2 text-[11px] font-medium text-muted-foreground sm:flex">
              <Filter className="w-3 h-3" /> Vínculo:
            </span>
            <select
              value={filtroVinculo}
              onChange={(e) => setFiltroVinculo(e.target.value as 'todos' | 'contratados' | 'nomeados' | 'efetivos')}
              className="cursor-pointer rounded-md border border-border bg-input px-2.5 py-1 text-xs font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="todos" className="bg-popover text-popover-foreground">Todos</option>
              <option value="contratados" className="bg-popover text-popover-foreground">Contratados</option>
              <option value="nomeados" className="bg-popover text-popover-foreground">Nomeados</option>
              <option value="efetivos" className="bg-popover text-popover-foreground">Efetivos</option>
            </select>
          </div>
        )}

        <button
          type="button"
          onClick={recentralizarSapeacu}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded-lg hover:bg-sky-500/20 transition-colors cursor-pointer"
          title="Recentralizar Mapa em Sapeaçu"
        >
          <MapPin className="w-3.5 h-3.5" />
          Sapeaçu - BA
        </button>
      </div>

      {/* Container do Mapa Leaflet */}
      <div className="w-full h-[520px] rounded-2xl overflow-hidden border border-[#232d42] shadow-xl relative z-0">
        <MapContainer
          ref={mapRef}
          center={SAPEACU_CENTER}
          zoom={14}
          scrollWheelZoom={true}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Seletor de Camadas (Satélite / Rota) */}
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Google Satélite (Híbrido)">
              <TileLayer
                attribution="&copy; Google Maps"
                url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                maxZoom={20}
                keepBuffer={6}
                updateWhenIdle={true}
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Mapa de Ruas (OpenStreetMap)">
              <TileLayer
                attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                keepBuffer={6}
                updateWhenIdle={true}
              />
            </LayersControl.BaseLayer>
          </LayersControl>
          <LocalidadesLayer />
          <MarkerClusterGroup
            iconCreateFunction={criarIconeCluster}
            chunkedLoading
            maxClusterRadius={45}
            spiderfyOnMaxZoom={true}
            showCoverageOnHover={false}
          >
            {funcionariosValidos.map((func) => {
              const icone = criarIconeCustomizado(func.id, func.nome, getAvatarUrl(func), func.modalidade, func.zona);
              const iniciais = obterIniciais(func.nome);
              
              return (
                <Marker
                  key={func.id}
                  position={[func.latitude, func.longitude]}
                  icon={icone}
                  eventHandlers={{
                    click: (e) => {
                      if (e.target && e.target._map) {
                        e.target._map.flyTo(e.target.getLatLng(), Math.max(e.target._map.getZoom(), 15), {
                          animate: true,
                          duration: 0.35,
                        });
                      }
                    },
                  }}
                >
                  {/* Popup Premium com autoPan desativado para evitar loop de animação do Leaflet */}
                  <Popup 
                    maxWidth={270} 
                    className="custom-popup"
                    autoPan={false}
                  >
                    <div className="font-sans text-slate-100 bg-[#182030] rounded-xl overflow-hidden min-w-[230px] shadow-xl border border-[#2d3a54]">
                      <div className="flex gap-3 items-center p-3 pr-6">
                        <div
                          onClick={() => setFotoModal(func)}
                          className="relative w-[50px] h-[50px] shrink-0 cursor-pointer group/avatar rounded-full overflow-hidden"
                          title="Clique para ampliar a foto"
                        >
                          {getAvatarUrl(func) ? (
                            <img
                              src={formatPhotoUrlWithTimestamp(getAvatarUrl(func))}
                              alt={func.nome}
                              className={cn(
                                "w-full h-full rounded-full object-cover border-2 absolute inset-0 z-10 transition-transform duration-200 group-hover/avatar:scale-110",
                                isEmaee
                                  ? ((func.zona || '').toLowerCase().includes('rural') ? "border-amber-500" : "border-sky-500")
                                  : (func.modalidade === 'EJA' ? "border-purple-500" : "border-sky-500")
                              )}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : null}
                          {/* Fallback que fica atrás da imagem ou aparece se ela falhar */}
                          <div className={cn(
                            "w-full h-full rounded-full text-white font-bold text-lg flex items-center justify-center border-2 border-slate-700 absolute inset-0 z-0 transition-transform duration-200 group-hover/avatar:scale-110",
                            isEmaee
                              ? ((func.zona || '').toLowerCase().includes('rural')
                                  ? "bg-gradient-to-br from-amber-600 to-amber-400"
                                  : "bg-gradient-to-br from-sky-600 to-sky-400")
                              : (func.modalidade === 'EJA' 
                                  ? "bg-gradient-to-br from-purple-600 to-purple-400"
                                  : "bg-gradient-to-br from-sky-600 to-sky-400")
                          )}>
                            {iniciais}
                          </div>
                          {/* Overlay visual ao passar o mouse para indicar expansão */}
                          <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity z-20 flex items-center justify-center">
                            <ZoomIn className="w-4 h-4 text-white drop-shadow" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <strong className="text-sm font-bold text-white leading-tight truncate max-w-[160px]" title={func.nome}>
                              {func.nome}
                            </strong>
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0",
                              isEmaee
                                ? ((func.zona || '').toLowerCase().includes('rural')
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    : "bg-sky-500/20 text-sky-300 border border-sky-500/30")
                                : (func.modalidade === 'EJA'
                                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                    : "bg-sky-500/20 text-sky-300 border border-sky-500/30")
                            )}>
                              {isEmaee ? (func.zona || 'Urbana') : (func.modalidade ?? 'Regular')}
                            </span>
                          </div>
                          <span className="text-xs text-sky-400 font-medium block mt-0.5 truncate">
                            {func.cargo}
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-1 leading-tight">
                            📍 {func.escola}
                          </span>
                        </div>
                      </div>
                      <div className="bg-[#1f283b] p-2 border-t border-[#26304d]">
                        <a
                          href={`https://www.google.com/maps?q=${func.latitude},${func.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full bg-[#0284c7] hover:bg-[#0369a1] active:bg-[#075985] !text-white text-xs font-bold py-2.5 px-3 rounded-lg shadow-md transition-all no-underline cursor-pointer group/btn"
                        >
                          <Navigation className="w-4 h-4 !text-white shrink-0 group-hover/btn:scale-110 transition-transform" />
                          <span className="!text-white font-bold">Gerar Rota no Maps</span>
                        </a>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MarkerClusterGroup>
        </MapContainer>
      </div>

      {/* Modal de Foto Ampliada ("Balãozão" ao clicar na foto via Portal) */}
      {fotoModal && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setFotoModal(null)}
        >
          <div 
            className="relative max-w-sm sm:max-w-md w-full bg-[#141a27] border border-[#2d3a54] rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4 text-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botão Fechar */}
            <button
              type="button"
              onClick={() => setFotoModal(null)}
              className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-[#1e283b] transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Container da Foto Ampliada */}
            <div className="relative w-52 h-52 sm:w-64 sm:h-64 rounded-2xl overflow-hidden border-4 border-[#232d42] shadow-2xl mt-2 bg-[#1e283b] flex items-center justify-center shrink-0">
              {getAvatarUrl(fotoModal) ? (
                <img
                  src={formatPhotoUrlWithTimestamp(getAvatarUrl(fotoModal))}
                  alt={fotoModal.nome}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}

              <div className={cn(
                "w-full h-full text-white font-bold text-5xl flex items-center justify-center",
                isEmaee
                  ? ((fotoModal.zona || '').toLowerCase().includes('rural')
                      ? "bg-gradient-to-br from-amber-600 to-amber-800"
                      : "bg-gradient-to-br from-sky-600 to-sky-800")
                  : (fotoModal.modalidade === 'EJA'
                      ? "bg-gradient-to-br from-purple-600 to-purple-800"
                      : "bg-gradient-to-br from-sky-600 to-sky-800")
              )}>
                {obterIniciais(fotoModal.nome)}
              </div>
            </div>

            {/* Detalhes do Funcionário */}
            <div className="flex flex-col items-center gap-1 w-full">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-white leading-snug">{fotoModal.nome}</h3>
                <span className={cn(
                  "text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider",
                  isEmaee
                    ? ((fotoModal.zona || '').toLowerCase().includes('rural')
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-sky-500/20 text-sky-300 border border-sky-500/30")
                    : (fotoModal.modalidade === 'EJA'
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : "bg-sky-500/20 text-sky-300 border border-sky-500/30")
                )}>
                  {isEmaee ? (fotoModal.zona || 'Urbana') : (fotoModal.modalidade ?? 'Regular')}
                </span>
              </div>
              <p className="text-sm font-semibold text-sky-400">{fotoModal.cargo}</p>
              <p className="text-xs text-slate-400 flex items-center justify-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                {fotoModal.escola}
              </p>
            </div>

            {/* Ações do Modal */}
            <div className="flex items-center gap-3 w-full mt-2 pt-4 border-t border-[#232d42]">
              <a
                href={`https://www.google.com/maps?q=${fotoModal.latitude},${fotoModal.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-[#0284c7] hover:bg-[#0369a1] active:bg-[#075985] !text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md transition-all no-underline cursor-pointer"
              >
                <Navigation className="w-4 h-4 !text-white shrink-0" />
                <span className="!text-white font-bold">Gerar Rota no Maps</span>
              </a>
              <button
                type="button"
                onClick={() => setFotoModal(null)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-300 bg-[#1e283b] hover:bg-[#28354d] border border-[#2d3a54] rounded-xl transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Info Inferior Dinâmica */}
      <p className="text-center text-xs text-slate-400">
        <strong className="text-sky-400">{funcionariosFiltrados.length}</strong> funcionário(s) encontrado(s){' '}
        {isEmaee ? (
          <>
            {filtroCidade !== 'todos' && `[Cidade: ${filtroCidade === 'sapeacu' ? 'SAPEAÇU' : 'OUTRAS CIDADES'}] `}
            {filtroZona !== 'todos' && `[Zona: ${filtroZona.toUpperCase()}] `}
          </>
        ) : (
          filtroModalidade !== 'todos' ? `[Ensino: ${filtroModalidade.toUpperCase()}] ` : ''
        )}
        {isLevel1OrSuperadmin && filtroVinculo !== 'todos' ? `[Vínculo: ${filtroVinculo.toUpperCase()}] ` : ''}
        de um total de {funcionarios.length}. Clique em um pino para detalhes.
      </p>
    </div>
  );
}
