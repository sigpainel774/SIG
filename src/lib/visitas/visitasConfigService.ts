import type L from 'leaflet'

export type TipoIconeCursor =
  | 'padrao_carro'
  | 'padrao_pedestre'
  | 'padrao_moto'
  | 'padrao_van'
  | 'padrao_radar'
  | 'custom'

export interface VisitasConfig {
  tempoMinimoSegundos: number // Tempo parado para caracterizar visita (ex: 60s)
  raioToleranciaMetros: number // Raio em metros para movimentação no mesmo imóvel/quintal (ex: 20m)
  fusaoMinutos: number // Intervalo de fusão para paradas consecutivas no mesmo imóvel (ex: 15min)
  iconeTipo: TipoIconeCursor
  iconeCustomUrl?: string | null
}

const STORAGE_KEY = 'sig_alpha_visitas_telemetria_config'

export const DEFAULT_VISITAS_CONFIG: VisitasConfig = {
  tempoMinimoSegundos: 60, // 1 minuto parado
  raioToleranciaMetros: 20, // 20 metros de raio (cobre sala, quintal, anexos)
  fusaoMinutos: 15, // 15 minutos
  iconeTipo: 'padrao_carro',
  iconeCustomUrl: null,
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
        iconeTipo: (parsed.iconeTipo as TipoIconeCursor) || DEFAULT_VISITAS_CONFIG.iconeTipo,
        iconeCustomUrl: parsed.iconeCustomUrl ?? null,
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
    iconeTipo: config.iconeTipo ?? atual.iconeTipo,
    iconeCustomUrl: config.iconeCustomUrl !== undefined ? config.iconeCustomUrl : atual.iconeCustomUrl,
  }
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nova))
      // Dispara evento customizado para sincronização reativa imediata entre abas/componentes
      window.dispatchEvent(new CustomEvent('sig_visitas_config_updated', { detail: nova }))
    } catch {}
  }
  return nova
}

// ─────────────────────────────────────────────────────────────
// Gerador de Ícones Leaflet para o Cursor do Usuário / Veículo
// ─────────────────────────────────────────────────────────────

export interface GerarIconeCursorOptions {
  tamanho?: number
  mostrarRadar?: boolean
  corPulso?: string
}

export function gerarIconeLeafletCursor(
  config: Partial<VisitasConfig> = {},
  heading: number = 0,
  options: GerarIconeCursorOptions = {}
): L.DivIcon {
  const cfg = { ...DEFAULT_VISITAS_CONFIG, ...config }
  const angulo = Number.isFinite(heading) ? heading % 360 : 0
  const tamanho = options.tamanho ?? 44
  const mostrarRadar = options.mostrarRadar !== false
  const corPulso = options.corPulso ?? 'bg-blue-500/30'

  let conteudoHtml = ''

  if (cfg.iconeTipo === 'custom' && cfg.iconeCustomUrl) {
    // Imagem personalizada do usuário
    conteudoHtml = `
      <div class="relative w-10 h-10 rounded-full bg-slate-950 border-2 border-blue-400 shadow-2xl flex items-center justify-center p-1 overflow-hidden transition-transform duration-200" style="transform: rotate(${angulo}deg);">
        <img 
          src="${cfg.iconeCustomUrl}" 
          alt="Cursor" 
          class="w-full h-full object-contain pointer-events-none select-none"
          onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
        />
        <svg class="w-5 h-5 fill-blue-400 hidden" viewBox="0 0 24 24">
          <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
        </svg>
      </div>
    `
  } else {
    // Ícones do sistema
    switch (cfg.iconeTipo) {
      case 'padrao_pedestre':
        conteudoHtml = `
          <div class="relative w-10 h-10 rounded-full bg-slate-950 border-2 border-emerald-400 shadow-2xl flex items-center justify-center text-emerald-400 transition-transform duration-200" style="transform: rotate(${angulo}deg);">
            <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/>
            </svg>
          </div>
        `
        break

      case 'padrao_moto':
        conteudoHtml = `
          <div class="relative w-10 h-10 rounded-full bg-slate-950 border-2 border-amber-400 shadow-2xl flex items-center justify-center text-amber-400 transition-transform duration-200" style="transform: rotate(${angulo}deg);">
            <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M19.44 9.03L15.41 5H11v2h3.59l2 2H5c-2.8 0-5 2.2-5 5s2.2 5 5 5c2.46 0 4.45-1.69 4.9-4h4.2c.45 2.31 2.44 4 4.9 4 2.8 0 5-2.2 5-5 0-2.55-1.92-4.63-4.56-4.97zM7.82 15C7.4 16.15 6.28 17 5 17c-1.63 0-3-1.37-3-3s1.37-3 3-3c1.28 0 2.4.85 2.82 2H5v2h2.82zM19 17c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
            </svg>
          </div>
        `
        break

      case 'padrao_van':
        conteudoHtml = `
          <div class="relative w-10 h-10 rounded-full bg-slate-950 border-2 border-indigo-400 shadow-2xl flex items-center justify-center text-indigo-400 transition-transform duration-200" style="transform: rotate(${angulo}deg);">
            <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
            </svg>
          </div>
        `
        break

      case 'padrao_radar':
        conteudoHtml = `
          <div class="relative w-10 h-10 rounded-full bg-slate-950 border-2 border-cyan-400 shadow-2xl flex items-center justify-center text-cyan-400 transition-transform duration-200" style="transform: rotate(${angulo}deg);">
            <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
            </svg>
          </div>
        `
        break

      case 'padrao_carro':
      default:
        conteudoHtml = `
          <div class="relative w-10 h-10 rounded-full bg-slate-950 border-2 border-blue-400 shadow-2xl flex items-center justify-center text-blue-400 transition-transform duration-200" style="transform: rotate(${angulo}deg);">
            <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
            </svg>
          </div>
        `
        break
    }
  }

  const html = `
    <div class="relative flex items-center justify-center" style="transform: translate(-50%, -50%);">
      ${mostrarRadar ? `<div class="absolute w-14 h-14 rounded-full ${corPulso} animate-ping pointer-events-none"></div>` : ''}
      <div class="absolute w-10 h-10 rounded-full bg-blue-400/20 pointer-events-none"></div>
      ${conteudoHtml}
    </div>
  `

  const Leaflet = typeof window !== 'undefined' ? (require('leaflet') as typeof L) : null
  if (!Leaflet) {
    return {} as L.DivIcon
  }

  return Leaflet.divIcon({
    className: 'custom-user-live-marker',
    html,
    iconSize: [tamanho, tamanho],
    iconAnchor: [tamanho / 2, tamanho / 2],
  })
}
