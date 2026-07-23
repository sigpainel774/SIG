'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { StandardTable, TableColumn } from '@/components/ui/table'
import {
  Printer,
  Trash2,
  RefreshCw,
  Search,
  Building2,
  User,
  Clock,
  Download,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'

type StatusAtividade = 'recebida' | 'em_impressao' | 'impressa' | 'entregue_professor'

const STATUS_CONFIG: Record<StatusAtividade, { label: string; class: string }> = {
  recebida: {
    label: 'Recebida',
    class: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  em_impressao: {
    label: 'Em Impressão',
    class: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  impressa: {
    label: 'Impressa',
    class: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  entregue_professor: {
    label: 'Entregue ao Professor',
    class: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  },
}

interface ModalGerenciarFilaImpressaoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ModalGerenciarFilaImpressao({
  open,
  onOpenChange,
}: ModalGerenciarFilaImpressaoProps) {
  const supabase = createClient()
  const { funcionario } = useAuthStore()

  const [atividades, setAtividades] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todas')

  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const loadAtividadesPendente = async () => {
    if (!open) return
    setLoading(true)

    try {
      const { data, error } = await (supabase as any)
        .from('atividades_secretaria')
        .select('*, escolas(nome), funcionarios!professor_id(nome), turmas(nome), materias(nome)')
        .neq('status', 'entregue_professor')
        .order('created_at', { ascending: false })

      if (!isMounted.current) return

      if (error) {
        console.error('Erro ao carregar fila de impressão:', error)
        toast.error('Erro ao carregar atividades pendentes.')
      } else {
        const formatado = (data ?? []).map((at: any) => ({
          ...at,
          escola_nome: at.escolas?.nome ?? 'Sem escola',
          professor_nome: at.funcionarios?.nome ?? '—',
          turma_nome: at.turmas?.nome ?? '—',
          materia_nome: at.materias?.nome ?? '—',
        }))
        setAtividades(formatado)
      }
    } catch (err: any) {
      console.error(err)
      toast.error('Falha ao consultar fila de impressão.')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  useEffect(() => {
    loadAtividadesPendente()
  }, [open])

  // Excluir atividade individual
  const handleExcluirAtividade = async (atividade: any) => {
    const confirm = window.confirm(
      `Deseja realmente remover a atividade "${atividade.titulo}" (Professor: ${atividade.professor_nome}) da fila de impressão?`
    )
    if (!confirm) return

    setDeletingId(atividade.id)
    try {
      // Remover histórico primeiro para manter integridade
      await (supabase as any)
        .from('atividades_secretaria_historico')
        .delete()
        .eq('atividade_id', atividade.id)

      // Excluir registro principal
      const { error } = await (supabase as any)
        .from('atividades_secretaria')
        .delete()
        .eq('id', atividade.id)

      if (error) throw error

      toast.success(`Atividade "${atividade.titulo}" removida da fila!`)
      setAtividades((prev) => prev.filter((a) => a.id !== atividade.id))
    } catch (err: any) {
      console.error('Erro ao excluir atividade:', err)
      toast.error(err?.message ?? 'Erro ao excluir atividade da fila.')
    } finally {
      setDeletingId(null)
    }
  }

  // Excluir em lote (todas as filtradas)
  const handleExcluirFiltradas = async () => {
    if (atividadesFiltradas.length === 0) return

    const confirm = window.confirm(
      `ATENÇÃO: Deseja realmente excluir TODAS as ${atividadesFiltradas.length} atividades exibidas na fila? Esta ação não pode ser desfeita.`
    )
    if (!confirm) return

    setBulkDeleting(true)
    const idsParaExcluir = atividadesFiltradas.map((a) => a.id)

    try {
      // 1. Apagar histórico
      await (supabase as any)
        .from('atividades_secretaria_historico')
        .delete()
        .in('atividade_id', idsParaExcluir)

      // 2. Apagar atividades
      const { error } = await (supabase as any)
        .from('atividades_secretaria')
        .delete()
        .in('id', idsParaExcluir)

      if (error) throw error

      toast.success(`${idsParaExcluir.length} atividades removidas da fila com sucesso!`)
      setAtividades((prev) => prev.filter((a) => !idsParaExcluir.includes(a.id)))
    } catch (err: any) {
      console.error('Erro na exclusão em lote:', err)
      toast.error(err?.message ?? 'Erro ao apagar atividades selecionadas.')
    } finally {
      setBulkDeleting(false)
    }
  }

  // Filtragem local
  const atividadesFiltradas = atividades.filter((at) => {
    const termo = searchTerm.toLowerCase().trim()
    const matchesTerm =
      !termo ||
      at.titulo?.toLowerCase().includes(termo) ||
      at.professor_nome?.toLowerCase().includes(termo) ||
      at.escola_nome?.toLowerCase().includes(termo) ||
      at.materia_nome?.toLowerCase().includes(termo) ||
      at.turma_nome?.toLowerCase().includes(termo)

    const matchesStatus =
      statusFilter === 'todas' || at.status === statusFilter

    return matchesTerm && matchesStatus
  })

  // Definir colunas da tabela
  const columns: TableColumn<any>[] = [
    {
      header: 'Atividade / Disciplina',
      accessor: (at) => (
        <div className="space-y-1">
          <p className="font-semibold text-white truncate max-w-[220px]">
            {at.titulo ?? 'Sem título'}
          </p>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span>{at.materia_nome}</span>
            <span>•</span>
            <span className="text-purple-400 font-medium">{at.turma_nome}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Escola',
      accessor: (at) => (
        <div className="flex items-center gap-1.5 text-xs text-zinc-300">
          <Building2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="truncate max-w-[180px]">{at.escola_nome}</span>
        </div>
      ),
    },
    {
      header: 'Professor',
      accessor: (at) => (
        <div className="flex items-center gap-1.5 text-xs text-zinc-300">
          <User className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span className="truncate max-w-[150px]">{at.professor_nome}</span>
        </div>
      ),
    },
    {
      header: 'Status Atual',
      accessor: (at) => {
        const conf = STATUS_CONFIG[at.status as StatusAtividade] ?? {
          label: at.status,
          class: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
        }
        return (
          <Badge
            variant="outline"
            className={`text-xs font-semibold px-2 py-0.5 ${conf.class}`}
          >
            {conf.label}
          </Badge>
        )
      },
    },
    {
      header: 'Data Aplicação',
      accessor: (at) => (
        <div className="flex items-center gap-1 text-xs text-zinc-400">
          <Clock className="w-3.5 h-3.5 text-zinc-500" />
          {at.data_aplicacao
            ? new Date(at.data_aplicacao + 'T00:00:00').toLocaleDateString('pt-BR')
            : '—'}
        </div>
      ),
    },
    {
      header: 'Ações',
      headClassName: 'text-right w-24',
      className: 'text-right',
      accessor: (at) => (
        <div className="flex items-center justify-end gap-1">
          {at.arquivo_url && (
            <a
              href={at.arquivo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10"
                title="Download do Arquivo"
              >
                <Download className="w-4 h-4" />
              </Button>
            </a>
          )}
          <Button
            variant="ghost"
            size="sm"
            disabled={deletingId === at.id || bulkDeleting}
            onClick={() => handleExcluirAtividade(at)}
            className="h-8 w-8 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
            title="Excluir Atividade da Fila"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Fila de Impressão de Atividades (Super Admin)"
      description="Gerenciamento e exclusão manual de atividades pendentes ou em impressão na rede escolar."
      maxWidth="sm:max-w-4xl"
    >
      <div className="space-y-4">
        {/* Barra Superior de Filtros e Recarregar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#141416] p-3 rounded-xl border border-[#26262a]">
          {/* Busca */}
          <div className="flex items-center gap-2 bg-[#1c1c1e] border border-[#26262a] px-3 py-1.5 rounded-lg flex-1">
            <Search className="w-4 h-4 text-zinc-400 shrink-0" />
            <Input
              placeholder="Buscar por título, professor, matéria ou escola..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none text-white focus-visible:ring-0 placeholder:text-zinc-500 h-6 text-sm p-0"
            />
          </div>

          {/* Filtro de Status */}
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#1c1c1e] border border-[#26262a] text-zinc-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
            >
              <option value="todas">Todos os Status Pendentes</option>
              <option value="recebida">Recebida</option>
              <option value="em_impressao">Em Impressão</option>
              <option value="impressa">Impressa</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={loadAtividadesPendente}
              disabled={loading}
              className="border-[#26262a] bg-[#1c1c1e] text-zinc-300 hover:text-white hover:bg-[#26262a]"
              title="Recarregar Fila"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            {atividadesFiltradas.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleExcluirFiltradas}
                disabled={bulkDeleting || loading}
                className="bg-rose-600 hover:bg-rose-700 text-white font-medium gap-1 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir Filtradas ({atividadesFiltradas.length})
              </Button>
            )}
          </div>
        </div>

        {/* Resumo */}
        <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
          <span>
            Exibindo <strong className="text-white">{atividadesFiltradas.length}</strong> de{' '}
            <strong className="text-white">{atividades.length}</strong> atividade(s) não entregue(s).
          </span>
        </div>

        {/* Tabela de Atividades */}
        <div className="rounded-xl border border-[#26262a] overflow-hidden bg-[#121214]">
          <StandardTable
            data={atividadesFiltradas}
            columns={columns}
            keyExtractor={(at) => at.id}
            loading={loading}
            loadingMessage="Carregando fila de impressão da rede..."
            emptyMessage="Nenhuma atividade pendente encontrada na fila de impressão."
            className="border-none"
          />
        </div>
      </div>
    </StandardDialog>
  )
}
