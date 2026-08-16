'use client'

import { useState, useEffect } from 'react'
import { getAvatarUrl } from '@/lib/photoHelper';
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'
import { FuncItem, TabFiltro, Cargo } from '@/hooks/useGestaoLotacoes'
import { CachedImage } from '@/components/ui/cached-image'
import { precarregarFotosCache } from '@/lib/photoCache'

interface FuncionarioLotacaoListProps {
  busca: string
  setBusca: (v: string) => void
  filtroCargo: string
  setFiltroCargo: (v: string) => void
  tab: TabFiltro
  setTab: (v: TabFiltro) => void
  cargos: Cargo[]
  funcsFiltrados: FuncItem[]
  selecionado: FuncItem | null
  setSelecionado: (f: FuncItem) => void
}

function getInitials(nome: string): string {
  const parts = nome.trim().split(' ').filter(Boolean)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const AVATAR_COLORS = [
  { bg: 'bg-[#1a3a5c]', text: 'text-[#60a5fa]' },
  { bg: 'bg-[#1a2e1a]', text: 'text-[#4ade80]' },
  { bg: 'bg-[#3a1a1a]', text: 'text-[#f87171]' },
  { bg: 'bg-[#2e1a3a]', text: 'text-[#c084fc]' },
  { bg: 'bg-[#3a2e1a]', text: 'text-[#fbbf24]' },
  { bg: 'bg-[#1a3a3a]', text: 'text-[#34d399]' },
]

function avatarColor(nome: string) {
  let hash = 0
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function FuncionarioLotacaoList({
  busca,
  setBusca,
  filtroCargo,
  setFiltroCargo,
  tab,
  setTab,
  cargos,
  funcsFiltrados,
  selecionado,
  setSelecionado,
}: FuncionarioLotacaoListProps) {
  const tabClass = (t: TabFiltro) =>
    `px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer text-center flex items-center justify-center min-h-[38px] sm:min-h-0 ${
      tab === t
        ? 'bg-[#3ea6ff] text-[#0f0f0f]'
        : 'bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
    }`

  useEffect(() => {
    if (funcsFiltrados.length > 0) {
      precarregarFotosCache(funcsFiltrados.map((f) => getAvatarUrl(f)))
    }
  }, [funcsFiltrados])

  return (
    <div className="w-full md:w-[310px] md:shrink-0 md:border-r border-border flex flex-col overflow-hidden">
      {/* Filtros */}
      <div className="p-3.5 sm:p-4 space-y-3 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Buscar por nome, CPF ou cargo..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground h-10 sm:h-9 text-sm"
          />
        </div>
        <Select
          value={filtroCargo}
          onValueChange={(v) => setFiltroCargo(v ?? 'todos')}
        >
          <SelectTrigger className="bg-background border-border text-foreground h-10 sm:h-9 text-sm">
            <SelectValue placeholder="Cargo (Todos)" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border text-popover-foreground max-h-[250px]">
            <SelectItem value="todos">Cargo (Todos)</SelectItem>
            {cargos.map((c) => (
              <SelectItem key={c.id} value={c.nome}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-3 gap-1.5">
          <button className={tabClass('todos')} onClick={() => setTab('todos')}>
            Todos
          </button>
          <button className={tabClass('sem_lotacao')} onClick={() => setTab('sem_lotacao')}>
            Sem Lotação
          </button>
          <button className={tabClass('lotados')} onClick={() => setTab('lotados')}>
            Lotados
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {funcsFiltrados.length === 0 ? (
          <div className="p-6 text-center text-zinc-500 text-sm">
            Nenhum funcionário encontrado.
          </div>
        ) : (
          funcsFiltrados.map((f) => {
            const isSelected = selecionado?.id === f.id
            const hasLotacao = f.lotacoes.length > 0
            const pal = avatarColor(f.nome)
            return (
              <button
                key={f.id}
                onClick={() => setSelecionado(f)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-b border-border cursor-pointer ${
                  isSelected
                    ? 'bg-[#1a2940] border-l-2 border-l-[#3ea6ff]'
                    : 'hover:bg-background'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden ${pal.bg} ${pal.text}`}
                >
                  <CachedImage
                    src={getAvatarUrl(f)}
                    alt={f.nome}
                    className="w-full h-full"
                    fallback={getInitials(f.nome)}
                    updatedAt={f.foto_updated_at}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{f.nome}</p>
                  <p className="text-xs text-zinc-500 truncate">{f.cpf ?? 'Sem CPF'}</p>
                </div>
                <div
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    hasLotacao ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                  title={hasLotacao ? 'Lotado' : 'Sem lotação'}
                />
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
