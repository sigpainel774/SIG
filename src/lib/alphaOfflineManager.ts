/**
 * Gerenciador Universal Offline-First do Sistema Alpha (Laboratório SIG)
 * Fornece armazenamento persistente no IndexedDB, fila de sincronização universal e resiliência offline para todos os módulos Alpha.
 */

import { SupabaseClient } from '@supabase/supabase-js'

export interface AlphaItemFilaSync {
  id: string // UUID idempotente
  modulo: string // ex: 'rotas-escolas', 'inspecao-predial', 'checklist-frota'
  tabela: string // Tabela de destino no Supabase (ex: 'registros_visitas_rotas', 'alpha_ocorrencias')
  acao: 'INSERT' | 'UPDATE' | 'UPSERT' | 'DELETE'
  payload: Record<string, any>
  criado_em: string
  sincronizado: boolean
  tentativas: number
  ultimo_erro?: string | null
}

const DB_NAME = 'sig_alpha_offline_db'
const DB_VERSION = 1

const STORE_MODULOS = 'alpha_modulos'
const STORE_DATA_CACHE = 'alpha_data_cache'
const STORE_SYNC_QUEUE = 'alpha_sync_queue'

const LS_FALLBACK_QUEUE = 'sig_alpha_offline_sync_queue'
const LS_FALLBACK_MODULOS = 'sig_alpha_offline_modulos'

let isSyncingLock = false

/**
 * Abre e inicializa a conexão com o banco IndexedDB do Alpha
 */
function openAlphaDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB não suportado neste ambiente'))
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Store 1: Funções / Módulos da Sidebar
      if (!db.objectStoreNames.contains(STORE_MODULOS)) {
        db.createObjectStore(STORE_MODULOS, { keyPath: 'codigo' })
      }

      // Store 2: Cache de dados e entidades por módulo
      if (!db.objectStoreNames.contains(STORE_DATA_CACHE)) {
        db.createObjectStore(STORE_DATA_CACHE, { keyPath: 'chave' })
      }

      // Store 3: Fila universal de sincronização com o Supabase
      if (!db.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
        const queueStore = db.createObjectStore(STORE_SYNC_QUEUE, { keyPath: 'id' })
        queueStore.createIndex('modulo', 'modulo', { unique: false })
        queueStore.createIndex('sincronizado', 'sincronizado', { unique: false })
        queueStore.createIndex('criado_em', 'criado_em', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Sanitiza recursivamente strings vazias ("") em null para evitar erros de tipagem UUID no Postgres
 */
function sanitizarPayload(payload: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value === '') {
      result[key] = null
    } else if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      result[key] = sanitizarPayload(value)
    } else {
      result[key] = value
    }
  }
  return result
}

// ─────────────────────────────────────────────────────────────
// 1. CACHE DE MÓDULOS / FUNÇÕES DA SIDEBAR DO ALPHA
// ─────────────────────────────────────────────────────────────

export async function salvarCacheModulosAlpha(modulos: any[]): Promise<void> {
  if (typeof window === 'undefined' || !Array.isArray(modulos)) return

  try {
    localStorage.setItem(LS_FALLBACK_MODULOS, JSON.stringify(modulos))
  } catch {}

  try {
    const db = await openAlphaDB()
    const tx = db.transaction(STORE_MODULOS, 'readwrite')
    const store = tx.objectStore(STORE_MODULOS)
    store.clear()
    for (const m of modulos) {
      if (m && m.codigo) {
        store.put(m)
      }
    }
  } catch (err) {
    console.warn('Erro ao gravar cache de módulos no IndexedDB:', err)
  }
}

export async function obterCacheModulosAlpha(): Promise<any[]> {
  if (typeof window === 'undefined') return []

  try {
    const db = await openAlphaDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_MODULOS, 'readonly')
      const store = tx.objectStore(STORE_MODULOS)
      const req = store.getAll()
      req.onsuccess = () => {
        const list = req.result || []
        if (list.length > 0) {
          resolve(list)
        } else {
          const cached = localStorage.getItem(LS_FALLBACK_MODULOS)
          resolve(cached ? JSON.parse(cached) : [])
        }
      }
      req.onerror = () => {
        const cached = localStorage.getItem(LS_FALLBACK_MODULOS)
        resolve(cached ? JSON.parse(cached) : [])
      }
    })
  } catch {
    const cached = localStorage.getItem(LS_FALLBACK_MODULOS)
    return cached ? JSON.parse(cached) : []
  }
}

// ─────────────────────────────────────────────────────────────
// 2. CACHE CHAVE-VALOR GENÉRICO PARA DADOS DE QUALQUER MÓDULO
// ─────────────────────────────────────────────────────────────

export async function salvarCacheEntidadeAlpha<T = any>(
  modulo: string,
  nomeChave: string,
  dados: T
): Promise<void> {
  if (typeof window === 'undefined') return

  const chaveCompleta = `${modulo}:${nomeChave}`
  const registro = {
    chave: chaveCompleta,
    modulo,
    dados,
    atualizado_em: new Date().toISOString(),
  }

  try {
    const db = await openAlphaDB()
    const tx = db.transaction(STORE_DATA_CACHE, 'readwrite')
    const store = tx.objectStore(STORE_DATA_CACHE)
    store.put(registro)
  } catch (err) {
    console.warn(`Erro ao salvar cache de ${chaveCompleta}:`, err)
  }
}

export async function obterCacheEntidadeAlpha<T = any>(
  modulo: string,
  nomeChave: string
): Promise<T | null> {
  if (typeof window === 'undefined') return null

  const chaveCompleta = `${modulo}:${nomeChave}`

  try {
    const db = await openAlphaDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_DATA_CACHE, 'readonly')
      const store = tx.objectStore(STORE_DATA_CACHE)
      const req = store.get(chaveCompleta)
      req.onsuccess = () => {
        if (req.result && req.result.dados !== undefined) {
          resolve(req.result.dados as T)
        } else {
          resolve(null)
        }
      }
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────
// 3. FILA UNIVERSAL DE SINCRONIZAÇÃO OFFLINE -> SUPABASE
// ─────────────────────────────────────────────────────────────

export async function enfileirarAcaoSyncAlpha(item: {
  id?: string
  modulo: string
  tabela: string
  acao: 'INSERT' | 'UPDATE' | 'UPSERT' | 'DELETE'
  payload: Record<string, any>
}): Promise<AlphaItemFilaSync> {
  const novoItem: AlphaItemFilaSync = {
    id: item.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `item_${Date.now()}_${Math.random().toString(36).slice(2)}`),
    modulo: item.modulo,
    tabela: item.tabela,
    acao: item.acao,
    payload: sanitizarPayload(item.payload),
    criado_em: new Date().toISOString(),
    sincronizado: false,
    tentativas: 0,
    ultimo_erro: null,
  }

  // Backup em LocalStorage
  try {
    const saved = localStorage.getItem(LS_FALLBACK_QUEUE)
    const list: AlphaItemFilaSync[] = saved ? JSON.parse(saved) : []
    list.push(novoItem)
    localStorage.setItem(LS_FALLBACK_QUEUE, JSON.stringify(list))
  } catch {}

  try {
    const db = await openAlphaDB()
    const tx = db.transaction(STORE_SYNC_QUEUE, 'readwrite')
    const store = tx.objectStore(STORE_SYNC_QUEUE)
    store.put(novoItem)
  } catch (err) {
    console.warn('Erro ao salvar item na fila do IndexedDB:', err)
  }

  return novoItem
}

export async function obterFilaPendenteAlpha(modulo?: string): Promise<AlphaItemFilaSync[]> {
  if (typeof window === 'undefined') return []

  try {
    const db = await openAlphaDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SYNC_QUEUE, 'readonly')
      const store = tx.objectStore(STORE_SYNC_QUEUE)
      const req = store.getAll()
      req.onsuccess = () => {
        const list = (req.result as AlphaItemFilaSync[]) || []
        const pendentes = list.filter((i) => !i.sincronizado && (modulo ? i.modulo === modulo : true))
        resolve(pendentes)
      }
      req.onerror = () => {
        const saved = localStorage.getItem(LS_FALLBACK_QUEUE)
        const list: AlphaItemFilaSync[] = saved ? JSON.parse(saved) : []
        resolve(list.filter((i) => !i.sincronizado && (modulo ? i.modulo === modulo : true)))
      }
    })
  } catch {
    const saved = localStorage.getItem(LS_FALLBACK_QUEUE)
    const list: AlphaItemFilaSync[] = saved ? JSON.parse(saved) : []
    return list.filter((i) => !i.sincronizado && (modulo ? i.modulo === modulo : true))
  }
}

/**
 * Sincroniza todos os itens pendentes com o Supabase de forma atômica e segura
 */
export async function sincronizarFilaAlphaGlobal(
  supabase: SupabaseClient,
  modulo?: string
): Promise<{ sincronizados: number; erros: number }> {
  if (isSyncingLock || typeof window === 'undefined' || !navigator.onLine) {
    return { sincronizados: 0, erros: 0 }
  }

  isSyncingLock = true
  let sincronizados = 0
  let erros = 0

  try {
    const pendentes = await obterFilaPendenteAlpha(modulo)
    if (pendentes.length === 0) return { sincronizados: 0, erros: 0 }

    // Renova a sessão antes de enviar para garantir JWT válido
    try {
      await supabase.auth.getSession()
    } catch {}

    const db = await openAlphaDB().catch(() => null)

    for (const item of pendentes) {
      // Pula itens que já falharam mais de 5 vezes para não travar a fila
      if (item.tentativas >= 5) {
        erros++
        continue
      }

      try {
        let opError = null

        if (item.acao === 'INSERT') {
          const { error } = await supabase.from(item.tabela).insert(item.payload)
          opError = error
        } else if (item.acao === 'UPSERT') {
          const { error } = await supabase
            .from(item.tabela)
            .upsert(item.payload, { onConflict: 'id' })
          opError = error
        } else if (item.acao === 'UPDATE') {
          const { error } = await supabase
            .from(item.tabela)
            .update(item.payload)
            .eq('id', item.id)
          opError = error
        } else if (item.acao === 'DELETE') {
          const { error } = await supabase
            .from(item.tabela)
            .delete()
            .eq('id', item.id)
          opError = error
        }

        if (opError) {
          throw opError
        }

        // Sucesso na sincronização do item
        item.sincronizado = true
        item.ultimo_erro = null
        sincronizados++

        if (db) {
          const tx = db.transaction(STORE_SYNC_QUEUE, 'readwrite')
          tx.objectStore(STORE_SYNC_QUEUE).put(item)
        }
      } catch (err: any) {
        item.tentativas = (item.tentativas || 0) + 1
        item.ultimo_erro = err.message || 'Falha de comunicação com o servidor'
        erros++
        console.error(`Erro ao sincronizar item ${item.id} do módulo ${item.modulo}:`, err)

        if (db) {
          const tx = db.transaction(STORE_SYNC_QUEUE, 'readwrite')
          tx.objectStore(STORE_SYNC_QUEUE).put(item)
        }
      }
    }

    // Auto-limpeza de itens antigos já sincronizados (> 3 dias)
    limparItensAntigosSincronizados().catch(() => {})
  } finally {
    isSyncingLock = false
  }

  return { sincronizados, erros }
}

/**
 * Remove registros antigos sincronizados para evitar estouro de cota do IndexedDB
 */
export async function limparItensAntigosSincronizados(): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    const db = await openAlphaDB()
    const tx = db.transaction(STORE_SYNC_QUEUE, 'readwrite')
    const store = tx.objectStore(STORE_SYNC_QUEUE)
    const req = store.getAll()

    req.onsuccess = () => {
      const items = (req.result as AlphaItemFilaSync[]) || []
      const agora = Date.now()
      const limiteTresDias = 3 * 24 * 60 * 60 * 1000

      for (const item of items) {
        if (item.sincronizado) {
          const tempo = new Date(item.criado_em).getTime()
          if (agora - tempo > limiteTresDias) {
            store.delete(item.id)
          }
        }
      }
    }
  } catch {}
}
