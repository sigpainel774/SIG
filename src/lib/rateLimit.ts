/**
 * Rate Limiter super leve compatível com Edge Runtime no Next.js 16.
 * Utiliza janelas de tempo deslizantes (Sliding Window) armazenadas em memória.
 */

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

// Configurações por tipo de rota
const ROUTE_CONFIGS: Record<string, RateLimitConfig> = {
  login: { windowMs: 60 * 1000, maxRequests: 10 },    // 10 tentativas por min por IP em /login e /api/auth
  verify: { windowMs: 60 * 1000, maxRequests: 30 },   // 30 verificações por min por IP em /verificar
  general: { windowMs: 60 * 1000, maxRequests: 300 }, // 300 requisições por min para uso geral (preserva escolas/NAT)
}

interface RequestRecord {
  timestamps: number[]
}

// Armazenamento em memória (Edge-safe)
const memoryStore = new Map<string, RequestRecord>()

// Limpeza automática periódica a cada 5 minutos para evitar vazamento de memória
let lastCleanup = Date.now()
function cleanupExpiredRecords() {
  const now = Date.now()
  if (now - lastCleanup < 5 * 60 * 1000) return
  lastCleanup = now

  const cutoff = now - 10 * 60 * 1000 // descarta registros mais antigos que 10 minutos
  for (const [key, record] of memoryStore.entries()) {
    record.timestamps = record.timestamps.filter((ts) => ts > cutoff)
    if (record.timestamps.length === 0) {
      memoryStore.delete(key)
    }
  }
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

/**
 * Verifica se a requisição de um IP para determinado tipo de rota excede o limite estipulado.
 */
export function checkRateLimit(
  ip: string,
  routeType: 'login' | 'verify' | 'general' = 'general'
): RateLimitResult {
  cleanupExpiredRecords()

  const config = ROUTE_CONFIGS[routeType] || ROUTE_CONFIGS.general
  const key = `${routeType}:${ip}`
  const now = Date.now()
  const windowStart = now - config.windowMs

  let record = memoryStore.get(key)
  if (!record) {
    record = { timestamps: [] }
    memoryStore.set(key, record)
  }

  // Filtra timestamps dentro da janela atual
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart)

  if (record.timestamps.length >= config.maxRequests) {
    const oldestInWindow = record.timestamps[0]
    const retryAfterSeconds = Math.ceil((oldestInWindow + config.windowMs - now) / 1000)
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, retryAfterSeconds),
    }
  }

  // Registra o acesso atual
  record.timestamps.push(now)
  const remaining = Math.max(0, config.maxRequests - record.timestamps.length)

  return {
    allowed: true,
    remaining,
    retryAfterSeconds: 0,
  }
}
