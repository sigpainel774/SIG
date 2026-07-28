'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, LayersControl, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Search, MapPin, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FuncionarioMapeado {
  id: string;
  nome: string;
  cargo: string;
  escola: string;
  foto_url?: string;
  latitude: number;
  longitude: number;
  modalidade?: string;
}

interface MapaGlobalProps {
  funcionarios: FuncionarioMapeado[];
}

export default function MapaGlobal({ funcionarios }: MapaGlobalProps) {
  const [busca, setBusca] = useState('');
  const [filtroModalidade, setFiltroModalidade] = useState<'todos' | 'regular' | 'eja'>('todos');
  const mapRef = useRef<L.Map>(null);

  // 1. Filtra funcionários baseado no input de pesquisa e na modalidade
  const funcionariosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    return funcionarios.filter((f) => {
      // Filtro de modalidade
      if (filtroModalidade === 'eja' && f.modalidade !== 'EJA') return false;
      if (filtroModalidade === 'regular' && f.modalidade === 'EJA') return false;

      // Filtro de texto
      if (!termo) return true;
      return (
        f.nome.toLowerCase().includes(termo) ||
        f.cargo.toLowerCase().includes(termo) ||
        f.escola.toLowerCase().includes(termo) ||
        (f.modalidade && f.modalidade.toLowerCase().includes(termo))
      );
    });
  }, [busca, filtroModalidade, funcionarios]);

  // 2. Coordenadas padrão de Sapeaçu - BA (-12.7299932, -39.1858195)
  const SAPEACU_CENTER: [number, number] = useMemo(() => [-12.7299932, -39.1858195], []);

  // Lógica para centralizar o mapa em Sapeaçu por padrão ou quando a busca for limpa
  useEffect(() => {
    if (mapRef.current) {
      // Invalida o tamanho do container Leaflet para prevenir mosaico cinza em trocas de aba
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);

      if (busca.trim() !== '' && funcionariosFiltrados.length > 0) {
        // Se houver busca ativa por texto, centraliza no primeiro resultado filtrado
        const primeiro = funcionariosFiltrados[0];
        mapRef.current.setView([primeiro.latitude, primeiro.longitude], 15);
      } else {
        // Por padrão (sem busca ou ao abrir), o mapa sempre foca em Sapeaçu - BA
        mapRef.current.setView(SAPEACU_CENTER, 14);
      }
    }
  }, [busca, funcionariosFiltrados, SAPEACU_CENTER]);

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
  const criarIconeCustomizado = (id: string, nome: string, fotoUrl?: string, modalidade?: string) => {
    const cacheKey = `${id}_${modalidade || 'Regular'}_${fotoUrl || 'nofoto'}`;
    if (iconCacheRef.current.has(cacheKey)) {
      return iconCacheRef.current.get(cacheKey)!;
    }

    const iniciais = obterIniciais(nome);
    const imgHtml =
      fotoUrl && fotoUrl.trim() !== ''
        ? `<img src="${fotoUrl}" alt="${nome.replace(/"/g, '&quot;')}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; position: absolute; inset: 0;" onerror="this.style.display='none'" />`
        : '';
    const isEJA = modalidade === 'EJA';
    const bgGradient = isEJA 
      ? 'linear-gradient(135deg, #a855f7, #7e22ce)' 
      : 'linear-gradient(135deg, #38bdf8, #0284c7)';

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
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Google Satélite (Puro)">
              <TileLayer
                attribution="&copy; Google Maps"
                url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                maxZoom={20}
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Mapa de Ruas (OpenStreetMap)">
              <TileLayer
                attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Satélite (Esri)">
              <TileLayer
                attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and GIS User Community"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
            </LayersControl.BaseLayer>
          </LayersControl>
          {funcionariosFiltrados.map((func) => {
            const icone = criarIconeCustomizado(func.id, func.nome, func.foto_url, func.modalidade);
            const iniciais = obterIniciais(func.nome);
            
            return (
              <Marker
                key={func.id}
                position={[func.latitude, func.longitude]}
                icon={icone}
              >
                {/* Popup Premium */}
                <Popup maxWidth={260} className="custom-popup">
                  <div className="font-sans text-slate-100 bg-[#182030] rounded-xl overflow-hidden min-w-[220px]">
                    <div className="flex gap-3 items-center p-3">
                      {func.foto_url ? (
                        <div className="relative w-[48px] h-[48px] shrink-0">
                          <img
                            src={func.foto_url}
                            alt={func.nome}
                            className={cn(
                              "w-full h-full rounded-full object-cover border-2 absolute inset-0 z-10",
                              func.modalidade === 'EJA' ? "border-purple-500" : "border-sky-500"
                            )}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          {/* Fallback que fica atrás da imagem ou aparece se ela falhar */}
                          <div className={cn(
                            "w-full h-full rounded-full text-white font-bold text-lg flex items-center justify-center border-2 border-slate-700 absolute inset-0 z-0",
                            func.modalidade === 'EJA' 
                              ? "bg-gradient-to-br from-purple-600 to-purple-400"
                              : "bg-gradient-to-br from-sky-600 to-sky-400"
                          )}>
                            {iniciais}
                          </div>
                        </div>
                      ) : (
                        <div className={cn(
                          "w-[48px] h-[48px] rounded-full text-white font-bold text-lg flex items-center justify-center shrink-0 border-2 border-slate-700",
                          func.modalidade === 'EJA'
                            ? "bg-gradient-to-br from-purple-600 to-purple-400"
                            : "bg-gradient-to-br from-sky-600 to-sky-400"
                        )}>
                          {iniciais}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <strong className="text-sm block text-white leading-tight">
                            {func.nome}
                          </strong>
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider",
                            func.modalidade === 'EJA'
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                          )}>
                            {func.modalidade ?? 'Regular'}
                          </span>
                        </div>
                        <span className="text-xs text-sky-400 block mt-0.5">
                          {func.cargo}
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-1">
                          📍 {func.escola}
                        </span>
                      </div>
                    </div>
                    <div className="bg-[#1f283b] p-2 border-t border-[#26304d]">
                      <a
                        href={`https://www.google.com/maps?q=${func.latitude},${func.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-center bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold py-2 rounded-lg transition-colors no-underline"
                      >
                        🧭 Gerar Rota no Maps
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Info Inferior Dinâmica */}
      <p className="text-center text-xs text-slate-400">
        <strong className="text-sky-400">{funcionariosFiltrados.length}</strong> funcionário(s) encontrado(s) {filtroModalidade !== 'todos' ? `[Filtro: ${filtroModalidade.toUpperCase()}]` : ''} de um total de{' '}
        {funcionarios.length}. Clique em um pino para detalhes.
      </p>
    </div>
  );
}
