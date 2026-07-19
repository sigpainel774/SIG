'use client'

import { Loader2, Printer, Pencil, UserX } from 'lucide-react'

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
  is_superadmin?: boolean | null
  endereco?: string | null
  latitude?: number | null
  longitude?: number | null
}

interface FuncionariosListProps {
  carregando: boolean
  funcsFiltrados: Funcionario[]
  isEditMode: boolean
  handleAbrirLotacoes: (func: Funcionario) => void
  handleImprimir: (funcId: string) => Promise<void>
  handleEditar: (func: Funcionario) => void
  handleDesligar: (func: Funcionario) => Promise<void>
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
  handleImprimir,
  handleEditar,
  handleDesligar
}: FuncionariosListProps) {
  return (
    <>
      {carregando ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : funcsFiltrados.length === 0 ? (
        <div className="bg-surface-1 border border-dashed border-border rounded-2xl p-12 text-center text-muted-foreground text-sm">
          Nenhum funcionário encontrado com os filtros aplicados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {funcsFiltrados.map((func) => {
            const palette = avatarPalette(func.nome)
            const isAtivo = (func.status ?? '').toLowerCase() === 'ativo'

            return (
              <div
                key={func.id}
                className="bg-card border-[0.5px] border-border hover:border-primary/40 rounded-2xl p-5 flex flex-col gap-4 transition-all shadow-md"
              >
                {/* Topo do card: Avatar + Nome + Badges + Ações */}
                <div className="flex items-start justify-between gap-3 pb-4 border-b border-border/50">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Avatar circular */}
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold shrink-0 overflow-hidden ${palette.bg} ${palette.text}`}
                    >
                      {func.foto_url ? (
                        <img
                          src={func.foto_url}
                          alt={func.nome}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        getInitials(func.nome)
                      )}
                    </div>

                    {/* Nome + badges */}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-foreground tracking-tight truncate">
                        {func.nome}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {/* Badge Cargo */}
                        {func.cargo && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-semibold tracking-wide truncate max-w-[130px]">
                            {func.cargo}
                          </span>
                        )}
                        {/* Badge Status */}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border ${
                            isAtivo
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isAtivo ? 'bg-emerald-500' : 'bg-zinc-500'
                            }`}
                          />
                          {isAtivo
                            ? 'Ativo'
                            : func.status.charAt(0).toUpperCase() +
                              func.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* M — Gestão de Lotações */}
                    {isEditMode && (
                      <button
                        onClick={() => handleAbrirLotacoes(func)}
                        title="Gestão de Lotações"
                        className="w-9 h-9 rounded-xl bg-transparent hover:bg-hoverCustom border border-border text-foreground font-bold text-xs flex items-center justify-center transition-all cursor-pointer"
                      >
                        M
                      </button>
                    )}
                    {/* Imprimir ficha (Único Destaque do Card) */}
                    <button
                      onClick={() => handleImprimir(func.id)}
                      title="Imprimir ficha"
                      className="w-9 h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground border-none flex items-center justify-center transition-all cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    {/* Editar */}
                    {isEditMode && (
                      <button
                        onClick={() => handleEditar(func)}
                        title="Editar funcionário"
                        className="w-9 h-9 rounded-xl bg-transparent hover:bg-hoverCustom border border-border text-foreground flex items-center justify-center transition-all cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {/* Desligar */}
                    {isEditMode && (
                      <button
                        onClick={() => handleDesligar(func)}
                        title="Desligar funcionário"
                        className="w-9 h-9 rounded-xl bg-transparent hover:bg-destructive/10 hover:text-destructive border border-border text-foreground flex items-center justify-center transition-all cursor-pointer"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Informações Adicionais */}
                <div className="space-y-2.5">
                  {func.orgao && (
                    <div className="flex flex-col">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        Órgão
                      </span>
                      <span className="text-sm font-normal text-muted-foreground font-medium">
                        {func.orgao}
                      </span>
                    </div>
                  )}
                  {func.data_nascimento && (
                    <div className="flex flex-col">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        Nascimento
                      </span>
                      <span className="text-sm font-normal text-muted-foreground font-medium">
                        {formatarData(func.data_nascimento)}
                      </span>
                    </div>
                  )}
                  {func.formacao && (
                    <div className="flex flex-col">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        Formação
                      </span>
                      <span className="text-sm font-normal text-muted-foreground font-medium">
                        {func.formacao}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
