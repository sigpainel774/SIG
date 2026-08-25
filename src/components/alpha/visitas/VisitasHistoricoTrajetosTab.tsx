'use client';

import React, { useState } from 'react';
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
  Play,
  Footprints,
  Sparkles,
} from 'lucide-react';

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

  const veicMap = new Map(veiculos.map((v) => [v.id, v.nome]));

  const formatarTempo = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) return `${h}h ${m}min`;
    return `${m}min ${s}s`;
  };

  const handleAbrirDetalhes = async (trajetoId: string) => {
    setCarregandoDetalhe(true);
    setModalDetalheAberto(true);
    try {
      const detalhe = await onVerDetalhesTrajeto(trajetoId);
      setTrajetoDetalhado(detalhe);
    } finally {
      setCarregandoDetalhe(false);
    }
  };

  const trajetosAtivos = trajetos.filter((t) => !t.deleted_at);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between bg-card border border-border p-4 rounded-2xl">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Navigation className="w-5 h-5 text-blue-400" />
            Histórico de Percursos e Auditoria de Campo
          </h2>
          <p className="text-xs text-muted-foreground">
            Visualize o histórico de itinerários percorridos, telemetria e combustível gasto.
          </p>
        </div>

        <span className="text-xs font-semibold text-blue-300 bg-blue-950/60 px-3 py-1.5 rounded-xl border border-blue-800/40">
          {trajetosAtivos.length} trajeto(s) gravado(s)
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAbrirDetalhes(t.id)}
                  className="h-8 text-xs font-semibold gap-1.5 text-blue-300 hover:bg-blue-950/30 border-blue-500/40"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Ver Detalhes
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onDeleteTrajeto(t.id)}
                  className="h-8 w-8 p-0"
                  title="Excluir Trajeto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal de Detalhes do Trajeto ── */}
      <StandardDialog
        open={modalDetalheAberto}
        onOpenChange={setModalDetalheAberto}
        title="Detalhes do Percurso de Campo"
        description="Telemetria e paradas registradas durante o trajeto."
        className="sm:max-w-[560px]"
      >
        {carregandoDetalhe ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            Carregando waypoints e paradas do trajeto...
          </div>
        ) : trajetoDetalhado ? (
          <div className="space-y-4 pt-2">
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
                Paradas e Visitas Detectadas ({trajetoDetalhado.visitas_registradas?.length ?? 0})
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
                        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
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
