'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Navigation,
  Play,
  Pause,
  Square,
  Clock,
  Gauge,
  Compass,
  MapPin,
  Car,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Wifi,
  WifiOff,
  Save,
  Radio,
  Sparkles,
  Layers,
  Crosshair,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/useAuthStore';
import { StandardDialog } from '@/components/ui/standard-dialog';
import { Button } from '@/components/ui/button';
import {
  calcularDistanciaHaversine,
  SEDE_SEMED_SAPEACU,
} from '@/lib/routeOptimizer';
import {
  PontoGpsTrack,
  NavegacaoLivreRegistro,
  salvarNavegacaoLivreOffline,
  marcarNavegacaoComoSincronizada,
  obterNavegacoesPendentes,
} from '@/lib/offlineRouteStore';
import { OfflineTileLayer } from '@/components/map/OfflineTileLayer';
import { EscolaMapeada } from './MapaRotasEscolas';

interface NavegacaoLivreTabProps {
  escolas?: EscolaMapeada[];
  onNavegacaoSalva?: () => void;
}

// Helper para calcular o ângulo (heading) em graus entre duas coordenadas
function calcularBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const y = Math.sin((lon2 - lon1) * rad) * Math.cos(lat2 * rad);
  const x =
    Math.cos(lat1 * rad) * Math.sin(lat2 * rad) -
    Math.sin(lat1 * rad) * Math.cos(lat2 * rad) * Math.cos((lon2 - lon1) * rad);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

// Ícones personalizados
const criarIconeCarroAoVivo = (bearing: number, speedKmh: number) => {
  return L.divIcon({
    className: 'custom-car-live-marker',
    html: `
      <div class="relative flex items-center justify-center" style="transform: translate(-50%, -50%);">
        <!-- Pulso de radar animado -->
        <div class="absolute w-14 h-14 rounded-full bg-sky-500/30 animate-ping pointer-events-none"></div>
        <div class="absolute w-10 h-10 rounded-full bg-sky-400/20 pointer-events-none"></div>
        <!-- Veículo com seta direcional -->
        <div class="relative w-10 h-10 rounded-full bg-slate-950 border-2 border-sky-400 shadow-2xl flex items-center justify-center text-sky-400 transition-transform duration-200" style="transform: rotate(${bearing}deg);">
          <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
          </svg>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const iconeInicioTrajeto = L.divIcon({
  className: 'custom-start-marker',
  html: `
    <div class="flex flex-col items-center" style="transform: translate(-50%, -100%);">
      <div class="w-6 h-6 rounded-full bg-emerald-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-[10px] font-bold">
        🏁
      </div>
      <div class="w-1 h-2 bg-emerald-800"></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

// Componente para auto-centralizar no carro quando ativado
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

export default function NavegacaoLivreTab({
  escolas = [],
  onNavegacaoSalva,
}: NavegacaoLivreTabProps) {
  const { funcionario } = useAuthStore();
  const supabase = createClient();

  // Estados do Ciclo de Vida da Navegação
  const [status, setStatus] = useState<'INATIVO' | 'EM_ANDAMENTO' | 'PAUSADO'>('INATIVO');
  const [pontosGps, setPontosGps] = useState<PontoGpsTrack[]>([]);
  const [seguirCarro, setSeguirCarro] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  // Telemetria em tempo real
  const [posicaoAtual, setPosicaoAtual] = useState<{
    lat: number;
    lng: number;
    speedKmh: number;
    heading: number;
    accuracy: number;
    timestamp: number;
  } | null>(null);

  const [duracaoSegundos, setDuracaoSegundos] = useState(0);
  const [distanciaTotalMetros, setDistanciaTotalMetros] = useState(0);
  const [velocidadeMax, setVelocidadeMax] = useState(0);

  // Modal de Finalização / Salvamento
  const [modalSalvarAberto, setModalSalvarAberto] = useState(false);
  const [tituloNavegacao, setTituloNavegacao] = useState('');
  const [observacoesNavegacao, setObservacoesNavegacao] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Refs de controle (blindadas contra closure stale do GPS)
  const statusRef = useRef<'INATIVO' | 'EM_ANDAMENTO' | 'PAUSADO'>('INATIVO');
  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pontosGpsRef = useRef<PontoGpsTrack[]>([]);
  const distanciaTotalMetrosRef = useRef<number>(0);
  const velocidadeMaxRef = useRef<number>(0);
  const isMounted = useRef(true);

  // Centro padrão de Sapeaçu
  const defaultCenter = useMemo<[number, number]>(() => {
    if (posicaoAtual) return [posicaoAtual.lat, posicaoAtual.lng];
    return [SEDE_SEMED_SAPEACU.latitude, SEDE_SEMED_SAPEACU.longitude];
  }, [posicaoAtual]);

  // Monitora conectividade online/offline
  useEffect(() => {
    isMounted.current = true;
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const onOn = () => setIsOnline(true);
      const onOff = () => setIsOnline(false);
      window.addEventListener('online', onOn);
      window.addEventListener('offline', onOff);
      return () => {
        window.removeEventListener('online', onOn);
        window.removeEventListener('offline', onOff);
      };
    }
  }, []);

  // Gerenciamento da Screen Wake Lock API (mantém a tela do celular sempre acesa)
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

  // Re-solicita WakeLock ao voltar para a aba
  useEffect(() => {
    const handleVisChange = () => {
      if (document.visibilityState === 'visible' && statusRef.current === 'EM_ANDAMENTO') {
        solicitarWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisChange);
    };
  }, [solicitarWakeLock]);

  // Cronômetro da Navegação
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

  // Handler de Leitura de Posição GPS com Deadband e Blindagem de Closure
  const handlePosition = useCallback(
    (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy, heading: rawHeading, speed } = pos.coords;
      const speedMps = speed !== null && speed >= 0 ? speed : null;
      const speedKmh = speedMps !== null ? Number((speedMps * 3.6).toFixed(1)) : 0;
      const timestamp = pos.timestamp;

      // Filtra apenas anomalias de IP com erro grosseiro (> 150m)
      if (accuracy > 150) return;

      const pontosAnteriores = pontosGpsRef.current;
      const ultimoPonto = pontosAnteriores.length > 0 ? pontosAnteriores[pontosAnteriores.length - 1] : null;

      let distDesdeUltimoMetros = 0;
      let calculatedHeading = 0;

      if (ultimoPonto) {
        distDesdeUltimoMetros = Math.round(
          calcularDistanciaHaversine(
            ultimoPonto.latitude,
            ultimoPonto.longitude,
            latitude,
            longitude
          ) * 1000
        );

        if (distDesdeUltimoMetros >= 2) {
          calculatedHeading = Math.round(
            calcularBearing(
              ultimoPonto.latitude,
              ultimoPonto.longitude,
              latitude,
              longitude
            )
          );
        } else {
          calculatedHeading = ultimoPonto.heading;
        }
      }

      const finalHeading =
        rawHeading !== null && !isNaN(rawHeading) && speedKmh > 2
          ? Math.round(rawHeading)
          : calculatedHeading;

      // Atualiza posição em tempo real (cursor no mapa)
      setPosicaoAtual({
        lat: latitude,
        lng: longitude,
        speedKmh,
        heading: finalHeading,
        accuracy: Math.round(accuracy),
        timestamp,
      });

      // Atualiza velocidade máxima
      if (speedKmh > velocidadeMaxRef.current) {
        velocidadeMaxRef.current = speedKmh;
        setVelocidadeMax(speedKmh);
      }

      // Se a ronda/navegação estiver gravando (statusRef === 'EM_ANDAMENTO'):
      if (statusRef.current === 'EM_ANDAMENTO') {
        const tempoDesdeUltimo = ultimoPonto ? timestamp - ultimoPonto.timestamp : Infinity;

        if (!ultimoPonto || distDesdeUltimoMetros >= 2 || tempoDesdeUltimo >= 4000) {
          const novoPonto: PontoGpsTrack = {
            latitude,
            longitude,
            timestamp,
            speedKmh,
            heading: finalHeading,
            accuracy: Math.round(accuracy),
            distanceM: distDesdeUltimoMetros,
          };

          pontosGpsRef.current = [...pontosGpsRef.current, novoPonto];
          setPontosGps([...pontosGpsRef.current]);

          if (distDesdeUltimoMetros > 0) {
            distanciaTotalMetrosRef.current += distDesdeUltimoMetros;
            setDistanciaTotalMetros(distanciaTotalMetrosRef.current);
          }
        }
      }
    },
    []
  );

  const handleError = useCallback((err: GeolocationPositionError) => {
    if (err.code === err.PERMISSION_DENIED) {
      toast.error('Permissão de GPS negada. Ative a localização no navegador para gravar percursos.');
      statusRef.current = 'INATIVO';
      setStatus('INATIVO');
    } else if (err.code === err.POSITION_UNAVAILABLE) {
      toast.warning('Aguardando sinal estável do satélite GPS...');
    }
  }, []);

  // Inicializa a escuta de GPS assim que a aba é aberta para já exibir posição ao vivo
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(handlePosition, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
    });

    watchIdRef.current = navigator.geolocation.watchPosition(handlePosition, handleError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      liberarWakeLock();
    };
  }, [handlePosition, handleError, liberarWakeLock]);

  // Iniciar Navegação
  const iniciarNavegacao = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      toast.error('Seu dispositivo não possui suporte a geolocalização.');
      return;
    }

    solicitarWakeLock();
    statusRef.current = 'EM_ANDAMENTO';
    setStatus('EM_ANDAMENTO');
    setSeguirCarro(true);

    pontosGpsRef.current = [];
    setPontosGps([]);
    distanciaTotalMetrosRef.current = 0;
    setDistanciaTotalMetros(0);
    setDuracaoSegundos(0);
    velocidadeMaxRef.current = 0;
    setVelocidadeMax(0);

    // Se já temos a posição atual captada, insere como primeiro ponto de partida
    if (posicaoAtual) {
      const pontoInicial: PontoGpsTrack = {
        latitude: posicaoAtual.lat,
        longitude: posicaoAtual.lng,
        timestamp: posicaoAtual.timestamp || Date.now(),
        speedKmh: posicaoAtual.speedKmh || 0,
        heading: posicaoAtual.heading || 0,
        accuracy: posicaoAtual.accuracy || 10,
        distanceM: 0,
      };
      pontosGpsRef.current = [pontoInicial];
      setPontosGps([pontoInicial]);
    }

    toast.success('Ronda escolar iniciada! Gravando traçado em tempo real.', {
      icon: '🚗',
    });
  };

  // Pausar Navegação
  const pausarNavegacao = () => {
    statusRef.current = 'PAUSADO';
    setStatus('PAUSADO');
    toast.info('Gravação de percurso pausada.');
  };

  // Retomar Navegação
  const retomarNavegacao = () => {
    solicitarWakeLock();
    statusRef.current = 'EM_ANDAMENTO';
    setStatus('EM_ANDAMENTO');
    setSeguirCarro(true);
    toast.success('Gravação retomada!', { icon: '▶️' });
  };

  // Cancelar Navegação
  const cancelarNavegacao = () => {
    liberarWakeLock();
    statusRef.current = 'INATIVO';
    setStatus('INATIVO');
    pontosGpsRef.current = [];
    setPontosGps([]);
    distanciaTotalMetrosRef.current = 0;
    setDistanciaTotalMetros(0);
    setDuracaoSegundos(0);
    velocidadeMaxRef.current = 0;
    setVelocidadeMax(0);
    toast.info('Navegação descartada.');
  };

  // Abrir Modal de Salvamento
  const abrirModalSalvar = () => {
    const pontosGravados = pontosGpsRef.current;
    if (pontosGravados.length < 2 && distanciaTotalMetrosRef.current < 10) {
      toast.warning('Poucos pontos registrados. Desloque-se mais alguns metros antes de salvar.');
    }
    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Bahia',
    });
    const horaFormatada = agora.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Bahia',
    });

    setTituloNavegacao(`Ronda Escolar - ${dataFormatada} ${horaFormatada}`);
    setObservacoesNavegacao('');
    statusRef.current = 'PAUSADO';
    setStatus('PAUSADO');
    setModalSalvarAberto(true);
  };

  // Confirmar e Salvar Navegação no IndexedDB e Supabase
  const handleSalvarNavegacaoFinal = async () => {
    if (!tituloNavegacao.trim()) {
      toast.error('Informe um título para identificar o percurso!');
      return;
    }

    const pontosParaSalvar = pontosGpsRef.current.length > 0 ? pontosGpsRef.current : pontosGps;
    const distanciaFinal = distanciaTotalMetrosRef.current || distanciaTotalMetros;

    setSalvando(true);
    try {
      const dataInicioStr =
        pontosParaSalvar.length > 0
          ? new Date(pontosParaSalvar[0].timestamp).toISOString()
          : new Date(Date.now() - duracaoSegundos * 1000).toISOString();

      const dataFimStr = new Date().toISOString();

      // Cálculo de velocidade média (km/h)
      const horas = duracaoSegundos / 3600;
      const distKm = distanciaFinal / 1000;
      const velocidadeMedia = horas > 0 ? Number((distKm / horas).toFixed(1)) : 0;

      const novoRegistro: NavegacaoLivreRegistro = {
        id: crypto.randomUUID(),
        funcionario_id: funcionario?.id ?? null,
        funcionario_nome: funcionario?.nome ?? 'Servidor / Motorista',
        veiculo_id: null,
        titulo: tituloNavegacao.trim(),
        data_inicio: dataInicioStr,
        data_fim: dataFimStr,
        duracao_segundos: duracaoSegundos,
        distancia_metros: distanciaFinal,
        velocidade_media_kmh: velocidadeMedia,
        velocidade_max_kmh: velocidadeMaxRef.current || velocidadeMax,
        pontos_gps: pontosParaSalvar,
        status: 'FINALIZADA',
        observacoes: observacoesNavegacao.trim() || null,
        sincronizado: false,
      };

      // 1. Salva no IndexedDB (Offline-First garantido)
      await salvarNavegacaoLivreOffline(novoRegistro);

      // 2. Se online, envia para a tabela do Supabase
      if (navigator.onLine) {
        try {
          const payload = {
            id: novoRegistro.id,
            funcionario_id: novoRegistro.funcionario_id,
            veiculo_id: novoRegistro.veiculo_id,
            titulo: novoRegistro.titulo,
            data_inicio: novoRegistro.data_inicio,
            data_fim: novoRegistro.data_fim,
            duracao_segundos: novoRegistro.duracao_segundos,
            distancia_metros: novoRegistro.distancia_metros,
            velocidade_media_kmh: novoRegistro.velocidade_media_kmh,
            velocidade_max_kmh: novoRegistro.velocidade_max_kmh,
            pontos_gps: novoRegistro.pontos_gps,
            status: novoRegistro.status,
            observacoes: novoRegistro.observacoes,
            sincronizado_em: new Date().toISOString(),
          };

          const { error: insertErr } = await (supabase as any)
            .from('registros_navegacoes_livres')
            .upsert(payload, { onConflict: 'id' });

          if (!insertErr) {
            await marcarNavegacaoComoSincronizada(novoRegistro.id);
            novoRegistro.sincronizado = true;
          }
        } catch (supabaseErr) {
          console.warn('Falha ao enviar navegação ao Supabase, mantida offline:', supabaseErr);
        }
      }

      liberarWakeLock();

      statusRef.current = 'INATIVO';
      setStatus('INATIVO');
      pontosGpsRef.current = [];
      setPontosGps([]);
      distanciaTotalMetrosRef.current = 0;
      setDistanciaTotalMetros(0);
      setDuracaoSegundos(0);
      velocidadeMaxRef.current = 0;
      setVelocidadeMax(0);
      setModalSalvarAberto(false);

      toast.success(`Percurso "${novoRegistro.titulo}" salvo com sucesso!`, {
        description: `${(distanciaFinal / 1000).toFixed(2)} km gravados com ${pontosParaSalvar.length} pontos.`,
        icon: '✅',
      });

      if (onNavegacaoSalva) {
        onNavegacaoSalva();
      }
    } catch (err) {
      console.error('Erro ao salvar navegação:', err);
      toast.error('Falha ao salvar a navegação. Os dados foram preservados no aparelho.');
    } finally {
      if (isMounted.current) {
        setSalvando(false);
      }
    }
  };

  // Limpeza ao desmontar
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (watchIdRef.current !== null && typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      liberarWakeLock();
    };
  }, [liberarWakeLock]);

  // Formatação de Tempo (hh:mm:ss)
  const formatarTempo = (totalSegs: number) => {
    const h = Math.floor(totalSegs / 3600);
    const m = Math.floor((totalSegs % 3600) / 60);
    const s = totalSegs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
      .toString()
      .padStart(2, '0')}`;
  };

  // Coordenadas para Polyline do mapa
  const polylineCoords = useMemo<[number, number][]>(() => {
    return pontosGps.map((p) => [p.latitude, p.longitude]);
  }, [pontosGps]);

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {/* ── Painel Superior de Instrumentos / HUD Flutuante ── */}
      <div className="bg-card border border-border p-4 rounded-2xl shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Velocímetro Digital & Status */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center border transition-all shrink-0',
              status === 'EM_ANDAMENTO'
                ? 'bg-sky-500/15 border-sky-500/30 text-sky-400 animate-pulse'
                : status === 'PAUSADO'
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                : 'bg-muted border-border text-muted-foreground'
            )}
          >
            <Gauge className="w-7 h-7" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-sky-500 uppercase tracking-wider">
                Velocidade Atual
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
                  ? 'Ao Vivo / Gravando'
                  : status === 'PAUSADO'
                  ? 'Pausado'
                  : 'Pronto'}
              </span>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-mono font-black text-foreground">
                {posicaoAtual ? posicaoAtual.speedKmh.toFixed(0) : '0'}
              </span>
              <span className="text-xs font-bold text-muted-foreground uppercase">km/h</span>
            </div>
          </div>
        </div>

        {/* Métricas Acumuladas da Viagem */}
        <div className="grid grid-cols-3 gap-3 bg-muted/40 border border-border p-3 rounded-xl flex-1 max-w-xl">
          {/* Cronômetro */}
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3 text-sky-500" />
              Tempo
            </span>
            <span className="text-sm sm:text-base font-mono font-bold text-foreground">
              {formatarTempo(duracaoSegundos)}
            </span>
          </div>

          {/* Odômetro */}
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
              <Navigation className="w-3 h-3 text-emerald-500" />
              Distância
            </span>
            <span className="text-sm sm:text-base font-mono font-bold text-foreground">
              {distanciaTotalMetros >= 1000
                ? `${(distanciaTotalMetros / 1000).toFixed(2)} km`
                : `${distanciaTotalMetros} m`}
            </span>
          </div>

          {/* Pontos Gravados & Sinal */}
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
              <Radio className="w-3 h-3 text-indigo-500" />
              GPS / Pontos
            </span>
            <span className="text-sm sm:text-base font-mono font-bold text-foreground truncate">
              {pontosGps.length} pts{' '}
              {posicaoAtual?.accuracy ? `(±${posicaoAtual.accuracy}m)` : ''}
            </span>
          </div>
        </div>

        {/* Botão de Centralização / Seguir */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setSeguirCarro(!seguirCarro)}
            className={cn(
              'px-3 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 cursor-pointer transition-all',
              seguirCarro
                ? 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                : 'bg-card border-border text-muted-foreground hover:text-foreground'
            )}
            title="Auto-centralizar a câmera no veículo"
          >
            <Crosshair className={cn('w-4 h-4', seguirCarro && 'animate-spin')} />
            <span className="hidden sm:inline">
              {seguirCarro ? 'Seguindo' : 'Livre'}
            </span>
          </button>
        </div>
      </div>

      {/* ── Container do Mapa Interativo Leaflet ── */}
      <div className="relative w-full h-[540px] rounded-2xl overflow-hidden border border-border shadow-lg bg-zinc-950">
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

          {/* Traçado da Polyline ao vivo */}
          {polylineCoords.length > 1 && (
            <>
              {/* Sombra de contorno */}
              <Polyline
                positions={polylineCoords}
                color="#0284c7"
                weight={8}
                opacity={0.4}
                lineCap="round"
                lineJoin="round"
              />
              {/* Linha azul neon */}
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

          {/* Marcador de Início da Viagem */}
          {pontosGps.length > 0 && (
            <Marker
              position={[pontosGps[0].latitude, pontosGps[0].longitude]}
              icon={iconeInicioTrajeto}
            >
              <Popup className="custom-leaflet-popup">
                <div className="p-2 text-xs">
                  <div className="font-bold text-emerald-500">Ponto de Partida</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Iniciado às{' '}
                    {new Date(pontosGps[0].timestamp).toLocaleTimeString('pt-BR', {
                      timeZone: 'America/Bahia',
                    })}
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Marcador do Veículo / Posição Ao Vivo */}
          {posicaoAtual && (
            <Marker
              position={[posicaoAtual.lat, posicaoAtual.lng]}
              icon={criarIconeCarroAoVivo(posicaoAtual.heading, posicaoAtual.speedKmh)}
              zIndexOffset={1000}
            >
              <Popup className="custom-leaflet-popup">
                <div className="p-2 text-xs">
                  <div className="font-bold text-foreground">Sua Localização Atual</div>
                  <div className="text-[11px] text-muted-foreground">
                    Velocidade: <strong>{posicaoAtual.speedKmh} km/h</strong>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Precisão: ±{posicaoAtual.accuracy} metros
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Marcadores de Escolas para Referência */}
          {escolas
            .filter((e) => e.latitude && e.longitude)
            .map((esc) => (
              <Marker
                key={esc.id}
                position={[Number(esc.latitude), Number(esc.longitude)]}
                opacity={0.7}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="p-2 text-xs">
                    <div className="font-bold text-foreground">{esc.nome}</div>
                    <div className="text-[11px] text-muted-foreground">{esc.endereco}</div>
                  </div>
                </Popup>
              </Marker>
            ))}
        </MapContainer>

        {/* ── Barra de Ações Flutuante Inferior (Barra de Controle de Rota) ── */}
        <div className="absolute bottom-4 left-4 right-4 z-[1000] bg-card/95 backdrop-blur-md border border-border p-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3 flex-wrap">
          {/* Lado Esquerdo: Mensagem de Status */}
          <div className="flex items-center gap-2">
            {status === 'INATIVO' && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Navigation className="w-4 h-4 text-sky-500" />
                <span>Pronto para iniciar gravação de percurso livre por GPS.</span>
              </div>
            )}

            {status === 'EM_ANDAMENTO' && (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span>Gravando trilha metro a metro...</span>
              </div>
            )}

            {status === 'PAUSADO' && (
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-500">
                <Pause className="w-4 h-4" />
                <span>Navegação pausada. Você pode retomar ou salvar o percurso.</span>
              </div>
            )}
          </div>

          {/* Lado Direito: Botões de Ação */}
          <div className="flex items-center gap-2">
            {status === 'INATIVO' && (
              <button
                type="button"
                onClick={iniciarNavegacao}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-2 shadow-lg shadow-sky-600/30 cursor-pointer transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                Iniciar Navegação Livre
              </button>
            )}

            {status === 'EM_ANDAMENTO' && (
              <>
                <button
                  type="button"
                  onClick={pausarNavegacao}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Pause className="w-3.5 h-3.5" />
                  Pausar
                </button>

                <button
                  type="button"
                  onClick={abrirModalSalvar}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  Encerrar e Salvar
                </button>
              </>
            )}

            {status === 'PAUSADO' && (
              <>
                <button
                  type="button"
                  onClick={retomarNavegacao}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Retomar
                </button>

                <button
                  type="button"
                  onClick={abrirModalSalvar}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  Salvar Percurso
                </button>

                <button
                  type="button"
                  onClick={cancelarNavegacao}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center gap-1 cursor-pointer transition-all"
                >
                  Descartar
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal de Salvamento do Percurso com StandardDialog ── */}
      {modalSalvarAberto && (
        <StandardDialog
          open={modalSalvarAberto}
          onOpenChange={(open) => {
            if (!open && !salvando) setModalSalvarAberto(false);
          }}
          title="Salvar Percurso de Navegação Livre"
          description="Revise o resumo da telemetria e defina um título para identificar este trajeto no histórico."
          maxWidth="sm:max-w-[500px]"
          footer={
            <div className="flex items-center justify-end gap-2 w-full pt-2">
              <Button
                type="button"
                variant="ghost"
                disabled={salvando}
                onClick={() => setModalSalvarAberto(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={salvando}
                onClick={handleSalvarNavegacaoFinal}
                className="gap-1.5 font-bold bg-sky-600 hover:bg-sky-700 text-white"
              >
                {salvando ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Confirmar e Gravar
                  </>
                )}
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-4 py-1">
            {/* Resumo Estatístico do Trajeto */}
            <div className="grid grid-cols-3 gap-2 bg-muted/50 border border-border p-3 rounded-xl text-center">
              <div>
                <span className="text-[10px] text-muted-foreground font-semibold block">
                  Distância Total
                </span>
                <span className="text-sm font-bold text-foreground">
                  {(distanciaTotalMetros / 1000).toFixed(2)} km
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-semibold block">
                  Tempo Decorrido
                </span>
                <span className="text-sm font-bold text-foreground">
                  {formatarTempo(duracaoSegundos)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-semibold block">
                  Pontos GPS
                </span>
                <span className="text-sm font-bold text-foreground">
                  {pontosGps.length} waypoints
                </span>
              </div>
            </div>

            {/* Campo de Título */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Título do Percurso *</span>
                <span className="text-[10px] text-muted-foreground">Identificador da Rota</span>
              </label>
              <input
                type="text"
                value={tituloNavegacao}
                onChange={(e) => setTituloNavegacao(e.target.value)}
                placeholder="Ex: Ronda Bairro Centro, Visita Unidades Rurais..."
                className="w-full px-3 py-2 text-xs bg-background border border-border rounded-xl text-foreground focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Campo de Observações */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                Observações do Percurso (Opcional)
              </label>
              <textarea
                rows={2}
                value={observacoesNavegacao}
                onChange={(e) => setObservacoesNavegacao(e.target.value)}
                placeholder="Ocorrências no trânsito, condições de estrada, paradas não programadas..."
                className="w-full px-3 py-2 text-xs bg-background border border-border rounded-xl text-foreground focus:outline-hidden focus:ring-2 focus:ring-sky-500 resize-none"
              />
            </div>

            {/* Aviso de Offline / Sincronização */}
            <div className="text-[11px] text-muted-foreground flex items-center gap-2 p-2.5 rounded-xl bg-muted/40 border border-border">
              {isOnline ? (
                <>
                  <Wifi className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Conectado à internet. Os dados serão salvos no aparelho e no Supabase.</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Modo offline: salvo no aparelho e sincronizado automaticamente ao reconectar.</span>
                </>
              )}
            </div>
          </div>
        </StandardDialog>
      )}
    </div>
  );
}
