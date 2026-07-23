'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, LayersControl, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Search } from 'lucide-react';

export interface AlunoMapeado {
  id: string;
  nome: string;
  escola: string;
  turma?: string;
  foto_url?: string;
  latitude: number;
  longitude: number;
}

interface MapaAlunosProps {
  alunos: AlunoMapeado[];
}

export default function MapaAlunos({ alunos }: MapaAlunosProps) {
  const [busca, setBusca] = useState('');
  const mapRef = useRef<L.Map>(null);

  // 1. Filtra alunos baseado no input de pesquisa
  const alunosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    if (!termo) return alunos;
    return alunos.filter(
      (a) =>
        a.nome.toLowerCase().includes(termo) ||
        a.escola.toLowerCase().includes(termo) ||
        (a.turma && a.turma.toLowerCase().includes(termo))
    );
  }, [busca, alunos]);

  // 2. Calcula o centro geográfico médio dos pontos visíveis
  const centroMedio = useMemo((): [number, number] => {
    if (alunosFiltrados.length === 0) return [-14.235004, -51.925282];
    const somaLat = alunosFiltrados.reduce((acc, curr) => acc + curr.latitude, 0);
    const somaLng = alunosFiltrados.reduce((acc, curr) => acc + curr.longitude, 0);
    return [
      somaLat / alunosFiltrados.length,
      somaLng / alunosFiltrados.length,
    ];
  }, [alunosFiltrados]);

  // Centraliza o mapa dinamicamente quando o filtro ou os dados mudam
  useEffect(() => {
    if (mapRef.current && alunosFiltrados.length > 0) {
      mapRef.current.setView(centroMedio, 13);
    }
  }, [centroMedio, alunosFiltrados.length]);

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

  // 4. Criação do Pino DivIcon Customizado (verde esmeralda para alunos)
  const criarIconeCustomizado = (nome: string) => {
    const iniciais = obterIniciais(nome);
    return L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div style="
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #34d399, #059669);
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
          placeholder="Filtrar por nome, escola ou turma..."
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
          {alunosFiltrados.map((aluno) => {
            const icone = criarIconeCustomizado(aluno.nome);
            const iniciais = obterIniciais(aluno.nome);

            return (
              <Marker
                key={aluno.id}
                position={[aluno.latitude, aluno.longitude]}
                icon={icone}
              >
                {/* Popup Premium */}
                <Popup maxWidth={260} className="custom-popup">
                  <div className="font-sans text-slate-100 bg-[#182030] rounded-xl overflow-hidden min-w-[220px]">
                    <div className="flex gap-3 items-center p-3">
                      {aluno.foto_url ? (
                        <div className="relative w-[48px] h-[48px] shrink-0">
                          <img
                            src={aluno.foto_url}
                            alt={aluno.nome}
                            className="w-full h-full rounded-full object-cover border-2 border-emerald-500 absolute inset-0 z-10"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <div className="w-full h-full rounded-full bg-gradient-to-br from-emerald-600 to-emerald-400 text-white font-bold text-lg flex items-center justify-center border-2 border-slate-700 absolute inset-0 z-0">
                            {iniciais}
                          </div>
                        </div>
                      ) : (
                        <div className="w-[48px] h-[48px] rounded-full bg-gradient-to-br from-emerald-600 to-emerald-400 text-white font-bold text-lg flex items-center justify-center shrink-0 border-2 border-slate-700">
                          {iniciais}
                        </div>
                      )}
                      <div>
                        <strong className="text-sm block text-white leading-tight">
                          {aluno.nome}
                        </strong>
                        {aluno.turma && (
                          <span className="text-xs text-emerald-400 block mt-0.5">
                            Turma: {aluno.turma}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400 block mt-1">
                          📍 {aluno.escola}
                        </span>
                      </div>
                    </div>
                    <div className="bg-[#1f283b] p-2 border-t border-[#26304d]">
                      <a
                        href={`https://www.google.com/maps?q=${aluno.latitude},${aluno.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-center bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded-lg transition-colors no-underline"
                      >
                        🧭 Ver Residência no Maps
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
        <strong className="text-emerald-400">{alunosFiltrados.length}</strong> aluno(s) encontrado(s) de um total de{' '}
        {alunos.length}. Clique em um pino para detalhes.
      </p>
    </div>
  );
}
