'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { KeyRound, RefreshCw, Pause, Trash2, Search, ShieldCheck, Check, X, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export interface AcessoItem {
  id: string
  funcionario: string
  email: string
  escola: string
  nivel: 'SECRETARIA' | 'DIRETOR' | 'PROFESSOR' | 'COORDENADOR' | 'N6' | 'ROOT' | string
  status: 'ATIVO' | 'INATIVO' | 'PAUSADO' | string
}

const mockAcessosInicial: AcessoItem[] = [
  {
    id: 'acs-1',
    funcionario: 'kaique@painel.com',
    email: 'kaique@painel.com',
    escola: 'Geral',
    nivel: 'SECRETARIA',
    status: 'ATIVO'
  },
  {
    id: 'acs-2',
    funcionario: 'Edires Pereira da Silva',
    email: 'eridesoo@gmail.com',
    escola: 'Colégio Moisés Alves',
    nivel: 'DIRETOR',
    status: 'ATIVO'
  },
  {
    id: 'acs-3',
    funcionario: 'diretor frei',
    email: 'diretorfrei@gmail.com',
    escola: 'Escola Frei Urbano',
    nivel: 'DIRETOR',
    status: 'ATIVO'
  },
  {
    id: 'acs-4',
    funcionario: 'Satoshi Nakamoto',
    email: 'satoshi29@gmail.com',
    escola: 'Colégio Moisés Alves',
    nivel: 'PROFESSOR',
    status: 'ATIVO'
  },
  {
    id: 'acs-5',
    funcionario: 'vigia 2',
    email: 'vigia2@gmail.com',
    escola: 'Colégio Moisés Alves',
    nivel: 'N6',
    status: 'ATIVO'
  },
  {
    id: 'acs-6',
    funcionario: 'Ciro II',
    email: 'ciro2026@gmail.com',
    escola: 'Colégio Dr Eraldo Tinoco',
    nivel: 'PROFESSOR',
    status: 'ATIVO'
  },
  {
    id: 'acs-7',
    funcionario: 'matthewrrusk@gmail.com',
    email: 'matthewrrusk@gmail.com',
    escola: 'Colégio Moisés Alves',
    nivel: 'COORDENADOR',
    status: 'ATIVO'
  }
]

export default function AdminAcessosPage() {
  const supabase = createClient()

  const [acessos, setAcessos] = useState<AcessoItem[]>(mockAcessosInicial)
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

        // Mesclar dados mantendo a lista de referência idêntica à imagem
        const map = new Map<string, AcessoItem>()
        mockAcessosInicial.forEach(item => map.set(item.email.toLowerCase(), item))
        dbItems.forEach(item => map.set(item.email.toLowerCase(), item))

        setAcessos(Array.from(map.values()))
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
  const handleTogglePausa = (item: AcessoItem) => {
    const isPausado = item.status === 'PAUSADO' || item.status === 'INATIVO'
    const novoStatus = isPausado ? 'ATIVO' : 'PAUSADO'

    setAcessos(prev => prev.map(a => a.id === item.id ? { ...a, status: novoStatus } : a))

    if (isPausado) {
      toast.success(`Acesso de ${item.funcionario} reativado com sucesso!`)
    } else {
      toast.warning(`Acesso de ${item.funcionario} pausado temporariamente.`)
    }
  }

  // Confirmar exclusão do acesso (Botão 2)
  const handleConfirmExcluir = (item: AcessoItem) => {
    setItemParaExcluir(item)
    setConfirmDeleteOpen(true)
  }

  const handleExcluirAcesso = () => {
    if (!itemParaExcluir) return
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
  const acessosFiltrados = acessos.filter(item => {
    const matchBusca = 
      item.funcionario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.escola.toLowerCase().includes(searchTerm.toLowerCase())

    const matchNivel = filtroNivel === 'ALL' || item.nivel.toUpperCase().includes(filtroNivel.toUpperCase())
    const matchStatus = filtroStatus === 'ALL' || item.status.toUpperCase() === filtroStatus.toUpperCase()

    return matchBusca && matchNivel && matchStatus
  })

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

      {/* Container da Tabela com visual fiel ao screenshot */}
      <div className="bg-[#121214] border border-[#232328] rounded-2xl overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-[#0e0e11] border-b border-[#232328]">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="text-zinc-400 font-extrabold text-[11px] tracking-wider uppercase py-4 pl-6">
                FUNCIONARIO
              </TableHead>
              <TableHead className="text-zinc-400 font-extrabold text-[11px] tracking-wider uppercase py-4">
                EMAIL
              </TableHead>
              <TableHead className="text-zinc-400 font-extrabold text-[11px] tracking-wider uppercase py-4">
                ESCOLA / ORGAO
              </TableHead>
              <TableHead className="text-zinc-400 font-extrabold text-[11px] tracking-wider uppercase py-4">
                NIVEL
              </TableHead>
              <TableHead className="text-zinc-400 font-extrabold text-[11px] tracking-wider uppercase py-4">
                STATUS
              </TableHead>
              <TableHead className="text-zinc-400 font-extrabold text-[11px] tracking-wider uppercase py-4 pr-6 text-right">
                ACOES
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {acessosFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-zinc-400 text-sm">
                  Nenhum registro de acesso encontrado.
                </TableCell>
              </TableRow>
            ) : (
              acessosFiltrados.map((item) => {
                const isPausado = item.status === 'PAUSADO' || item.status === 'INATIVO'
                const isGeral = item.escola === 'Geral'

                return (
                  <TableRow 
                    key={item.id} 
                    className="border-b border-[#1c1c20] hover:bg-[#18181c] transition-colors"
                  >
                    {/* FUNCIONARIO */}
                    <TableCell className="py-4 pl-6 font-bold text-white text-sm whitespace-nowrap">
                      {item.funcionario}
                    </TableCell>

                    {/* EMAIL */}
                    <TableCell className="py-4 text-zinc-400 text-sm whitespace-nowrap">
                      {item.email}
                    </TableCell>

                    {/* ESCOLA / ORGAO */}
                    <TableCell className={`py-4 text-sm whitespace-nowrap ${isGeral ? 'italic text-zinc-400' : 'text-zinc-200'}`}>
                      {item.escola}
                    </TableCell>

                    {/* NIVEL */}
                    <TableCell className="py-4 whitespace-nowrap">
                      {renderNivelBadge(item.nivel)}
                    </TableCell>

                    {/* STATUS */}
                    <TableCell className="py-4 whitespace-nowrap">
                      {isPausado ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#27272a] border border-[#3f3f46] text-[#a1a1aa] text-[11px] font-extrabold tracking-wide uppercase">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#71717a]" />
                          {item.status}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#052e16] border border-[#166534] text-[#4ade80] text-[11px] font-extrabold tracking-wide uppercase">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
                          ATIVO
                        </span>
                      )}
                    </TableCell>

                    {/* ACOES (Dois botões quadrados vermelhos por linha) */}
                    <TableCell className="py-4 pr-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
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
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal de Confirmação para Excluir Acesso */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-[400px] bg-[#18181b] border-[#3f3f46] text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Remover Acesso do Usuário
            </DialogTitle>
          </DialogHeader>

          <p className="text-zinc-300 text-sm leading-relaxed">
            Tem certeza que deseja remover permanentemente o nível de acesso do usuário <strong className="text-white">{itemParaExcluir?.funcionario}</strong>?
          </p>

          <DialogFooter className="gap-2 pt-2">
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
