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
import { createClient } from '@/lib/supabaseClient'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
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

// ── STATUS CONFIG ──────────────────────────────────────────────────────────────
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

// ── componente ─────────────────────────────────────────────────────────────────
function AvaliacoesContent() {
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
  const isGlobalAdmin = isAdminGlobalOrRoot?.() ?? false
  const nivelNaEscola = escolaAtivaId
    ? acessos.find((a) => a.escola_id === escolaAtivaId)?.nivel ?? 99
    : 99

  const isProfessor = nivelNaEscola === 4 || nivelNaEscola === 5 || funcionario?.cargo?.toLowerCase().includes('professor')
  const isSecretario = nivelNaEscola === 3
  const isDiretoria = nivelNaEscola === 2 || isGlobalAdmin

  // Definir aba ativa inicial com base no perfil
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

  // Abrir atividade direto por ID se vier da URL (ex: clique na notificação)
  useEffect(() => {
    const idParam = searchParams.get('id')
    if (!idParam) return
    const abrirAtividadePorId = async () => {
      const supabase = createClient()
      const { data, error } = await (supabase as any)
        .from('atividades_secretaria')
        .select('*, funcionarios!professor_id(nome), turmas(nome), materias(nome)')
        .eq('id', idParam)
        .maybeSingle()

      if (error) {
        console.error('Erro ao buscar atividade por ID:', error)
        return
      }

      if (data) {
        const formatado = {
          ...data,
          professor_nome: data.funcionarios?.nome ?? '—',
          turma_nome: data.turmas?.nome ?? '—',
          materia_name: data.materias?.nome ?? '—',
          materia_nome: data.materias?.nome ?? '—',
        }
        setAtividadeSelecionada(formatado)
        setDetalhesOpen(true)
      }
    }
    abrirAtividadePorId()
  }, [searchParams])

  // Buscar atividades do banco
  const fetchAtividades = async () => {
    setLoading(true)
    const supabase = createClient()

    let query = (supabase as any)
      .from('atividades_secretaria')
      .select('*, funcionarios!professor_id(nome), turmas(nome), materias(nome)')
      .order('created_at', { ascending: false })

    // Filtros de nível de acesso
    if (!isGlobalAdmin) {
      if (escolaAtivaId) {
        query = query.eq('escola_id', escolaAtivaId)
      }
      // Filtra por professor apenas se ele for estritamente professor (sem privilégios de diretoria/secretaria)
      if (isProfessor && !isSecretario && !isDiretoria && funcionario?.id) {
        query = query.eq('professor_id', funcionario.id)
      }
    }

    try {
      const { data, error } = await query
      if (error) throw error

      const formatado = (data ?? []).map((at: any) => ({
        ...at,
        professor_nome: at.funcionarios?.nome ?? '—',
        turma_nome: at.turmas?.nome ?? '—',
        materia_name: at.materias?.nome ?? '—',
        materia_nome: at.materias?.nome ?? '—',
      }))

      setAtividades(formatado)
      calcularKpis(formatado)
    } catch (err) {
      console.error('Erro ao carregar atividades:', err)
    } finally {
      setLoading(false)
    }
  }

  // Calcular KPIs no cliente para maior flexibilidade
  const calcularKpis = async (lista: any[]) => {
    const hoje = new Date()
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

    const totalMes = lista.filter((at) => new Date(at.created_at) >= inicioMes).length
    const pendentesImpressao = lista.filter((at) => ['recebida', 'em_impressao'].includes(at.status)).length
    const concluidas = lista.filter((at) => at.status === 'entregue_professor').length

    if (lista.length === 0) {
      setKpis({
        totalMes,
        pendentesImpressao,
        concluidas,
        tempoMedioImpressao: '—',
        tempoMedioEntrega: '—',
      })
      return
    }

    // Evitar erro silencioso HTTP 414 (Request-URI Too Large) limitando a 100 atividades mais recentes
    const listaLimitada = lista.slice(0, 100)
    const atividadeIds = listaLimitada.map((at) => at.id)

    // Calcular tempo médio a partir do histórico
    const supabase = createClient()
    const { data: historicos } = await (supabase as any)
      .from('atividades_secretaria_historico')
      .select('atividade_id, status_novo, alterado_em')
      .in('atividade_id', atividadeIds)
      .order('alterado_em', { ascending: true })

    if (!historicos || (historicos as any[]).length === 0) {
      setKpis({ totalMes, pendentesImpressao, concluidas, tempoMedioImpressao: '—', tempoMedioEntrega: '—' })
      return
    }

    // Mapear tempos por atividade_id
    const tempos: Record<string, { criada: Date; impressa?: Date; entregue?: Date }> = {}
    
    lista.forEach((at) => {
      tempos[at.id] = { criada: new Date(at.created_at) }
    });

    (historicos as any[]).forEach((h: any) => {
      if (!tempos[h.atividade_id]) return
      if (h.status_novo === 'impressa') {
        tempos[h.atividade_id].impressa = new Date(h.alterado_em)
      }
      if (h.status_novo === 'entregue_professor') {
        tempos[h.atividade_id].entregue = new Date(h.alterado_em)
      }
    })

    let somaImpressao = 0
    let contImpressao = 0
    let somaEntrega = 0
    let contEntrega = 0

    Object.values(tempos).forEach((t) => {
      if (t.impressa) {
        somaImpressao += t.impressa.getTime() - t.criada.getTime()
        contImpressao++
      }
      if (t.impressa && t.entregue) {
        somaEntrega += t.entregue.getTime() - t.impressa.getTime()
        contEntrega++
      }
    })

    const formatarTempo = (ms: number) => {
      const horas = Math.floor(ms / (1000 * 60 * 60))
      if (horas < 24) return `${horas}h`
      const dias = Math.floor(horas / 24)
      const horasResto = horas % 24
      return horasResto > 0 ? `${dias}d ${horasResto}h` : `${dias}d`
    }

    setKpis({
      totalMes,
      pendentesImpressao,
      concluidas,
      tempoMedioImpressao: contImpressao > 0 ? formatarTempo(somaImpressao / contImpressao) : '—',
      tempoMedioEntrega: contEntrega > 0 ? formatarTempo(somaEntrega / contEntrega) : '—',
    })
  }

  useEffect(() => {
    fetchAtividades()
  }, [escolaAtivaId, funcionario?.id])

  // Filtragem dos dados exibidos
  const atividadesFiltradas = useMemo(() => {
    return atividades.filter((at) => {
      // 1. Busca por título ou professor
      const matchBusca =
        at.titulo?.toLowerCase().includes(busca.toLowerCase()) ||
        at.professor_nome?.toLowerCase().includes(busca.toLowerCase())

      // 2. Filtro Trimestre
      const matchTrimestre =
        filtroTrimestre === 'all' || String(at.trimestre) === filtroTrimestre

      // 3. Filtro Status (se não estiver filtrado pela Tab)
      const matchStatus =
        filtroStatus === 'all' || at.status === filtroStatus

      // 4. Filtro por Aba Ativa
      let matchTab = true
      if (activeTab === 'recebidas_impressao') {
        matchTab = ['recebida', 'em_impressao'].includes(at.status)
      } else if (activeTab === 'impressas_entregues') {
        matchTab = ['impressa', 'entregue_professor'].includes(at.status)
      } else if (activeTab === 'minhas_atividades') {
        matchTab = at.professor_id === funcionario?.id
      }

      return matchBusca && matchTrimestre && matchStatus && matchTab
    })
  }, [atividades, busca, filtroTrimestre, filtroStatus, activeTab, funcionario?.id])

  const abrirDetalhes = (at: any) => {
    setAtividadeSelecionada(at)
    setDetalhesOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#26262a]">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/home">
              <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-[#3ea6ff]" />
              Central de Atividades
            </h2>
          </div>
          <p className="text-zinc-400 text-sm mt-1">
            Gestão, controle de impressão e entrega de atividades avaliativas.
          </p>
        </div>

        {isProfessor && (
          <Button
            onClick={() => setNovaAtividadeOpen(true)}
            className="bg-[#3ea6ff] hover:bg-[#0090ff] text-black font-bold gap-2 shrink-0 rounded-xl"
          >
            <Plus className="w-4 h-4" />
            Nova Atividade
          </Button>
        )}
      </div>

      {/* ── KPIs GERENCIAIS (Diretoria, Admin e Root) ── */}
      {isDiretoria && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KPICardMini label="Enviadas (Mês)" value={kpis.totalMes} icon={TrendingUp} color="blue" />
          <KPICardMini label="Aguardando Impressão" value={kpis.pendentesImpressao} icon={Clock} color="amber" />
          <KPICardMini label="Concluídas" value={kpis.concluidas} icon={CheckCircle2} color="emerald" />
          <KPICardMini label="Tempo Médio Impressão" value={kpis.tempoMedioImpressao} icon={Clock} color="violet" />
          <KPICardMini label="Tempo Médio Entrega" value={kpis.tempoMedioEntrega} icon={Clock} color="rose" />
        </div>
      )}

      {/* ── ABAS DE NAVEGAÇÃO ── */}
      <div className="flex border-b border-[#26262a] overflow-x-auto select-none gap-2">
        {isProfessor && (
          <TabButton
            active={activeTab === 'minhas_atividades'}
            onClick={() => {
              setActiveTab('minhas_atividades')
              setFiltroStatus('all')
            }}
            label="Minhas Atividades"
          />
        )}

        {isSecretario && (
          <>
            <TabButton
              active={activeTab === 'recebidas_impressao'}
              onClick={() => setActiveTab('recebidas_impressao')}
              label="Recebidas & Em Impressão"
            />
            <TabButton
              active={activeTab === 'impressas_entregues'}
              onClick={() => setActiveTab('impressas_entregues')}
              label="Impressas & Entregues"
            />
            <TabButton
              active={activeTab === 'historico'}
              onClick={() => {
                setActiveTab('historico')
                setFiltroStatus('all')
              }}
              label="Histórico Completo"
            />
          </>
        )}

        {isDiretoria && (
          <>
            <TabButton
              active={activeTab === 'visao_geral'}
              onClick={() => {
                setActiveTab('visao_geral')
                setFiltroStatus('all')
              }}
              label="Visão Geral"
            />
            <TabButton
              active={activeTab === 'historico'}
              onClick={() => {
                setActiveTab('historico')
                setFiltroStatus('all')
              }}
              label="Histórico Completo"
            />
          </>
        )}
      </div>

      {/* ── FILTROS ── */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título ou professor..."
            className="pl-9 bg-[#141416] border-[#26262a] text-white placeholder:text-zinc-600 focus-visible:ring-[#3ea6ff]"
          />
        </div>

        <div className="flex gap-3">
          {/* Trimestre */}
          <Select value={filtroTrimestre} onValueChange={(v) => setFiltroTrimestre(v || 'all')}>
            <SelectTrigger className="w-[160px] bg-[#141416] border-[#26262a] text-white focus:ring-[#3ea6ff]">
              <SelectValue placeholder="Trimestre" />
            </SelectTrigger>
            <SelectContent className="bg-[#141416] border-[#26262a] text-white">
              <SelectItem value="all">Todos Trimestres</SelectItem>
              <SelectItem value="1">1º Trimestre</SelectItem>
              <SelectItem value="2">2º Trimestre</SelectItem>
              <SelectItem value="3">3º Trimestre</SelectItem>
            </SelectContent>
          </Select>

          {/* Status (oculto quando abas já pré-filtram status) */}
          {activeTab !== 'recebidas_impressao' && activeTab !== 'impressas_entregues' && (
            <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v || 'all')}>
              <SelectTrigger className="w-[160px] bg-[#141416] border-[#26262a] text-white focus:ring-[#3ea6ff]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-[#141416] border-[#26262a] text-white">
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="recebida">Recebida</SelectItem>
                <SelectItem value="em_impressao">Em Impressão</SelectItem>
                <SelectItem value="impressa">Impressa</SelectItem>
                <SelectItem value="entregue_professor">Entregue</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* ── TABELA DE DADOS ── */}
      <Card className="bg-[#141416] border-[#26262a] overflow-hidden rounded-2xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#3ea6ff]" />
            <span>Buscando atividades...</span>
          </div>
        ) : activitiesListEmpty(atividadesFiltradas) ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-4">
            <ClipboardList className="w-16 h-16 text-zinc-700" />
            <div className="text-center">
              <p className="text-lg font-semibold text-zinc-400">Nenhuma atividade encontrada</p>
              <p className="text-sm text-zinc-600 mt-1">Experimente ajustar os filtros ou pesquisar outro termo.</p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-[#1c1c1e] hover:bg-[#1c1c1e] border-b border-[#26262a]">
              <TableRow className="border-b border-[#26262a]">
                <TableHead className="text-zinc-400 font-semibold h-12">Atividade</TableHead>
                <TableHead className="text-zinc-400 font-semibold h-12">Professor</TableHead>
                <TableHead className="text-zinc-400 font-semibold h-12">Turma / Matéria</TableHead>
                <TableHead className="text-zinc-400 font-semibold h-12">Data Aplicação</TableHead>
                <TableHead className="text-zinc-400 font-semibold h-12">Trimestre</TableHead>
                <TableHead className="text-zinc-400 font-semibold h-12">Status</TableHead>
                <TableHead className="text-zinc-400 font-semibold h-12 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {atividadesFiltradas.map((at) => {
                const sInfo = STATUS_CONFIG[at.status as StatusAtividade] ?? {
                  label: at.status,
                  class: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
                }
                return (
                  <TableRow
                    key={at.id}
                    onClick={() => abrirDetalhes(at)}
                    className="border-b border-[#26262a]/50 hover:bg-[#1c1c1e]/30 cursor-pointer transition-colors"
                  >
                    <TableCell className="font-semibold text-white h-14">
                      {at.titulo}
                    </TableCell>
                    <TableCell className="text-zinc-300">
                      {at.professor_nome}
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      <div className="text-sm">{at.turma_nome}</div>
                      <div className="text-xs text-zinc-500">{at.materia_name}</div>
                    </TableCell>
                    <TableCell className="text-zinc-300">
                      {at.data_aplicacao
                        ? new Date(at.data_aplicacao + 'T00:00:00').toLocaleDateString('pt-BR')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {at.trimestre ? `${at.trimestre}º Trim` : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={sInfo.class}>
                        {sInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {at.arquivo_url && (
                          <a href={at.arquivo_url} target="_blank" rel="noopener noreferrer">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-[#26262a]"
                              title="Visualizar arquivo"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* ── MODAIS ── */}
      <ModalNovaAtividade
        open={novaAtividadeOpen}
        onOpenChange={setNovaAtividadeOpen}
        onSuccess={fetchAtividades}
      />

      <ModalDetalhesAtividade
        open={detalhesOpen}
        onOpenChange={setDetalhesOpen}
        atividade={atividadeSelecionada}
        onStatusChange={fetchAtividades}
      />
    </div>
  )
}

// ── COMPONENTES AUXILIARES INTERNOS ─────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-3 text-sm font-semibold transition-all duration-200 border-b-2 outline-none cursor-pointer whitespace-nowrap',
        active
          ? 'border-[#3ea6ff] text-[#3ea6ff]'
          : 'border-transparent text-zinc-400 hover:text-white hover:border-zinc-700'
      )}
    >
      {label}
    </button>
  )
}

function KPICardMini({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: string | number
  icon: any
  color: 'blue' | 'amber' | 'emerald' | 'violet' | 'rose'
}) {
  const colors = {
    blue:    { bg: 'bg-[#1b253b]', text: 'text-[#3ea6ff]', border: 'border-[#3ea6ff]/20' },
    amber:   { bg: 'bg-[#2c1a0e]', text: 'text-amber-400', border: 'border-amber-500/20' },
    emerald: { bg: 'bg-[#0d1f18]', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    violet:  { bg: 'bg-[#1e1b2e]', text: 'text-violet-400', border: 'border-violet-500/20' },
    rose:    { bg: 'bg-[#1f0d0d]', text: 'text-rose-400', border: 'border-rose-500/20' },
  }
  const c = colors[color]

  return (
    <Card className="bg-surface-1 border-borderCustom rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border', c.bg, c.border)}>
        <Icon className={cn('w-4 h-4', c.text)} />
      </div>
      <div>
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider leading-tight">{label}</p>
        <p className="text-xl font-bold text-white mt-0.5 tabular-nums leading-none">{value}</p>
      </div>
    </Card>
  )
}

function activitiesListEmpty(arr: any[]) {
  return !arr || arr.length === 0
}

export default function AvaliacoesPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#3ea6ff]" />
        <span>Carregando central de atividades...</span>
      </div>
    }>
      <AvaliacoesContent />
    </Suspense>
  )
}
