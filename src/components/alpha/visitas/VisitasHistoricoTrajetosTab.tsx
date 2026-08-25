'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  VisitasTrajeto,
  VisitasTrajetoResumo,
  VisitasVeiculo,
} from '@/types/visitas';
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
import { MapContainer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { OfflineTileLayer } from '@/components/map/OfflineTileLayer';
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

  const veicMap = new Map(veiculos.map((v) => [v.id, v.nome]));

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

  // Coordenadas da Polyline
  const polylineCoords = useMemo(() => {
    if (!trajetoDetalhado?.posicoes || trajetoDetalhado.posicoes.length === 0) return [];
    return trajetoDetalhado.posicoes.map((p) => [p.latitude, p.longitude] as [number, number]);
  }, [trajetoDetalhado]);

  // Objeto de Navegação Livre mapeado para o Replay Animado com Carrinho, Velocímetro e Relógio
  const navegacaoReplay = useMemo<NavegacaoLivreRegistro | null>(() => {
    if (!trajetoDetalhado) return null;
    const rawPontos = trajetoDetalhado.posicoes || [];
    return {
      id: trajetoDetalhado.id,
      funcionario_id: trajetoDetalhado.usuario_id || null,
      funcionario_nome: 'Agente / Servidor (Visitas)',
      veiculo_id: trajetoDetalhado.veiculo_id || null,
      titulo: (trajetoDetalhado as any).nome || `Trajeto - ${new Date(trajetoDetalhado.started_at).toLocaleDateString('pt-BR')}`,
      data_inicio: trajetoDetalhado.started_at,
      data_fim: trajetoDetalhado.ended_at || null,
      duracao_segundos: (trajetoDetalhado.moving_seconds || 0) + (trajetoDetalhado.visit_seconds || 0),
      distancia_metros: Number(trajetoDetalhado.distance_meters) || 0,
      velocidade_media_kmh: 0,
      velocidade_max_kmh: 0,
      pontos_gps: rawPontos.map((p: any) => ({
        latitude: Number(p.latitude) || 0,
        longitude: Number(p.longitude) || 0,
        timestamp: p.timestamp || new Date(trajetoDetalhado.started_at).getTime(),
        speedKmh: Number(p.speedKmh ?? (p.speed ? p.speed * 3.6 : 0)) || 0,
        heading: Number(p.heading) || 0,
        accuracy: Number(p.accuracy) || 10,
        distanceM: Number(p.distanceM) || 0,
      })),
      status: 'FINALIZADA',
      observacoes: (trajetoDetalhado as any).observacoes || null,
      sincronizado: true,
    };
  }, [trajetoDetalhado]);

  // Centro do Mapa do Percurso
  const centerMap = useMemo(() => {
    if (polylineCoords.length > 0) {
      return polylineCoords[0];
    }
    return [-12.7214, -39.1989] as [number, number];
  }, [polylineCoords]);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between bg-card border border-border p-4 rounded-2xl">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Navigation className="w-5 h-5 text-blue-400" />
            Histórico de Percursos e Auditoria de Campo
          </h2>
          <p className="text-xs text-muted-foreground">
            Visualize o itinerário percorrido, telemetria e combustível gasto, mesmo offline.
          </p>
        </div>

        <span className="text-xs font-semibold text-blue-300 bg-blue-950/60 px-3 py-1.5 rounded-xl border border-blue-800/40">
          {trajetosAtivos.length} trajeto(s)
        </span>
      </div>

      {trajetosAtivos.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-card/40 space-y-3">
          <Navigation className="w-10 h-10 text-muted-foreground mx-auto" />
          <div className="text-sm font-semibold text-foreground">
            Nenhum trajeto gravado ainda
          </div>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Inicie a navegação na aba "Rastreamento GPS" para gravar o primeiro percurso.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {trajetosAtivos.map((t) => (
            <div
              key={t.id}
              className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between gap-4 hover:border-blue-500/40 transition-all shadow-xs"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-blue-400 font-bold">
                      {t.modo === 'driving' ? (
                        <>
                          <Car className="w-3.5 h-3.5" />
                          <span>Veículo</span>
                        </>
                      ) : (
                        <>
                          <Footprints className="w-3.5 h-3.5" />
                          <span>A pé</span>
                        </>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
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

                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase font-bold border-blue-500/30 text-blue-400 bg-blue-500/10"
                  >
                    {(t.distance_meters / 1000).toFixed(2)} km
                  </Badge>
                </div>

                {/* Métricas do Card */}
                <div className="grid grid-cols-2 gap-2 bg-muted/40 p-2.5 rounded-xl text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">
                      Em Movimento
                    </span>
                    <strong className="text-foreground">
                      {formatarTempo(t.moving_seconds)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">
                      Em Paradas
                    </span>
                    <strong className="text-foreground">
                      {formatarTempo(t.visit_seconds)}
                    </strong>
                  </div>

                  {t.estimated_liters && (
                    <div>
                      <span className="text-[10px] text-muted-foreground block">
                        Combustível
                      </span>
                      <strong className="text-foreground">
                        {t.estimated_liters} L
                      </strong>
                    </div>
                  )}

                  {t.estimated_cost && (
                    <div>
                      <span className="text-[10px] text-muted-foreground block">
                        Custo Estimado
                      </span>
                      <strong className="text-emerald-400">
                        R$ {t.estimated_cost}
                      </strong>
                    </div>
                  )}
                </div>

                {t.veiculo_id && (
                  <div className="text-xs text-slate-300 flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-blue-400" />
                    <span>{veicMap.get(t.veiculo_id) ?? 'Veículo de Campo'}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border gap-2">
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAbrirDetalhes(t.id, 'replay')}
                    className="h-8 text-xs font-bold gap-1.5 bg-white/10 hover:bg-white/20 text-white border-white/20 cursor-pointer shadow-xs"
                    title="Simular percurso animado com carrinho, velocímetro e relógio"
                  >
                    <Play className="w-3.5 h-3.5 text-white" />
                    <span>Replay Animado</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleAbrirDetalhes(t.id, 'mapa')}
                    className="h-8 text-xs font-semibold gap-1.5 text-slate-300 hover:text-white cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
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
          ))}
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
            <div className="flex rounded-xl bg-muted/60 p-1 border border-border">
              <button
                type="button"
                onClick={() => setAbaDetalhe('replay')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  abaDetalhe === 'replay'
                    ? 'bg-white text-black shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
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
                    ? 'bg-white text-black shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
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
                    ? 'bg-white text-black shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
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
                    <OfflineTileLayer />

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
