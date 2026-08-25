import {
  salvarCacheEntidadeAlpha,
  obterCacheEntidadeAlpha,
  enfileirarAcaoSyncAlpha,
  sincronizarFilaAlphaGlobal,
  obterFilaPendenteAlpha,
} from '@/lib/alphaOfflineManager';
import { createClient } from '@/lib/supabaseClient';
import {
  VisitasArea,
  VisitasPonto,
  VisitasRoteiro,
  VisitasVeiculo,
  VisitasTrajeto,
  VisitasTrajetoResumo,
  VisitasGeoPdfMap,
} from '@/types/visitas';
import { toast } from 'sonner';

const MODULO = 'visitas';

const CACHE_KEYS = {
  AREAS: 'areas',
  PONTOS: 'pontos',
  ROTEIROS: 'roteiros',
  VEICULOS: 'veiculos',
  TRAJETOS: 'trajetos',
  TRAJETOS_DETALHADOS: 'trajetos_detalhados_map',
  SESSAO_ATIVA: 'sessao_rastreamento_ativa',
  GEOPDF: 'geopdf',
};

export const visitasOfflineService = {
  // --- Áreas ---
  async getAreas(): Promise<VisitasArea[]> {
    return (await obterCacheEntidadeAlpha<VisitasArea[]>(MODULO, CACHE_KEYS.AREAS)) ?? [];
  },
  async setAreas(data: VisitasArea[]): Promise<void> {
    await salvarCacheEntidadeAlpha(MODULO, CACHE_KEYS.AREAS, data);
  },

  // --- Pontos ---
  async getPontos(): Promise<VisitasPonto[]> {
    return (await obterCacheEntidadeAlpha<VisitasPonto[]>(MODULO, CACHE_KEYS.PONTOS)) ?? [];
  },
  async setPontos(data: VisitasPonto[]): Promise<void> {
    await salvarCacheEntidadeAlpha(MODULO, CACHE_KEYS.PONTOS, data);
  },

  // --- Roteiros ---
  async getRoteiros(): Promise<VisitasRoteiro[]> {
    return (await obterCacheEntidadeAlpha<VisitasRoteiro[]>(MODULO, CACHE_KEYS.ROTEIROS)) ?? [];
  },
  async setRoteiros(data: VisitasRoteiro[]): Promise<void> {
    await salvarCacheEntidadeAlpha(MODULO, CACHE_KEYS.ROTEIROS, data);
  },

  // --- Veículos ---
  async getVeiculos(): Promise<VisitasVeiculo[]> {
    return (await obterCacheEntidadeAlpha<VisitasVeiculo[]>(MODULO, CACHE_KEYS.VEICULOS)) ?? [];
  },
  async setVeiculos(data: VisitasVeiculo[]): Promise<void> {
    await salvarCacheEntidadeAlpha(MODULO, CACHE_KEYS.VEICULOS, data);
  },

  // --- Trajetos (Lista Resumo) ---
  async getTrajetos(): Promise<VisitasTrajetoResumo[]> {
    return (await obterCacheEntidadeAlpha<VisitasTrajetoResumo[]>(MODULO, CACHE_KEYS.TRAJETOS)) ?? [];
  },
  async setTrajetos(data: VisitasTrajetoResumo[]): Promise<void> {
    await salvarCacheEntidadeAlpha(MODULO, CACHE_KEYS.TRAJETOS, data);
  },

  // --- Trajetos Completos Detalhados (com Waypoints e Visitas para Replay Offline) ---
  async salvarTrajetoCompletoLocal(trajeto: VisitasTrajeto): Promise<void> {
    try {
      const mapa =
        (await obterCacheEntidadeAlpha<Record<string, VisitasTrajeto>>(
          MODULO,
          CACHE_KEYS.TRAJETOS_DETALHADOS
        )) ?? {};
      mapa[trajeto.id] = trajeto;
      await salvarCacheEntidadeAlpha(MODULO, CACHE_KEYS.TRAJETOS_DETALHADOS, mapa);
    } catch (err) {
      console.warn('Erro ao salvar trajeto detalhado localmente:', err);
    }
  },

  async obterTrajetoCompletoLocal(trajetoId: string): Promise<VisitasTrajeto | null> {
    try {
      const mapa =
        (await obterCacheEntidadeAlpha<Record<string, VisitasTrajeto>>(
          MODULO,
          CACHE_KEYS.TRAJETOS_DETALHADOS
        )) ?? {};
      return mapa[trajetoId] ?? null;
    } catch {
      return null;
    }
  },

  // --- Auto-Save de Sessão em Progresso (Blindagem contra F5 / crash acidental) ---
  async salvarSessaoAtiva(dados: any): Promise<void> {
    try {
      await salvarCacheEntidadeAlpha(MODULO, CACHE_KEYS.SESSAO_ATIVA, dados);
    } catch {}
  },

  async obterSessaoAtiva(): Promise<any | null> {
    try {
      return await obterCacheEntidadeAlpha<any>(MODULO, CACHE_KEYS.SESSAO_ATIVA);
    } catch {
      return null;
    }
  },

  async limparSessaoAtiva(): Promise<void> {
    try {
      await salvarCacheEntidadeAlpha(MODULO, CACHE_KEYS.SESSAO_ATIVA, null);
    } catch {}
  },

  // --- Mapas GeoPDF ---
  async getGeoPdfs(): Promise<VisitasGeoPdfMap[]> {
    return (await obterCacheEntidadeAlpha<VisitasGeoPdfMap[]>(MODULO, CACHE_KEYS.GEOPDF)) ?? [];
  },
  async setGeoPdfs(data: VisitasGeoPdfMap[]): Promise<void> {
    await salvarCacheEntidadeAlpha(MODULO, CACHE_KEYS.GEOPDF, data);
  },

  // --- Fila de Operações Offline ---
  async enfileirarOperacao(
    tabela: string,
    acao: 'INSERT' | 'UPDATE' | 'UPSERT' | 'DELETE',
    payload: any,
    registroId: string
  ): Promise<void> {
    try {
      await enfileirarAcaoSyncAlpha({
        id: registroId,
        modulo: MODULO,
        tabela,
        acao,
        payload,
      });
    } catch (err: any) {
      if (err?.name === 'QuotaExceededError' || err?.code === 22) {
        toast.error('Armazenamento do dispositivo cheio! Libere espaço para continuar gravando offline.');
      } else {
        toast.error('Erro ao armazenar alteração localmente.');
      }
      throw err;
    }
  },

  // --- Contagem de Itens Pendentes ---
  async contarItensPendentes(): Promise<number> {
    const pendentes = await obterFilaPendenteAlpha(MODULO);
    return pendentes.filter((item) => !item.sincronizado).length;
  },

  // --- Sincronização Manual ---
  async sincronizarTudo(): Promise<number> {
    const supabase = createClient();
    const resultado = await sincronizarFilaAlphaGlobal(supabase, MODULO);
    return resultado.sincronizados;
  },
};
