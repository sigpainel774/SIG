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

  // Coordenadas padrão de Sapeaçu - BA
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

  // Localização da SEMED (INEP 01 - Sede Administrativa da Educação)
  const semedUnidade = useMemo(() => {
    return escolas.find(
      (e) =>
        e.inep === '01' ||
        e.inep === '1' ||
        e.tipo === 'SECRETARIA' ||
        (e.nome || '').toUpperCase().includes('SEMED') ||
        (e.nome || '').toLowerCase() === 'sede'
    );
  }, [escolas]);

  const pontoSede: PontoLocalizacao = useMemo(() => {
    if (semedUnidade) {
      const lat = parseCoordinate(semedUnidade.latitude);
      const lng = parseCoordinate(semedUnidade.longitude);
      if (lat !== null && lng !== null) {
        return {
          id: semedUnidade.id,
          nome: semedUnidade.nome.includes('SEMED')
            ? semedUnidade.nome
            : 'Secretaria Municipal de Educação (SEMED)',
          latitude: lat,
          longitude: lng,
          tipo: 'SECRETARIA',
          inep: semedUnidade.inep ?? '01',
          endereco: semedUnidade.endereco ?? 'Centro, Sapeaçu - BA',
          localizacao: semedUnidade.localizacao ?? 'URBANA',
        };
      }
    }
    return SEDE_SEMED_SAPEACU;
  }, [semedUnidade]);

  // Escolas válidas com coordenadas (excluindo a SEMED, que atua como Sede / Ponto de Partida oficial)
  const escolasValidas = useMemo(() => {
    const list: EscolaComCoordenadas[] = [];
    for (const e of escolas) {
      const isSemed =
        e.inep === '01' ||
        e.inep === '1' ||
        e.tipo === 'SECRETARIA' ||
        e.id === semedUnidade?.id ||
        (e.nome || '').toUpperCase().includes('SEMED');

      if (isSemed) continue;

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
  }, [escolas, semedUnidade]);

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
        (e.endereco || '').toLowerCase().includes(termo) ||
        (e.inep || '').toLowerCase().includes(termo)
      );
    });
  }, [escolasValidas, buscaDebounced, filtroZona]);

  // Adicionar/Remover escola do roteiro
  const toggleEscolaRoteiro = (ponto: PontoLocalizacao) => {
    setEscolasSelecionadas((prev) => {
      const existe = prev.some((item) => item.id === ponto.id);
      if (existe) {
        return prev.filter((item) => item.id !== ponto.id);
      } else {
        return [...prev, ponto];
      }
    });
    setResultadoRoteiro(null);
  };

  const removerEscolaRoteiro = (id: string) => {
    setEscolasSelecionadas((prev) => prev.filter((item) => item.id !== id));
    setResultadoRoteiro(null);
  };

  const limparRoteiro = () => {
    setEscolasSelecionadas([]);
    setResultadoRoteiro(null);
  };

  // Calcular Rota Otimizada
  const handleCalcularMelhorRoteiro = async () => {
    if (escolasSelecionadas.length === 0) return;

    setCalculandoRota(true);
    try {
      const consumoKmL = parseFloat(consumoKmLInput.replace(',', '.')) || 10.0;
      const precoLitro = parseFloat(precoCombustivelInput.replace(',', '.')) || 6.29;

      const pontoInicial = incluirSede ? pontoSede : escolasSelecionadas[0];
      const destinos = incluirSede
        ? escolasSelecionadas
        : escolasSelecionadas.filter((p) => p.id !== pontoInicial.id);

      const pontosOrdenados = otimizarOrdemVisitas(pontoInicial, destinos, retornarAoSede);
      const resultado = await obterRotaViariaReal(pontosOrdenados, consumoKmL, precoLitro);

      setResultadoRoteiro(resultado);

      // Ajusta o zoom do mapa para enquadrar todos os pontos do roteiro
      if (mapRef.current && resultado.pontosOrdenados.length > 0) {
        const bounds = L.latLngBounds(
          resultado.pontosOrdenados.map((p) => [p.latitude, p.longitude] as [number, number])
        );
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    } catch (err) {
      console.error('Erro ao calcular roteiro:', err);
    } finally {
      setCalculandoRota(false);
    }
  };

  // Centralizar mapa em Sapeaçu
  const recentralizarSapeacu = () => {
    if (mapRef.current) {
      mapRef.current.setView(SAPEACU_CENTER, 14, { animate: true });
    }
  };

  // Criação de Ícones Customizados
  const criarIconeEscola = (escola: EscolaComCoordenadas, ordem?: number) => {
    const isRural = (escola.localizacao || '').toUpperCase().includes('RURAL');
    const isEspecial = escola.tipo === 'ESPECIAL' || escola.nome.toUpperCase().includes('EMAEE');

    let bgColor = isRural ? '#f59e0b' : '#0284c7';
    let borderColor = isRural ? '#d97706' : '#0369a1';
    if (isEspecial) {
      bgColor = '#8b5cf6';
      borderColor = '#6d28d9';
    }

    const estaSelecionada = escolasSelecionadas.some((p) => p.id === escola.id);

    const badgeOrdemHtml =
      ordem !== undefined
        ? `<span style="position: absolute; top: -7px; right: -7px; background: #10b981; color: #ffffff; font-size: 11px; font-weight: 800; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">${ordem}</span>`
        : estaSelecionada
        ? `<span style="position: absolute; top: -6px; right: -6px; background: #38bdf8; color: #0f172a; font-size: 10px; font-weight: 900; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #ffffff; box-shadow: 0 2px 5px rgba(0,0,0,0.25);">✓</span>`
        : '';

    return L.divIcon({
      className: 'custom-escola-marker',
      html: `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
          <div style="width: 32px; height: 32px; border-radius: 12px; background: ${bgColor}; border: 2px solid ${borderColor}; box-shadow: 0 4px 12px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: #ffffff; transform: ${
        estaSelecionada ? 'scale(1.15)' : 'scale(1)'
      }; transition: all 0.2s ease;">
            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 22v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4"/><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2"/><path d="M18 5v17"/><path d="m4 6 8-4 8 4"/><path d="M6 5v17"/><circle cx="12" cy="9" r="2"/></svg>
          </div>
          ${badgeOrdemHtml}
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
        {/* Barra Superior com Pesquisa, Filtro de Zona e Botão Sapeaçu */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border p-3.5 rounded-2xl shadow-2xs">
          <div className="flex flex-1 items-center gap-2.5 min-w-[220px] bg-surface-2 dark:bg-secondary/40 px-3.5 py-2 rounded-xl border border-border">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Buscar escola por nome, endereço ou código INEP..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="bg-transparent border-none text-sm text-foreground placeholder:text-muted-foreground focus:outline-none w-full"
            />
          </div>

          {/* Filtro Urbana / Rural */}
          <div className="flex items-center gap-1 bg-surface-2 dark:bg-secondary/40 p-1 rounded-xl border border-border">
            <span className="text-xs font-medium text-muted-foreground px-2 flex items-center gap-1 hidden sm:flex">
              <Filter className="w-3.5 h-3.5" /> Zona:
            </span>
            <button
              type="button"
              onClick={() => setFiltroZona('todos')}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                filtroZona === 'todos'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
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
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Urbana (
              {
                escolasValidas.filter((e) =>
                  (e.localizacao || '').toUpperCase().includes('URBANA')
                ).length
              }
              )
            </button>
            <button
              type="button"
              onClick={() => setFiltroZona('RURAL')}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                filtroZona === 'RURAL'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Rural (
              {
                escolasValidas.filter((e) =>
                  (e.localizacao || '').toUpperCase().includes('RURAL')
                ).length
              }
              )
            </button>
          </div>

          <button
            type="button"
            onClick={recentralizarSapeacu}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20 dark:border-sky-500/30 rounded-xl hover:bg-sky-500/20 transition-colors cursor-pointer shadow-2xs"
            title="Recentralizar Mapa em Sapeaçu"
          >
            <MapPin className="w-3.5 h-3.5" />
            Sapeaçu - BA
          </button>
        </div>

        {/* Container do Mapa Leaflet */}
        <div className="w-full h-[580px] rounded-2xl overflow-hidden border border-border shadow-md relative z-0">
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
              <Marker
                position={[pontoSede.latitude, pontoSede.longitude]}
                icon={iconeSede}
              >
                <Popup className="custom-popup" autoPan={false}>
                  <div className="p-3.5 bg-card text-foreground rounded-xl border border-border min-w-[240px] shadow-lg">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                        Sede Administrativa
                      </span>
                      <span className="text-[10px] font-extrabold text-sky-600 dark:text-sky-400">
                        INEP: {pontoSede.inep ?? '01'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-bold text-sky-600 dark:text-sky-400 text-sm mb-1">
                      <Navigation className="w-4 h-4" />
                      Ponto de Partida / Chegada
                    </div>
                    <div className="text-xs font-bold text-foreground mb-1">
                      {pontoSede.nome}
                    </div>
                    {pontoSede.endereco && (
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>{pontoSede.endereco}</span>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            )}

            {escolasFiltradas.map((esc) => {
              const idxNoRoteiro = resultadoRoteiro?.pontosOrdenados.findIndex(
                (p) => p.id === esc.id
              );
              const numOrdem =
                idxNoRoteiro !== undefined && idxNoRoteiro !== -1 ? idxNoRoteiro + 1 : undefined;
              const estaSelecionada = escolasSelecionadas.some((p) => p.id === esc.id);
              const icone = criarIconeEscola(esc, numOrdem);

              return (
                <Marker key={esc.id} position={[esc.latitude, esc.longitude]} icon={icone}>
                  <Popup className="custom-popup" autoPan={false}>
                    <div className="p-3.5 bg-card text-foreground rounded-xl border border-border min-w-[240px] shadow-lg">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider',
                            (esc.localizacao || '').toUpperCase().includes('RURAL')
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                              : 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30'
                          )}
                        >
                          Zona {esc.localizacao ?? 'Urbana'}
                        </span>
                        {esc.inep && (
                          <span className="text-[10px] text-muted-foreground">INEP: {esc.inep}</span>
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-foreground leading-tight mb-1.5">
                        {esc.nome}
                      </h4>
                      {esc.endereco && (
                        <p className="text-xs text-muted-foreground mb-3 flex items-start gap-1">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
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
                            inep: esc.inep,
                          })
                        }
                        className={cn(
                          'w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs',
                          estaSelecionada
                            ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 hover:bg-rose-500/25'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
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

          {/* Legenda Flutuante com Suporte a Light/Dark */}
          <div className="absolute bottom-3 left-3 z-[1000] bg-card/95 backdrop-blur-md border border-border p-2.5 rounded-xl shadow-lg flex flex-wrap items-center gap-3 text-xs text-foreground font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-600 border border-white/50 shadow-2xs"></span>
              <span>SEMED (INEP 01)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-sky-500 border border-white/50 shadow-2xs"></span>
              <span>Urbana</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-amber-500 border border-white/50 shadow-2xs"></span>
              <span>Rural</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-purple-500 border border-white/50 shadow-2xs"></span>
              <span>EMAEE / Especial</span>
            </div>
          </div>
        </div>
      </div>

      {/* Coluna Lateral: Painel de Planejamento de Roteiro */}
      <div className="w-full xl:w-[380px] shrink-0 flex flex-col gap-4">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-2xs flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 dark:bg-sky-500/15 dark:border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <Route className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">Roteiro de Visitas</h3>
                <p className="text-xs text-muted-foreground">Melhor caminho & economia</p>
              </div>
            </div>
            {escolasSelecionadas.length > 0 && (
              <button
                type="button"
                onClick={limparRoteiro}
                className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors flex items-center gap-1 cursor-pointer font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" /> Limpar
              </button>
            )}
          </div>

          {/* Parâmetros de Partida & Veículo */}
          <div className="grid grid-cols-2 gap-3 bg-surface-2 dark:bg-secondary/40 p-3 rounded-xl border border-border">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                <Fuel className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" /> Consumo (km/L)
              </label>
              <input
                type="text"
                value={consumoKmLInput}
                onChange={(e) => setConsumoKmLInput(e.target.value)}
                placeholder="10.0"
                className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-sky-500 shadow-2xs font-semibold"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />{' '}
                Gasolina (R$/L)
              </label>
              <input
                type="text"
                value={precoCombustivelInput}
                onChange={(e) => setPrecoCombustivelInput(e.target.value)}
                placeholder="6.29"
                className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-emerald-500 shadow-2xs font-semibold"
              />
            </div>

            <div className="col-span-2 flex flex-col gap-1.5 pt-1">
              <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={incluirSede}
                  onChange={(e) => setIncluirSede(e.target.checked)}
                  className="rounded border-border text-sky-600 focus:ring-sky-500"
                />
                Partir da Secretaria (SEMED - INEP 01)
              </label>

              {incluirSede && (
                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={retornarAoSede}
                    onChange={(e) => setRetornarAoSede(e.target.checked)}
                    className="rounded border-border text-sky-600 focus:ring-sky-500"
                  />
                  Retornar à Secretaria no fim do roteiro
                </label>
              )}
            </div>
          </div>

          {/* Lista de Escolas Selecionadas */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">
                Escolas no Roteiro ({escolasSelecionadas.length})
              </span>
            </div>

            {escolasSelecionadas.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-border text-center text-muted-foreground text-xs flex flex-col items-center gap-1.5 bg-surface-2/40">
                <School className="w-6 h-6 text-muted-foreground/60" />
                <span>Nenhuma escola selecionada.</span>
                <span className="text-[11px] text-muted-foreground/80">
                  Clique nos marcadores no mapa ou selecione uma unidade.
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto pr-1">
                {escolasSelecionadas.map((esc, index) => (
                  <div
                    key={esc.id}
                    className="flex items-center justify-between bg-surface-2 dark:bg-secondary/40 border border-border px-3 py-2 rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="w-5 h-5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-400 font-bold flex items-center justify-center text-[10px] shrink-0">
                        {index + 1}
                      </span>
                      <span className="font-medium text-foreground truncate">{esc.nome}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removerEscolaRoteiro(esc.id)}
                      className="text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-1 cursor-pointer"
                      title="Remover"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botão de Calcular Rota Ótima */}
          <button
            type="button"
            disabled={escolasSelecionadas.length === 0 || calculandoRota}
            onClick={handleCalcularMelhorRoteiro}
            className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {calculandoRota ? (
              <span>Otimizando roteiro...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Calcular Melhor Roteiro
              </>
            )}
          </button>

          {/* Painel de Resultados do Roteiro */}
          {resultadoRoteiro && (
            <div className="flex flex-col gap-3 bg-surface-2 dark:bg-secondary/40 border border-sky-500/30 p-3.5 rounded-xl animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <span className="text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Roteiro
                  Otimizado
                </span>
                <a
                  href={resultadoRoteiro.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> Abrir no Google Maps
                </a>
              </div>

              {/* Indicadores de Consumo & Distância */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-card p-2.5 rounded-lg border border-border shadow-2xs">
                  <span className="text-[10px] text-muted-foreground block mb-0.5 font-medium">
                    Distância Total
                  </span>
                  <span className="text-sm font-extrabold text-foreground">
                    {resultadoRoteiro.distanciaTotalKm} km
                  </span>
                </div>
                <div className="bg-card p-2.5 rounded-lg border border-border shadow-2xs">
                  <span className="text-[10px] text-muted-foreground block mb-0.5 font-medium">
                    Gasolina Estimada
                  </span>
                  <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
                    {resultadoRoteiro.consumoLitros} L
                  </span>
                </div>
                <div className="bg-card p-2.5 rounded-lg border border-border shadow-2xs">
                  <span className="text-[10px] text-muted-foreground block mb-0.5 font-medium">
                    Custo Estimado
                  </span>
                  <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                    R$ {resultadoRoteiro.custoTotalReais.toFixed(2)}
                  </span>
                </div>
                <div className="bg-card p-2.5 rounded-lg border border-border shadow-2xs">
                  <span className="text-[10px] text-muted-foreground block mb-0.5 font-medium">
                    Tempo em Trânsito
                  </span>
                  <span className="text-sm font-extrabold text-violet-600 dark:text-violet-400">
                    ~{resultadoRoteiro.tempoEstimadoMinutos} min
                  </span>
                </div>
              </div>

              {/* Paradas Passo a Passo */}
              <div className="flex flex-col gap-1.5 pt-1">
                <span className="text-[11px] font-bold text-muted-foreground">
                  Ordem de Paradas:
                </span>
                <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto pr-1">
                  {resultadoRoteiro.pontosOrdenados.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-foreground">
                      <span className="w-4 h-4 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 font-bold text-[9px] flex items-center justify-center shrink-0">
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
