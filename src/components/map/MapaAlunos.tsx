'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, LayersControl, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Search, MapPin, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

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

export default function MapaAlunos({ alunos }: MapaAlunosProps) {
  const [busca, setBusca] = useState('');
  const [filtroModalidade, setFiltroModalidade] = useState<'todos' | 'regular' | 'eja'>('todos');
  const mapRef = useRef<L.Map>(null);

  // 1. Filtra alunos baseado no input de pesquisa e modalidade
  const alunosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();
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
  }, [busca, filtroModalidade, alunos]);

  // 2. Coordenadas padrão de Sapeaçu - BA (-12.7299932, -39.1858195)
  const SAPEACU_CENTER: [number, number] = useMemo(() => [-12.7299932, -39.1858195], []);

  // Lógica para centralizar o mapa em Sapeaçu por padrão ou quando a busca for limpa
  useEffect(() => {
    if (mapRef.current) {
      // Invalida o tamanho do container Leaflet para prevenir mosaico cinza em trocas de aba
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);

      if (busca.trim() !== '' && alunosFiltrados.length > 0) {
        // Se houver busca ativa por texto, centraliza no primeiro resultado filtrado
        const primeiro = alunosFiltrados[0];
        mapRef.current.setView([primeiro.latitude, primeiro.longitude], 15);
      } else {
        // Por padrão (sem busca ou ao abrir), o mapa sempre foca em Sapeaçu - BA
        mapRef.current.setView(SAPEACU_CENTER, 14);
      }
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

  // 4. Criação do Pino DivIcon Customizado (verde esmeralda para regular, roxo para EJA)
  const criarIconeCustomizado = (nome: string, fotoUrl?: string, modalidade?: string) => {
    const iniciais = obterIniciais(nome);
    const imgHtml =
      fotoUrl && fotoUrl.trim() !== ''
        ? `<img src="${fotoUrl}" alt="${nome.replace(/"/g, '&quot;')}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; position: absolute; inset: 0;" onerror="this.style.display='none'" />`
        : '';

    const isEJA = modalidade === 'EJA';
    const bgGradient = isEJA
      ? 'linear-gradient(135deg, #a855f7, #7e22ce)'
      : 'linear-gradient(135deg, #34d399, #059669)';

    return L.divIcon({
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
  };

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
            const icone = criarIconeCustomizado(aluno.nome, aluno.foto_url, aluno.modalidade);
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
                            className={cn(
                              "w-full h-full rounded-full object-cover border-2 absolute inset-0 z-10",
                              aluno.modalidade === 'EJA' ? "border-purple-500" : "border-emerald-500"
                            )}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <div className={cn(
                            "w-full h-full rounded-full text-white font-bold text-lg flex items-center justify-center border-2 border-slate-700 absolute inset-0 z-0",
                            aluno.modalidade === 'EJA'
                              ? "bg-gradient-to-br from-purple-600 to-purple-400"
                              : "bg-gradient-to-br from-emerald-600 to-emerald-400"
                          )}>
                            {iniciais}
                          </div>
                        </div>
                      ) : (
                        <div className={cn(
                          "w-[48px] h-[48px] rounded-full text-white font-bold text-lg flex items-center justify-center shrink-0 border-2 border-slate-700",
                          aluno.modalidade === 'EJA'
                            ? "bg-gradient-to-br from-purple-600 to-purple-400"
                            : "bg-gradient-to-br from-emerald-600 to-emerald-400"
                        )}>
                          {iniciais}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <strong className="text-sm block text-white leading-tight">
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
        <strong className="text-emerald-400">{alunosFiltrados.length}</strong> aluno(s) encontrado(s) {filtroModalidade !== 'todos' ? `[Filtro: ${filtroModalidade.toUpperCase()}]` : ''} de um total de{' '}
        {alunos.length}. Clique em um pino para detalhes.
      </p>
    </div>
  );
}
