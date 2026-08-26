import {
  salvarCacheEntidadeAlpha,
  obterCacheEntidadeAlpha,
  enfileirarAcaoSyncAlpha,
  sincronizarFilaAlphaGlobal,
  obterFilaPendenteAlpha,
  removerItemFilaSyncAlpha,
  limparFilaSyncAlpha,
  AlphaItemFilaSync,
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

  // --- Trajetos (Lista Resumo com fusão de itens locais/offline) ---
  async getTrajetos(): Promise<VisitasTrajetoResumo[]> {
    const cached = (await obterCacheEntidadeAlpha<VisitasTrajetoResumo[]>(MODULO, CACHE_KEYS.TRAJETOS)) ?? [];
    
    // Fusão com trajetos detalhados salvos localmente e fila pendente
    const mapaDetalhados = (await obterCacheEntidadeAlpha<Record<string, VisitasTrajeto>>(MODULO, CACHE_KEYS.TRAJETOS_DETALHADOS)) ?? {};
    const pendentes = await obterFilaPendenteAlpha(MODULO);
    
    const mapaResumos = new Map<string, VisitasTrajetoResumo>();
    
    for (const c of cached) {
      if (c && c.id) mapaResumos.set(c.id, c);
    }
    
    for (const [id, t] of Object.entries(mapaDetalhados)) {
      if (t && t.id) {
        if (!mapaResumos.has(t.id)) {
          const { posicoes, ...resumo } = t;
          mapaResumos.set(t.id, resumo as VisitasTrajetoResumo);
        }
      }
    }
    
    for (const p of pendentes) {
      if (p && p.tabela === 'visitas_trajetos' && p.payload && p.payload.id) {
        if (!mapaResumos.has(p.payload.id)) {
          const { posicoes, ...resumo } = p.payload;
          mapaResumos.set(p.payload.id, resumo as VisitasTrajetoResumo);
        }
      }
    }
    
    return Array.from(mapaResumos.values()).sort((a, b) => 
      new Date(b.started_at || b.created_at || 0).getTime() - new Date(a.started_at || a.created_at || 0).getTime()
    );
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
      if (mapa[trajetoId]) return mapa[trajetoId];

      // Busca na fila pendente se não estiver no mapa detalhado
      const pendentes = await obterFilaPendenteAlpha(MODULO);
      const itemFila = pendentes.find((p) => p.tabela === 'visitas_trajetos' && p.payload?.id === trajetoId);
      if (itemFila && itemFila.payload) {
        return itemFila.payload as VisitasTrajeto;
      }

      return null;
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

  async obterIdsPendentes(): Promise<Set<string>> {
    try {
      const pendentes = await obterFilaPendenteAlpha(MODULO);
      const ids = new Set<string>();
      for (const p of pendentes) {
        if (!p.sincronizado) {
          if (p.id) ids.add(p.id);
          if (p.payload?.id) ids.add(p.payload.id);
        }
      }
      return ids;
    } catch {
      return new Set<string>();
    }
  },

  // --- Gerenciamento e Exclusão da Fila Pendente ---
  async obterItensFilaPendentes(): Promise<AlphaItemFilaSync[]> {
    return await obterFilaPendenteAlpha(MODULO);
  },

  async removerItemPendente(id: string): Promise<void> {
    await removerItemFilaSyncAlpha(id);
  },

  async limparFilaPendentes(): Promise<void> {
    await limparFilaSyncAlpha(MODULO);
  },

  // --- Sincronização Manual ---
  async sincronizarTudo(options?: { forcar?: boolean }): Promise<{ sincronizados: number; erros: number; total: number }> {
    const supabase = createClient();
    return await sincronizarFilaAlphaGlobal(supabase, MODULO, { forcar: options?.forcar ?? true });
  },
};
