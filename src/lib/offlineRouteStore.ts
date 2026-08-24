/**
 * Gerenciador de Armazenamento Local e Fila Offline (IndexedDB / LocalStorage)
 * SIG - Sapeaçu / BA
 */

import { PontoLocalizacao, ResultadoRoteiro } from './routeOptimizer';

export interface VisitaPonto {
  id: string; // UUID único gerado no dispositivo (idempotência)
  escola_id: string | null;
  escola_nome: string;
  funcionario_id: string | null;
  rota_id?: string | null;
  veiculo_id?: string | null;
  rota_nome: string;
  data_hora_chegada: string;
  latitude: number | null;
  longitude: number | null;
  distancia_ponto_metros: number | null;
  odometro_km: number | null;
  observacoes: string | null;
  status: 'REALIZADA' | 'IMPREVISTO' | 'AUSENTE';
  sincronizado: boolean;
  tentativas_sync?: number;
}

export interface PontoGpsTrack {
  latitude: number;
  longitude: number;
  timestamp: number;
  speedKmh: number;
  heading: number;
  accuracy: number;
  distanceM: number;
}

export interface NavegacaoLivreRegistro {
  id: string;
  funcionario_id: string | null;
  funcionario_nome?: string | null;
  veiculo_id?: string | null;
  titulo: string;
  data_inicio: string;
  data_fim: string | null;
  duracao_segundos: number;
  distancia_metros: number;
  velocidade_media_kmh: number;
  velocidade_max_kmh: number;
  pontos_gps: PontoGpsTrack[];
  status: 'EM_ANDAMENTO' | 'FINALIZADA' | 'CANCELADA';
  observacoes?: string | null;
  sincronizado: boolean;
  created_at?: string;
}

export interface RotaAtivaState {
  id: string;
  rota_id?: string | null;
  veiculo_id?: string | null;
  nome: string;
  data_inicio: string;
  escolasSelecionadas: PontoLocalizacao[];
  resultadoRoteiro: ResultadoRoteiro | null;
  paradasConcluidas: string[]; // array de IDs de escolas
  emNavegacao: boolean;
}

const DB_NAME = 'sig_rotas_offline_db';
const DB_VERSION = 2;
const STORE_ROTAS = 'rota_ativa';
const STORE_VISITAS = 'visitas_queue';
const STORE_NAVEGACOES = 'navegacoes_livres';

const LS_FALLBACK_ROTA = 'sig_offline_rota_ativa';
const LS_FALLBACK_VISITAS = 'sig_offline_visitas_queue';
const LS_FALLBACK_NAVEGACOES = 'sig_offline_navegacoes_livres';

/**
 * Abre a conexão com o banco IndexedDB local
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB não suportado neste ambiente'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_ROTAS)) {
        db.createObjectStore(STORE_ROTAS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_VISITAS)) {
        const visitasStore = db.createObjectStore(STORE_VISITAS, { keyPath: 'id' });
        visitasStore.createIndex('sincronizado', 'sincronizado', { unique: false });
        visitasStore.createIndex('data_hora_chegada', 'data_hora_chegada', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_NAVEGACOES)) {
        const navStore = db.createObjectStore(STORE_NAVEGACOES, { keyPath: 'id' });
        navStore.createIndex('sincronizado', 'sincronizado', { unique: false });
        navStore.createIndex('data_inicio', 'data_inicio', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Salva a rota ativa na memória persistente
 */
export async function salvarRotaAtiva(rota: RotaAtivaState): Promise<void> {
  if (typeof window === 'undefined') return;

  // Fallback rápido no localStorage
  try {
    localStorage.setItem(LS_FALLBACK_ROTA, JSON.stringify(rota));
  } catch {}

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ROTAS, 'readwrite');
      const store = tx.objectStore(STORE_ROTAS);
      const req = store.put(rota);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Fallback para localStorage na rota ativa:', err);
  }
}

/**
 * Recupera a rota ativa salva
 */
export async function obterRotaAtiva(): Promise<RotaAtivaState | null> {
  if (typeof window === 'undefined') return null;

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_ROTAS, 'readonly');
      const store = tx.objectStore(STORE_ROTAS);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = req.result as RotaAtivaState[];
        if (list && list.length > 0) {
          resolve(list[0]);
        } else {
          const cached = localStorage.getItem(LS_FALLBACK_ROTA);
          resolve(cached ? JSON.parse(cached) : null);
        }
      };
      req.onerror = () => {
        const cached = localStorage.getItem(LS_FALLBACK_ROTA);
        resolve(cached ? JSON.parse(cached) : null);
      };
    });
  } catch {
    const cached = localStorage.getItem(LS_FALLBACK_ROTA);
    return cached ? JSON.parse(cached) : null;
  }
}

/**
 * Limpa a rota ativa atual
 */
export async function limparRotaAtiva(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LS_FALLBACK_ROTA);
  } catch {}

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_ROTAS, 'readwrite');
      const store = tx.objectStore(STORE_ROTAS);
      store.clear();
      tx.oncomplete = () => resolve();
    });
  } catch {}
}

/**
 * Adiciona um registro de visita ou check-in na fila offline
 */
export async function enfileirarVisitaOffline(visita: VisitaPonto): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const MAX_ITEMS = 50;
    const saved = localStorage.getItem(LS_FALLBACK_VISITAS);
    const list: VisitaPonto[] = saved ? JSON.parse(saved) : [];
    const idx = list.findIndex((item) => item.id === visita.id);
    if (idx >= 0) {
      list[idx] = visita;
    } else {
      list.push(visita);
    }
    const limitedList = list.slice(-MAX_ITEMS);
    localStorage.setItem(LS_FALLBACK_VISITAS, JSON.stringify(limitedList));
  } catch {}

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VISITAS, 'readwrite');
      const store = tx.objectStore(STORE_VISITAS);
      const req = store.put(visita);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Erro ao salvar no IndexedDB, mantido no localStorage:', err);
  }
}

/**
 * Retorna todas as visitas não sincronizadas
 */
export async function obterVisitasPendentes(): Promise<VisitaPonto[]> {
  if (typeof window === 'undefined') return [];

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_VISITAS, 'readonly');
      const store = tx.objectStore(STORE_VISITAS);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result as VisitaPonto[]) || [];
        const pendentes = list.filter((v) => !v.sincronizado);
        resolve(pendentes);
      };
      req.onerror = () => {
        const saved = localStorage.getItem(LS_FALLBACK_VISITAS);
        const list: VisitaPonto[] = saved ? JSON.parse(saved) : [];
        resolve(list.filter((v) => !v.sincronizado));
      };
    });
  } catch {
    const saved = localStorage.getItem(LS_FALLBACK_VISITAS);
    const list: VisitaPonto[] = saved ? JSON.parse(saved) : [];
    return list.filter((v) => !v.sincronizado);
  }
}

/**
 * Marca visitas como sincronizadas e limpa itens antigos
 */
export async function marcarVisitasComoSincronizadas(ids: string[]): Promise<void> {
  if (typeof window === 'undefined' || ids.length === 0) return;

  try {
    const saved = localStorage.getItem(LS_FALLBACK_VISITAS);
    if (saved) {
      const list: VisitaPonto[] = JSON.parse(saved);
      const updated = list.map((item) => (ids.includes(item.id) ? { ...item, sincronizado: true } : item));
      localStorage.setItem(LS_FALLBACK_VISITAS, JSON.stringify(updated));
    }
  } catch {}

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_VISITAS, 'readwrite');
    const store = tx.objectStore(STORE_VISITAS);

    for (const id of ids) {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const record = getReq.result as VisitaPonto;
        if (record) {
          record.sincronizado = true;
          store.put(record);
        }
      };
    }
  } catch (err) {
    console.error('Erro ao marcar visitas como sincronizadas:', err);
  }
}

/**
 * Remove uma visita do armazenamento local (IndexedDB e LocalStorage)
 */
export async function removerVisitaOffline(id: string): Promise<void> {
  if (typeof window === 'undefined' || !id) return;

  try {
    const saved = localStorage.getItem(LS_FALLBACK_VISITAS);
    if (saved) {
      const list: VisitaPonto[] = JSON.parse(saved);
      const filtered = list.filter((item) => item.id !== id);
      localStorage.setItem(LS_FALLBACK_VISITAS, JSON.stringify(filtered));
    }
  } catch {}

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_VISITAS, 'readwrite');
    const store = tx.objectStore(STORE_VISITAS);
    store.delete(id);
  } catch (err) {
    console.error('Erro ao remover visita do IndexedDB:', err);
  }
}

// ==============================================================================
// GESTÃO OFFLINE DE NAVEGAÇÕES LIVRES (GRAVAÇÃO DE TRILHAS GPS)
// ==============================================================================

/**
 * Salva ou atualiza uma navegação livre localmente no IndexedDB e LocalStorage
 */
export async function salvarNavegacaoLivreOffline(nav: NavegacaoLivreRegistro): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const MAX_ITEMS = 30;
    const saved = localStorage.getItem(LS_FALLBACK_NAVEGACOES);
    const list: NavegacaoLivreRegistro[] = saved ? JSON.parse(saved) : [];
    const idx = list.findIndex((item) => item.id === nav.id);
    if (idx >= 0) {
      list[idx] = nav;
    } else {
      list.unshift(nav);
    }
    const limitedList = list.slice(0, MAX_ITEMS);
    localStorage.setItem(LS_FALLBACK_NAVEGACOES, JSON.stringify(limitedList));
  } catch {}

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAVEGACOES, 'readwrite');
      const store = tx.objectStore(STORE_NAVEGACOES);
      const req = store.put(nav);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Erro ao salvar navegação no IndexedDB, mantido no localStorage:', err);
  }
}

/**
 * Obtém todas as navegações livres locais
 */
export async function obterNavegacoesLivresOffline(): Promise<NavegacaoLivreRegistro[]> {
  if (typeof window === 'undefined') return [];

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAVEGACOES, 'readonly');
      const store = tx.objectStore(STORE_NAVEGACOES);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result as NavegacaoLivreRegistro[]) || [];
        if (list.length > 0) {
          resolve(list.sort((a, b) => new Date(b.data_inicio).getTime() - new Date(a.data_inicio).getTime()));
        } else {
          const saved = localStorage.getItem(LS_FALLBACK_NAVEGACOES);
          resolve(saved ? JSON.parse(saved) : []);
        }
      };
      req.onerror = () => {
        const saved = localStorage.getItem(LS_FALLBACK_NAVEGACOES);
        resolve(saved ? JSON.parse(saved) : []);
      };
    });
  } catch {
    const saved = localStorage.getItem(LS_FALLBACK_NAVEGACOES);
    return saved ? JSON.parse(saved) : [];
  }
}

/**
 * Retorna navegações livres pendentes de sincronização
 */
export async function obterNavegacoesPendentes(): Promise<NavegacaoLivreRegistro[]> {
  const todas = await obterNavegacoesLivresOffline();
  return todas.filter((n) => !n.sincronizado && n.status === 'FINALIZADA');
}

/**
 * Marca uma navegação como sincronizada
 */
export async function marcarNavegacaoComoSincronizada(id: string): Promise<void> {
  if (typeof window === 'undefined' || !id) return;

  try {
    const saved = localStorage.getItem(LS_FALLBACK_NAVEGACOES);
    if (saved) {
      const list: NavegacaoLivreRegistro[] = JSON.parse(saved);
      const updated = list.map((item) => (item.id === id ? { ...item, sincronizado: true } : item));
      localStorage.setItem(LS_FALLBACK_NAVEGACOES, JSON.stringify(updated));
    }
  } catch {}

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAVEGACOES, 'readwrite');
    const store = tx.objectStore(STORE_NAVEGACOES);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const rec = getReq.result as NavegacaoLivreRegistro;
      if (rec) {
        rec.sincronizado = true;
        store.put(rec);
      }
    };
  } catch (err) {
    console.error('Erro ao marcar navegação como sincronizada no IndexedDB:', err);
  }
}

/**
 * Remove uma navegação do armazenamento local
 */
export async function removerNavegacaoOffline(id: string): Promise<void> {
  if (typeof window === 'undefined' || !id) return;

  try {
    const saved = localStorage.getItem(LS_FALLBACK_NAVEGACOES);
    if (saved) {
      const list: NavegacaoLivreRegistro[] = JSON.parse(saved);
      const filtered = list.filter((item) => item.id !== id);
      localStorage.setItem(LS_FALLBACK_NAVEGACOES, JSON.stringify(filtered));
    }
  } catch {}

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAVEGACOES, 'readwrite');
    const store = tx.objectStore(STORE_NAVEGACOES);
    store.delete(id);
  } catch (err) {
    console.error('Erro ao remover navegação do IndexedDB:', err);
  }
}
