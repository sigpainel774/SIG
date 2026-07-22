'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, LayersControl, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Search } from 'lucide-react';

export interface FuncionarioMapeado {
  id: string;
  nome: string;
  cargo: string;
  escola: string;
  foto_url?: string;
  latitude: number;
  longitude: number;
}

interface MapaGlobalProps {
  funcionarios: FuncionarioMapeado[];
}

export default function MapaGlobal({ funcionarios }: MapaGlobalProps) {
  const [busca, setBusca] = useState('');
  const mapRef = useRef<L.Map>(null);

  // 1. Filtra funcionários baseado no input de pesquisa
  const funcionariosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    if (!termo) return funcionarios;
    return funcionarios.filter(
      (f) =>
        f.nome.toLowerCase().includes(termo) ||
        f.cargo.toLowerCase().includes(termo) ||
        f.escola.toLowerCase().includes(termo)
    );
  }, [busca, funcionarios]);

  // 2. Calcula o centro geográfico médio dos pontos visíveis
  const centroMedio = useMemo((): [number, number] => {
    // If no employees, default to Brazil
    if (funcionariosFiltrados.length === 0) return [-14.235004, -51.925282];
    
    const somaLat = funcionariosFiltrados.reduce((acc, curr) => acc + curr.latitude, 0);
    const somaLng = funcionariosFiltrados.reduce((acc, curr) => acc + curr.longitude, 0);
    return [
      somaLat / funcionariosFiltrados.length,
      somaLng / funcionariosFiltrados.length,
    ];
  }, [funcionariosFiltrados]);

  // Centraliza o mapa dinamicamente quando o filtro ou os dados mudam
  useEffect(() => {
    if (mapRef.current && funcionariosFiltrados.length > 0) {
      mapRef.current.setView(centroMedio, 13);
    }
  }, [centroMedio, funcionariosFiltrados.length]);

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

  // 4. Criação do Pino DivIcon Customizado usando Leaflet nativo
  const criarIconeCustomizado = (nome: string) => {
    const iniciais = obterIniciais(nome);
    return L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div style="
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #38bdf8, #0284c7);
          color: #ffffff;
          font-weight: 700;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid #1e293b;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        ">
          ${iniciais}
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -20],
    });
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Campo de Filtro Dinâmico */}
      <div className="flex gap-2 items-center bg-[#141a27] border border-[#232d42] rounded-xl px-4 py-3 shadow-sm">
        <Search className="w-5 h-5 text-slate-500" />
        <input
          type="text"
          placeholder="Filtrar por nome, cargo ou escola..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder-slate-500"
        />
      </div>

      {/* Container Principal do Mapa */}
      <div className="w-full h-[520px] rounded-2xl overflow-hidden border border-[#26304d] bg-[#182030] shadow-md z-0">
        <MapContainer
          center={centroMedio}
          zoom={13}
          ref={mapRef}
          className="w-full h-full"
        >
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Mapa de Ruas">
              <TileLayer
                attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Satélite">
              <TileLayer
                attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and GIS User Community"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
            </LayersControl.BaseLayer>
          </LayersControl>
          {funcionariosFiltrados.map((func) => {
            const icone = criarIconeCustomizado(func.nome);
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
                            className="w-full h-full rounded-full object-cover border-2 border-sky-500 absolute inset-0 z-10"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          {/* Fallback que fica atrás da imagem ou aparece se ela falhar */}
                          <div className="w-full h-full rounded-full bg-gradient-to-br from-sky-600 to-sky-400 text-white font-bold text-lg flex items-center justify-center border-2 border-slate-700 absolute inset-0 z-0">
                            {iniciais}
                          </div>
                        </div>
                      ) : (
                        <div className="w-[48px] h-[48px] rounded-full bg-gradient-to-br from-sky-600 to-sky-400 text-white font-bold text-lg flex items-center justify-center shrink-0 border-2 border-slate-700">
                          {iniciais}
                        </div>
                      )}
                      <div>
                        <strong className="text-sm block text-white leading-tight">
                          {func.nome}
                        </strong>
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
        <strong className="text-sky-400">{funcionariosFiltrados.length}</strong> funcionário(s) encontrado(s) de um total de{' '}
        {funcionarios.length}. Clique em um pino para detalhes.
      </p>
    </div>
  );
}
