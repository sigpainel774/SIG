'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getAvatarUrl } from '@/lib/photoHelper';
import { MapContainer, TileLayer, LayersControl, Marker, Popup, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { Search, MapPin, Filter, Navigation, ZoomIn, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSchoolStore } from '@/store/useSchoolStore';
import { preloadFotos, prewarmSapeacuTiles, formatPhotoUrlWithTimestamp } from '@/lib/mapCache';

// Criador estático de ícone de agrupamento (evita re-render / memory leaks - ES-3)
const criarIconeCluster = (cluster: any) => {
  const count = cluster.getChildCount();
  const sizeClass = count > 50 ? 'marker-cluster-custom-large' : '';
  return L.divIcon({
    html: `<div><span>${count}</span></div>`,
    className: `marker-cluster-custom ${sizeClass}`,
    iconSize: L.point(42, 42, true),
  });
};

export interface AlunoMapeado {
  id: string;
  nome: string;
  escola: string;
  turma?: string;
  foto_url?: string;
  latitude: number;
  longitude: number;
  modalidade?: string;
  cidade?: string;
  zona?: string;
  status?: string;
}

interface MapaAlunosProps {
  alunos: AlunoMapeado[];
}

export default function MapaAlunos({ alunos }: MapaAlunosProps) {
  const selectedEscola = useSchoolStore((state) => state.selectedEscola);
  const isEmaee = selectedEscola?.tipo === 'EMAEE';

  const [busca, setBusca] = useState('');
  const buscaDebounced = React.useDeferredValue(busca);
  const [filtroModalidade, setFiltroModalidade] = useState<'todos' | 'regular' | 'eja'>('todos');
  const [filtroZona, setFiltroZona] = useState<'todos' | 'Urbana' | 'Rural'>('todos');
  const [filtroCidade, setFiltroCidade] = useState<'todos' | 'sapeacu' | 'outras'>('todos');
  const [filtroStatusEmaee, setFiltroStatusEmaee] = useState<'todos' | 'ATIVO' | 'EM_INVESTIGACAO' | 'FILA_ESPERA' | 'ALTA' | 'INATIVO'>('todos');
  const [fotoModal, setFotoModal] = useState<AlunoMapeado | null>(null);

  const cidadesUnicas = useMemo(() => {
    const set = new Set<string>();
    alunos.forEach((a) => {
      if (a.cidade) set.add(a.cidade.trim());
    });
    return Array.from(set).sort();
  }, [alunos]);
  const mapRef = useRef<L.Map>(null);

  // Pre-warming dos tiles de Sapeaçu - BA na montagem
  useEffect(() => {
    prewarmSapeacuTiles();
  }, []);

  // 1. Filtra alunos baseado no input de pesquisa, status EMAEE e modalidade / cidade / zona
  const alunosFiltrados = useMemo(() => {
    const termo = buscaDebounced.toLowerCase().trim();
    return alunos.filter((a) => {
      if (isEmaee) {
        if (filtroStatusEmaee !== 'todos') {
          if (a.status !== filtroStatusEmaee) return false;
        }
        if (filtroZona !== 'todos') {
          const aZona = (a.zona || '').toLowerCase();
          const filterZ = filtroZona.toLowerCase();
          if (!aZona.includes(filterZ)) return false;
        }
        if (filtroCidade === 'sapeacu') {
          const cid = (a.cidade || '').toLowerCase().trim();
          if (!cid.includes('sapeaçu') && !cid.includes('sapeacu')) return false;
        } else if (filtroCidade === 'outras') {
          const cid = (a.cidade || '').toLowerCase().trim();
          if (cid.includes('sapeaçu') || cid.includes('sapeacu')) return false;
        }
      } else {
        if (filtroModalidade === 'eja' && a.modalidade !== 'EJA') return false;
        if (filtroModalidade === 'regular' && a.modalidade === 'EJA') return false;
      }

      // Filtro de texto
      if (!termo) return true;
      return (
        a.nome.toLowerCase().includes(termo) ||
        a.escola.toLowerCase().includes(termo) ||
        (a.turma && a.turma.toLowerCase().includes(termo)) ||
        (a.modalidade && a.modalidade.toLowerCase().includes(termo)) ||
        (a.cidade && a.cidade.toLowerCase().includes(termo))
      );
    });
  }, [buscaDebounced, filtroStatusEmaee, filtroModalidade, filtroZona, filtroCidade, isEmaee, alunos]);

  // 1.5 Filtro de coordenadas válidas para o mapa (evitar lat/lng 0 ou nulas - ES-4)
  const alunosValidos = useMemo(() => {
    return alunosFiltrados.filter(
      (a) =>
        a.latitude != null &&
        a.longitude != null &&
        !isNaN(Number(a.latitude)) &&
        !isNaN(Number(a.longitude)) &&
        Number(a.latitude) !== 0 &&
        Number(a.longitude) !== 0
    );
  }, [alunosFiltrados]);

  // Pré-carrega fotos 3x4 dos alunos visíveis
  useEffect(() => {
    if (alunosValidos.length > 0) {
      const urls = alunosValidos.map((a) => getAvatarUrl(a)).filter(Boolean);
      preloadFotos(urls);
    }
  }, [alunosValidos]);

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

      if (busca.trim() !== '' && alunosFiltrados.length > 0) {
        const primeiro = alunosFiltrados[0];
        mapRef.current.setView([primeiro.latitude, primeiro.longitude], 15);
      } else {
        mapRef.current.setView(SAPEACU_CENTER, 14);
      }

      return () => {
        active = false;
        clearTimeout(timer);
      };
    }
  }, [busca, alunosFiltrados, SAPEACU_CENTER]);

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

  // 4. Criação do Pino DivIcon Customizado (com cache)
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
      ? (isRural ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #10b981, #047857)')
      : (isEJA ? 'linear-gradient(135deg, #a855f7, #7e22ce)' : 'linear-gradient(135deg, #34d399, #059669)');

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
            placeholder="Filtrar por nome, escola ou turma..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder-slate-500"
          />
        </div>

        {/* Seletor de Filtro de Modalidade ou Cidade/Zona */}
        {isEmaee ? (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro de Status do EMAEE */}
            <div className="flex items-center gap-1 bg-[#1e283b] p-1 rounded-lg border border-[#2d3a54] flex-wrap">
              <span className="text-[11px] font-medium text-slate-400 px-2 flex items-center gap-1 hidden sm:flex">
                <Filter className="w-3 h-3" /> Status:
              </span>
              <button
                type="button"
                onClick={() => setFiltroStatusEmaee('todos')}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                  filtroStatusEmaee === 'todos'
                    ? "bg-slate-700 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setFiltroStatusEmaee('ATIVO')}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                  filtroStatusEmaee === 'ATIVO'
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-emerald-400/80 hover:text-emerald-300"
                )}
              >
                Em Atendimento
              </button>
              <button
                type="button"
                onClick={() => setFiltroStatusEmaee('EM_INVESTIGACAO')}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                  filtroStatusEmaee === 'EM_INVESTIGACAO'
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-amber-400/80 hover:text-amber-300"
                )}
              >
                Em Investigação
              </button>
              <button
                type="button"
                onClick={() => setFiltroStatusEmaee('FILA_ESPERA')}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                  filtroStatusEmaee === 'FILA_ESPERA'
                    ? "bg-sky-500 text-white shadow-sm"
                    : "text-sky-400/80 hover:text-sky-300"
                )}
              >
                Fila de Espera
              </button>
              <button
                type="button"
                onClick={() => setFiltroStatusEmaee('ALTA')}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                  filtroStatusEmaee === 'ALTA'
                    ? "bg-purple-500 text-white shadow-sm"
                    : "text-purple-400/80 hover:text-purple-300"
                )}
              >
                Alta Médica
              </button>
              <button
                type="button"
                onClick={() => setFiltroStatusEmaee('INATIVO')}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                  filtroStatusEmaee === 'INATIVO'
                    ? "bg-rose-500 text-white shadow-sm"
                    : "text-rose-400/80 hover:text-rose-300"
                )}
              >
                Inativo
              </button>
            </div>

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
                    ? "bg-emerald-500 text-white shadow-sm"
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
                    ? "bg-emerald-500 text-white shadow-sm"
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
                    ? "bg-emerald-500 text-white shadow-sm"
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
                    ? "bg-emerald-500 text-white shadow-sm"
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
                    ? "bg-emerald-500 text-white shadow-sm"
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
                  ? "bg-emerald-500 text-white shadow-sm"
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
                  ? "bg-emerald-500 text-white shadow-sm"
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

        <button
          type="button"
          onClick={recentralizarSapeacu}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          title="Centralizar visualização do mapa em Sapeaçu - BA"
        >
          <MapPin className="w-4 h-4" />
          Centralizar Sapeaçu
        </button>
      </div>

      {/* Container Principal do Mapa */}
      <div className="w-full h-[520px] rounded-2xl overflow-hidden border border-[#26304d] bg-[#182030] shadow-md z-0">
        <MapContainer
          center={SAPEACU_CENTER}
          zoom={14}
          ref={mapRef}
          className="w-full h-full"
        >
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
          <MarkerClusterGroup
            iconCreateFunction={criarIconeCluster}
            chunkedLoading
            maxClusterRadius={45}
            spiderfyOnMaxZoom={true}
            showCoverageOnHover={false}
          >
            {alunosValidos.map((aluno) => {
              const icone = criarIconeCustomizado(aluno.id, aluno.nome, (getAvatarUrl(aluno) ?? undefined), aluno.modalidade, aluno.zona);
              const iniciais = obterIniciais(aluno.nome);

              return (
                <Marker
                  key={aluno.id}
                  position={[aluno.latitude, aluno.longitude]}
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
                          onClick={() => setFotoModal(aluno)}
                          className="relative w-[50px] h-[50px] shrink-0 cursor-pointer group/avatar rounded-full overflow-hidden"
                          title="Clique para ampliar a foto"
                        >
                          {(getAvatarUrl(aluno) ?? undefined) ? (
                            <img
                              src={formatPhotoUrlWithTimestamp((getAvatarUrl(aluno) ?? undefined))}
                              alt={aluno.nome}
                              className={cn(
                                "w-full h-full rounded-full object-cover border-2 absolute inset-0 z-10 transition-transform duration-200 group-hover/avatar:scale-110",
                                aluno.modalidade === 'EJA' ? "border-purple-500" : "border-emerald-500"
                              )}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : null}
                          <div className={cn(
                            "w-full h-full rounded-full text-white font-bold text-lg flex items-center justify-center border-2 border-slate-700 absolute inset-0 z-0 transition-transform duration-200 group-hover/avatar:scale-110",
                            aluno.modalidade === 'EJA'
                              ? "bg-gradient-to-br from-purple-600 to-purple-400"
                              : "bg-gradient-to-br from-emerald-600 to-emerald-400"
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
                            <strong className="text-sm font-bold text-white leading-tight truncate max-w-[160px]" title={aluno.nome}>
                              {aluno.nome}
                            </strong>
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0",
                              isEmaee
                                ? ((aluno.zona || '').toLowerCase().includes('rural')
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30")
                                : (aluno.modalidade === 'EJA'
                                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30")
                            )}>
                              {isEmaee ? (aluno.zona || 'Urbana') : (aluno.modalidade ?? 'Regular')}
                            </span>
                            {isEmaee && aluno.status && (
                              <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wider shrink-0",
                                aluno.status === 'ATIVO' ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                                aluno.status === 'EM_INVESTIGACAO' ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                                aluno.status === 'FILA_ESPERA' ? "bg-sky-500/20 text-sky-300 border border-sky-500/30" :
                                aluno.status === 'ALTA' ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" :
                                "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              )}>
                                {aluno.status === 'ATIVO' ? 'Em Atendimento' :
                                 aluno.status === 'EM_INVESTIGACAO' ? 'Em Investigação' :
                                 aluno.status === 'FILA_ESPERA' ? 'Fila de Espera' :
                                 aluno.status === 'ALTA' ? 'Alta Médica' :
                                 aluno.status === 'INATIVO' ? 'Inativo' : aluno.status}
                              </span>
                            )}
                          </div>
                          {aluno.turma && (
                            <span className="text-xs text-emerald-400 font-medium block mt-0.5 truncate">
                              Turma: {aluno.turma}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400 block mt-1 leading-tight">
                            📍 {aluno.escola}
                          </span>
                        </div>
                      </div>
                      <div className="bg-[#1f283b] p-2 border-t border-[#26304d]">
                        <a
                          href={`https://www.google.com/maps?q=${aluno.latitude},${aluno.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 !text-white text-xs font-bold py-2.5 px-3 rounded-lg shadow-md transition-all no-underline cursor-pointer group/btn"
                        >
                          <Navigation className="w-4 h-4 !text-white shrink-0 group-hover/btn:scale-110 transition-transform" />
                          <span className="!text-white font-bold">Ver Residência no Maps</span>
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

      {/* Modal de Foto Ampliada via React Portal */}
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
                fotoModal.modalidade === 'EJA'
                  ? "bg-gradient-to-br from-purple-600 to-purple-800"
                  : "bg-gradient-to-br from-emerald-600 to-emerald-800"
              )}>
                {obterIniciais(fotoModal.nome)}
              </div>
            </div>

            {/* Detalhes do Aluno */}
            <div className="flex flex-col items-center gap-1 w-full">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-white leading-snug">{fotoModal.nome}</h3>
                <span className={cn(
                  "text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider",
                  isEmaee
                    ? ((fotoModal.zona || '').toLowerCase().includes('rural')
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30")
                    : (fotoModal.modalidade === 'EJA'
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30")
                )}>
                  {isEmaee ? (fotoModal.zona || 'Urbana') : (fotoModal.modalidade ?? 'Regular')}
                </span>
              </div>
              {fotoModal.turma && <p className="text-sm font-semibold text-emerald-400">Turma: {fotoModal.turma}</p>}
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
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 !text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md transition-all no-underline cursor-pointer"
              >
                <Navigation className="w-4 h-4 !text-white shrink-0" />
                <span className="!text-white font-bold">Ver Residência no Maps</span>
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
        <strong className="text-emerald-400">{alunosFiltrados.length}</strong> aluno(s) encontrado(s){' '}
        {isEmaee ? (
          <>
            {filtroCidade !== 'todos' && `[Cidade: ${filtroCidade === 'sapeacu' ? 'SAPEAÇU' : 'OUTRAS CIDADES'}] `}
            {filtroZona !== 'todos' && `[Zona: ${filtroZona.toUpperCase()}] `}
          </>
        ) : (
          filtroModalidade !== 'todos' ? `[Filtro: ${filtroModalidade.toUpperCase()}] ` : ''
        )}
        de um total de {alunos.length}. Clique em um pino para detalhes.
      </p>
    </div>
  );
}
