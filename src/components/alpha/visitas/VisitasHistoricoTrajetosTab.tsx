'use client';

import React, { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  VisitasTrajeto,
  VisitasTrajetoResumo,
  VisitasVeiculo,
} from '@/types/visitas';
import { visitasOfflineService } from '@/lib/visitas/visitasOfflineService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StandardDialog } from '@/components/ui/standard-dialog';
import {
  Car,
  Clock,
  Navigation,
  Calendar,
  Fuel,
  DollarSign,
  Trash2,
  Eye,
  MapPin,
  Footprints,
  Sparkles,
  Map as MapIcon,
  HardDrive,
  CheckCircle2,
  Play,
} from 'lucide-react';
import { MapContainer, TileLayer, LayersControl, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapaReplayPercurso } from '@/components/map/MapWrapper';
import { NavegacaoLivreRegistro } from '@/lib/offlineRouteStore';

// Ícones dos Marcadores do Percurso
const iconeInicio = L.divIcon({
  className: 'custom-track-start-marker',
  html: `
    <div class="w-6 h-6 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center text-white text-[10px] font-bold">
      A
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const iconeFim = L.divIcon({
  className: 'custom-track-end-marker',
  html: `
    <div class="w-6 h-6 rounded-full bg-rose-500 border-2 border-white shadow-lg flex items-center justify-center text-white text-[10px] font-bold">
      B
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const iconeParada = L.divIcon({
  className: 'custom-track-stop-marker',
  html: `
    <div class="w-5 h-5 rounded-full bg-amber-500 border-2 border-slate-900 shadow-md flex items-center justify-center text-white text-[9px] font-bold">
      📍
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

interface VisitasHistoricoTrajetosTabProps {
  trajetos: VisitasTrajetoResumo[];
  veiculos: VisitasVeiculo[];
  onDeleteTrajeto: (trajetoId: string) => Promise<void>;
  onVerDetalhesTrajeto: (trajetoId: string) => Promise<VisitasTrajeto | null>;
}

export function VisitasHistoricoTrajetosTab({
  trajetos = [],
  veiculos = [],
  onDeleteTrajeto,
  onVerDetalhesTrajeto,
}: VisitasHistoricoTrajetosTabProps) {
  const [modalDetalheAberto, setModalDetalheAberto] = useState(false);
  const [trajetoDetalhado, setTrajetoDetalhado] = useState<VisitasTrajeto | null>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [abaDetalhe, setAbaDetalhe] = useState<'replay' | 'mapa' | 'metricas'>('replay');
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const veicMap = new Map(veiculos.map((v) => [v.id, v.nome]));

  useEffect(() => {
    const checkPendentes = async () => {
      try {
        const ids = await visitasOfflineService.obterIdsPendentes();
        setPendingIds(ids);
      } catch {}
    };
    checkPendentes();
    const interval = setInterval(checkPendentes, 4000);
    return () => clearInterval(interval);
  }, []);

  const formatarTempo = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) return `${h}h ${m}min`;
    return `${m}min ${s}s`;
  };

  const handleAbrirDetalhes = async (trajetoId: string, abaInicial: 'replay' | 'mapa' | 'metricas' = 'mapa') => {
    setCarregandoDetalhe(true);
    setModalDetalheAberto(true);
    setAbaDetalhe(abaInicial);
    try {
      const detalhe = await onVerDetalhesTrajeto(trajetoId);
      setTrajetoDetalhado(detalhe);
    } finally {
      setCarregandoDetalhe(false);
    }
  };

  const trajetosAtivos = trajetos.filter((t) => !t.deleted_at);

  // Normaliza lista de posições do trajeto (aceita array ou string JSON)
  const posicoesNormalizadas = useMemo<any[]>(() => {
    if (!trajetoDetalhado?.posicoes) return [];
    let raw: any = trajetoDetalhado.posicoes;
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw);
      } catch {
        raw = [];
      }
    }
    return Array.isArray(raw) ? raw : [];
  }, [trajetoDetalhado]);

  // Coordenadas da Polyline
  const polylineCoords = useMemo(() => {
    return posicoesNormalizadas
      .map((p) => [Number(p.latitude), Number(p.longitude)] as [number, number])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0);
  }, [posicoesNormalizadas]);

  // Objeto de Navegação Livre mapeado para o Replay Animado com Carrinho, Velocímetro e Relógio
  const navegacaoReplay = useMemo<NavegacaoLivreRegistro | null>(() => {
    if (!trajetoDetalhado) return null;

    const dataInicioStr = trajetoDetalhado.started_at || new Date().toISOString();
    const dataInicioObj = new Date(dataInicioStr);
    const dataValida = !isNaN(dataInicioObj.getTime());
    const dataInicioTimestamp = dataValida ? dataInicioObj.getTime() : Date.now();
    const dataFormatada = dataValida ? dataInicioObj.toLocaleDateString('pt-BR') : 'Data não informada';

    return {
      id: trajetoDetalhado.id,
      funcionario_id: trajetoDetalhado.usuario_id || null,
      funcionario_nome: 'Agente / Servidor (Visitas)',
      veiculo_id: trajetoDetalhado.veiculo_id || null,
      titulo: (trajetoDetalhado as any).nome || `Trajeto - ${dataFormatada}`,
      data_inicio: dataInicioStr,
      data_fim: trajetoDetalhado.ended_at || null,
      duracao_segundos: (Number(trajetoDetalhado.moving_seconds) || 0) + (Number(trajetoDetalhado.visit_seconds) || 0),
      distancia_metros: Number(trajetoDetalhado.distance_meters) || 0,
      velocidade_media_kmh: 0,
      velocidade_max_kmh: 0,
      pontos_gps: posicoesNormalizadas
        .map((p: any) => ({
          latitude: Number(p.latitude) || 0,
          longitude: Number(p.longitude) || 0,
          timestamp: Number(p.timestamp) || dataInicioTimestamp,
          speedKmh: Number(p.speedKmh ?? (p.speed ? p.speed * 3.6 : 0)) || 0,
          heading: Number(p.heading) || 0,
          accuracy: Number(p.accuracy) || 10,
          distanceM: Number(p.distanceM) || 0,
        }))
        .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && p.latitude !== 0),
      status: 'FINALIZADA',
      observacoes: (trajetoDetalhado as any).observacoes || null,
      sincronizado: true,
    };
  }, [trajetoDetalhado, posicoesNormalizadas]);

  // Centro do Mapa do Percurso
  const centerMap = useMemo<[number, number]>(() => {
    if (polylineCoords.length > 0 && Number.isFinite(polylineCoords[0][0]) && Number.isFinite(polylineCoords[0][1])) {
      return polylineCoords[0];
    }
    return [-12.7214, -39.1989];
  }, [polylineCoords]);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between bg-white border border-sidebar-border p-4 rounded-2xl flex-wrap gap-3 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-sidebar-foreground flex items-center gap-2">
            <Navigation className="w-5 h-5 text-sidebar-primary" />
            Histórico de Percursos e Auditoria de Campo
          </h2>
          <p className="text-xs text-muted-foreground">
            Visualize o itinerário percorrido, telemetria e combustível gasto, mesmo offline no celular.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pendingIds.size > 0 && (
            <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 flex items-center gap-1.5 animate-pulse">
              <HardDrive className="w-3.5 h-3.5 text-amber-600" />
              {pendingIds.size} rota(s) local(is)
            </span>
          )}
          <span className="text-xs font-semibold text-sidebar-accent-foreground bg-sidebar-accent px-3 py-1.5 rounded-xl border border-sidebar-border">
            {trajetosAtivos.length} trajeto(s) no total
          </span>
        </div>
      </div>

      {trajetosAtivos.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-sidebar-border rounded-2xl bg-white space-y-3">
          <Navigation className="w-10 h-10 text-muted-foreground mx-auto" />
          <div className="text-sm font-semibold text-sidebar-foreground">
            Nenhum trajeto gravado ainda
          </div>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Inicie a navegação na aba "Rastreamento GPS" para gravar o primeiro percurso.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {trajetosAtivos.map((t) => {
            const isPendente = pendingIds.has(t.id);
            const titulo = (t as any).nome || `Trajeto - ${new Date(t.started_at).toLocaleDateString('pt-BR')}`;
            return (
              <div
                key={t.id}
                className="bg-white border border-sidebar-border rounded-2xl p-4 flex flex-col justify-between gap-4 hover:border-sidebar-primary/40 transition-all shadow-xs"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-sidebar-foreground truncate" title={titulo}>
                        {titulo}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1 text-[11px] text-sidebar-primary font-semibold">
                          {t.modo === 'driving' ? (
                            <>
                              <Car className="w-3 h-3" />
                              <span>Veículo</span>
                            </>
                          ) : (
                            <>
                              <Footprints className="w-3 h-3" />
                              <span>A pé</span>
                            </>
                          )}
                        </div>
                        <span className="text-slate-400 text-xs">•</span>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(t.started_at).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase font-bold border-sidebar-border text-sidebar-accent-foreground bg-sidebar-accent"
                      >
                        {(t.distance_meters / 1000).toFixed(2)} km
                      </Badge>
                      {isPendente ? (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                          <HardDrive className="w-2.5 h-2.5 text-amber-600" />
                          No Aparelho
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                          Nuvem
                        </span>
                      )}
                    </div>
                  </div>

                {/* Métricas do Card */}
                <div className="grid grid-cols-2 gap-2 bg-sidebar-accent/30 border border-sidebar-border p-2.5 rounded-xl text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-sans">
                      Em Movimento
                    </span>
                    <strong className="text-sidebar-foreground">
                      {formatarTempo(t.moving_seconds)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-sans">
                      Em Paradas
                    </span>
                    <strong className="text-sidebar-foreground">
                      {formatarTempo(t.visit_seconds)}
                    </strong>
                  </div>

                  {t.estimated_liters && (
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-sans">
                        Combustível
                      </span>
                      <strong className="text-sidebar-foreground">
                        {t.estimated_liters} L
                      </strong>
                    </div>
                  )}

                  {t.estimated_cost && (
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-sans">
                        Custo Estimado
                      </span>
                      <strong className="text-emerald-700">
                        R$ {t.estimated_cost}
                      </strong>
                    </div>
                  )}
                </div>

                {t.veiculo_id && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-sidebar-primary" />
                    <span>{veicMap.get(t.veiculo_id) ?? 'Veículo de Campo'}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-sidebar-border gap-2">
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    onClick={() => handleAbrirDetalhes(t.id, 'replay')}
                    className="h-8 text-xs font-bold gap-1.5 bg-sidebar-primary hover:bg-sidebar-primary/90 text-white cursor-pointer shadow-xs"
                    title="Simular percurso animado com carrinho, velocímetro e relógio"
                  >
                    <Play className="w-3.5 h-3.5 text-white" />
                    <span>Replay Animado</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAbrirDetalhes(t.id, 'mapa')}
                    className="h-8 text-xs font-semibold gap-1.5 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/50 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Mapa</span>
                  </Button>
                </div>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onDeleteTrajeto(t.id)}
                  className="h-8 w-8 p-0 cursor-pointer"
                  title="Excluir Trajeto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* ── Modal de Detalhes e Replay no Mapa Offline ── */}
      <StandardDialog
        open={modalDetalheAberto}
        onOpenChange={setModalDetalheAberto}
        title="Auditoria e Replay do Percurso (Offline)"
        description="Visualize a rota percorrida pelo GPS, reproduza o carrinho animado com velocímetro e analise paradas."
        maxWidth="sm:max-w-4xl"
      >
        {carregandoDetalhe ? (
          <div className="py-16 text-center text-xs text-muted-foreground">
            Carregando waypoints e dados do percurso...
          </div>
        ) : trajetoDetalhado ? (
          <div className="space-y-4 pt-2">
            {/* Seletor de visualização */}
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setAbaDetalhe('replay')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  abaDetalhe === 'replay'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                Replay Animado (Carrinho &amp; Velocímetro)
              </button>
              <button
                type="button"
                onClick={() => setAbaDetalhe('mapa')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  abaDetalhe === 'mapa'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                Traçado Geral ({polylineCoords.length} pts)
              </button>
              <button
                type="button"
                onClick={() => setAbaDetalhe('metricas')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  abaDetalhe === 'metricas'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Telemetria ({trajetoDetalhado.visitas_registradas?.length ?? 0} paradas)
              </button>
            </div>

            {abaDetalhe === 'replay' ? (
              <div className="w-full">
                <MapaReplayPercurso
                  navegacaoLivre={navegacaoReplay}
                  tituloPercurso={(trajetoDetalhado as any).nome || 'Replay da Rota'}
                />
              </div>
            ) : abaDetalhe === 'mapa' ? (
              <div className="relative w-full h-[400px] rounded-xl overflow-hidden border border-border shadow-inner bg-zinc-950">
                {polylineCoords.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                    Sem waypoints georreferenciados para este percurso.
                  </div>
                ) : (
                  <MapContainer
                    key={trajetoDetalhado.id}
                    center={centerMap}
                    zoom={15}
                    scrollWheelZoom={true}
                    style={{ height: '100%', width: '100%' }}
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
                      <LayersControl.BaseLayer name="Google Ruas">
                        <TileLayer
                          attribution="&copy; Google Maps"
                          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                          maxZoom={20}
                          keepBuffer={6}
                          updateWhenIdle={true}
                        />
                      </LayersControl.BaseLayer>
                      <LayersControl.BaseLayer name="Google Terreno">
                        <TileLayer
                          attribution="&copy; Google Maps"
                          url="https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}"
                          maxZoom={20}
                          keepBuffer={6}
                          updateWhenIdle={true}
                        />
                      </LayersControl.BaseLayer>
                      <LayersControl.BaseLayer name="Mapa de Ruas (OpenStreetMap)">
                        <TileLayer
                          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
                          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                          maxZoom={19}
                          keepBuffer={8}
                          updateWhenIdle={true}
                        />
                      </LayersControl.BaseLayer>
                    </LayersControl>

                    {/* Linha do Trajeto */}
                    <Polyline
                      positions={polylineCoords}
                      pathOptions={{
                        color: '#3b82f6',
                        weight: 4,
                        opacity: 0.85,
                      }}
                    />

                    {/* Marcador de Início */}
                    {polylineCoords.length > 0 && (
                      <Marker position={polylineCoords[0]} icon={iconeInicio}>
                        <Popup className="custom-leaflet-popup">
                          <div className="p-1 text-xs">
                            <strong>Início do Percurso</strong>
                          </div>
                        </Popup>
                      </Marker>
                    )}

                    {/* Marcador de Fim */}
                    {polylineCoords.length > 1 && (
                      <Marker
                        position={polylineCoords[polylineCoords.length - 1]}
                        icon={iconeFim}
                      >
                        <Popup className="custom-leaflet-popup">
                          <div className="p-1 text-xs">
                            <strong>Fim do Percurso</strong>
                          </div>
                        </Popup>
                      </Marker>
                    )}

                    {/* Marcadores de Paradas */}
                    {trajetoDetalhado.visitas_registradas?.map((v, idx) => (
                      <Marker
                        key={v.id ?? idx}
                        position={[v.latitude, v.longitude]}
                        icon={iconeParada}
                      >
                        <Popup className="custom-leaflet-popup">
                          <div className="p-1 text-xs space-y-1">
                            <strong className="text-foreground">
                              {v.areaNome ?? `Parada ${idx + 1}`}
                            </strong>
                            <div className="text-[10px] text-muted-foreground">
                              Duração: {formatarTempo(v.durationSeconds)}
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-muted/40 p-3 rounded-xl text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Distância</span>
                    <strong className="text-foreground">
                      {(trajetoDetalhado.distance_meters / 1000).toFixed(2)} km
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Em Movimento</span>
                    <strong className="text-foreground">
                      {formatarTempo(trajetoDetalhado.moving_seconds)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Combustível</span>
                    <strong className="text-foreground">
                      {trajetoDetalhado.estimated_liters ?? 0} L
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Custo Total</span>
                    <strong className="text-emerald-400">
                      R$ {trajetoDetalhado.estimated_cost ?? 0}
                    </strong>
                  </div>
                </div>

                {/* Paradas / Visitas Detectadas */}
                <div>
                  <span className="text-xs font-bold text-foreground block mb-2">
                    Paradas Detectadas ({trajetoDetalhado.visitas_registradas?.length ?? 0})
                  </span>
                  {(!trajetoDetalhado.visitas_registradas ||
                    trajetoDetalhado.visitas_registradas.length === 0) ? (
                    <div className="p-3 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                      Nenhuma parada prolongada registrada durante este trajeto.
                    </div>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-1.5 border border-border rounded-xl p-2">
                      {trajetoDetalhado.visitas_registradas.map((v, i) => (
                        <div
                          key={v.id ?? i}
                          className="p-2 rounded-lg bg-muted/40 border border-border text-xs flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <div>
                              <div className="font-bold text-foreground">
                                {v.areaNome ?? `Parada ${i + 1}`}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                {v.latitude.toFixed(5)}, {v.longitude.toFixed(5)}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {formatarTempo(v.durationSeconds)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setModalDetalheAberto(false)}
                className="h-8 text-xs"
              >
                Fechar
              </Button>
            </div>
          </div>
        ) : null}
      </StandardDialog>
    </div>
  );
}
