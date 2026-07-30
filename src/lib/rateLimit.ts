interface RateLimitEntry {
  count: number
  resetTime: number
}

// Map em memória para armazenar requisições por identificador
const rateLimitMap = new Map<string, RateLimitEntry>()

/**
 * Utilitário em memória para limitação de taxa (Rate Limiting) de requisições por janela deslizante.
 * Conta com rotina automática de expiração e limpeza de chaves para evitar vazamento de memória (Memory Leak).
 * 
 * @param identifier Chave única de identificação (ex: `${userId}_${ip}`)
 * @param limit Número máximo de requisições permitidas na janela (padrão: 5)
 * @param windowMs Duração da janela em milissegundos (padrão: 60000ms = 1 minuto)
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 5,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetInSeconds: number } {
  const now = Date.now()

  // Expiração/Limpeza proativa de entradas antigas do Map
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key)
    }
  }

  const existingEntry = rateLimitMap.get(identifier)

  if (!existingEntry || now > existingEntry.resetTime) {
    // Nova janela para este identificador
    const resetTime = now + windowMs
    rateLimitMap.set(identifier, { count: 1, resetTime })
    return {
      allowed: true,
      remaining: limit - 1,
      resetInSeconds: Math.ceil(windowMs / 1000),
    }
  }

  if (existingEntry.count >= limit) {
    // Limite atingido
    const resetInSeconds = Math.ceil((existingEntry.resetTime - now) / 1000)
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: Math.max(1, resetInSeconds),
    }
  }

  // Incrementar contagem
  existingEntry.count += 1
  const resetInSeconds = Math.ceil((existingEntry.resetTime - now) / 1000)

  return {
    allowed: true,
    remaining: limit - existingEntry.count,
    resetInSeconds: Math.max(1, resetInSeconds),
  }
}
