'use client';

import React, { useState, useMemo, useEffect, useRef, useDeferredValue } from 'react';
import { MapContainer, TileLayer, LayersControl, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import {
  Search,
  MapPin,
  Filter,
  Navigation,
  School,
  Sparkles,
  Route,
  Check,
  Plus,
  Trash2,
  ExternalLink,
  Fuel,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PontoLocalizacao,
  ResultadoRoteiro,
  SEDE_SEMED_SAPEACU,
  parseCoordinate,
  otimizarOrdemVisitas,
  obterRotaViariaReal,
} from '@/lib/routeOptimizer';

export interface EscolaMapeada {
  id: string;
  nome: string;
  latitude: number | null;
  longitude: number | null;
  endereco?: string | null;
  localizacao?: string | null;
  tipo?: string | null;
  inep?: string | null;
  telefone?: string | null;
  ativo?: boolean | null;
}

export interface EscolaComCoordenadas extends EscolaMapeada {
  latitude: number;
  longitude: number;
}

interface MapaRotasEscolasProps {
  escolas: EscolaMapeada[];
}

export default function MapaRotasEscolas({ escolas }: MapaRotasEscolasProps) {
  const [busca, setBusca] = useState('');
  const buscaDebounced = useDeferredValue(busca);
  const [filtroZona, setFiltroZona] = useState<'todos' | 'URBANA' | 'RURAL'>('todos');

  // Coordenadas padrao de Sapeacu - BA
  const SAPEACU_CENTER: [number, number] = useMemo(() => [-12.7299932, -39.1858195], []);
  const mapRef = useRef<L.Map>(null);

  // Estados do Roteiro
  const [escolasSelecionadas, setEscolasSelecionadas] = useState<PontoLocalizacao[]>([]);
  const [incluirSede, setIncluirSede] = useState(true);
  const [retornarAoSede, setRetornarAoSede] = useState(true);
  const [consumoKmLInput, setConsumoKmLInput] = useState('10.0');
  const [precoCombustivelInput, setPrecoCombustivelInput] = useState('6.29');
  const [calculandoRota, setCalculandoRota] = useState(false);
  const [resultadoRoteiro, setResultadoRoteiro] = useState<ResultadoRoteiro | null>(null);

  // Escolas validas com coordenadas
  const escolasValidas = useMemo(() => {
    const list: EscolaComCoordenadas[] = [];
    for (const e of escolas) {
      const lat = parseCoordinate(e.latitude);
      const lng = parseCoordinate(e.longitude);
      if (lat !== null && lng !== null) {
        list.push({
          ...e,
          latitude: lat,
          longitude: lng,
          tipo: e.tipo ?? 'MUNICIPAL',
          localizacao: e.localizacao ?? 'URBANA',
        });
      }
    }
    return list;
  }, [escolas]);

  // Escolas filtradas para a listagem/busca
  const escolasFiltradas = useMemo(() => {
    const termo = buscaDebounced.toLowerCase().trim();
    return escolasValidas.filter((e) => {
      if (filtroZona !== 'todos') {
        const zona = (e.localizacao || '').toUpperCase();
        if (!zona.includes(filtroZona)) return false;
      }
      if (!termo) return true;
      return (
        e.nome.toLowerCase().includes(termo) ||
        (e.endereco && e.endereco.toLowerCase().includes(termo)) ||
        (e.inep && e.inep.toLowerCase().includes(termo))
      );
    });
  }, [escolasValidas, filtroZona, buscaDebounced]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  const recentralizarSapeacu = () => {
    if (mapRef.current) {
      mapRef.current.invalidateSize();
      mapRef.current.setView(SAPEACU_CENTER, 14);
    }
  };

  const toggleEscolaRoteiro = (ponto: PontoLocalizacao) => {
    setEscolasSelecionadas((prev) => {
      const existe = prev.some((p) => p.id === ponto.id);
      if (existe) {
        return prev.filter((p) => p.id !== ponto.id);
      } else {
        return [...prev, ponto];
      }
    });
  };

  const removerEscolaRoteiro = (id: string) => {
    setEscolasSelecionadas((prev) => prev.filter((p) => p.id !== id));
  };

  const limparRoteiro = () => {
    setEscolasSelecionadas([]);
    setResultadoRoteiro(null);
  };

  const handleCalcularMelhorRoteiro = async () => {
    if (escolasSelecionadas.length === 0) return;

    setCalculandoRota(true);
    try {
      const pontoPartida = incluirSede ? SEDE_SEMED_SAPEACU : escolasSelecionadas[0];
      const destinos = incluirSede
        ? escolasSelecionadas
        : escolasSelecionadas.slice(1);

      const ordemOtimizada = otimizarOrdemVisitas(
        pontoPartida,
        destinos,
        incluirSede && retornarAoSede
      );

      const consumoKmL = parseFloat(consumoKmLInput.replace(',', '.')) || 10.0;
      const precoLitro = parseFloat(precoCombustivelInput.replace(',', '.')) || 6.29;

      const resultado = await obterRotaViariaReal(
        ordemOtimizada,
        consumoKmL,
        precoLitro
      );

      setResultadoRoteiro(resultado);

      if (mapRef.current && resultado.coordenadasPolyline.length > 0) {
        const bounds = L.latLngBounds(resultado.coordenadasPolyline);
        mapRef.current.fitBounds(bounds, { padding: [40, 40] });
      }
    } finally {
      setCalculandoRota(false);
    }
  };

  const criarIconeEscola = (escola: EscolaMapeada, indiceRoteiro?: number) => {
    const isRural = (escola.localizacao || '').toUpperCase().includes('RURAL');
    const isEmaee = (escola.tipo || '').toUpperCase().includes('EMAEE') || escola.nome.toUpperCase().includes('EMAEE');

    const numeroBadge =
      indiceRoteiro !== undefined
        ? `<span style="position: absolute; top: -6px; right: -6px; background: #22c55e; color: #ffffff; font-size: 11px; font-weight: 800; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #0f172a; box-shadow: 0 2px 5px rgba(0,0,0,0.5);">${indiceRoteiro}</span>`
        : '';

    const corBg = isRural ? '#d97706' : (isEmaee ? '#9333ea' : '#0284c7');

    return L.divIcon({
      className: 'custom-school-icon',
      html: `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
          <div style="width: 32px; height: 32px; border-radius: 10px; background: ${corBg}; border: 2px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: #ffffff;">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 22v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4"/><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2"/><path d="M18 5v17"/><path d="m4 6 8-4 8 4"/><path d="M6 5v17"/></svg>
          </div>
          ${numeroBadge}
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -18],
    });
  };

  const iconeSede = useMemo(() => {
    return L.divIcon({
      className: 'custom-sede-icon',
      html: `
        <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
          <div style="width: 36px; height: 36px; border-radius: 50%; background: #2563eb; border: 3px solid #60a5fa; box-shadow: 0 4px 14px rgba(37,99,235,0.6); display: flex; align-items: center; justify-content: center; color: #ffffff;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
          </div>
          <span style="position: absolute; top: -6px; right: -6px; background: #3b82f6; color: #ffffff; font-size: 10px; font-weight: 800; padding: 1px 4px; border-radius: 6px; border: 1.5px solid #ffffff;">SEMED</span>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
      popupAnchor: [0, -20],
    });
  }, []);

  return (
    <div className="flex flex-col xl:flex-row gap-5 w-full">
      {/* Coluna Principal: Mapa e Barra de Filtros */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Barra Superior com Pesquisa, Filtro de Zona e Botao Sapeacu */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#141416] border border-[#26262a] p-3.5 rounded-2xl shadow-sm">
          <div className="flex flex-1 items-center gap-2.5 min-w-[220px] bg-[#1a1a1e] px-3.5 py-2 rounded-xl border border-[#2d2d32]">
            <Search className="w-4 h-4 text-zinc-400 shrink-0" />
            <input
              type="text"
              placeholder="Buscar escola por nome, endereço ou código INEP..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="bg-transparent border-none text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none w-full"
            />
          </div>

          {/* Filtro Urbana / Rural */}
          <div className="flex items-center gap-1 bg-[#1a1a1e] p-1 rounded-xl border border-[#2d2d32]">
            <span className="text-xs font-medium text-zinc-400 px-2 flex items-center gap-1 hidden sm:flex">
              <Filter className="w-3.5 h-3.5" /> Zona:
            </span>
            <button
              type="button"
              onClick={() => setFiltroZona('todos')}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                filtroZona === 'todos'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              Todas ({escolasValidas.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltroZona('URBANA')}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                filtroZona === 'URBANA'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              Urbana ({escolasValidas.filter((e) => (e.localizacao || '').toUpperCase().includes('URBANA')).length})
            </button>
            <button
              type="button"
              onClick={() => setFiltroZona('RURAL')}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                filtroZona === 'RURAL'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              Rural ({escolasValidas.filter((e) => (e.localizacao || '').toUpperCase().includes('RURAL')).length})
            </button>
          </div>

          <button
            type="button"
            onClick={recentralizarSapeacu}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded-xl hover:bg-sky-500/20 transition-colors cursor-pointer"
            title="Recentralizar Mapa em Sapeaçu"
          >
            <MapPin className="w-3.5 h-3.5" />
            Sapeaçu - BA
          </button>
        </div>

        {/* Container do Mapa Leaflet */}
        <div className="w-full h-[580px] rounded-2xl overflow-hidden border border-[#26262a] shadow-xl relative z-0">
          <MapContainer
            ref={mapRef}
            center={SAPEACU_CENTER}
            zoom={14}
            scrollWheelZoom={true}
            style={{ width: '100%', height: '100%' }}
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

            {incluirSede && (
              <Marker position={[SEDE_SEMED_SAPEACU.latitude, SEDE_SEMED_SAPEACU.longitude]} icon={iconeSede}>
                <Popup className="custom-popup" autoPan={false}>
                  <div className="p-3 bg-[#182030] text-zinc-100 rounded-xl border border-[#2d3a54] min-w-[220px]">
                    <div className="flex items-center gap-2 font-bold text-sky-400 text-sm mb-1">
                      <Navigation className="w-4 h-4" />
                      Ponto de Partida (Sede)
                    </div>
                    <div className="text-xs font-semibold text-zinc-200 mb-1">{SEDE_SEMED_SAPEACU.nome}</div>
                    <div className="text-[11px] text-zinc-400">{SEDE_SEMED_SAPEACU.endereco}</div>
                  </div>
                </Popup>
              </Marker>
            )}

            {escolasFiltradas.map((esc) => {
              const idxNoRoteiro = resultadoRoteiro?.pontosOrdenados.findIndex((p) => p.id === esc.id);
              const numOrdem = idxNoRoteiro !== undefined && idxNoRoteiro !== -1 ? idxNoRoteiro + 1 : undefined;
              const estaSelecionada = escolasSelecionadas.some((p) => p.id === esc.id);
              const icone = criarIconeEscola(esc, numOrdem);

              return (
                <Marker
                  key={esc.id}
                  position={[esc.latitude, esc.longitude]}
                  icon={icone}
                >
                  <Popup className="custom-popup" autoPan={false}>
                    <div className="p-3.5 bg-[#182030] text-zinc-100 rounded-xl border border-[#2d3a54] min-w-[240px]">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider',
                            (esc.localizacao || '').toUpperCase().includes('RURAL')
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          )}
                        >
                          Zona {esc.localizacao ?? 'Urbana'}
                        </span>
                        {esc.inep && (
                          <span className="text-[10px] text-zinc-400">INEP: {esc.inep}</span>
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-zinc-100 leading-tight mb-1.5">{esc.nome}</h4>
                      {esc.endereco && (
                        <p className="text-xs text-zinc-400 mb-3 flex items-start gap-1">
                          <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                          <span>{esc.endereco}</span>
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          toggleEscolaRoteiro({
                            id: esc.id,
                            nome: esc.nome,
                            latitude: esc.latitude,
                            longitude: esc.longitude,
                            endereco: esc.endereco,
                            localizacao: esc.localizacao,
                            tipo: esc.tipo ?? 'MUNICIPAL',
                          })
                        }
                        className={cn(
                          'w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm',
                          estaSelecionada
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
                            : 'bg-sky-500 text-white hover:bg-sky-600'
                        )}
                      >
                        {estaSelecionada ? (
                          <>
                            <Trash2 className="w-3.5 h-3.5" />
                            Remover do Roteiro
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            Adicionar ao Roteiro
                          </>
                        )}
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {resultadoRoteiro && resultadoRoteiro.coordenadasPolyline.length > 1 && (
              <Polyline
                positions={resultadoRoteiro.coordenadasPolyline}
                pathOptions={{
                  color: '#0284c7',
                  weight: 5,
                  opacity: 0.85,
                  dashArray: '8, 8',
                }}
              />
            )}
          </MapContainer>

          <div className="absolute bottom-3 left-3 z-[1000] bg-[#141416]/90 backdrop-blur-md border border-[#26262a] p-2.5 rounded-xl shadow-lg flex items-center gap-3 text-xs text-zinc-300">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-sky-500 border border-white/50"></span>
              <span>Urbana</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-amber-500 border border-white/50"></span>
              <span>Rural</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-purple-500 border border-white/50"></span>
              <span>EMAEE / Especial</span>
            </div>
          </div>
        </div>
      </div>

      {/* Coluna Lateral: Painel de Planejamento de Roteiro */}
      <div className="w-full xl:w-[380px] shrink-0 flex flex-col gap-4">
        <div className="bg-[#141416] border border-[#26262a] rounded-2xl p-4 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#26262a] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Route className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-100">Roteiro de Visitas</h3>
                <p className="text-xs text-zinc-400">Melhor caminho & economia</p>
              </div>
            </div>
            {escolasSelecionadas.length > 0 && (
              <button
                type="button"
                onClick={limparRoteiro}
                className="text-xs text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Limpar
              </button>
            )}
          </div>

          {/* Parametros de Partida & Veiculo */}
          <div className="grid grid-cols-2 gap-3 bg-[#1a1a1e] p-3 rounded-xl border border-[#2d2d32]">
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1 mb-1">
                <Fuel className="w-3.5 h-3.5 text-sky-400" /> Consumo (km/L)
              </label>
              <input
                type="text"
                value={consumoKmLInput}
                onChange={(e) => setConsumoKmLInput(e.target.value)}
                placeholder="10.0"
                className="w-full bg-[#141416] border border-[#333339] rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Gasolina (R$/L)
              </label>
              <input
                type="text"
                value={precoCombustivelInput}
                onChange={(e) => setPrecoCombustivelInput(e.target.value)}
                placeholder="6.29"
                className="w-full bg-[#141416] border border-[#333339] rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="col-span-2 flex flex-col gap-1.5 pt-1">
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={incluirSede}
                  onChange={(e) => setIncluirSede(e.target.checked)}
                  className="rounded border-zinc-700 text-sky-600 focus:ring-sky-500"
                />
                Partir da Secretaria (SEMED - Centro)
              </label>

              {incluirSede && (
                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={retornarAoSede}
                    onChange={(e) => setRetornarAoSede(e.target.checked)}
                    className="rounded border-zinc-700 text-sky-600 focus:ring-sky-500"
                  />
                  Retornar à Secretaria no fim do roteiro
                </label>
              )}
            </div>
          </div>

          {/* Lista de Escolas Selecionadas */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300">
                Escolas no Roteiro ({escolasSelecionadas.length})
              </span>
            </div>

            {escolasSelecionadas.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-[#2d2d32] text-center text-zinc-500 text-xs flex flex-col items-center gap-1.5">
                <School className="w-6 h-6 text-zinc-600" />
                <span>Nenhuma escola selecionada.</span>
                <span className="text-[11px] text-zinc-600">
                  Clique nos marcadores no mapa ou adicione abaixo.
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto pr-1">
                {escolasSelecionadas.map((esc, index) => (
                  <div
                    key={esc.id}
                    className="flex items-center justify-between bg-[#1a1a1e] border border-[#2d2d32] px-3 py-2 rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-[10px] shrink-0">
                        {index + 1}
                      </span>
                      <span className="font-medium text-zinc-200 truncate">{esc.nome}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removerEscolaRoteiro(esc.id)}
                      className="text-zinc-500 hover:text-rose-400 transition-colors p-1 cursor-pointer"
                      title="Remover"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botao de Calcular Rota Otima */}
          <button
            type="button"
            disabled={escolasSelecionadas.length === 0 || calculandoRota}
            onClick={handleCalcularMelhorRoteiro}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {calculandoRota ? (
              <span>Otimizando roteiro...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-sky-200" />
                Calcular Melhor Roteiro
              </>
            )}
          </button>

          {/* Painel de Resultados do Roteiro */}
          {resultadoRoteiro && (
            <div className="flex flex-col gap-3 bg-[#1a1a1e] border border-sky-500/30 p-3.5 rounded-xl animate-in fade-in-50 duration-300">
              <div className="flex items-center justify-between border-b border-[#2d2d32] pb-2.5">
                <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" /> Roteiro Otimizado
                </span>
                <a
                  href={resultadoRoteiro.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> Abrir no Google Maps
                </a>
              </div>

              {/* Indicadores de Consumo & Distancia */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#141416] p-2.5 rounded-lg border border-[#2d2d32]">
                  <span className="text-[10px] text-zinc-400 block mb-0.5">Distância Total</span>
                  <span className="text-sm font-extrabold text-zinc-100">
                    {resultadoRoteiro.distanciaTotalKm} km
                  </span>
                </div>
                <div className="bg-[#141416] p-2.5 rounded-lg border border-[#2d2d32]">
                  <span className="text-[10px] text-zinc-400 block mb-0.5">Gasolina Estimada</span>
                  <span className="text-sm font-extrabold text-amber-400">
                    {resultadoRoteiro.consumoLitros} L
                  </span>
                </div>
                <div className="bg-[#141416] p-2.5 rounded-lg border border-[#2d2d32]">
                  <span className="text-[10px] text-zinc-400 block mb-0.5">Custo Estimado</span>
                  <span className="text-sm font-extrabold text-emerald-400">
                    R$ {resultadoRoteiro.custoTotalReais.toFixed(2)}
                  </span>
                </div>
                <div className="bg-[#141416] p-2.5 rounded-lg border border-[#2d2d32]">
                  <span className="text-[10px] text-zinc-400 block mb-0.5">Tempo em Trânsito</span>
                  <span className="text-sm font-extrabold text-violet-400">
                    ~{resultadoRoteiro.tempoEstimadoMinutos} min
                  </span>
                </div>
              </div>

              {/* Paradas Passo a Passo */}
              <div className="flex flex-col gap-1.5 pt-1">
                <span className="text-[11px] font-bold text-zinc-400">Ordem de Paradas:</span>
                <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto pr-1">
                  {resultadoRoteiro.pontosOrdenados.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-zinc-300">
                      <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-300 font-bold text-[9px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="truncate">{p.nome}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
