'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  Car,
  MapPin,
  Compass,
  Gauge,
  Calendar,
  User,
  Info,
  CheckCircle2,
  AlertTriangle,
  FastForward,
  Navigation,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { obterRotaViariaReal, PontoLocalizacao, calcularDistanciaHaversine } from '@/lib/routeOptimizer';
import { NavegacaoLivreRegistro, PontoGpsTrack } from '@/lib/offlineRouteStore';

export interface VisitaHistoricoItem {
  id: string;
  escola_id: string | null;
  escola_nome: string;
  data_hora_chegada: string;
  latitude: number;
  longitude: number;
  distancia_ponto_metros: number | null;
  odometro_km: number | null;
  observacoes: string | null;
  status: string;
  funcionario_nome: string | null;
  escola_endereco?: string | null;
  escola_localizacao?: string | null;
}

interface MapaReplayPercursoProps {
  visitas?: VisitaHistoricoItem[];
  navegacaoLivre?: NavegacaoLivreRegistro | null;
  tituloPercurso?: string;
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

// Criação dos ícones personalizados do Leaflet
const criarIconeParada = (numero: number, horario: string, isAtiva: boolean) => {
  return L.divIcon({
    className: 'custom-stop-marker',
    html: `
      <div class="flex flex-col items-center group cursor-pointer" style="transform: translate(-50%, -100%);">
        <div class="px-2 py-0.5 rounded-md text-[10px] font-bold shadow-md whitespace-nowrap mb-1 border ${
          isAtiva
            ? 'bg-sky-500 text-white border-sky-300 ring-2 ring-sky-400/50'
            : 'bg-zinc-900 text-zinc-200 border-zinc-700'
        }">
          ${numero}. ${horario}
        </div>
        <div class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-lg border-2 border-white ${
          isAtiva ? 'bg-sky-500 scale-110' : 'bg-emerald-600'
        }">
          ${numero}
        </div>
        <div class="w-1.5 h-2 bg-zinc-800 -mt-0.5 rounded-b-xs"></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -32],
  });
};

const criarIconeCarro = (bearing: number) => {
  return L.divIcon({
    className: 'custom-car-marker',
    html: `
      <div class="relative flex items-center justify-center" style="transform: translate(-50%, -50%);">
        <!-- Pulso de radar ao redor do carro -->
        <div class="absolute w-12 h-12 rounded-full bg-sky-500/25 animate-ping pointer-events-none"></div>
        <div class="relative w-10 h-10 rounded-full bg-zinc-950 border-2 border-sky-400 shadow-2xl flex items-center justify-center text-sky-400 transition-transform duration-150" style="transform: rotate(${bearing}deg);">
          <!-- Ícone de Carro / Navegação com seta direcional -->
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

// Componente utilitário para auto-ajustar o mapa para caber todos os pontos
function FitBoundsToRoute({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (!bounds || !map) return;
    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
      } catch (err) {
        console.warn('Ajuste suave de limites do mapa ignorado:', err);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [bounds, map]);
  return null;
}

export default function MapaReplayPercurso({
  visitas = [],
  navegacaoLivre = null,
  tituloPercurso,
}: MapaReplayPercursoProps) {
  // Ordena visitas cronologicamente caso seja modo de visitas
  const visitasOrdenadas = useMemo(() => {
    return [...visitas]
      .filter((v) => Number.isFinite(Number(v.latitude)) && Number.isFinite(Number(v.longitude)))
      .sort((a, b) => {
        const tA = new Date(a.data_hora_chegada).getTime() || 0;
        const tB = new Date(b.data_hora_chegada).getTime() || 0;
        return tA - tB;
      });
  }, [visitas]);

  // Modo de operação: 'NAVEGACAO_LIVRE' ou 'VISITAS_ESCOLAS'
  const isModoNavegacaoLivre = Boolean(navegacaoLivre && (navegacaoLivre.pontos_gps || []).length > 0);

  // Estados de Rota Viária (Polyline)
  const [polylineCoords, setPolylineCoords] = useState<[number, number][]>([]);
  const [carregandoRota, setCarregandoRota] = useState(false);
  const [distanciaTotalKm, setDistanciaTotalKm] = useState<number>(0);

  // Estados do Player de Reprodução
  const [estaTocando, setEstaTocando] = useState(false);
  const [progresso, setProgresso] = useState<number>(0); // 0.0 a 1.0 (0% a 100%)
  const [velocidade, setVelocidade] = useState<number>(2); // 1x, 2x, 5x, 10x

  // Timestamps extremos blindados contra NaN
  const { timeInicio, timeFim, duracaoTotalMs } = useMemo(() => {
    if (isModoNavegacaoLivre && navegacaoLivre) {
      const pontos = navegacaoLivre.pontos_gps || [];
      if (pontos.length > 0) {
        const rawTIni =
          Number(pontos[0].timestamp) ||
          (navegacaoLivre.data_inicio ? new Date(navegacaoLivre.data_inicio).getTime() : Date.now());
        const tIni = Number.isFinite(rawTIni) ? rawTIni : Date.now();

        const ultimoPonto = pontos[pontos.length - 1];
        const rawTFim =
          Number(ultimoPonto?.timestamp) ||
          (navegacaoLivre.data_fim
            ? new Date(navegacaoLivre.data_fim).getTime()
            : tIni + (Number(navegacaoLivre.duracao_segundos) || 0) * 1000);
        const tFim = Number.isFinite(rawTFim) && rawTFim >= tIni ? rawTFim : tIni + 1000;

        const duracao = Math.max(tFim - tIni, 1000);
        return {
          timeInicio: tIni,
          timeFim: tFim,
          duracaoTotalMs: Number.isFinite(duracao) ? duracao : 1000,
        };
      }
    }

    if (visitasOrdenadas.length === 0) {
      const agora = Date.now();
      return { timeInicio: agora, timeFim: agora + 1000, duracaoTotalMs: 1000 };
    }

    const rawIni = new Date(visitasOrdenadas[0].data_hora_chegada).getTime();
    const tIni = Number.isFinite(rawIni) ? rawIni : Date.now();

    const rawFim = new Date(visitasOrdenadas[visitasOrdenadas.length - 1].data_hora_chegada).getTime();
    const tFim = Number.isFinite(rawFim) && rawFim >= tIni ? rawFim : tIni + 1000;

    const duracao = Math.max(tFim - tIni, 1000);
    return {
      timeInicio: tIni,
      timeFim: tFim,
      duracaoTotalMs: Number.isFinite(duracao) ? duracao : 1000,
    };
  }, [isModoNavegacaoLivre, navegacaoLivre, visitasOrdenadas]);

  // Carrega coordenadas e traçado
  useEffect(() => {
    // 1. Se for Navegação Livre gravada: usa a densa trilha de GPS diretamente
    if (isModoNavegacaoLivre && navegacaoLivre) {
      const pts = Array.isArray(navegacaoLivre.pontos_gps) ? navegacaoLivre.pontos_gps : [];
      const coords: [number, number][] = pts
        .map((p) => [Number(p.latitude), Number(p.longitude)] as [number, number])
        .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0);

      setPolylineCoords(coords);
      setDistanciaTotalKm(Number(((Number(navegacaoLivre.distancia_metros) || 0) / 1000).toFixed(2)));
      return;
    }

    // 2. Se for Roteiro de Visitas a Escolas:
    if (visitasOrdenadas.length < 2) {
      if (visitasOrdenadas.length === 1) {
        const v = visitasOrdenadas[0];
        if (Number.isFinite(Number(v.latitude)) && Number.isFinite(Number(v.longitude))) {
          setPolylineCoords([[Number(v.latitude), Number(v.longitude)]]);
        } else {
          setPolylineCoords([]);
        }
      } else {
        setPolylineCoords([]);
      }
      setDistanciaTotalKm(0);
      return;
    }

    let isMounted = true;
    setCarregandoRota(true);

    const pontos: PontoLocalizacao[] = visitasOrdenadas.map((v, i) => ({
      id: v.id,
      nome: v.escola_nome,
      latitude: Number(v.latitude) || -12.7299932,
      longitude: Number(v.longitude) || -39.1858195,
      ordem: i + 1,
    }));

    obterRotaViariaReal(pontos)
      .then((res) => {
        if (isMounted) {
          if (res.coordenadasPolyline && res.coordenadasPolyline.length > 0) {
            const limpas = res.coordenadasPolyline.filter(
              ([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng)
            );
            setPolylineCoords(limpas);
            setDistanciaTotalKm(Number(res.distanciaTotalKm) || 0);
          } else {
            const fallback: [number, number][] = pontos.map((p) => [p.latitude, p.longitude]);
            setPolylineCoords(fallback);
          }
        }
      })
      .catch((err) => {
        console.error('Erro ao buscar traçado da rota para replay:', err);
        if (isMounted) {
          const fallback: [number, number][] = pontos.map((p) => [p.latitude, p.longitude]);
          setPolylineCoords(fallback);
        }
      })
      .finally(() => {
        if (isMounted) setCarregandoRota(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isModoNavegacaoLivre, navegacaoLivre, visitasOrdenadas]);

  // Calcula a posição do carro e ângulo com base no progresso atual (0 a 1)
  const telemetriaAtual = useMemo(() => {
    const defaultCoords = {
      lat: -12.7299932,
      lng: -39.1858195,
      bearing: 0,
      speedKmh: 0,
      dataHoraSimulada: new Date(Number.isFinite(timeInicio) ? timeInicio : Date.now()),
      paradaAtualIdx: 0,
      paradaAtual: null as VisitaHistoricoItem | null,
      proximaParada: null as VisitaHistoricoItem | null,
    };

    if (!polylineCoords || polylineCoords.length === 0) {
      return defaultCoords;
    }

    if (polylineCoords.length === 1) {
      const latVal = Number(polylineCoords[0][0]) || -12.7299932;
      const lngVal = Number(polylineCoords[0][1]) || -39.1858195;
      return {
        ...defaultCoords,
        lat: latVal,
        lng: lngVal,
        paradaAtual: visitasOrdenadas[0] || null,
      };
    }

    const totalSegs = Math.max(1, polylineCoords.length - 1);
    const progressoNormalizado = Math.max(0, Math.min(progresso, 1));
    const pontoFracionario = progressoNormalizado * totalSegs;
    const indexAtual = Math.min(Math.floor(pontoFracionario), totalSegs - 1);
    const fraction = pontoFracionario - indexAtual;

    const p1 = polylineCoords[indexAtual] || polylineCoords[0] || [-12.7299932, -39.1858195];
    const p2 = polylineCoords[indexAtual + 1] || p1;

    const p1Lat = Number(p1[0]) || -12.7299932;
    const p1Lng = Number(p1[1]) || -39.1858195;
    const p2Lat = Number(p2[0]) || p1Lat;
    const p2Lng = Number(p2[1]) || p1Lng;

    // Interpolação Linear entre p1 e p2
    const lat = Number.isFinite(p1Lat + (p2Lat - p1Lat) * fraction)
      ? p1Lat + (p2Lat - p1Lat) * fraction
      : p1Lat;
    const lng = Number.isFinite(p1Lng + (p2Lng - p1Lng) * fraction)
      ? p1Lng + (p2Lng - p1Lng) * fraction
      : p1Lng;
    const bearing = Number.isFinite(calcularBearing(p1Lat, p1Lng, p2Lat, p2Lng))
      ? calcularBearing(p1Lat, p1Lng, p2Lat, p2Lng)
      : 0;

    // Cálculo do Timestamp Simulado
    const timestampAtual = timeInicio + progressoNormalizado * (duracaoTotalMs || 1000);
    const dataHoraSimulada = new Date(Number.isFinite(timestampAtual) ? timestampAtual : Date.now());

    let speedKmh = 0;

    if (isModoNavegacaoLivre && navegacaoLivre && (navegacaoLivre.pontos_gps || []).length > 0) {
      const pts = navegacaoLivre.pontos_gps;
      const pt1 = pts[indexAtual] || pts[0] || { speedKmh: 0 };
      const pt2 = pts[indexAtual + 1] || pt1;
      const sp1 = Number(pt1.speedKmh ?? (pt1 as any).speed ?? 0) || 0;
      const sp2 = Number(pt2.speedKmh ?? (pt2 as any).speed ?? 0) || 0;
      const calcSpeed = sp1 + (sp2 - sp1) * fraction;
      speedKmh = Number.isFinite(calcSpeed) ? Number(calcSpeed.toFixed(1)) : 0;
    }

    // Identifica qual parada o veículo já passou e qual é a próxima (em modo de visitas)
    let paradaAtualIdx = 0;
    for (let i = 0; i < visitasOrdenadas.length; i++) {
      const tParada = new Date(visitasOrdenadas[i].data_hora_chegada).getTime();
      if (Number.isFinite(tParada) && timestampAtual >= tParada) {
        paradaAtualIdx = i;
      }
    }

    return {
      lat,
      lng,
      bearing,
      speedKmh,
      dataHoraSimulada,
      paradaAtualIdx,
      paradaAtual: visitasOrdenadas[paradaAtualIdx] || null,
      proximaParada: visitasOrdenadas[paradaAtualIdx + 1] || null,
    };
  }, [
    polylineCoords,
    progresso,
    timeInicio,
    duracaoTotalMs,
    isModoNavegacaoLivre,
    navegacaoLivre,
    visitasOrdenadas,
  ]);

  // Loop de Animação com requestAnimationFrame
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const loopAnimacao = useCallback(
    (time: number) => {
      if (lastTimeRef.current !== null) {
        const delta = time - lastTimeRef.current;
        // Duração base de uma volta completa: 30 segundos (em 1x)
        const duracaoBaseMs = 30000;
        const incremento = (delta * velocidade) / duracaoBaseMs;

        setProgresso((prev) => {
          const prox = prev + incremento;
          if (prox >= 1) {
            setEstaTocando(false);
            return 1;
          }
          return prox;
        });
      }
      lastTimeRef.current = time;
      if (estaTocando) {
        animFrameRef.current = requestAnimationFrame(loopAnimacao);
      }
    },
    [estaTocando, velocidade]
  );

  useEffect(() => {
    if (estaTocando) {
      lastTimeRef.current = performance.now();
      animFrameRef.current = requestAnimationFrame(loopAnimacao);
    } else {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      lastTimeRef.current = null;
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [estaTocando, loopAnimacao]);

  // Bounds para auto-enquadramento
  const bounds = useMemo<L.LatLngBoundsExpression | null>(() => {
    if (!polylineCoords || polylineCoords.length === 0) return null;
    try {
      const validCoords = polylineCoords.filter(
        ([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng)
      );
      if (validCoords.length === 0) return null;
      return L.latLngBounds(validCoords.map((c) => [c[0], c[1]]));
    } catch {
      return null;
    }
  }, [polylineCoords]);

  const temDeslocamentoReal = polylineCoords.length >= 2 && distanciaTotalKm > 0;

  const togglePlay = () => {
    if (!temDeslocamentoReal) {
      toast.warning('Este percurso não possui deslocamento registrado para animação.', {
        description: 'Selecione uma navegação livre com waypoints ou um roteiro com 2 ou mais escolas distintas.',
      });
      return;
    }
    if (progresso >= 1) {
      setProgresso(0);
    }
    setEstaTocando(!estaTocando);
  };

  const handleReset = () => {
    setEstaTocando(false);
    setProgresso(0);
  };

  const formatarHora = (date: Date | null | undefined) => {
    if (!date || isNaN(date.getTime())) return '--:--:--';
    try {
      return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'America/Bahia',
      });
    } catch {
      return '--:--:--';
    }
  };

  const formatarData = (date: Date | null | undefined) => {
    if (!date || isNaN(date.getTime())) return '--/--/----';
    try {
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'America/Bahia',
      });
    } catch {
      return '--/--/----';
    }
  };

  if (!isModoNavegacaoLivre && visitasOrdenadas.length === 0) {
    return (
      <div className="w-full h-[450px] rounded-2xl bg-card border border-border flex flex-col items-center justify-center p-6 text-center text-muted-foreground shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mb-3">
          <MapPin className="w-6 h-6" />
        </div>
        <h4 className="font-bold text-base text-foreground mb-1">Nenhum percurso selecionado</h4>
        <p className="text-xs text-muted-foreground max-w-sm">
          Selecione uma navegação livre gravada ou uma viagem com paradas no painel para reproduzir o percurso no mapa.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* HUD Superior / Painel de Telemetria e Relógio */}
      <div className="bg-card border border-border p-4 rounded-2xl shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Relógio Digital do Momento */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">
                {isModoNavegacaoLivre ? 'Replay de Navegação Livre' : 'Relógio de Telemetria'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted font-semibold text-muted-foreground">
                {formatarData(telemetriaAtual.dataHoraSimulada)}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-foreground tracking-tight">
              {formatarHora(telemetriaAtual.dataHoraSimulada)}
            </div>
          </div>
        </div>

        {/* Informações da Etapa / Status da Parada */}
        <div className="flex-1 max-w-md bg-muted/40 border border-border p-3 rounded-xl flex flex-col justify-center">
          {isModoNavegacaoLivre && navegacaoLivre ? (
            <>
              <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5 mb-0.5">
                <Navigation className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-bold text-foreground truncate">{navegacaoLivre.titulo}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  Velocidade no ponto:{' '}
                  <strong className="text-foreground">{telemetriaAtual.speedKmh} km/h</strong>
                </span>
                <span>•</span>
                <span>
                  Max: <strong className="text-emerald-400">{navegacaoLivre.velocidade_max_kmh} km/h</strong>
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
                <Car className="w-3.5 h-3.5 text-sky-400" />
                <span>Posição no Percurso:</span>
                <span className="font-bold text-foreground">
                  Parada {telemetriaAtual.paradaAtualIdx + 1} de {visitasOrdenadas.length}
                </span>
              </div>
              <div className="text-xs font-bold text-foreground truncate">
                {telemetriaAtual.paradaAtual ? telemetriaAtual.paradaAtual.escola_nome : 'Partida da SEMED'}
              </div>
            </>
          )}
        </div>

        {/* Estatísticas Rápidas da Viagem */}
        <div className="flex items-center gap-4 text-xs shrink-0">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground font-semibold">
              {isModoNavegacaoLivre ? 'Pontos GPS' : 'Total Paradas'}
            </span>
            <span className="text-sm font-bold text-foreground">
              {isModoNavegacaoLivre && navegacaoLivre
                ? `${(navegacaoLivre.pontos_gps || []).length} waypoints`
                : `${visitasOrdenadas.length} locais`}
            </span>
          </div>
          <div className="w-px h-8 bg-border"></div>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground font-semibold">Distância Percorrida</span>
            <span className="text-sm font-bold text-emerald-400">
              {distanciaTotalKm > 0 ? `${distanciaTotalKm} km` : '0.00 km'}
            </span>
          </div>
        </div>
      </div>

      {/* Aviso de Percurso Estático (se aplicável) */}
      {!temDeslocamentoReal && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-xs text-amber-300">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-200 block">
              Percurso Estático ou com Pouco Deslocamento
            </span>
            <span>
              Os pontos registrados nesta sessão possuem a mesma coordenada (distância zero). Para assistir ao carrinho se movimentando no mapa, grave uma nova <strong>Navegação Livre</strong> na aba dedicada ou selecione um roteiro com escolas distintas.
            </span>
          </div>
        </div>
      )}

      {/* Container do Mapa Leaflet */}
      <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-border shadow-lg bg-zinc-950">
        <MapContainer
          center={
            polylineCoords.length > 0
              ? [polylineCoords[0][0], polylineCoords[0][1]]
              : [-12.7299932, -39.1858195]
          }
          zoom={14}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitBoundsToRoute bounds={bounds} />

          {/* Traçado Viário da Rota */}
          {polylineCoords.length > 1 && (
            <>
              {/* Linha de sombra / contorno */}
              <Polyline
                positions={polylineCoords}
                color="#0369a1"
                weight={7}
                opacity={0.4}
                lineCap="round"
                lineJoin="round"
              />
              {/* Linha principal azul */}
              <Polyline
                positions={polylineCoords}
                color="#38bdf8"
                weight={4}
                opacity={0.9}
                dashArray={isModoNavegacaoLivre ? undefined : '6, 6'}
                lineCap="round"
              />
            </>
          )}

          {/* Marcadores de Todas as Paradas (Modo Visitas) */}
          {!isModoNavegacaoLivre &&
            visitasOrdenadas.map((visita, idx) => {
              const lat = Number(visita.latitude);
              const lng = Number(visita.longitude);
              if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

              const isAtiva = telemetriaAtual.paradaAtualIdx === idx;
              const horaStr = formatarHora(new Date(visita.data_hora_chegada));

              return (
                <Marker
                  key={visita.id}
                  position={[lat, lng]}
                  icon={criarIconeParada(idx + 1, horaStr, isAtiva)}
                >
                  <Popup className="custom-leaflet-popup">
                    <div className="p-2 min-w-[200px] text-xs">
                      <div className="font-bold text-foreground text-sm border-b border-border pb-1 mb-1">
                        {idx + 1}. {visita.escola_nome}
                      </div>
                      <div className="flex flex-col gap-1 text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-sky-500" />
                          <span>Chegada:</span>
                          <strong className="text-foreground">{horaStr}</strong>
                        </div>
                        {visita.distancia_ponto_metros !== null && (
                          <div className="flex items-center gap-1">
                            <Gauge className="w-3.5 h-3.5 text-amber-500" />
                            <span>Distância GPS:</span>
                            <strong className="text-foreground">
                              {visita.distancia_ponto_metros}m do ponto
                            </strong>
                          </div>
                        )}
                        {visita.funcionario_nome && (
                          <div className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Responsável:</span>
                            <strong className="text-foreground">{visita.funcionario_nome}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

          {/* Marcador Animado do Carrinho com Rotação (Blindado contra coordenadas NaN) */}
          {polylineCoords.length > 0 &&
            Number.isFinite(telemetriaAtual.lat) &&
            Number.isFinite(telemetriaAtual.lng) && (
              <Marker
                position={[telemetriaAtual.lat, telemetriaAtual.lng]}
                icon={criarIconeCarro(telemetriaAtual.bearing)}
                zIndexOffset={1000}
              />
            )}
        </MapContainer>

        {/* Overlay com Controles do Player Flutuante */}
        <div className="absolute bottom-4 left-4 right-4 z-[1000] bg-card/95 backdrop-blur-md border border-border p-3.5 rounded-2xl shadow-2xl flex flex-col gap-3">
          {/* Barra de Progresso / Linha do Tempo (Scrubber) */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono font-bold text-muted-foreground w-14 shrink-0">
              {formatarHora(new Date(timeInicio))}
            </span>
            <div className="relative flex-1 flex items-center">
              <input
                type="range"
                min="0"
                max="1"
                step="0.001"
                value={progresso}
                disabled={!temDeslocamentoReal}
                onChange={(e) => {
                  setEstaTocando(false);
                  setProgresso(parseFloat(e.target.value));
                }}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-sky-500 disabled:opacity-50"
              />
            </div>
            <span className="text-[11px] font-mono font-bold text-muted-foreground w-14 shrink-0 text-right">
              {formatarHora(new Date(timeFim))}
            </span>
          </div>

          {/* Botões de Ação do Player */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                disabled={!temDeslocamentoReal}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-sm',
                  estaTocando
                    ? 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-400/40'
                    : 'bg-sky-600 hover:bg-sky-700 text-white ring-2 ring-sky-400/40',
                  !temDeslocamentoReal && 'opacity-50 cursor-not-allowed'
                )}
              >
                {estaTocando ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Pausar Simulação
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    {progresso >= 1 ? 'Reproduzir Novamente' : 'Reproduzir Percurso'}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={!temDeslocamentoReal}
                className="p-2 rounded-xl bg-muted border border-border text-foreground hover:bg-hoverCustom transition-colors cursor-pointer disabled:opacity-50"
                title="Reiniciar Percurso"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Controle de Velocidade */}
            <div className="flex items-center gap-1.5 bg-muted/60 border border-border p-1 rounded-xl">
              <span className="text-[10px] font-bold text-muted-foreground px-1.5 flex items-center gap-1">
                <FastForward className="w-3 h-3 text-sky-500" />
                Velocidade:
              </span>
              {[1, 2, 5, 10].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVelocidade(v)}
                  className={cn(
                    'px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors',
                    velocidade === v
                      ? 'bg-sky-500 text-white shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {v}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
