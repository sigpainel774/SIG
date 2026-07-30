'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, LayersControl, Marker, Popup, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { Search, MapPin, Filter, Navigation, ZoomIn, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { preloadFotos, prewarmSapeacuTiles } from '@/lib/mapCache';

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
}

interface MapaAlunosProps {
  alunos: AlunoMapeado[];
}

function BoundsTracker({ setBounds, setZoom }: { setBounds: (b: L.LatLngBounds) => void, setZoom: (z: number) => void }) {
  const map = useMapEvents({
    moveend: () => {
      setBounds(map.getBounds());
      setZoom(map.getZoom());
    },
    zoomend: () => {
      setZoom(map.getZoom());
    }
  });

  useEffect(() => {
    setBounds(map.getBounds());
    setZoom(map.getZoom());
  }, [map, setBounds, setZoom]);

  return null;
}

export default function MapaAlunos({ alunos }: MapaAlunosProps) {
  const [busca, setBusca] = useState('');
  const buscaDebounced = React.useDeferredValue(busca);
  const [filtroModalidade, setFiltroModalidade] = useState<'todos' | 'regular' | 'eja'>('todos');
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [mapZoom, setMapZoom] = useState(14);
  const [fotoModal, setFotoModal] = useState<AlunoMapeado | null>(null);
  const mapRef = useRef<L.Map>(null);

  // Pre-warming dos tiles de Sapeaçu - BA na montagem
  useEffect(() => {
    prewarmSapeacuTiles();
  }, []);

  // 1. Filtra alunos baseado no input de pesquisa e modalidade
  const alunosFiltrados = useMemo(() => {
    const termo = buscaDebounced.toLowerCase().trim();
    return alunos.filter((a) => {
      // Filtro de modalidade
      if (filtroModalidade === 'eja' && a.modalidade !== 'EJA') return false;
      if (filtroModalidade === 'regular' && a.modalidade === 'EJA') return false;

      // Filtro de texto
      if (!termo) return true;
      return (
        a.nome.toLowerCase().includes(termo) ||
        a.escola.toLowerCase().includes(termo) ||
        (a.turma && a.turma.toLowerCase().includes(termo)) ||
        (a.modalidade && a.modalidade.toLowerCase().includes(termo))
      );
    });
  }, [buscaDebounced, filtroModalidade, alunos]);

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

  // 4. Criação do Pino DivIcon Customizado (verde esmeralda para regular, roxo para EJA com cache)
  const criarIconeCustomizado = (id: string, nome: string, fotoUrl?: string, modalidade?: string) => {
    const cacheKey = `${id}_${modalidade || 'Regular'}_${fotoUrl || 'nofoto'}`;
    if (iconCacheRef.current.has(cacheKey)) {
      return iconCacheRef.current.get(cacheKey)!;
    }

    const iniciais = obterIniciais(nome);
    const imgHtml =
      fotoUrl && fotoUrl.trim() !== ''
        ? `<img src="${fotoUrl}" alt="${nome.replace(/"/g, '&quot;')}" decoding="async" loading="eager" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; position: absolute; inset: 0;" onerror="this.style.display='none'" />`
        : '';

    const isEJA = modalidade === 'EJA';
    const bgGradient = isEJA
      ? 'linear-gradient(135deg, #a855f7, #7e22ce)'
      : 'linear-gradient(135deg, #34d399, #059669)';

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

        {/* Seletor de Filtro de Modalidade (Todos, Regular, EJA) */}
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
                keepBuffer={4}
                updateWhenIdle={true}
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Mapa de Ruas (OpenStreetMap)">
              <TileLayer
                attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                keepBuffer={4}
                updateWhenIdle={true}
              />
            </LayersControl.BaseLayer>
          </LayersControl>
          <BoundsTracker setBounds={setMapBounds} setZoom={setMapZoom} />
          <MarkerClusterGroup
            iconCreateFunction={criarIconeCluster}
            chunkedLoading
            maxClusterRadius={45}
            spiderfyOnMaxZoom={true}
            showCoverageOnHover={false}
          >
            {alunosValidos.map((aluno) => {
              const icone = criarIconeCustomizado(aluno.id, aluno.nome, aluno.foto_url, aluno.modalidade);
              const iniciais = obterIniciais(aluno.nome);

              return (
                <Marker
                  key={aluno.id}
                  position={[aluno.latitude, aluno.longitude]}
                  icon={icone}
                >
                  {/* Popup Premium */}
                  <Popup maxWidth={260} className="custom-popup">
                    <div className="font-sans text-slate-100 bg-[#182030] rounded-xl overflow-hidden min-w-[220px] shadow-xl border border-[#2d3a54]">
                      <div className="flex gap-3 items-center p-3">
                        <div
                          onClick={() => setFotoModal(aluno)}
                          className="relative w-[50px] h-[50px] shrink-0 cursor-pointer group/avatar rounded-full overflow-hidden"
                          title="Clique para ampliar a foto"
                        >
                          {aluno.foto_url ? (
                            <img
                              src={aluno.foto_url}
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
                            <strong className="text-sm block text-white leading-tight truncate max-w-[140px]" title={aluno.nome}>
                              {aluno.nome}
                            </strong>
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider",
                              aluno.modalidade === 'EJA'
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            )}>
                              {aluno.modalidade ?? 'Regular'}
                            </span>
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

      {/* Modal de Foto Ampliada */}
      {fotoModal && (
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
              {fotoModal.foto_url ? (
                <img
                  src={fotoModal.foto_url}
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
                  fotoModal.modalidade === 'EJA'
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                )}>
                  {fotoModal.modalidade ?? 'Regular'}
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
        </div>
      )}

      {/* Info Inferior Dinâmica */}
      <p className="text-center text-xs text-slate-400">
        <strong className="text-emerald-400">{alunosFiltrados.length}</strong> aluno(s) encontrado(s) {filtroModalidade !== 'todos' ? `[Filtro: ${filtroModalidade.toUpperCase()}]` : ''} de um total de{' '}
        {alunos.length}. Clique em um pino para detalhes.
      </p>
    </div>
  );
}
