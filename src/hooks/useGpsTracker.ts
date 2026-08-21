'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PontoLocalizacao, calcularDistanciaHaversine } from '@/lib/routeOptimizer';
import { toast } from 'sonner';

export interface PosicaoVeiculo {
  latitude: number;
  longitude: number;
  accuracy: number;
  heading: number; // Ângulo em graus (0 a 360)
  speedKmh: number;
  timestamp: number;
}

export interface GpsTrackerOptions {
  escolasDestino?: PontoLocalizacao[];
  onChegadaPonto?: (ponto: PontoLocalizacao, distanciaMetros: number) => void;
}

/**
 * Calcula o azimute/heading (em graus 0-360) entre duas coordenadas geográficas
 */
export function calcularBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

export function useGpsTracker(options: GpsTrackerOptions = {}) {
  const [ativo, setAtivo] = useState(false);
  const [posicao, setPosicao] = useState<PosicaoVeiculo | null>(null);
  const [permissaoNegada, setPermissaoNegada] = useState(false);
  const [proximaParada, setProximaParada] = useState<{
    ponto: PontoLocalizacao;
    distanciaMetros: number;
  } | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  const ultimaPosicaoRef = useRef<PosicaoVeiculo | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Gerenciamento da Wake Lock API para manter a tela do celular sempre acesa
  const solicitarWakeLock = useCallback(async () => {
    if (typeof window !== 'undefined' && 'wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch {
        // Fallback silencioso se o navegador rejeitar WakeLock
      }
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

  // Re-solicita WakeLock caso o usuário alterne de aba e retorne
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && ativo) {
        solicitarWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [ativo, solicitarWakeLock]);

  // Handler de atualização de posição do GPS
  const handlePositionSuccess = useCallback((pos: GeolocationPosition) => {
    const { latitude, longitude, accuracy, heading: rawHeading, speed } = pos.coords;
    const speedKmh = speed !== null && speed > 0 ? Number((speed * 3.6).toFixed(1)) : 0;

    let finalHeading = ultimaPosicaoRef.current?.heading ?? 0;

    // Se o dispositivo fornecer heading nativo e estiver em movimento
    if (rawHeading !== null && !isNaN(rawHeading) && speedKmh > 2) {
      finalHeading = rawHeading;
    } else if (ultimaPosicaoRef.current) {
      // Calcula o bearing a partir do deslocamento anterior com Deadband
      const distMetros =
        calcularDistanciaHaversine(
          ultimaPosicaoRef.current.latitude,
          ultimaPosicaoRef.current.longitude,
          latitude,
          longitude
        ) * 1000;

      // Filtro de jitter: Só atualiza o ângulo se tiver deslocado mais de 4 metros e > 3 km/h
      if (distMetros > 4 && speedKmh >= 3) {
        finalHeading = Math.round(
          calcularBearing(
            ultimaPosicaoRef.current.latitude,
            ultimaPosicaoRef.current.longitude,
            latitude,
            longitude
          )
        );
      }
    }

    const novaPosicao: PosicaoVeiculo = {
      latitude,
      longitude,
      accuracy: Math.round(accuracy),
      heading: finalHeading,
      speedKmh,
      timestamp: pos.timestamp,
    };

    ultimaPosicaoRef.current = novaPosicao;
    setPosicao(novaPosicao);
    setPermissaoNegada(false);

    // Calcula a próxima parada e distância
    const destinos = optionsRef.current.escolasDestino || [];
    if (destinos.length > 0) {
      let menorDist = Infinity;
      let pontoMaisProximo: PontoLocalizacao | null = null;

      for (const dest of destinos) {
        const distKm = calcularDistanciaHaversine(latitude, longitude, dest.latitude, dest.longitude);
        const distM = Math.round(distKm * 1000);
        if (distM < menorDist) {
          menorDist = distM;
          pontoMaisProximo = dest;
        }
      }

      if (pontoMaisProximo) {
        setProximaParada({
          ponto: pontoMaisProximo,
          distanciaMetros: menorDist,
        });

        // Se estiver a menos de 75 metros, dispara evento de aproximação
        if (menorDist <= 75 && optionsRef.current.onChegadaPonto) {
          optionsRef.current.onChegadaPonto(pontoMaisProximo, menorDist);
        }
      }
    }
  }, []);

  const handlePositionError = useCallback((err: GeolocationPositionError) => {
    if (err.code === err.PERMISSION_DENIED) {
      setPermissaoNegada(true);
      toast.error('Permissão de GPS negada. Ative a localização no navegador para navegar.');
      setAtivo(false);
    } else if (err.code === err.POSITION_UNAVAILABLE) {
      toast.warning('Sinal de GPS fraco. Aguardando satélite...');
    }
  }, []);

  // Iniciar Rastreamento
  const iniciarGps = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      toast.error('Seu navegador não suporta geolocalização por GPS.');
      return;
    }

    solicitarWakeLock();
    setAtivo(true);

    // Configuração de Alta Precisão (Hardware GPS)
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionSuccess,
      handlePositionError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000,
      }
    );
  }, [handlePositionSuccess, handlePositionError, solicitarWakeLock]);

  // Parar Rastreamento
  const pararGps = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    liberarWakeLock();
    setAtivo(false);
  }, [liberarWakeLock]);

  // Limpeza estrita ao desmontar o componente para evitar memory leaks
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      liberarWakeLock();
    };
  }, [liberarWakeLock]);

  return {
    ativo,
    posicao,
    proximaParada,
    permissaoNegada,
    iniciarGps,
    pararGps,
  };
}
