'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Sliders,
  Clock,
  MapPin,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Info,
  CheckCircle2,
  Car,
  Footprints,
  Navigation,
  Upload,
  Image as ImageIcon,
  Trash2,
  Compass,
} from 'lucide-react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import {
  obterVisitasConfig,
  salvarVisitasConfig,
  VisitasConfig,
  TipoIconeCursor,
  DEFAULT_VISITAS_CONFIG,
} from '@/lib/visitas/visitasConfigService'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface VisitasConfigModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSalvo?: (config: VisitasConfig) => void
}

const ICONES_PADRAO: Array<{
  tipo: TipoIconeCursor
  nome: string
  descricao: string
  icone: string
}> = [
  {
    tipo: 'padrao_carro',
    nome: 'Viatura Oficial',
    descricao: 'Carro / Veículo de Campo',
    icone: '🚗',
  },
  {
    tipo: 'padrao_pedestre',
    nome: 'Agente a Pé',
    descricao: 'Fiscal / Inspetor a pé',
    icone: '🚶',
  },
  {
    tipo: 'padrao_moto',
    nome: 'Motocicleta',
    descricao: 'Vistoria rápida em duas rodas',
    icone: '🛵',
  },
  {
    tipo: 'padrao_van',
    nome: 'Van / Escolar',
    descricao: 'Transporte e frota média',
    icone: '🚌',
  },
  {
    tipo: 'padrao_radar',
    nome: 'Alvo / Radar GPS',
    descricao: 'Mira geodésica de alta precisão',
    icone: '🛰️',
  },
]

export function VisitasConfigModal({ open, onOpenChange, onSalvo }: VisitasConfigModalProps) {
  const [tempoMinimo, setTempoMinimo] = useState<number>(DEFAULT_VISITAS_CONFIG.tempoMinimoSegundos)
  const [raioTolerancia, setRaioTolerancia] = useState<number>(DEFAULT_VISITAS_CONFIG.raioToleranciaMetros)
  const [fusaoMinutos, setFusaoMinutos] = useState<number>(DEFAULT_VISITAS_CONFIG.fusaoMinutos)
  const [iconeTipo, setIconeTipo] = useState<TipoIconeCursor>(DEFAULT_VISITAS_CONFIG.iconeTipo)
  const [iconeCustomUrl, setIconeCustomUrl] = useState<string | null>(null)
  const [previewAngulo, setPreviewAngulo] = useState<number>(0)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open) {
      const cfg = obterVisitasConfig()
      setTempoMinimo(cfg.tempoMinimoSegundos)
      setRaioTolerancia(cfg.raioToleranciaMetros)
      setFusaoMinutos(cfg.fusaoMinutos)
      setIconeTipo(cfg.iconeTipo)
      setIconeCustomUrl(cfg.iconeCustomUrl ?? null)
    }
  }, [open])

  // Animação suave de rotação do preview
  useEffect(() => {
    if (!open) return
    const interval = setInterval(() => {
      setPreviewAngulo((prev) => (prev + 45) % 360)
    }, 2000)
    return () => clearInterval(interval)
  }, [open])

  // Redimensionamento e compressão segura via Canvas (máx 80x80px - ES-ICON-01)
  const processarUploadImagem = (file: File) => {
    const tiposPermitidos = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'image/gif']
    if (!tiposPermitidos.includes(file.type)) {
      toast.error('Formato não suportado. Utilize PNG, JPG, SVG, WebP ou GIF.')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      if (!result) return

      // Se for SVG, salva direto
      if (file.type === 'image/svg+xml') {
        setIconeCustomUrl(result)
        setIconeTipo('custom')
        toast.success('Ícone SVG carregado!')
        return
      }

      // Se for imagem raster (PNG/JPG/WebP/GIF), redimensiona no Canvas
      const img = new Image()
      img.onload = () => {
        const MAX_DIM = 80
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width)
            width = MAX_DIM
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height)
            height = MAX_DIM
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
          const dataUrl = canvas.toDataURL('image/png', 0.9)
          setIconeCustomUrl(dataUrl)
          setIconeTipo('custom')
          toast.success('Ícone personalizado otimizado com sucesso!')
        }
      }
      img.onerror = () => {
        toast.error('Erro ao ler a imagem selecionada.')
      }
      img.src = result
    }
    reader.readAsDataURL(file)
  }

  const handleSalvar = () => {
    const salva = salvarVisitasConfig({
      tempoMinimoSegundos: tempoMinimo,
      raioToleranciaMetros: raioTolerancia,
      fusaoMinutos: fusaoMinutos,
      iconeTipo,
      iconeCustomUrl,
    })
    toast.success('Configurações de telemetria e ícone salvos no dispositivo!')
    if (onSalvo) onSalvo(salva)
    onOpenChange(false)
  }

  const handleRestaurarPadroes = () => {
    setTempoMinimo(DEFAULT_VISITAS_CONFIG.tempoMinimoSegundos)
    setRaioTolerancia(DEFAULT_VISITAS_CONFIG.raioToleranciaMetros)
    setFusaoMinutos(DEFAULT_VISITAS_CONFIG.fusaoMinutos)
    setIconeTipo(DEFAULT_VISITAS_CONFIG.iconeTipo)
    setIconeCustomUrl(null)
    toast.info('Valores padrão restaurados.')
  }

  const formatarTempo = (segundos: number) => {
    if (segundos < 60) return `${segundos} segundos`
    const min = Math.floor(segundos / 60)
    const resto = segundos % 60
    return resto > 0 ? `${min} min e ${resto}s` : `${min} minuto${min > 1 ? 's' : ''}`
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Calibrar Visitas & Cursor GPS"
      description="Calibração de sensibilidade do GPS, regras anti-duplicação e personalização do cursor no mapa."
      maxWidth="sm:max-w-xl"
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRestaurarPadroes}
            className="rounded-xl text-xs gap-1.5 cursor-pointer border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Padrão</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSalvar}
              className="rounded-xl text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5 shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Salvar Parâmetros</span>
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 py-1 text-slate-800 max-h-[70vh] overflow-y-auto pr-1">
        
        {/* ── 0. Personalização do Ícone do Cursor no Mapa ── */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-600" />
              Ícone do Cursor no Mapa (Você / Veículo)
            </label>
            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
              {iconeTipo === 'custom' ? 'Imagem Própria' : 'Ícone Integrado'}
            </span>
          </div>

          <p className="text-[11px] text-slate-600 leading-relaxed">
            Selecione o símbolo visual que se moverá na tela ao navegar em tempo real ou ao clicar no botão "Onde estou".
          </p>

          {/* Grid de Ícones Padrão */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ICONES_PADRAO.map((item) => (
              <button
                key={item.tipo}
                type="button"
                onClick={() => setIconeTipo(item.tipo)}
                className={cn(
                  'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5',
                  iconeTipo === item.tipo
                    ? 'border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-500 font-bold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                )}
              >
                <div className="text-xl shrink-0">{item.icone}</div>
                <div className="overflow-hidden">
                  <div className="text-xs text-slate-900 truncate font-semibold">{item.nome}</div>
                  <div className="text-[10px] text-slate-500 truncate">{item.descricao}</div>
                </div>
              </button>
            ))}

            {/* Opção de Imagem Personalizada */}
            <button
              type="button"
              onClick={() => {
                if (iconeCustomUrl) {
                  setIconeTipo('custom')
                } else if (fileInputRef.current) {
                  fileInputRef.current.click()
                }
              }}
              className={cn(
                'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5',
                iconeTipo === 'custom'
                  ? 'border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-500 font-bold shadow-xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
              )}
            >
              <div className="text-xl shrink-0">
                {iconeCustomUrl ? (
                  <img
                    src={iconeCustomUrl}
                    alt="Custom"
                    className="w-6 h-6 object-contain rounded-full border border-blue-400"
                  />
                ) : (
                  '🖼️'
                )}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs text-slate-900 truncate font-semibold">Foto / Logo</div>
                <div className="text-[10px] text-slate-500 truncate">
                  {iconeCustomUrl ? 'Personalizado' : 'Fazer Upload'}
                </div>
              </div>
            </button>
          </div>

          {/* Área de Upload e Preview */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-xl">
            <div className="flex items-center gap-3">
              {/* Preview com animação de radar */}
              <div className="relative w-12 h-12 flex items-center justify-center">
                <div className="absolute w-12 h-12 rounded-full bg-blue-500/20 animate-ping pointer-events-none"></div>
                <div
                  className="relative w-9 h-9 rounded-full bg-blue-600 border-2 border-white shadow-md flex items-center justify-center text-white transition-transform duration-500"
                  style={{ transform: `rotate(${previewAngulo}deg)` }}
                >
                  {iconeTipo === 'custom' && iconeCustomUrl ? (
                    <img src={iconeCustomUrl} alt="Preview" className="w-full h-full object-contain p-0.5 rounded-full" />
                  ) : iconeTipo === 'padrao_pedestre' ? (
                    '🚶'
                  ) : iconeTipo === 'padrao_moto' ? (
                    '🛵'
                  ) : iconeTipo === 'padrao_van' ? (
                    '🚌'
                  ) : iconeTipo === 'padrao_radar' ? (
                    '🛰️'
                  ) : (
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
                    </svg>
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-blue-600" />
                  Pré-visualização do Cursor
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Gira conforme a bússola/direção GPS
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp,image/gif"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) processarUploadImagem(file)
                }}
                className="hidden"
              />

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 text-xs font-semibold gap-1.5 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
              >
                <Upload className="w-3.5 h-3.5 text-slate-700" />
                <span>Trocar Imagem</span>
              </Button>

              {iconeCustomUrl && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIconeCustomUrl(null)
                    setIconeTipo('padrao_carro')
                    toast.info('Imagem personalizada removida.')
                  }}
                  className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50"
                  title="Remover imagem personalizada"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ── 1. Tempo Mínimo de Parada ── */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Tempo Parado para Contabilizar Visita
            </label>
            <span className="text-xs font-extrabold text-blue-700 font-mono bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
              {formatarTempo(tempoMinimo)}
            </span>
          </div>

          <p className="text-[11px] text-slate-600 leading-relaxed">
            Tempo contínuo que o profissional deve permanecer no local para o sistema registrar automaticamente uma visita no itinerário.
          </p>

          <input
            type="range"
            min={15}
            max={300}
            step={15}
            value={tempoMinimo}
            onChange={(e) => setTempoMinimo(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />

          {/* Atalhos Rápidos de Tempo */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {[30, 45, 60, 90, 120, 180, 300].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTempoMinimo(t)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer whitespace-nowrap',
                  tempoMinimo === t
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                )}
              >
                {formatarTempo(t)}
              </button>
            ))}
          </div>
        </div>

        {/* ── 2. Raio de Tolerância (Imóvel / Quintal) ── */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              Raio de Movimentação no Imóvel
            </label>
            <span className="text-xs font-extrabold text-blue-700 font-mono bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
              {raioTolerancia} metros
            </span>
          </div>

          <p className="text-[11px] text-slate-600 leading-relaxed">
            Área de tolerância ao redor do ponto de parada para permitir que o profissional ande pela residência, quintal ou anexo sem quebrar a visita em vários registros.
          </p>

          <input
            type="range"
            min={5}
            max={100}
            step={5}
            value={raioTolerancia}
            onChange={(e) => setRaioTolerancia(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {[10, 15, 20, 25, 30, 50, 75].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRaioTolerancia(r)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer whitespace-nowrap',
                  raioTolerancia === r
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                )}
              >
                {r}m
              </button>
            ))}
          </div>
        </div>

        {/* ── 3. Janela de Fusão Anti-Duplicação ── */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Fusão Anti-Duplicação de Visitas
            </label>
            <span className="text-xs font-extrabold text-blue-700 font-mono bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
              {fusaoMinutos} minutos
            </span>
          </div>

          <p className="text-[11px] text-slate-600 leading-relaxed">
            Se o profissional sair brevemente e retornar ao mesmo imóvel dentro deste intervalo, os tempos serão unificados em uma única visita.
          </p>

          <input
            type="range"
            min={2}
            max={60}
            step={1}
            value={fusaoMinutos}
            onChange={(e) => setFusaoMinutos(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {[5, 10, 15, 20, 30, 45].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setFusaoMinutos(m)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer whitespace-nowrap',
                  fusaoMinutos === m
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                )}
              >
                {m} min
              </button>
            ))}
          </div>
        </div>
      </div>
    </StandardDialog>
  )
}
