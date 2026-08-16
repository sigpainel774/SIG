'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import {
  ClipboardList,
  Search,
  Plus,
  ArrowLeft,
  Loader2,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  Filter,
  Download
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import { useEditModeStore } from '@/store/useEditModeStore'
import { useCheckPermissao } from '@/hooks/useCheckPermissao'
import { useEjaGuard } from '@/hooks/useEjaGuard'
import { createClient } from '@/lib/supabaseClient'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { IconTile } from '@/components/ui/icon-tile'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ModalNovaAtividade } from '@/components/modals/modal-nova-atividade'
import { ModalDetalhesAtividade } from '@/components/modals/modal-detalhes-atividade'

type StatusAtividade = 'recebida' | 'em_impressao' | 'impressa' | 'entregue_professor'

const STATUS_CONFIG: Record<StatusAtividade, { label: string; class: string }> = {
  recebida: {
    label: 'Recebida',
    class: 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400',
  },
  em_impressao: {
    label: 'Em Impressão',
    class: 'bg-blue-500/15 text-blue-700 border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-400',
  },
  impressa: {
    label: 'Impressa',
    class: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400',
  },
  entregue_professor: {
    label: 'Entregue ao Professor',
    class: 'bg-slate-500/10 text-slate-700 border-slate-500/25 dark:bg-zinc-500/20 dark:text-zinc-400 dark:border-zinc-500/30',
  },
}

function EjaAvaliacoesContent() {
  const { authorized } = useEjaGuard()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { funcionario, acessos, escolaAtivaId, isAdminGlobalOrRoot } = useAuthStore()
  const { selectedEscola } = useSchoolStore()
  const { isEditMode } = useEditModeStore()

  // Modais
  const [novaAtividadeOpen, setNovaAtividadeOpen] = useState(false)
  const [detalhesOpen, setDetalhesOpen] = useState(false)
  const [atividadeSelecionada, setAtividadeSelecionada] = useState<any>(null)

  // Estados de dados
  const [atividades, setAtividades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroTrimestre, setFiltroTrimestre] = useState('all')
  const [filtroStatus, setFiltroStatus] = useState('all')
  const [activeTab, setActiveTab] = useState('')

  // KPIs
  const [kpis, setKpis] = useState({
    totalMes: 0,
    pendentesImpressao: 0,
    concluidas: 0,
    tempoMedioImpressao: '—',
    tempoMedioEntrega: '—',
  })

  // Determinar perfis e permissões
  const { temPermissao: podeVerFila } = useCheckPermissao('atividades.ver_fila')
  const { temPermissao: podeImprimirAtividades } = useCheckPermissao('atividades.imprimir')
  const { temPermissao: podeAtualizarStatusAtividades } = useCheckPermissao('atividades.atualizar_status')

  const isGlobalAdmin = isAdminGlobalOrRoot?.() ?? false
  const nivelNaEscola = escolaAtivaId
    ? acessos.find((a) => a.escola_id === escolaAtivaId)?.nivel ?? 99
    : 99

  const isProfessor = nivelNaEscola === 4 || nivelNaEscola === 5 || funcionario?.cargo?.toLowerCase().includes('professor')
  const isSecretario = nivelNaEscola === 3 && podeVerFila
  const isDiretoria = nivelNaEscola === 2 || isGlobalAdmin

  useEffect(() => {
    if (activeTab) return
    const tabParam = searchParams.get('tab')
    if (tabParam) {
      if (tabParam === 'central') {
        setActiveTab(isSecretario ? 'recebidas_impressao' : 'visao_geral')
      } else {
        setActiveTab(tabParam)
      }
      return
    }

    if (isProfessor) {
      setActiveTab('minhas_atividades')
    } else if (isSecretario) {
      setActiveTab('recebidas_impressao')
    } else {
      setActiveTab('visao_geral')
    }
  }, [isProfessor, isSecretario, activeTab, searchParams])

  const fetchAtividades = async () => {
    const targetEscolaId = escolaAtivaId || selectedEscola?.id
    if (!targetEscolaId) {
      setAtividades([])
      setLoading(false)
      return
    }

    setLoading(true)
    const supabase = createClient()

    let query = (supabase as any)
      .from('atividades_secretaria')
      .select('*, funcionarios!professor_id(nome), turmas(nome), materias(nome)')
      .eq('escola_id', targetEscolaId)
      .order('created_at', { ascending: false })

    try {
      const { data, error } = await query
      if (error) throw error

      const formatado = (data ?? [])
        .map((at: any) => ({
          ...at,
          professor_nome: at.funcionarios?.nome ?? '—',
          turma_nome: at.turmas?.nome ?? '—',
          materia_name: at.materias?.nome ?? '—',
          materia_nome: at.materias?.nome ?? '—',
        }))
        // Filtra exclusivamente turmas EJA
        .filter((at: any) => at.turma_nome.toUpperCase().includes('EJA'))

      setAtividades(formatado)

      const hoje = new Date()
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      const totalMes = formatado.filter((at: any) => new Date(at.created_at) >= inicioMes).length
      const pendentesImpressao = formatado.filter((at: any) => ['recebida', 'em_impressao'].includes(at.status)).length
      const concluidas = formatado.filter((at: any) => at.status === 'entregue_professor').length

      setKpis({
        totalMes,
        pendentesImpressao,
        concluidas,
        tempoMedioImpressao: '—',
        tempoMedioEntrega: '—',
      })
    } catch (err) {
      console.error('Erro ao carregar atividades EJA:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authorized) {
      fetchAtividades()
    }
  }, [escolaAtivaId, selectedEscola?.id, authorized])

  const atividadesFiltradas = useMemo(() => {
    return atividades.filter((at) => {
      const matchBusca =
        !busca ||
        at.titulo?.toLowerCase().includes(busca.toLowerCase()) ||
        at.professor_nome?.toLowerCase().includes(busca.toLowerCase()) ||
        at.turma_nome?.toLowerCase().includes(busca.toLowerCase()) ||
        at.materia_nome?.toLowerCase().includes(busca.toLowerCase())

      const matchTrimestre =
        filtroTrimestre === 'all' || String(at.trimestre) === filtroTrimestre

      const matchStatus = filtroStatus === 'all' || at.status === filtroStatus

      return matchBusca && matchTrimestre && matchStatus
    })
  }, [atividades, busca, filtroTrimestre, filtroStatus])

  if (authorized === false) return null

  return (
    <div className="space-y-6">
      {/* Modal de Nova Atividade */}
      {novaAtividadeOpen && (
        <ModalNovaAtividade
          open={novaAtividadeOpen}
          onOpenChange={setNovaAtividadeOpen}
          onSuccess={fetchAtividades}
        />
      )}

      {/* Modal de Detalhes */}
      {detalhesOpen && atividadeSelecionada && (
        <ModalDetalhesAtividade
          open={detalhesOpen}
          onOpenChange={setDetalhesOpen}
          atividade={atividadeSelecionada}
          onStatusChange={fetchAtividades}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/home">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <IconTile icon={ClipboardList} variant="primary" className="h-10 w-10 shrink-0" />
            <h1 className="text-2xl font-bold text-foreground">Avaliações & Atividades - EJA</h1>
          </div>
          <p className="text-muted-foreground text-sm font-normal mt-2 ml-1">
            Controle de envio, impressão e entregas de diários e avaliações da Educação de Jovens e Adultos.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {isEditMode && (
            <Button
              onClick={() => setNovaAtividadeOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold gap-2 rounded-xl h-10 px-4"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Atividade EJA</span>
            </Button>
          )}
        </div>
      </div>

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase">Total no Mês</span>
            <FileText className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{kpis.totalMes}</p>
        </Card>

        <Card className="bg-card border-border p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase">Pendentes de Impressão</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{kpis.pendentesImpressao}</p>
        </Card>

        <Card className="bg-card border-border p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase">Entregues ao Docente</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{kpis.concluidas}</p>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por título, docente, turma ou disciplina EJA..."
            className="pl-9 bg-background border-border text-foreground h-10 rounded-lg w-full"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-[160px]">
          <Select value={filtroTrimestre} onValueChange={(val) => setFiltroTrimestre(val ?? 'all')}>
            <SelectTrigger className="bg-background border-border text-foreground h-10 rounded-lg">
              <SelectValue placeholder="Trimestre">
                {filtroTrimestre === 'all' ? 'Todos Trimestres' : `${filtroTrimestre}º Trimestre`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-foreground">
              <SelectItem value="all">Todos Trimestres</SelectItem>
              <SelectItem value="1">1º Trimestre</SelectItem>
              <SelectItem value="2">2º Trimestre</SelectItem>
              <SelectItem value="3">3º Trimestre</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-[160px]">
          <Select value={filtroStatus} onValueChange={(val) => setFiltroStatus(val ?? 'all')}>
            <SelectTrigger className="bg-background border-border text-foreground h-10 rounded-lg">
              <SelectValue placeholder="Status">
                {filtroStatus === 'all' ? 'Todos os Status' : STATUS_CONFIG[filtroStatus as StatusAtividade]?.label || filtroStatus}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-foreground">
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="recebida">Recebida</SelectItem>
              <SelectItem value="em_impressao">Em Impressão</SelectItem>
              <SelectItem value="impressa">Impressa</SelectItem>
              <SelectItem value="entregue_professor">Entregue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela de Atividades */}
      <Card className="bg-card border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-semibold text-xs">Título / Descrição</TableHead>
              <TableHead className="font-semibold text-xs">Docente</TableHead>
              <TableHead className="font-semibold text-xs">Turma EJA</TableHead>
              <TableHead className="font-semibold text-xs">Disciplina</TableHead>
              <TableHead className="font-semibold text-xs text-center">Status</TableHead>
              <TableHead className="font-semibold text-xs text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-500 mb-2" />
                  Carregando atividades EJA...
                </TableCell>
              </TableRow>
            ) : atividadesFiltradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                  Nenhuma atividade ou avaliação da modalidade EJA encontrada com os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              atividadesFiltradas.map((at) => {
                const statusInfo = STATUS_CONFIG[at.status as StatusAtividade] || {
                  label: at.status,
                  class: 'bg-muted text-muted-foreground',
                }
                return (
                  <TableRow
                    key={at.id}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => {
                      setAtividadeSelecionada(at)
                      setDetalhesOpen(true)
                    }}
                  >
                    <TableCell className="font-medium text-sm text-foreground">
                      {at.titulo}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {at.professor_nome}
                    </TableCell>
                    <TableCell className="text-sm text-purple-600 dark:text-purple-400 font-semibold">
                      {at.turma_nome}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {at.materia_nome}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusInfo.class}`}>
                        {statusInfo.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-500/10 text-xs font-medium"
                      >
                        Ver Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

export default function EjaAvaliacoesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Carregando Avaliações EJA...</div>}>
      <EjaAvaliacoesContent />
    </Suspense>
  )
}
