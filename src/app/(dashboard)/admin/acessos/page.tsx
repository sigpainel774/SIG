'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { KeyRound, RefreshCw, Pause, Trash2, Search, ShieldCheck, Check, X, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { StandardTable, TableColumn } from '@/components/ui/table'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { toast } from 'sonner'
import { useLocalSearch } from '@/hooks/useLocalSearch'

export interface AcessoItem {
  id: string
  funcionario: string
  email: string
  escola: string
  nivel: 'SECRETARIA' | 'DIRETOR' | 'PROFESSOR' | 'COORDENADOR' | 'N6' | 'ROOT' | string
  status: 'ATIVO' | 'INATIVO' | 'PAUSADO' | string
}



export default function AdminAcessosPage() {
  const supabase = createClient()

  const [acessos, setAcessos] = useState<AcessoItem[]>([])
  const [loading, setLoading] = useState(false)

  // Filtros exatamente como no layout da imagem
  const [filtroNivel, setFiltroNivel] = useState('ALL')
  const [filtroStatus, setFiltroStatus] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  // Modal exclusão
  const [itemParaExcluir, setItemParaExcluir] = useState<AcessoItem | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const loadAcessos = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('funcionarios')
        .select('*')
        .order('nome', { ascending: true })

      if (data && data.length > 0) {
        const dbItems: AcessoItem[] = data.map((f: any) => ({
          id: f.id,
          funcionario: f.nome,
          email: f.email || f.nome,
          escola: f.orgao || 'Colégio Moisés Alves',
          nivel: f.is_superadmin ? 'ROOT' : (f.cargo?.toUpperCase() || 'PROFESSOR'),
          status: f.status?.toUpperCase() || 'ATIVO'
        }))

        setAcessos(dbItems)
      }
    } catch (err) {
      console.warn('Erro ao carregar acessos do banco, usando fallback:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAcessos()
  }, [])

  // Alternar pausa do acesso (Botão 1)
  const handleTogglePausa = async (item: AcessoItem) => {
    const isPausado = item.status === 'PAUSADO' || item.status === 'INATIVO'
    const novoStatus = isPausado ? 'ATIVO' : 'PAUSADO'

    if (isPausado && item.nivel.toUpperCase().includes('DIRETOR')) {
      // Checar se a escola do funcionário já possui diretor ativo
      const { data: vincData } = await supabase
        .from('vinculos_funcionarios')
        .select('escola_id, escolas(id, diretor_id, nome)')
        .eq('funcionario_id', item.id)
        .limit(1)
        .maybeSingle()

      const escola = (vincData?.escolas as any)
      if (escola?.diretor_id && escola.diretor_id !== item.id) {
        toast.error(`Não é possível reativar: a escola "${escola.nome}" já possui outro diretor ativo. Desvincule o gestor atual primeiro.`)
        return
      }
    }

    setAcessos(prev => prev.map(a => a.id === item.id ? { ...a, status: novoStatus } : a))

    if (!isPausado) {
      // Ao pausar, remove automaticamente como diretor_id responsável de qualquer escola
      await supabase
        .from('escolas')
        .update({ diretor_id: null })
        .eq('diretor_id', item.id)

      toast.warning(`Acesso de ${item.funcionario} pausado temporariamente.`)
    } else {
      toast.success(`Acesso de ${item.funcionario} reativado com sucesso!`)
    }
  }

  // Confirmar exclusão do acesso (Botão 2)
  const handleConfirmExcluir = (item: AcessoItem) => {
    setItemParaExcluir(item)
    setConfirmDeleteOpen(true)
  }

  const handleExcluirAcesso = async () => {
    if (!itemParaExcluir) return

    // Ao excluir o acesso, remove automaticamente como diretor_id responsável de qualquer escola
    await supabase
      .from('escolas')
      .update({ diretor_id: null })
      .eq('diretor_id', itemParaExcluir.id)

    setAcessos(prev => prev.filter(a => a.id !== itemParaExcluir.id))
    toast.error(`Acesso de ${itemParaExcluir.funcionario} removido do sistema.`)
    setConfirmDeleteOpen(false)
    setItemParaExcluir(null)
  }

  // Renderização das pílulas de nível exatamente conforme a imagem
  const renderNivelBadge = (nivel: string) => {
    const cleanNivel = nivel.toUpperCase()
    if (cleanNivel.includes('SECRETARIA')) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-950/70 border border-purple-500/50 text-purple-300 shadow-sm">
          SECRETARIA
        </span>
      )
    }
    if (cleanNivel.includes('DIRETOR')) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-950/70 border border-amber-500/50 text-amber-400 shadow-sm">
          DIRETOR
        </span>
      )
    }
    if (cleanNivel.includes('PROFESSOR')) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-950/70 border border-emerald-500/50 text-emerald-400 shadow-sm">
          PROFESSOR
        </span>
      )
    }
    if (cleanNivel.includes('N6') || cleanNivel.includes('VIGIA') || cleanNivel.includes('OPERACIONAL')) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-950/70 border border-blue-500/50 text-blue-400 shadow-sm">
          N6
        </span>
      )
    }
    if (cleanNivel.includes('COORDENADOR')) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-950/70 border border-sky-500/50 text-sky-400 shadow-sm">
          COORDENADOR
        </span>
      )
    }
    if (cleanNivel.includes('ROOT') || cleanNivel.includes('ADMIN')) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#7c3aed]/20 border border-[#7c3aed]/50 text-[#a78bfa] shadow-sm">
          ROOT
        </span>
      )
    }

    return (
      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-zinc-800 border border-zinc-700 text-zinc-300">
        {cleanNivel}
      </span>
    )
  }

  // Filtragem dos itens da tabela
  const acessosBuscados = useLocalSearch(acessos, searchTerm, ['funcionario', 'email', 'escola'])

  const acessosFiltrados = acessosBuscados.filter(item => {
    const matchNivel = filtroNivel === 'ALL' || item.nivel.toUpperCase().includes(filtroNivel.toUpperCase())
    const matchStatus = filtroStatus === 'ALL' || item.status.toUpperCase() === filtroStatus.toUpperCase()

    return matchNivel && matchStatus
  })

  const columns: TableColumn<AcessoItem>[] = [
    {
      header: 'FUNCIONARIO',
      accessor: (item) => <span className="font-bold text-white text-sm whitespace-nowrap">{item.funcionario}</span>
    },
    {
      header: 'EMAIL',
      accessor: (item) => <span className="text-zinc-400 text-sm whitespace-nowrap">{item.email}</span>
    },
    {
      header: 'ESCOLA / ORGAO',
      accessor: (item) => (
        <span className={`text-sm whitespace-nowrap ${item.escola === 'Geral' ? 'italic text-zinc-400' : 'text-zinc-200'}`}>
          {item.escola}
        </span>
      )
    },
    {
      header: 'NIVEL',
      accessor: (item) => renderNivelBadge(item.nivel)
    },
    {
      header: 'STATUS',
      accessor: (item) => {
        const isPausado = item.status === 'PAUSADO' || item.status === 'INATIVO'
        return isPausado ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#27272a] border border-[#3f3f46] text-[#a1a1aa] text-[11px] font-extrabold tracking-wide uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#71717a]" />
            {item.status}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#052e16] border border-[#166534] text-[#4ade80] text-[11px] font-extrabold tracking-wide uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
            ATIVO
          </span>
        )
      }
    },
    {
      header: 'ACOES',
      className: 'text-right pr-6',
      headClassName: 'text-right pr-6',
      accessor: (item) => {
        const isPausado = item.status === 'PAUSADO' || item.status === 'INATIVO'
        return (
          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
            {/* Botão 1: Pausar / Alternar Acesso */}
            <button
              type="button"
              onClick={() => handleTogglePausa(item)}
              className="w-9 h-9 rounded-xl bg-[#450a0a]/30 hover:bg-[#7f1d1d]/60 border border-[#ef4444]/40 text-[#f87171] hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-sm"
              title={isPausado ? 'Reativar Acesso' : 'Pausar Acesso'}
            >
              <Pause className="w-4 h-4" />
            </button>

            {/* Botão 2: Excluir Acesso */}
            <button
              type="button"
              onClick={() => handleConfirmExcluir(item)}
              className="w-9 h-9 rounded-xl bg-[#450a0a]/30 hover:bg-[#7f1d1d]/60 border border-[#ef4444]/40 text-[#f87171] hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-sm"
              title="Excluir Acesso"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )
      }
    }
  ]

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* Filtros Superiores exatamente conforme Layout da Imagem */}
      <div className="space-y-3">
        {/* Dropdown 1: Todos os níveis */}
        <div>
          <select
            value={filtroNivel}
            onChange={e => setFiltroNivel(e.target.value)}
            className="w-full bg-[#121214] border border-[#232328] text-zinc-200 h-12 rounded-xl px-4 text-sm font-medium focus:outline-none focus:border-purple-500 cursor-pointer shadow-md"
          >
            <option value="ALL">Todos os níveis</option>
            <option value="SECRETARIA">Secretaria</option>
            <option value="DIRETOR">Diretor</option>
            <option value="PROFESSOR">Professor</option>
            <option value="COORDENADOR">Coordenador</option>
            <option value="N6">N6 - Operacional</option>
            <option value="ROOT">Root / Admin</option>
          </select>
        </div>

        {/* Dropdown 2: Todos os status */}
        <div>
          <select
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value)}
            className="w-full bg-[#121214] border border-[#232328] text-zinc-200 h-12 rounded-xl px-4 text-sm font-medium focus:outline-none focus:border-purple-500 cursor-pointer shadow-md"
          >
            <option value="ALL">Todos os status</option>
            <option value="ATIVO">Ativo</option>
            <option value="PAUSADO">Pausado</option>
            <option value="INATIVO">Inativo</option>
          </select>
        </div>
      </div>

      <StandardTable
        data={acessosFiltrados}
        columns={columns}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage="Nenhum registro de acesso encontrado."
      />

      {/* Modal de Confirmação para Excluir Acesso */}
      {confirmDeleteOpen && (
        <StandardDialog
          open={confirmDeleteOpen}
          onOpenChange={setConfirmDeleteOpen}
          title="Remover Acesso do Usuário"
          maxWidth="sm:max-w-[400px]"
          footer={
            <div className="flex justify-end gap-2 w-full pt-2 border-t border-[#3f3f46]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmDeleteOpen(false)}
                className="bg-[#27272a] border-[#3f3f46] text-white hover:bg-[#3f3f46]"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleExcluirAcesso}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Confirmar Exclusão
              </Button>
            </div>
          }
        >
          <p className="text-zinc-300 text-sm leading-relaxed">
            Tem certeza que deseja remover permanentemente o nível de acesso do usuário <strong className="text-white">{itemParaExcluir?.funcionario}</strong>?
          </p>
        </StandardDialog>
      )}
    </div>
  )
}
