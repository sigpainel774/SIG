'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Localidade } from '@/types/localidades';
import { listarLocalidades } from '@/lib/localidadesService';

// Cache em memória global no client para carregamento instantâneo entre abas e modais
let globalLocalidadesCache: Localidade[] | null = null;
let globalFetchPromise: Promise<Localidade[]> | null = null;

export function useLocalidades(apenasAtivas = true) {
  const [localidades, setLocalidades] = useState<Localidade[]>(() => {
    if (globalLocalidadesCache) {
      return apenasAtivas
        ? globalLocalidadesCache.filter((l) => l.ativo)
        : globalLocalidadesCache;
    }
    return [];
  });
  const [loading, setLoading] = useState<boolean>(!globalLocalidadesCache);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const carregar = useCallback(
    async (force = false) => {
      if (!force && globalLocalidadesCache) {
        setLocalidades(
          apenasAtivas
            ? globalLocalidadesCache.filter((l) => l.ativo)
            : globalLocalidadesCache
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        if (!globalFetchPromise || force) {
          globalFetchPromise = listarLocalidades(false);
        }

        const data = await globalFetchPromise;
        globalLocalidadesCache = data;

        if (isMountedRef.current) {
          setLocalidades(apenasAtivas ? data.filter((l) => l.ativo) : data);
        }
      } catch (err: any) {
        console.error('Erro ao carregar localidades:', err);
        if (isMountedRef.current) {
          setError(err?.message || 'Erro ao carregar localidades');
        }
      } finally {
        globalFetchPromise = null;
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [apenasAtivas]
  );

  useEffect(() => {
    isMountedRef.current = true;
    carregar();
    return () => {
      isMountedRef.current = false;
    };
  }, [carregar]);

  const invalidarCache = useCallback(() => {
    globalLocalidadesCache = null;
    return carregar(true);
  }, [carregar]);

  return {
    localidades,
    loading,
    error,
    recarregar: () => carregar(true),
    invalidarCache,
  };
}
