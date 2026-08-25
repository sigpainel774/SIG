export interface VisitasConfig {
  tempoMinimoSegundos: number // Tempo parado para caracterizar visita (ex: 60s)
  raioToleranciaMetros: number // Raio em metros para movimentação no mesmo imóvel/quintal (ex: 20m)
  fusaoMinutos: number // Intervalo de fusão para paradas consecutivas no mesmo imóvel (ex: 15min)
}

const STORAGE_KEY = 'sig_alpha_visitas_telemetria_config'

export const DEFAULT_VISITAS_CONFIG: VisitasConfig = {
  tempoMinimoSegundos: 60, // 1 minuto parado
  raioToleranciaMetros: 20, // 20 metros de raio (cobre sala, quintal, anexos)
  fusaoMinutos: 15, // 15 minutos
}

export function obterVisitasConfig(): VisitasConfig {
  if (typeof window === 'undefined') return DEFAULT_VISITAS_CONFIG
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        tempoMinimoSegundos: Number(parsed.tempoMinimoSegundos) || DEFAULT_VISITAS_CONFIG.tempoMinimoSegundos,
        raioToleranciaMetros: Number(parsed.raioToleranciaMetros) || DEFAULT_VISITAS_CONFIG.raioToleranciaMetros,
        fusaoMinutos: Number(parsed.fusaoMinutos) || DEFAULT_VISITAS_CONFIG.fusaoMinutos,
      }
    }
  } catch {}
  return DEFAULT_VISITAS_CONFIG
}

export function salvarVisitasConfig(config: Partial<VisitasConfig>): VisitasConfig {
  const atual = obterVisitasConfig()
  const nova: VisitasConfig = {
    tempoMinimoSegundos: Math.max(15, Math.min(1800, Number(config.tempoMinimoSegundos ?? atual.tempoMinimoSegundos))),
    raioToleranciaMetros: Math.max(5, Math.min(150, Number(config.raioToleranciaMetros ?? atual.raioToleranciaMetros))),
    fusaoMinutos: Math.max(1, Math.min(60, Number(config.fusaoMinutos ?? atual.fusaoMinutos))),
  }
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nova))
    } catch {}
  }
  return nova
}
