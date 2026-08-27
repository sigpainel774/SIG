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
export function sanitizarPayload(payload: Record<string, any>): Record<string, any> {
  if (!payload || typeof payload !== 'object') return payload
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value === '' || value === undefined) {
      result[key] = null
    } else if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      result[key] = sanitizarPayload(value)
    } else {
      result[key] = value
    }
  }
  return result
}

/**
 * Limpa campos virtuais do frontend e valida tipos obrigatórios antes de persistir no Supabase
 */
export function limparPayloadParaTabela(tabela: string, rawPayload: Record<string, any>): Record<string, any> {
  const p = sanitizarPayload(rawPayload || {})

  if (tabela === 'visitas_pontos') {
    delete p.fotos // Fotos são persistidas em visitas_fotos
    if (p.area_id === 'nenhuma' || p.area_id === '' || p.area_id === 'nenhum') p.area_id = null
    if (p.usuario_id === 'nenhum' || p.usuario_id === '') p.usuario_id = null
    if (p.latitude !== undefined && p.latitude !== null) p.latitude = Number(p.latitude)
    if (p.longitude !== undefined && p.longitude !== null) p.longitude = Number(p.longitude)
    if (!p.status) p.status = 'pendente'
  } else if (tabela === 'visitas_areas') {
    delete p.hectares // Coluna gerada automaticamente pelo Postgres (GENERATED ALWAYS AS (square_meters / 10000.0) STORED)
    if (p.escola_id === 'nenhuma' || p.escola_id === '' || p.escola_id === 'nenhum') p.escola_id = null
    if (p.usuario_id === 'nenhum' || p.usuario_id === '') p.usuario_id = null
    if (p.square_meters !== undefined && p.square_meters !== null) p.square_meters = Number(p.square_meters)
  } else if (tabela === 'visitas_roteiros') {
    if (p.veiculo_id === 'nenhum' || p.veiculo_id === '' || p.veiculo_id === 'nenhuma') p.veiculo_id = null
    if (p.usuario_id === 'nenhum' || p.usuario_id === '') p.usuario_id = null
    if (Array.isArray(p.area_ids)) {
      p.area_ids = p.area_ids.filter((id: any) => id && typeof id === 'string' && id.trim() !== '' && id !== 'nenhuma' && id !== 'nenhum')
    } else {
      p.area_ids = []
    }
  } else if (tabela === 'visitas_trajetos') {
    if (p.area_id === 'nenhuma' || p.area_id === '' || p.area_id === 'nenhum') p.area_id = null
    if (p.roteiro_id === 'nenhum' || p.roteiro_id === '' || p.roteiro_id === 'nenhuma') p.roteiro_id = null
    if (p.veiculo_id === 'nenhum' || p.veiculo_id === '' || p.veiculo_id === 'nenhuma') p.veiculo_id = null
    if (p.usuario_id === 'nenhum' || p.usuario_id === '') p.usuario_id = null
    if (!p.modo) p.modo = 'driving'
    if (p.distance_meters !== undefined && p.distance_meters !== null) p.distance_meters = Number(p.distance_meters)
    if (p.moving_seconds !== undefined && p.moving_seconds !== null) p.moving_seconds = Number(p.moving_seconds)
    if (p.visit_seconds !== undefined && p.visit_seconds !== null) p.visit_seconds = Number(p.visit_seconds)
    if (p.origin_lat != null) p.origin_lat = Number(p.origin_lat)
    if (p.origin_lng != null) p.origin_lng = Number(p.origin_lng)
    if (p.destination_lat != null) p.destination_lat = Number(p.destination_lat)
    if (p.destination_lng != null) p.destination_lng = Number(p.destination_lng)
    if (p.estimated_liters != null) p.estimated_liters = Number(p.estimated_liters)
    if (p.estimated_cost != null) p.estimated_cost = Number(p.estimated_cost)
    if (!p.posicoes) p.posicoes = []
    if (!p.visitas_registradas) p.visitas_registradas = []
  } else if (tabela === 'visitas_veiculos') {
    if (p.placa === '') p.placa = null
    if (p.motor === '') p.motor = null
    if (p.usuario_id === 'nenhum' || p.usuario_id === '') p.usuario_id = null
    if (p.consumo_km_l !== undefined && p.consumo_km_l !== null) p.consumo_km_l = Number(p.consumo_km_l) || 10
    if (p.preco_litro !== undefined && p.preco_litro !== null) p.preco_litro = Number(p.preco_litro) || 6
    if (p.ativo === undefined || p.ativo === null) p.ativo = true
    if (!p.tipo_combustivel) p.tipo_combustivel = 'gasolina'
  } else if (tabela === 'visitas_mapas_geopdf') {
    if (p.usuario_id === 'nenhum' || p.usuario_id === '') p.usuario_id = null
    if (p.opacidade !== undefined && p.opacidade !== null) p.opacidade = Number(p.opacidade)
    if (p.rotacao !== undefined && p.rotacao !== null) p.rotacao = Number(p.rotacao)
    if (p.numero_pagina !== undefined && p.numero_pagina !== null) p.numero_pagina = Number(p.numero_pagina)
  } else if (tabela === 'visitas_fotos') {
    if (p.usuario_id === 'nenhum' || p.usuario_id === '') p.usuario_id = null
    if (p.latitude != null) p.latitude = Number(p.latitude)
    if (p.longitude != null) p.longitude = Number(p.longitude)
  }

  return p
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
  modulo?: string,
  options?: { forcar?: boolean }
): Promise<{ sincronizados: number; erros: number; total: number }> {
  if (isSyncingLock || typeof window === 'undefined' || !navigator.onLine) {
    return { sincronizados: 0, erros: 0, total: 0 }
  }

  isSyncingLock = true
  let sincronizados = 0
  let erros = 0

  try {
    const pendentes = await obterFilaPendenteAlpha(modulo)
    if (pendentes.length === 0) return { sincronizados: 0, erros: 0, total: 0 }

    // Renova a sessão antes de enviar para garantir JWT válido
    try {
      await supabase.auth.getSession()
    } catch {}

    const db = await openAlphaDB().catch(() => null)

    for (const item of pendentes) {
      // Se não for sincronização forçada manual, pula itens que falharam mais de 10 vezes
      if (!options?.forcar && item.tentativas >= 10) {
        erros++
        continue
      }

      try {
        let opError = null
        const payloadLimpo = limparPayloadParaTabela(item.tabela, item.payload)

        if (item.acao === 'INSERT' || item.acao === 'UPSERT') {
          // Preferir upsert com onConflict no ID para evitar erros de duplicidade
          const { error } = await supabase
            .from(item.tabela)
            .upsert(payloadLimpo, { onConflict: 'id' })
          opError = error
        } else if (item.acao === 'UPDATE') {
          const { error } = await supabase
            .from(item.tabela)
            .update(payloadLimpo)
            .eq('id', item.id)
          opError = error
        } else if (item.acao === 'DELETE') {
          // Tenta soft-delete primeiro se tabela tiver deleted_at
          const { error: softError } = await supabase
            .from(item.tabela)
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', item.id)
          
          if (softError) {
            // Fallback para hard delete
            const { error: hardError } = await supabase
              .from(item.tabela)
              .delete()
              .eq('id', item.id)
            opError = hardError
          }
        }

        if (opError) {
          throw opError
        }

        // Sucesso na sincronização do item
        item.sincronizado = true
        item.ultimo_erro = null
        item.tentativas = 0
        sincronizados++

        if (db) {
          const tx = db.transaction(STORE_SYNC_QUEUE, 'readwrite')
          tx.objectStore(STORE_SYNC_QUEUE).put(item)
        }

        // Atualiza também no localStorage fallback
        try {
          const saved = localStorage.getItem(LS_FALLBACK_QUEUE)
          if (saved) {
            const list: AlphaItemFilaSync[] = JSON.parse(saved)
            const idx = list.findIndex((x) => x.id === item.id)
            if (idx >= 0) {
              list[idx].sincronizado = true
              list[idx].ultimo_erro = null
              localStorage.setItem(LS_FALLBACK_QUEUE, JSON.stringify(list))
            }
          }
        } catch {}
      } catch (err: any) {
        item.tentativas = (item.tentativas || 0) + 1
        item.ultimo_erro = err.message || 'Falha de comunicação com o servidor'
        erros++
        console.error(`Erro ao sincronizar item ${item.id} do módulo ${item.modulo}:`, err?.message || err)

        if (db) {
          const tx = db.transaction(STORE_SYNC_QUEUE, 'readwrite')
          tx.objectStore(STORE_SYNC_QUEUE).put(item)
        }
      }
    }

    // Auto-limpeza de itens antigos já sincronizados (> 3 dias)
    limparItensAntigosSincronizados().catch(() => {})

    return { sincronizados, erros, total: pendentes.length }
  } finally {
    isSyncingLock = false
  }
}

/**
 * Exclui um item específico da fila de sincronização (IndexedDB e LocalStorage)
 */
export async function removerItemFilaSyncAlpha(id: string): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    const saved = localStorage.getItem(LS_FALLBACK_QUEUE)
    if (saved) {
      const list: AlphaItemFilaSync[] = JSON.parse(saved)
      const filtrados = list.filter((x) => x.id !== id)
      localStorage.setItem(LS_FALLBACK_QUEUE, JSON.stringify(filtrados))
    }
  } catch {}

  try {
    const db = await openAlphaDB()
    const tx = db.transaction(STORE_SYNC_QUEUE, 'readwrite')
    const store = tx.objectStore(STORE_SYNC_QUEUE)
    store.delete(id)
  } catch (err) {
    console.warn('Erro ao remover item da fila no IndexedDB:', err)
  }
}

/**
 * Limpa todos os itens pendentes da fila de sincronização de um módulo (ou global se não especificado)
 */
export async function limparFilaSyncAlpha(modulo?: string): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    const saved = localStorage.getItem(LS_FALLBACK_QUEUE)
    if (saved) {
      const list: AlphaItemFilaSync[] = JSON.parse(saved)
      const mantidos = modulo ? list.filter((x) => x.modulo !== modulo) : []
      localStorage.setItem(LS_FALLBACK_QUEUE, JSON.stringify(mantidos))
    }
  } catch {}

  try {
    const db = await openAlphaDB()
    const tx = db.transaction(STORE_SYNC_QUEUE, 'readwrite')
    const store = tx.objectStore(STORE_SYNC_QUEUE)

    if (!modulo) {
      store.clear()
    } else {
      const req = store.getAll()
      req.onsuccess = () => {
        const list = (req.result as AlphaItemFilaSync[]) || []
        const txDelete = db.transaction(STORE_SYNC_QUEUE, 'readwrite')
        const storeDelete = txDelete.objectStore(STORE_SYNC_QUEUE)
        for (const item of list) {
          if (item.modulo === modulo) {
            storeDelete.delete(item.id)
          }
        }
      }
    }
  } catch (err) {
    console.warn('Erro ao limpar fila no IndexedDB:', err)
  }
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
