'use client'

import { useMemo } from 'react'
import { getAvatarUrl } from '@/lib/photoHelper';
import { Loader2, Printer, Pencil, UserX, Briefcase, Building2, Calendar, GraduationCap, History, Network } from 'lucide-react'
import { CachedImage } from '@/components/ui/cached-image'

export interface Funcionario {
  id: string
  nome: string
  email: string
  cpf?: string | null
  cargo?: string | null
  status: string
  orgao?: string | null
  data_nascimento?: string | null
  formacao?: string | null
  foto_url?: string | null
  foto_avatar_path?: string | null
  foto_visualizacao_path?: string | null
  foto_updated_at?: string | null
  is_superadmin?: boolean | null
  endereco?: string | null
  latitude?: number | null
  longitude?: number | null
  modalidade_ensino?: string | null
}

interface FuncionariosListProps {
  carregando: boolean
  funcsFiltrados: Funcionario[]
  isEditMode: boolean
  handleAbrirLotacoes: (func: Funcionario) => void
  handleAbrirMovimentacoes?: (func: Funcionario) => void
  handleImprimir: (funcId: string) => Promise<void>
  handleEditar: (func: Funcionario) => void
  handleDesligar: (func: Funcionario) => Promise<void>
  onResetFiltros?: () => void
}

/* ── Estilos Visuais por Cargo / Profissão ─────────────────── */

interface CargoStyle {
  border: string
  borderLeft: string
  badgeBg: string
  badgeText: string
  badgeBorder: string
  headerBg: string
  headerText: string
  headerBorder: string
  dot: string
}

const CARGO_COLOR_MAP: Record<string, CargoStyle> = {
  professor: {
    border: 'border-blue-500/30 hover:border-blue-500/70',
    borderLeft: 'border-l-[4px] border-l-blue-500',
    badgeBg: 'bg-blue-500/10',
    badgeText: 'text-blue-700 dark:text-blue-400',
    badgeBorder: 'border-blue-500/30',
    headerBg: 'bg-blue-500/10',
    headerText: 'text-blue-700 dark:text-blue-300',
    headerBorder: 'border-blue-500/20',
    dot: 'bg-blue-500'
  },
  secretario: {
    border: 'border-purple-500/30 hover:border-purple-500/70',
    borderLeft: 'border-l-[4px] border-l-purple-500',
    badgeBg: 'bg-purple-500/10',
    badgeText: 'text-purple-700 dark:text-purple-400',
    badgeBorder: 'border-purple-500/30',
    headerBg: 'bg-purple-500/10',
    headerText: 'text-purple-700 dark:text-purple-300',
    headerBorder: 'border-purple-500/20',
    dot: 'bg-purple-500'
  },
  diretor: {
    border: 'border-amber-500/30 hover:border-amber-500/70',
    borderLeft: 'border-l-[4px] border-l-amber-500',
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-800 dark:text-amber-400',
    badgeBorder: 'border-amber-500/30',
    headerBg: 'bg-amber-500/10',
    headerText: 'text-amber-800 dark:text-amber-300',
    headerBorder: 'border-amber-500/20',
    dot: 'bg-amber-500'
  },
  coordenador: {
    border: 'border-emerald-500/30 hover:border-emerald-500/70',
    borderLeft: 'border-l-[4px] border-l-emerald-500',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-700 dark:text-emerald-400',
    badgeBorder: 'border-emerald-500/30',
    headerBg: 'bg-emerald-500/10',
    headerText: 'text-emerald-700 dark:text-emerald-300',
    headerBorder: 'border-emerald-500/20',
    dot: 'bg-emerald-500'
  },
  merendeiro: {
    border: 'border-rose-500/30 hover:border-rose-500/70',
    borderLeft: 'border-l-[4px] border-l-rose-500',
    badgeBg: 'bg-rose-500/10',
    badgeText: 'text-rose-700 dark:text-rose-400',
    badgeBorder: 'border-rose-500/30',
    headerBg: 'bg-rose-500/10',
    headerText: 'text-rose-700 dark:text-rose-300',
    headerBorder: 'border-rose-500/20',
    dot: 'bg-rose-500'
  },
  vigia: {
    border: 'border-cyan-500/30 hover:border-cyan-500/70',
    borderLeft: 'border-l-[4px] border-l-cyan-500',
    badgeBg: 'bg-cyan-500/10',
    badgeText: 'text-cyan-700 dark:text-cyan-400',
    badgeBorder: 'border-cyan-500/30',
    headerBg: 'bg-cyan-500/10',
    headerText: 'text-cyan-700 dark:text-cyan-300',
    headerBorder: 'border-cyan-500/20',
    dot: 'bg-cyan-500'
  },
  auxiliar: {
    border: 'border-orange-500/30 hover:border-orange-500/70',
    borderLeft: 'border-l-[4px] border-l-orange-500',
    badgeBg: 'bg-orange-500/10',
    badgeText: 'text-orange-700 dark:text-orange-400',
    badgeBorder: 'border-orange-500/30',
    headerBg: 'bg-orange-500/10',
    headerText: 'text-orange-700 dark:text-orange-300',
    headerBorder: 'border-orange-500/20',
    dot: 'bg-orange-500'
  },
  motorista: {
    border: 'border-indigo-500/30 hover:border-indigo-500/70',
    borderLeft: 'border-l-[4px] border-l-indigo-500',
    badgeBg: 'bg-indigo-500/10',
    badgeText: 'text-indigo-700 dark:text-indigo-400',
    badgeBorder: 'border-indigo-500/30',
    headerBg: 'bg-indigo-500/10',
    headerText: 'text-indigo-700 dark:text-indigo-300',
    headerBorder: 'border-indigo-500/20',
    dot: 'bg-indigo-500'
  }
}

const FALLBACK_PALETTES: CargoStyle[] = [
  {
    border: 'border-teal-500/30 hover:border-teal-500/70',
    borderLeft: 'border-l-[4px] border-l-teal-500',
    badgeBg: 'bg-teal-500/10',
    badgeText: 'text-teal-700 dark:text-teal-400',
    badgeBorder: 'border-teal-500/30',
    headerBg: 'bg-teal-500/10',
    headerText: 'text-teal-700 dark:text-teal-300',
    headerBorder: 'border-teal-500/20',
    dot: 'bg-teal-500'
  },
  {
    border: 'border-fuchsia-500/30 hover:border-fuchsia-500/70',
    borderLeft: 'border-l-[4px] border-l-fuchsia-500',
    badgeBg: 'bg-fuchsia-500/10',
    badgeText: 'text-fuchsia-700 dark:text-fuchsia-400',
    badgeBorder: 'border-fuchsia-500/30',
    headerBg: 'bg-fuchsia-500/10',
    headerText: 'text-fuchsia-700 dark:text-fuchsia-300',
    headerBorder: 'border-fuchsia-500/20',
    dot: 'bg-fuchsia-500'
  },
  {
    border: 'border-sky-500/30 hover:border-sky-500/70',
    borderLeft: 'border-l-[4px] border-l-sky-500',
    badgeBg: 'bg-sky-500/10',
    badgeText: 'text-sky-700 dark:text-sky-400',
    badgeBorder: 'border-sky-500/30',
    headerBg: 'bg-sky-500/10',
    headerText: 'text-sky-700 dark:text-sky-300',
    headerBorder: 'border-sky-500/20',
    dot: 'bg-sky-500'
  },
  {
    border: 'border-violet-500/30 hover:border-violet-500/70',
    borderLeft: 'border-l-[4px] border-l-violet-500',
    badgeBg: 'bg-violet-500/10',
    badgeText: 'text-violet-700 dark:text-violet-400',
    badgeBorder: 'border-violet-500/30',
    headerBg: 'bg-violet-500/10',
    headerText: 'text-violet-700 dark:text-violet-300',
    headerBorder: 'border-violet-500/20',
    dot: 'bg-violet-500'
  },
  {
    border: 'border-pink-500/30 hover:border-pink-500/70',
    borderLeft: 'border-l-[4px] border-l-pink-500',
    badgeBg: 'bg-pink-500/10',
    badgeText: 'text-pink-700 dark:text-pink-400',
    badgeBorder: 'border-pink-500/30',
    headerBg: 'bg-pink-500/10',
    headerText: 'text-pink-700 dark:text-pink-300',
    headerBorder: 'border-pink-500/20',
    dot: 'bg-pink-500'
  }
]

const NEUTRAL_PALETTE: CargoStyle = {
  border: 'border-zinc-500/30 hover:border-zinc-500/70',
  borderLeft: 'border-l-[4px] border-l-zinc-500',
  badgeBg: 'bg-zinc-500/10',
  badgeText: 'text-zinc-700 dark:text-zinc-400',
  badgeBorder: 'border-zinc-500/30',
  headerBg: 'bg-zinc-500/10',
  headerText: 'text-zinc-700 dark:text-zinc-300',
  headerBorder: 'border-zinc-500/20',
  dot: 'bg-zinc-500'
}

function getCargoStyle(cargo: string | null | undefined): CargoStyle {
  if (!cargo || !cargo.trim() || cargo === 'Sem Cargo') return NEUTRAL_PALETTE

  const normalized = cargo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  if (normalized.includes('profess')) return CARGO_COLOR_MAP.professor
  if (normalized.includes('secretar')) return CARGO_COLOR_MAP.secretario
  if (normalized.includes('diret')) return CARGO_COLOR_MAP.diretor
  if (normalized.includes('coorden') || normalized.includes('pedagog')) return CARGO_COLOR_MAP.coordenador
  if (normalized.includes('merend') || normalized.includes('cozin')) return CARGO_COLOR_MAP.merendeiro
  if (normalized.includes('vigi') || normalized.includes('port') || normalized.includes('seguran')) return CARGO_COLOR_MAP.vigia
  if (normalized.includes('auxil') || normalized.includes('assist') || normalized.includes('agent')) return CARGO_COLOR_MAP.auxiliar
  if (normalized.includes('motor') || normalized.includes('transp')) return CARGO_COLOR_MAP.motorista

  let hash = 0
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash)
  }
  return FALLBACK_PALETTES[Math.abs(hash) % FALLBACK_PALETTES.length]
}

/* ── Helpers Locais de Formatação ───────────────────────────── */

function getInitials(nome: string): string {
  const parts = nome.trim().split(' ').filter(Boolean)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const AVATAR_PALETTES: { bg: string; text: string }[] = [
  { bg: 'bg-[#1a3a5c]', text: 'text-[#60a5fa]' },
  { bg: 'bg-[#1a2e1a]', text: 'text-[#4ade80]' },
  { bg: 'bg-[#3a1a1a]', text: 'text-[#f87171]' },
  { bg: 'bg-[#2e1a3a]', text: 'text-[#c084fc]' },
  { bg: 'bg-[#3a2e1a]', text: 'text-[#fbbf24]' },
  { bg: 'bg-[#1a3a3a]', text: 'text-[#34d399]' }
]

function avatarPalette(nome: string) {
  let hash = 0
  for (let i = 0; i < nome.length; i++) {
    hash = nome.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length]
}

function formatarData(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

export function FuncionariosList({
  carregando,
  funcsFiltrados,
  isEditMode,
  handleAbrirLotacoes,
  handleAbrirMovimentacoes,
  handleImprimir,
  handleEditar,
  handleDesligar,
  onResetFiltros
}: FuncionariosListProps) {
  /* ── Agrupamento de Funcionários por Cargo ───────────────────── */
  const groupedFuncs = useMemo(() => {
    const map = new Map<string, Funcionario[]>()

    funcsFiltrados.forEach((func) => {
      const cargoKey = func.cargo && func.cargo.trim() ? func.cargo.trim() : 'Sem Cargo'
      if (!map.has(cargoKey)) {
        map.set(cargoKey, [])
      }
      map.get(cargoKey)!.push(func)
    })

    const sortedKeys = Array.from(map.keys()).sort((a, b) => {
      if (a === 'Sem Cargo') return 1
      if (b === 'Sem Cargo') return -1
      return a.localeCompare(b, 'pt-BR')
    })

    return sortedKeys.map((cargoName) => {
      const list = map.get(cargoName)!
      list.sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR'))
      return {
        cargo: cargoName,
        style: getCargoStyle(cargoName),
        funcionarios: list
      }
    })
  }, [funcsFiltrados])

  return (
    <>
      {carregando ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : funcsFiltrados.length === 0 ? (
        <div className="bg-surface-1 border border-dashed border-border rounded-2xl p-12 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-3">
          <p>Nenhum funcionário encontrado com os filtros aplicados.</p>
          {onResetFiltros && (
            <button
              onClick={onResetFiltros}
              className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {groupedFuncs.map((group) => {
            const { cargo, style, funcionarios } = group

            return (
              <div key={cargo} className="space-y-4">
                {/* Cabeçalho da Função / Cargo */}
                <div className="flex items-center gap-2.5 pb-1">
                  <div className={`w-3 h-3 rounded-full shrink-0 ${style.dot}`} />
                  <h2 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
                    {cargo}
                  </h2>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style.headerBg} ${style.headerText} ${style.headerBorder}`}
                  >
                    {funcionarios.length} {funcionarios.length === 1 ? 'funcionário' : 'funcionários'}
                  </span>
                  <div className="h-px bg-border/50 flex-1 ml-2" />
                </div>

                {/* Grade de Cards do Cargo */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {funcionarios.map((func) => {
                    const palette = avatarPalette(func.nome)
                    const isAtivo = (func.status ?? '').toLowerCase() === 'ativo'

                    return (
                      <div
                        key={func.id}
                        className={`bg-sidebar dark:bg-card border ${style.border} ${style.borderLeft} rounded-2xl p-5 flex flex-col gap-4 transition-all shadow-md hover:shadow-lg relative overflow-hidden`}
                      >
                        {/* Topo do card: Avatar + Nome + Badges (100% largura útil) */}
                        <div className="flex items-start gap-3.5 pb-4 border-b border-sidebar-border/60 dark:border-border/50">
                          {/* Avatar circular */}
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold shrink-0 overflow-hidden ${palette.bg} ${palette.text}`}
                          >
                            <CachedImage
                              src={getAvatarUrl(func)}
                              alt={func.nome}
                              className="w-full h-full"
                              fallback={getInitials(func.nome)}
                              updatedAt={func.foto_updated_at}
                            />
                          </div>

                          {/* Nome + badges */}
                          <div className="min-w-0 flex-1">
                            <h3
                              className="text-sm sm:text-base font-semibold text-foreground tracking-tight leading-snug break-words"
                              title={func.nome}
                            >
                              {func.nome}
                            </h3>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              {/* Badge Cargo com Cor Específica */}
                              {func.cargo && (
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[10px] font-semibold tracking-wide truncate max-w-[150px] ${style.badgeBg} ${style.badgeText} ${style.badgeBorder}`}
                                  title={func.cargo}
                                >
                                  {func.cargo}
                                </span>
                              )}
                              {/* Badge Status */}
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border ${
                                  isAtivo
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-600 dark:text-zinc-400'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isAtivo ? 'bg-emerald-500' : 'bg-zinc-500'
                                  }`}
                                />
                                {isAtivo
                                  ? 'Ativo'
                                  : (func.status ?? 'Inativo').charAt(0).toUpperCase() +
                                    (func.status ?? 'Inativo').slice(1)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Informações Adicionais em Grid */}
                        <div className="grid grid-cols-2 gap-2.5 flex-1">
                          {/* Órgão (2 colunas) */}
                          <div className="col-span-2 bg-sidebar-accent dark:bg-zinc-800/40 border border-sidebar-border/60 dark:border-zinc-700/50 p-2.5 sm:p-3 rounded-xl flex items-start gap-2.5 min-w-0">
                            <span className="p-1.5 bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 rounded-lg shrink-0">
                              <Building2 className="w-4 h-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <span className="block text-[10px] font-bold tracking-wider text-slate-500 dark:text-zinc-400 uppercase">
                                Órgão
                              </span>
                              <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100 leading-snug block mt-0.5 break-words">
                                {func.orgao ?? '—'}
                              </span>
                            </div>
                          </div>

                          {/* Nascimento */}
                          <div className="bg-sidebar-accent dark:bg-zinc-800/40 border border-sidebar-border/60 dark:border-zinc-700/50 p-2.5 sm:p-3 rounded-xl flex items-center gap-2 min-w-0">
                            <span className="p-1.5 bg-purple-500/15 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 rounded-lg shrink-0">
                              <Calendar className="w-4 h-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <span className="block text-[10px] font-bold tracking-wider text-slate-500 dark:text-zinc-400 uppercase">
                                Nascimento
                              </span>
                              <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 mt-0.5 block whitespace-nowrap">
                                {formatarData(func.data_nascimento)}
                              </span>
                            </div>
                          </div>

                          {/* Formação */}
                          <div className="bg-sidebar-accent dark:bg-zinc-800/40 border border-sidebar-border/60 dark:border-zinc-700/50 p-2.5 sm:p-3 rounded-xl flex items-center gap-2 min-w-0">
                            <span className="p-1.5 bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 rounded-lg shrink-0">
                              <GraduationCap className="w-4 h-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <span className="block text-[10px] font-bold tracking-wider text-slate-500 dark:text-zinc-400 uppercase">
                                Formação
                              </span>
                              <span
                                className="text-xs font-bold text-slate-900 dark:text-zinc-100 mt-0.5 block leading-tight break-words line-clamp-2"
                                title={func.formacao ?? '—'}
                              >
                                {func.formacao ?? '—'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Rodapé Integrado: Modalidade + Barra de Ações Rápidas */}
                        <div className="flex items-center justify-between gap-2 pt-3 border-t border-sidebar-border/60 dark:border-border/50 mt-auto">
                          {/* Tag de Modalidade de Ensino */}
                          <div>
                            {(() => {
                              const isEja =
                                (func.modalidade_ensino || '').trim().toUpperCase() ===
                                'EJA'
                              return (
                                <span
                                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border inline-flex items-center ${
                                    isEja
                                      ? 'bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300 border-orange-500/20'
                                      : 'bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300 border-sky-500/20'
                                  }`}
                                >
                                  {isEja ? 'EJA' : 'Regular'}
                                </span>
                              )
                            })()}
                          </div>

                          {/* Botões de Ação Rápidas no Rodapé */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Gestão de Lotações */}
                            {isEditMode && (
                              <button
                                onClick={() => handleAbrirLotacoes(func)}
                                title="Gestão de Lotações"
                                className="w-8.5 h-8.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 flex items-center justify-center transition-all cursor-pointer"
                              >
                                <Network className="w-4 h-4" />
                              </button>
                            )}
                            {/* Histórico de Movimentações */}
                            {handleAbrirMovimentacoes && (
                              <button
                                onClick={() => handleAbrirMovimentacoes(func)}
                                title="Histórico de Movimentações"
                                className="w-8.5 h-8.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white border-none flex items-center justify-center transition-all cursor-pointer shadow-sm"
                              >
                                <History className="w-4 h-4" />
                              </button>
                            )}
                            {/* Imprimir ficha */}
                            <button
                              onClick={() => handleImprimir(func.id)}
                              title="Imprimir ficha"
                              className="w-8.5 h-8.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground border-none flex items-center justify-center transition-all cursor-pointer"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            {/* Editar */}
                            {isEditMode && (
                              <button
                                onClick={() => handleEditar(func)}
                                title="Editar funcionário"
                                className="w-8.5 h-8.5 rounded-xl bg-transparent hover:bg-hoverCustom border border-border text-foreground flex items-center justify-center transition-all cursor-pointer"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {/* Desligar */}
                            {isEditMode && (
                              <button
                                onClick={() => handleDesligar(func)}
                                title="Desligar funcionário"
                                className="w-8.5 h-8.5 rounded-xl bg-transparent hover:bg-destructive/10 hover:text-destructive border border-border text-foreground flex items-center justify-center transition-all cursor-pointer"
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
