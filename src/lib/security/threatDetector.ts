/**
 * Motor de Detecção de Ameaças e Registro Forense do SIG WAF/IDS.
 */

import { ALL_THREAT_PATTERNS, ThreatPattern } from './wafPatterns'
import { blockIpInMemory, isIpBlocked } from './ipBlockStore'

export interface ThreatInspectionResult {
  detected: boolean
  blocked: boolean
  pattern?: ThreatPattern
  matchedPayload?: string
  location?: 'URL_PATH' | 'QUERY_PARAM' | 'HEADER_USER_AGENT' | 'HEADER_OTHER' | 'BODY_PAYLOAD'
  ip: string
  reason?: string
}

/**
 * Inspeciona a URL, os query parameters e os cabeçalhos HTTP em busca de anomalias.
 * Executa em microssegundos no Edge Runtime com 'early-exit'.
 */
export function inspectUrlAndHeaders(
  url: URL,
  headers: Headers,
  clientIp: string
): ThreatInspectionResult {
  // 1. Verifica se o IP já está em Blacklist
  const ipCheck = isIpBlocked(clientIp)
  if (ipCheck.blocked) {
    return {
      detected: true,
      blocked: true,
      ip: clientIp,
      reason: `IP Bloqueado Preventivamente: ${ipCheck.reason ?? 'Tráfego malicioso detectado anteriormente'}`,
    }
  }

  const pathname = url.pathname
  const search = url.search
  const userAgent = headers.get('user-agent') ?? ''

  // 2. Early-exit: se for rota comum e sem query ou sem caracteres suspeitos, libera imediatamente
  const hasSuspiciousChars =
    search.includes("'") ||
    search.includes('"') ||
    search.includes(';') ||
    search.includes('--') ||
    search.includes('<') ||
    search.includes('..') ||
    pathname.includes('..') ||
    pathname.includes('.env') ||
    pathname.includes('.git') ||
    pathname.includes('php')

  // 3. Inspeção de User-Agent (Bots maliciosos conhecidos)
  if (userAgent) {
    for (const pattern of ALL_THREAT_PATTERNS) {
      if (pattern.category === 'SCANNER_BOT' && pattern.regex.test(userAgent)) {
        blockIpInMemory(clientIp, `Scanner detectado: ${pattern.name}`, 120)
        return {
          detected: true,
          blocked: true,
          pattern,
          matchedPayload: userAgent.slice(0, 300),
          location: 'HEADER_USER_AGENT',
          ip: clientIp,
          reason: pattern.description,
        }
      }
    }
  }

  // 4. Se não houver caracteres suspeitos na URL nem na query, encerra (0 overhead)
  if (!hasSuspiciousChars) {
    return { detected: false, blocked: false, ip: clientIp }
  }

  // 5. Inspeção no Pathname
  for (const pattern of ALL_THREAT_PATTERNS) {
    if (pattern.regex.test(pathname)) {
      const isCritical = pattern.severity === 'CRITICA' || pattern.severity === 'ALTA'
      if (isCritical) {
        blockIpInMemory(clientIp, `Violação em URL: ${pattern.name}`, 60)
      }
      return {
        detected: true,
        blocked: isCritical,
        pattern,
        matchedPayload: pathname,
        location: 'URL_PATH',
        ip: clientIp,
        reason: pattern.description,
      }
    }
  }

  // 6. Inspeção nos Query Parameters
  if (search) {
    const decodedSearch = decodeURIComponent(search)
    for (const pattern of ALL_THREAT_PATTERNS) {
      if (pattern.regex.test(search) || pattern.regex.test(decodedSearch)) {
        const isCritical = pattern.severity === 'CRITICA' || pattern.severity === 'ALTA'
        if (isCritical) {
          blockIpInMemory(clientIp, `Violação em Query: ${pattern.name}`, 60)
        }
        return {
          detected: true,
          blocked: isCritical,
          pattern,
          matchedPayload: decodedSearch.slice(0, 500),
          location: 'QUERY_PARAM',
          ip: clientIp,
          reason: pattern.description,
        }
      }
    }
  }

  return { detected: false, blocked: false, ip: clientIp }
}

/**
 * Inspeciona objetos de payload (ex: body de JSON de requisições de API).
 */
export function inspectPayloadObject(payload: any, clientIp: string): ThreatInspectionResult {
  if (!payload || typeof payload !== 'object') {
    return { detected: false, blocked: false, ip: clientIp }
  }

  const payloadStr = JSON.stringify(payload)
  // Early exit se payload curto e sem caracteres suspeitos
  if (!payloadStr.includes("'") && !payloadStr.includes('--') && !payloadStr.includes('<script') && !payloadStr.includes('union')) {
    return { detected: false, blocked: false, ip: clientIp }
  }

  for (const pattern of ALL_THREAT_PATTERNS) {
    if (pattern.regex.test(payloadStr)) {
      const isCritical = pattern.severity === 'CRITICA' || pattern.severity === 'ALTA'
      if (isCritical) {
        blockIpInMemory(clientIp, `Payload malicioso: ${pattern.name}`, 60)
      }
      return {
        detected: true,
        blocked: isCritical,
        pattern,
        matchedPayload: payloadStr.slice(0, 500),
        location: 'BODY_PAYLOAD',
        ip: clientIp,
        reason: pattern.description,
      }
    }
  }

  return { detected: false, blocked: false, ip: clientIp }
}

/**
 * Dispara o registro de uma ameaça em segundo plano (não-bloqueante / fire-and-forget).
 */
export function recordThreatEventAsync(eventData: {
  tipo_ataque: string
  severidade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'
  status: 'BLOQUEADO' | 'DETECTADO' | 'MITIGADO' | 'INVESTIGANDO'
  ip_origem: string
  pais?: string | null
  cidade?: string | null
  user_agent?: string | null
  rota_alvo: string
  metodo_http?: string
  payload_detectado?: string | null
  headers_snapshot?: Record<string, any>
  user_id?: string | null
  email_tentativa?: string | null
  detalhes_analise?: Record<string, any>
}): void {
  // Utiliza fetch assíncrono interno ou chamada de background segura
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const internalSecret = process.env.INTERNAL_WAF_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'waf-internal'

  fetch(`${baseUrl}/api/admin/defesa/log-threat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-waf-internal-secret': internalSecret,
    },
    body: JSON.stringify(eventData),
  }).catch((err) => {
    // Falha silenciosa de telemetria sem afetar o fluxo principal
    console.error('WAF: Falha ao persistir log de ameaça em background:', err)
  })
}
