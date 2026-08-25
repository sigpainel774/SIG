'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet';
import { OfflineTileLayer } from '@/components/map/OfflineTileLayer';
import { visitasOfflineService } from '@/lib/visitas/visitasOfflineService';
import L from 'leaflet';
import {
  Play,
  Pause,
  Clock,
  Gauge,
  MapPin,
  Car,
  Crosshair,
  Fuel,
  DollarSign,
  Footprints,
  Save,
  Radio,
  Sliders,
} from 'lucide-react';
import { VisitasConfigModal } from './VisitasConfigModal';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { StandardDialog } from '@/components/ui/standard-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  VisitasArea,
  VisitasVeiculo,
  VisitasRoteiro,
  TrackWaypoint,
  RouteVisit,
  TravelMode,
} from '@/types/visitas';
import { RouteTrackerManager } from '@/lib/visitas/routeTrackerManager';
import { calcularBearing } from '@/lib/visitas/areaCalculator';
import {
  obterVisitasConfig,
  gerarIconeLeafletCursor,
  VisitasConfig,
} from '@/lib/visitas/visitasConfigService';

interface VisitasNavegacaoLiveTabProps {
  areas?: VisitasArea[];
  veiculos?: VisitasVeiculo[];
  roteiroAtivo?: VisitasRoteiro | null;
  onSalvarTrajeto: (trajetoData: any) => Promise<void>;
}

// Helper para centralizar a câmera suavemente no veículo
function MapFollower({
  posicao,
  seguir,
}: {
  posicao: { lat: number; lng: number } | null;
  seguir: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (posicao && seguir) {
      map.panTo([posicao.lat, posicao.lng], { animate: true, duration: 0.6 });
    }
  }, [posicao, seguir, map]);
  return null;
}

export default function VisitasNavegacaoLiveTab({
  areas = [],
  veiculos = [],
  roteiroAtivo,
  onSalvarTrajeto,
}: VisitasNavegacaoLiveTabProps) {
  // Ciclo de vida da navegação
  const [status, setStatus] = useState<'INATIVO' | 'EM_ANDAMENTO' | 'PAUSADO'>('INATIVO');
  const [modo, setModo] = useState<TravelMode>('driving');
  const [veiculoId, setVeiculoId] = useState<string>(roteiroAtivo?.veiculo_id ?? 'nenhum');
  const [seguirCarro, setSeguirCarro] = useState(true);

  // Telemetria em tempo real
  const [posicaoAtual, setPosicaoAtual] = useState<{
    lat: number;
    lng: number;
    speedKmh: number;
    heading: number;
    accuracy: number;
  } | null>(null);

  const [distanciaMetros, setDistanciaMetros] = useState(0);
  const [duracaoSegundos, setDuracaoSegundos] = useState(0);
  const [tempoMovimento, setTempoMovimento] = useState(0);
  const [tempoParadas, setTempoParadas] = useState(0);
  const [pontosGps, setPontosGps] = useState<TrackWaypoint[]>([]);
  const [visitasDetectadas, setVisitasDetectadas] = useState<RouteVisit[]>([]);

  const [visitasConfig, setVisitasConfig] = useState<VisitasConfig>(obterVisitasConfig);

  useEffect(() => {
    const handleConfigUpdate = (e: any) => {
      if (e?.detail) {
        setVisitasConfig(e.detail);
      } else {
        setVisitasConfig(obterVisitasConfig());
      }
    };
    window.addEventListener('sig_visitas_config_updated', handleConfigUpdate);
    return () => window.removeEventListener('sig_visitas_config_updated', handleConfigUpdate);
  }, []);

  // Modal de salvamento e configurações
  const [modalSalvarAberto, setModalSalvarAberto] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [tituloTrajeto, setTituloTrajeto] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);

  // REFS BLINDADOS (Elimina erros de closure stale e race conditions — ES-07)
  const trackerRef = useRef<RouteTrackerManager | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const statusRef = useRef<'INATIVO' | 'EM_ANDAMENTO' | 'PAUSADO'>('INATIVO');
  const velocidadeMaxRef = useRef<number>(0);
  const isMounted = useRef(true);

  statusRef.current = status;

  const veiculoSelecionado = useMemo(() => {
    return veiculos.find((v) => v.id === veiculoId) ?? null;
  }, [veiculos, veiculoId]);

  // Screen Wake Lock API
  const solicitarWakeLock = useCallback(async () => {
    if (typeof window !== 'undefined' && 'wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch {}
    }
  }, []);

  const liberarWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {}
      wakeLockRef.current = null;
    }
  }, []);

  // Handler do GPS blindado contra closure stale
  const handleGpsPosition = useCallback(
    (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy, heading: rawHeading, speed } = pos.coords;
      const speedMps = speed !== null && speed >= 0 ? speed : null;
      const speedKmh = speedMps !== null ? Number((speedMps * 3.6).toFixed(1)) : 0;
      const timestamp = pos.timestamp;

      if (accuracy > 40) return; // Filtra leituras de baixa precisão

      let heading = isNaN(rawHeading ?? NaN) ? 0 : (rawHeading ?? 0);

      // Se o rastreador estiver ativo, processa via RouteTrackerManager
      if (trackerRef.current && statusRef.current === 'EM_ANDAMENTO') {
        trackerRef.current.addPosition(
          latitude,
          longitude,
          accuracy,
          speedMps,
          heading,
          timestamp
        );

        const currentPos = trackerRef.current.getPositions();
        setPontosGps(currentPos);
        setDistanciaMetros(trackerRef.current.getDistanceMeters());
        setTempoMovimento(trackerRef.current.getMovingSeconds());
        setTempoParadas(trackerRef.current.getVisitSeconds());
        setVisitasDetectadas(trackerRef.current.getVisits());

        if (speedKmh > velocidadeMaxRef.current) {
          velocidadeMaxRef.current = speedKmh;
        }
      }

      setPosicaoAtual({
        lat: latitude,
        lng: longitude,
        speedKmh,
        heading,
        accuracy: Math.round(accuracy),
      });
    },
    []
  );

  // Iniciar Navegação
  const iniciarNavegacao = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      toast.error('Seu dispositivo não possui suporte a GPS.');
      return;
    }

    const novoId = crypto.randomUUID();
    trackerRef.current = new RouteTrackerManager(
      novoId,
      modo,
      veiculoSelecionado,
      areas
    );

    solicitarWakeLock();
    setStatus('EM_ANDAMENTO');
    setSeguirCarro(true);
    setPontosGps([]);
    setDistanciaMetros(0);
    setDuracaoSegundos(0);
    setTempoMovimento(0);
    setTempoParadas(0);
    velocidadeMaxRef.current = 0;

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleGpsPosition,
      (err) => {
        toast.warning('Aguardando sinal estável do satélite GPS...');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000,
      }
    );

    toast.success('Rastreamento de campo iniciado!', { icon: '🛰️' });
  };

  // Cronômetro da sessão
  useEffect(() => {
    if (status === 'EM_ANDAMENTO') {
      timerIntervalRef.current = setInterval(() => {
        setDuracaoSegundos((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [status]);

  // Pausar / Retomar / Finalizar
  const pausarNavegacao = () => {
    setStatus('PAUSADO');
    toast.info('Rastreamento pausado.');
  };

  const retomarNavegacao = () => {
    solicitarWakeLock();
    setStatus('EM_ANDAMENTO');
    setSeguirCarro(true);
    toast.success('Rastreamento retomado!');
  };

  const abrirModalSalvar = () => {
    setStatus('PAUSADO');
    const agora = new Date();
    setTituloTrajeto(
      `Trajeto - ${agora.toLocaleDateString('pt-BR')} ${agora.toLocaleTimeString(
        'pt-BR',
        { hour: '2-digit', minute: '2-digit' }
      )}`
    );
    setModalSalvarAberto(true);
  };

  const handleConfirmarSalvamento = async () => {
    if (!tituloTrajeto.trim()) return;

    setSalvando(true);
    try {
      const trajetoFinal = trackerRef.current
        ? trackerRef.current.finish()
        : {
            id: crypto.randomUUID(),
            modo,
            started_at: new Date().toISOString(),
            ended_at: new Date().toISOString(),
            distance_meters: distanciaMetros,
            moving_seconds: tempoMovimento,
            visit_seconds: tempoParadas,
            posicoes: pontosGps,
            visitas_registradas: visitasDetectadas,
          };

      const payload = {
        ...trajetoFinal,
        nome: tituloTrajeto.trim(),
        roteiro_id: roteiroAtivo?.id ?? null,
        veiculo_id: veiculoSelecionado?.id ?? null,
        observacoes: observacoes.trim() || null,
      };

      await onSalvarTrajeto(payload);

      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      liberarWakeLock();

      setStatus('INATIVO');
      setPontosGps([]);
      setDistanciaMetros(0);
      setDuracaoSegundos(0);
      setModalSalvarAberto(false);
      toast.success('Percurso gravado e salvo com sucesso!');
    } finally {
      if (isMounted.current) setSalvando(false);
    }
  };

  // Limpeza ao desmontar
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      liberarWakeLock();
    };
  }, [liberarWakeLock]);

  // Cálculos de combustível estimados ao vivo
  const litrosEstimados = useMemo(() => {
    if (modo === 'driving' && veiculoSelecionado && veiculoSelecionado.consumo_km_l > 0) {
      const distKm = distanciaMetros / 1000;
      return (distKm / veiculoSelecionado.consumo_km_l).toFixed(2);
    }
    return '0.00';
  }, [distanciaMetros, modo, veiculoSelecionado]);

  const custoEstimado = useMemo(() => {
    if (modo === 'driving' && veiculoSelecionado) {
      return (Number(litrosEstimados) * veiculoSelecionado.preco_litro).toFixed(2);
    }
    return '0.00';
  }, [litrosEstimados, modo, veiculoSelecionado]);

  const formatarTempo = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
      .toString()
      .padStart(2, '0')}`;
  };

  const polylineCoords = useMemo<[number, number][]>(() => {
    return pontosGps.map((p) => [p.latitude, p.longitude]);
  }, [pontosGps]);

  const defaultCenter = useMemo<[number, number]>(() => {
    if (posicaoAtual) return [posicaoAtual.lat, posicaoAtual.lng];
    return [-12.7214, -39.1989]; // Sapeaçu-BA
  }, [posicaoAtual]);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* ── Painel HUD de Instrumentos de Campo ── */}
      <div className="bg-card border border-border p-4 rounded-2xl shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Velocímetro Digital */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center border transition-all shrink-0',
              status === 'EM_ANDAMENTO'
                ? 'bg-blue-500/15 border-blue-500/30 text-blue-400 animate-pulse'
                : status === 'PAUSADO'
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                : 'bg-muted border-border text-muted-foreground'
            )}
          >
            <Gauge className="w-7 h-7" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                Velocidade
              </span>
              <span
                className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full font-bold uppercase',
                  status === 'EM_ANDAMENTO'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : status === 'PAUSADO'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {status === 'EM_ANDAMENTO'
                  ? 'Gravando'
                  : status === 'PAUSADO'
                  ? 'Pausado'
                  : 'Pronto'}
              </span>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-mono font-black text-foreground">
                {posicaoAtual ? posicaoAtual.speedKmh.toFixed(0) : '0'}
              </span>
              <span className="text-xs font-bold text-muted-foreground uppercase">
                km/h
              </span>
            </div>
          </div>
        </div>

        {/* Métricas Acumuladas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/40 border border-border p-3 rounded-xl flex-1 max-w-2xl">
          <div>
            <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3 text-blue-400" />
              Tempo Total
            </span>
            <span className="text-sm font-mono font-bold text-foreground">
              {formatarTempo(duracaoSegundos)}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
              <Car className="w-3 h-3 text-emerald-400" />
              Distância
            </span>
            <span className="text-sm font-mono font-bold text-foreground">
              {(distanciaMetros / 1000).toFixed(2)} km
            </span>
          </div>

          <div>
            <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
              <Fuel className="w-3 h-3 text-amber-400" />
              Combustível
            </span>
            <span className="text-sm font-mono font-bold text-foreground">
              {litrosEstimados} L
            </span>
          </div>

          <div>
            <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-emerald-400" />
              Custo Estimado
            </span>
            <span className="text-sm font-mono font-bold text-foreground">
              R$ {custoEstimado}
            </span>
          </div>
        </div>

        {/* Controles de Seguir, Modo e Configurações */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsConfigOpen(true)}
            className="h-9 text-xs font-bold gap-1.5 rounded-xl border border-border hover:border-violet-500/40 text-muted-foreground hover:text-violet-400 cursor-pointer"
            title="Configurar Sensibilidade e Anti-Duplicação de Visitas"
          >
            <Sliders className="w-4 h-4 text-violet-400" />
            <span className="hidden sm:inline">Calibrar Visitas</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setSeguirCarro(!seguirCarro)}
            className={cn(
              'h-9 text-xs font-bold gap-1.5 rounded-xl border',
              seguirCarro
                ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                : 'text-muted-foreground'
            )}
          >
            <Crosshair className={cn('w-4 h-4', seguirCarro && 'animate-spin')} />
            {seguirCarro ? 'Seguindo GPS' : 'Câmera Livre'}
          </Button>
        </div>
      </div>

      {/* ── Mapa Interativo Leaflet ao Vivo ── */}
      <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-border shadow-2xl bg-zinc-950">
        <MapContainer
          center={defaultCenter}
          zoom={16}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <OfflineTileLayer />

          <MapFollower
            posicao={posicaoAtual ? { lat: posicaoAtual.lat, lng: posicaoAtual.lng } : null}
            seguir={seguirCarro}
          />

          {/* Polyline do Trajeto em Tempo Real */}
          {polylineCoords.length > 1 && (
            <>
              <Polyline
                positions={polylineCoords}
                color="#0284c7"
                weight={8}
                opacity={0.4}
                lineCap="round"
                lineJoin="round"
              />
              <Polyline
                positions={polylineCoords}
                color="#38bdf8"
                weight={5}
                opacity={0.95}
                lineCap="round"
                lineJoin="round"
              />
            </>
          )}

          {/* Marcador do Veículo / Usuário com Ícone Customizado */}
          {posicaoAtual && (
            <Marker
              position={[posicaoAtual.lat, posicaoAtual.lng]}
              icon={gerarIconeLeafletCursor(visitasConfig, posicaoAtual.heading, {
                tamanho: 48,
                mostrarRadar: true,
                corPulso: 'bg-sky-500/30',
              })}
              zIndexOffset={1000}
            >
              <Popup className="custom-leaflet-popup">
                <div className="p-2 text-xs">
                  <div className="font-bold text-foreground">Sua Localização</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Velocidade: <strong>{posicaoAtual.speedKmh} km/h</strong>
                  </div>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* ── Barra de Controle de Gravação Flutuante ── */}
        <div className="absolute bottom-4 left-4 right-4 z-[1000] bg-card/95 backdrop-blur-md border border-border p-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {status === 'INATIVO' && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Radio className="w-4 h-4 text-blue-400" />
                <span>Pronto para iniciar gravação de percurso com telemetria GPS.</span>
              </div>
            )}
            {status === 'EM_ANDAMENTO' && (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Gravando percurso ({pontosGps.length} waypoints)</span>
              </div>
            )}
            {status === 'PAUSADO' && (
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                <Pause className="w-4 h-4" />
                <span>Gravação pausada. Retome ou finalize o trajeto.</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {status === 'INATIVO' && (
              <Button
                onClick={iniciarNavegacao}
                size="sm"
                className="h-9 px-5 text-xs font-bold gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-xs rounded-xl"
              >
                <Play className="w-4 h-4 fill-current" />
                Iniciar Rastreamento
              </Button>
            )}

            {status === 'EM_ANDAMENTO' && (
              <>
                <Button
                  onClick={pausarNavegacao}
                  size="sm"
                  variant="outline"
                  className="h-9 text-xs font-bold gap-1.5 bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 rounded-xl"
                >
                  <Pause className="w-3.5 h-3.5" />
                  Pausar
                </Button>
                <Button
                  onClick={abrirModalSalvar}
                  size="sm"
                  className="h-9 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs rounded-xl"
                >
                  <Save className="w-3.5 h-3.5" />
                  Finalizar &amp; Salvar
                </Button>
              </>
            )}

            {status === 'PAUSADO' && (
              <>
                <Button
                  onClick={retomarNavegacao}
                  size="sm"
                  className="h-9 text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Retomar
                </Button>
                <Button
                  onClick={abrirModalSalvar}
                  size="sm"
                  className="h-9 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                >
                  <Save className="w-3.5 h-3.5" />
                  Salvar Percurso
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal de Salvamento Final do Percurso ── */}
      <StandardDialog
        open={modalSalvarAberto}
        onOpenChange={setModalSalvarAberto}
        title="Salvar Trajeto Gravado"
        description="Confirme os detalhes do percurso para salvar no banco de dados e histórico."
        className="sm:max-w-[500px]"
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Título do Percurso *</Label>
            <Input
              value={tituloTrajeto}
              onChange={(e) => setTituloTrajeto(e.target.value)}
              className="h-9 text-xs"
              required
            />
          </div>

          <div className="bg-muted/40 border border-border p-3 rounded-xl grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <span className="text-muted-foreground block text-[10px]">Distância</span>
              <strong className="text-foreground">{(distanciaMetros / 1000).toFixed(2)} km</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">Tempo Total</span>
              <strong className="text-foreground">{formatarTempo(duracaoSegundos)}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">Combustível</span>
              <strong className="text-foreground">{litrosEstimados} L</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">Custo Estimado</span>
              <strong className="text-foreground">R$ {custoEstimado}</strong>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Observações de Campo</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ocorrências no percurso, trânsito, desvios..."
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalSalvarAberto(false)}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={salvando || !tituloTrajeto.trim()}
              onClick={handleConfirmarSalvamento}
              className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {salvando ? 'Gravando...' : 'Salvar Trajeto'}
            </Button>
          </div>
        </div>
      </StandardDialog>

      {/* Modal de Configuração de Telemetria e Anti-Duplicação */}
      <VisitasConfigModal
        open={isConfigOpen}
        onOpenChange={setIsConfigOpen}
        onSalvo={(cfg) => trackerRef.current?.updateConfig(cfg)}
      />
    </div>
  );
}
