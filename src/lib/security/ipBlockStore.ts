/**
 * Store em memória Edge-safe para Blacklist e Whitelist de IPs.
 * Garante tempo de resposta sub-milissegundo no proxy sem impactar o banco de dados.
 */

interface BlockedIpEntry {
  ip: string
  reason: string
  expiresAt: number | null // null se permanente
  addedAt: number
}

// Armazenamento em memória no isolate do servidor/Edge
const blockedIps = new Map<string, BlockedIpEntry>()
const whitelistIps = new Set<string>(['127.0.0.1', '::1', 'localhost'])

// Limpeza de bloqueios expirados a cada 1 minuto
let lastCleanup = Date.now()
function cleanupExpired() {
  const now = Date.now()
  if (now - lastCleanup < 60 * 1000) return
  lastCleanup = now

  for (const [ip, entry] of blockedIps.entries()) {
    if (entry.expiresAt && entry.expiresAt <= now) {
      blockedIps.delete(ip)
    }
  }
}

/**
 * Verifica se um endereço IP está bloqueado atualmente.
 */
export function isIpBlocked(ip: string): { blocked: boolean; reason?: string; expiresAt?: number | null } {
  if (!ip || whitelistIps.has(ip)) {
    return { blocked: false }
  }

  cleanupExpired()

  const entry = blockedIps.get(ip)
  if (!entry) {
    return { blocked: false }
  }

  const now = Date.now()
  if (entry.expiresAt && entry.expiresAt <= now) {
    blockedIps.delete(ip)
    return { blocked: false }
  }

  return {
    blocked: true,
    reason: entry.reason,
    expiresAt: entry.expiresAt,
  }
}

/**
 * Adiciona um IP à lista de bloqueio em memória.
 */
export function blockIpInMemory(ip: string, reason: string, durationMinutes: number | null = 60): void {
  if (!ip || whitelistIps.has(ip)) return

  const now = Date.now()
  const expiresAt = durationMinutes ? now + durationMinutes * 60 * 1000 : null

  blockedIps.set(ip, {
    ip,
    reason,
    expiresAt,
    addedAt: now,
  })
}

/**
 * Remove um IP da lista de bloqueio em memória.
 */
export function unblockIpInMemory(ip: string): void {
  blockedIps.delete(ip)
}

/**
 * Registra múltiplos IPs na inicialização ou sincronização.
 */
export function syncBlockedIpsFromDb(entries: { ip_address: string; reason: string; blocked_until: string | null }[]): void {
  const now = Date.now()
  blockedIps.clear()
  for (const entry of entries) {
    const expiresAt = entry.blocked_until ? new Date(entry.blocked_until).getTime() : null
    if (!expiresAt || expiresAt > now) {
      blockedIps.set(entry.ip_address, {
        ip: entry.ip_address,
        reason: entry.reason,
        expiresAt,
        addedAt: now,
      })
    }
  }
}

/**
 * Adiciona um IP confiável à whitelist.
 */
export function addWhitelistIp(ip: string): void {
  whitelistIps.add(ip)
  blockedIps.delete(ip)
}
