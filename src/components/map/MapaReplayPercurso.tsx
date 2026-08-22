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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { obterRotaViariaReal, PontoLocalizacao } from '@/lib/routeOptimizer';

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
  visitas: VisitaHistoricoItem[];
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
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [bounds, map]);
  return null;
}

export default function MapaReplayPercurso({ visitas, tituloPercurso }: MapaReplayPercursoProps) {
  // Ordena visitas cronologicamente
  const visitasOrdenadas = useMemo(() => {
    return [...visitas].sort(
      (a, b) => new Date(a.data_hora_chegada).getTime() - new Date(b.data_hora_chegada).getTime()
    );
  }, [visitas]);

  // Estados de Rota Viária (Polyline)
  const [polylineCoords, setPolylineCoords] = useState<[number, number][]>([]);
  const [carregandoRota, setCarregandoRota] = useState(false);
  const [distanciaTotalKm, setDistanciaTotalKm] = useState<number>(0);

  // Estados do Player de Reprodução
  const [estaTocando, setEstaTocando] = useState(false);
  const [progresso, setProgresso] = useState<number>(0); // 0.0 a 1.0 (0% a 100%)
  const [velocidade, setVelocidade] = useState<number>(2); // 1x, 2x, 5x, 10x

  // Timestamps extremos
  const { timeInicio, timeFim, duracaoTotalMs } = useMemo(() => {
    if (visitasOrdenadas.length === 0) return { timeInicio: 0, timeFim: 0, duracaoTotalMs: 0 };
    const tIni = new Date(visitasOrdenadas[0].data_hora_chegada).getTime();
    const tFim = new Date(visitasOrdenadas[visitasOrdenadas.length - 1].data_hora_chegada).getTime();
    const duracao = Math.max(tFim - tIni, 1000);
    return { timeInicio: tIni, timeFim: tFim, duracaoTotalMs: duracao };
  }, [visitasOrdenadas]);

  // Carrega a malha viária real via OSRM ao montar/mudar visitas
  useEffect(() => {
    if (visitasOrdenadas.length < 2) {
      if (visitasOrdenadas.length === 1) {
        setPolylineCoords([[visitasOrdenadas[0].latitude, visitasOrdenadas[0].longitude]]);
      } else {
        setPolylineCoords([]);
      }
      return;
    }

    let isMounted = true;
    setCarregandoRota(true);

    const pontos: PontoLocalizacao[] = visitasOrdenadas.map((v, i) => ({
      id: v.id,
      nome: v.escola_nome,
      latitude: v.latitude,
      longitude: v.longitude,
      ordem: i + 1,
    }));

    obterRotaViariaReal(pontos)
      .then((res) => {
        if (isMounted) {
          if (res.coordenadasPolyline && res.coordenadasPolyline.length > 0) {
            setPolylineCoords(res.coordenadasPolyline);
            setDistanciaTotalKm(res.distanciaTotalKm);
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
  }, [visitasOrdenadas]);

  // Calcula a posição do carro e ângulo com base no progresso atual (0 a 1)
  const telemetriaAtual = useMemo(() => {
    if (polylineCoords.length === 0) {
      return {
        lat: -12.7299932,
        lng: -39.1858195,
        bearing: 0,
        dataHoraSimulada: new Date(),
        paradaAtualIdx: 0,
        paradaAtual: null,
        proximaParada: null,
      };
    }

    if (polylineCoords.length === 1) {
      return {
        lat: polylineCoords[0][0],
        lng: polylineCoords[0][1],
        bearing: 0,
        dataHoraSimulada: new Date(timeInicio),
        paradaAtualIdx: 0,
        paradaAtual: visitasOrdenadas[0] || null,
        proximaParada: null,
      };
    }

    const totalSegs = polylineCoords.length - 1;
    const pontoFracionario = progresso * totalSegs;
    const indexAtual = Math.min(Math.floor(pontoFracionario), totalSegs - 1);
    const fraction = pontoFracionario - indexAtual;

    const p1 = polylineCoords[indexAtual];
    const p2 = polylineCoords[indexAtual + 1] || p1;

    // Interpolação Linear entre p1 e p2
    const lat = p1[0] + (p2[0] - p1[0]) * fraction;
    const lng = p1[1] + (p2[1] - p1[1]) * fraction;
    const bearing = calcularBearing(p1[0], p1[1], p2[0], p2[1]);

    // Cálculo do Timestamp Simulado
    const timestampAtual = timeInicio + progresso * duracaoTotalMs;
    const dataHoraSimulada = new Date(timestampAtual);

    // Identifica qual parada o veículo já passou e qual é a próxima
    let paradaAtualIdx = 0;
    for (let i = 0; i < visitasOrdenadas.length; i++) {
      const tParada = new Date(visitasOrdenadas[i].data_hora_chegada).getTime();
      if (timestampAtual >= tParada) {
        paradaAtualIdx = i;
      }
    }

    return {
      lat,
      lng,
      bearing,
      dataHoraSimulada,
      paradaAtualIdx,
      paradaAtual: visitasOrdenadas[paradaAtualIdx] || null,
      proximaParada: visitasOrdenadas[paradaAtualIdx + 1] || null,
    };
  }, [polylineCoords, progresso, timeInicio, duracaoTotalMs, visitasOrdenadas]);

  // Loop de Animação com requestAnimationFrame (Blindado contra vazamentos de memória)
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
    if (polylineCoords.length === 0) return null;
    return L.latLngBounds(polylineCoords.map((c) => [c[0], c[1]]));
  }, [polylineCoords]);

  const togglePlay = () => {
    if (progresso >= 1) {
      setProgresso(0);
    }
    setEstaTocando(!estaTocando);
  };

  const handleReset = () => {
    setEstaTocando(false);
    setProgresso(0);
  };

  const formatarHora = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/Bahia',
    });
  };

  const formatarData = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Bahia',
    });
  };

  if (visitasOrdenadas.length === 0) {
    return (
      <div className="w-full h-[450px] rounded-2xl bg-card border border-border flex flex-col items-center justify-center p-6 text-center text-muted-foreground shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mb-3">
          <MapPin className="w-6 h-6" />
        </div>
        <h4 className="font-bold text-base text-foreground mb-1">Nenhuma parada selecionada</h4>
        <p className="text-xs text-muted-foreground max-w-sm">
          Selecione uma data ou viagem no painel para visualizar o mapa e reproduzir o percurso simulado com o carrinho.
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
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 dark:bg-sky-500/15 dark:border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                Relógio de Telemetria
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
          <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
            <Car className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>Posição no Percurso:</span>
            <span className="font-bold text-foreground">
              Parada {telemetriaAtual.paradaAtualIdx + 1} de {visitasOrdenadas.length}
            </span>
          </div>
          <div className="text-xs font-bold text-foreground truncate">
            {telemetriaAtual.paradaAtual ? telemetriaAtual.paradaAtual.escola_nome : 'Partida da SEMED'}
          </div>
          {telemetriaAtual.proximaParada && (
            <div className="text-[11px] text-muted-foreground truncate mt-0.5">
              Próximo destino:{' '}
              <span className="font-semibold text-foreground">
                {telemetriaAtual.proximaParada.escola_nome}
              </span>
            </div>
          )}
        </div>

        {/* Estatísticas Rápidas da Viagem */}
        <div className="flex items-center gap-4 text-xs shrink-0">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground font-semibold">Total Paradas</span>
            <span className="text-sm font-bold text-foreground">{visitasOrdenadas.length} locais</span>
          </div>
          <div className="w-px h-8 bg-border"></div>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground font-semibold">Distância Rota</span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {distanciaTotalKm > 0 ? `${distanciaTotalKm} km` : 'Calculando...'}
            </span>
          </div>
        </div>
      </div>

      {/* Container do Mapa Leaflet */}
      <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-border shadow-lg bg-zinc-950">
        <MapContainer
          center={[visitasOrdenadas[0].latitude, visitasOrdenadas[0].longitude]}
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
                dashArray="6, 6"
                lineCap="round"
              />
            </>
          )}

          {/* Marcadores de Todas as Paradas */}
          {visitasOrdenadas.map((visita, idx) => {
            const isAtiva = telemetriaAtual.paradaAtualIdx === idx;
            const horaStr = new Date(visita.data_hora_chegada).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'America/Bahia',
            });

            return (
              <Marker
                key={visita.id}
                position={[visita.latitude, visita.longitude]}
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
                      {visita.observacoes && (
                        <div className="mt-1 p-1.5 rounded-md bg-muted text-[11px] text-foreground">
                          {visita.observacoes}
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Marcador Animado do Carrinho com Rotação */}
          {polylineCoords.length > 0 && (
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
            <span className="text-[11px] font-mono font-bold text-muted-foreground w-12 shrink-0">
              {formatarHora(new Date(timeInicio))}
            </span>
            <div className="relative flex-1 flex items-center">
              <input
                type="range"
                min="0"
                max="1"
                step="0.001"
                value={progresso}
                onChange={(e) => {
                  setEstaTocando(false);
                  setProgresso(parseFloat(e.target.value));
                }}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>
            <span className="text-[11px] font-mono font-bold text-muted-foreground w-12 shrink-0 text-right">
              {formatarHora(new Date(timeFim))}
            </span>
          </div>

          {/* Botões de Ação do Player */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                disabled={visitasOrdenadas.length < 2}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-sm',
                  estaTocando
                    ? 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-400/40'
                    : 'bg-sky-600 hover:bg-sky-700 text-white ring-2 ring-sky-400/40',
                  visitasOrdenadas.length < 2 && 'opacity-50 cursor-not-allowed'
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
                className="p-2 rounded-xl bg-muted border border-border text-foreground hover:bg-hoverCustom transition-colors cursor-pointer"
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
