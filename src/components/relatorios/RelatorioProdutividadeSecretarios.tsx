'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Escola, useSchoolStore } from '@/store/useSchoolStore'
import { useAuthStore } from '@/store/useAuthStore'
import { 
  Users, 
  Award, 
  Search, 
  Filter, 
  Printer, 
  Download, 
  TrendingUp, 
  PlusCircle, 
  Edit3, 
  Clock, 
  ShieldAlert, 
  Calendar, 
  ChevronRight, 
  Sparkles, 
  Activity, 
  FileText, 
  CheckCircle2, 
  Building2, 
  X,
  ArrowUpDown,
  History,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StandardTable, TableColumn } from '@/components/ui/table'
import { 
  PrintRelatorioProdutividadeSecretarios, 
  SecretarioProdutividadeItem, 
  ResumoProdutividadePrint, 
  EscolaProdutividadePrint 
} from '@/components/print/print-relatorio-produtividade-secretarios'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface RelatorioProdutividadeSecretariosProps {
  selectedEscola?: Escola | null
}

interface DetalheLogItem {
  id: string
  created_at: string
  action: string
  entity: string
  entity_id: string
  old_data: any
  new_data: any
  ip_address?: string | null
}

export default function RelatorioProdutividadeSecretarios({ selectedEscola: propSelectedEscola }: RelatorioProdutividadeSecretariosProps) {
  const { selectedEscola: storeSelectedEscola, escolas } = useSchoolStore()
  const { isAdminGlobalOrRoot, acessos } = useAuthStore()

  // Permissão exclusiva Nível 1 / Superadmin
  const isSuperAdminOrNivel1 = isAdminGlobalOrRoot() || acessos?.some(a => a.nivel === 1 && a.ativo)

  const activeEscola = propSelectedEscola !== undefined ? propSelectedEscola : storeSelectedEscola

  // Estados de dados
  const [loading, setLoading] = useState(true)
  const [secretarios, setSecretarios] = useState<SecretarioProdutividadeItem[]>([])
  const [logsBrutos, setLogsBrutos] = useState<any[]>([])

  // Estados de Filtros
  const [filtroPeriodo, setFiltroPeriodo] = useState<'hoje' | '7dias' | '30dias' | 'mes' | 'ano' | 'custom'>('30dias')
  const [dataInicioCustom, setDataInicioCustom] = useState<string>('')
  const [dataFimCustom, setDataFimCustom] = useState<string>('')
  const [busca, setBusca] = useState('')
  const [filtroAtividade, setFiltroAtividade] = useState<'todas' | 'cadastros' | 'edicoes' | 'outras'>('todas')
  const [ordenacao, setOrdenacao] = useState<'acoes' | 'cadastros' | 'edicoes' | 'nome'>('acoes')

  // Modal / Extrato Detalhado do Secretário
  const [secretarioModal, setSecretarioModal] = useState<SecretarioProdutividadeItem | null>(null)
  const [logsSecretarioModal, setLogsSecretarioModal] = useState<DetalheLogItem[]>([])
  const [loadingModalLogs, setLoadingModalLogs] = useState(false)

  // Modal de Impressão A4
  const [printModalModo, setPrintModalModo] = useState<'sintetico' | 'nominal' | null>(null)

  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // Calcular limites de data do período selecionado
  const periodoDatas = useMemo(() => {
    const agora = new Date()
    let inicio = new Date()
    let label = 'Últimos 30 dias'

    if (filtroPeriodo === 'hoje') {
      inicio.setHours(0, 0, 0, 0)
      label = 'Hoje (' + agora.toLocaleDateString('pt-BR') + ')'
    } else if (filtroPeriodo === '7dias') {
      inicio.setDate(inicio.getDate() - 7)
      inicio.setHours(0, 0, 0, 0)
      label = 'Últimos 7 dias'
    } else if (filtroPeriodo === '30dias') {
      inicio.setDate(inicio.getDate() - 30)
      inicio.setHours(0, 0, 0, 0)
      label = 'Últimos 30 dias'
    } else if (filtroPeriodo === 'mes') {
      inicio = new Date(agora.getFullYear(), agora.getMonth(), 1)
      label = `Mês Atual (${agora.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })})`
    } else if (filtroPeriodo === 'ano') {
      inicio = new Date(agora.getFullYear(), 0, 1)
      label = `Ano Letivo ${agora.getFullYear()}`
    } else if (filtroPeriodo === 'custom' && dataInicioCustom) {
      inicio = new Date(dataInicioCustom + 'T00:00:00')
      const fimLabel = dataFimCustom ? new Date(dataFimCustom + 'T23:59:59').toLocaleDateString('pt-BR') : 'atual'
      label = `${new Date(dataInicioCustom).toLocaleDateString('pt-BR')} até ${fimLabel}`
    }

    let fim: Date | null = null
    if (filtroPeriodo === 'custom' && dataFimCustom) {
      fim = new Date(dataFimCustom + 'T23:59:59')
    }

    return { inicio, fim, label }
  }, [filtroPeriodo, dataInicioCustom, dataFimCustom])

  // Carregar dados principais
  useEffect(() => {
    async function carregarProdutividade() {
      if (!isSuperAdminOrNivel1) {
        setLoading(false)
        return
      }

      setLoading(true)
      const supabase = createClient()

      try {
        // 1. Buscar todos os secretários escolares cadastrados
        const { data: funcData, error: funcError } = await (supabase as any)
          .from('funcionarios')
          .select(`
            id,
            nome,
            cpf,
            cargo,
            email,
            auth_user_id,
            foto_url,
            foto_avatar_path,
            deleted_at,
            acessos_usuarios (
              id,
              nivel,
              escola_id,
              ativo
            ),
            vinculos_funcionarios (
              id,
              cargo,
              escola_id,
              ativo,
              escolas (
                id,
                nome,
                is_teste
              )
            )
          `)
          .is('deleted_at', null)
          .order('nome', { ascending: true })

        if (funcError) throw funcError

        // Filtrar apenas funcionários que atuam como Secretários Escolares (por cargo ou por nível 3)
        const secretariosRaw = (funcData || []).filter((f: any) => {
          const cargoLower = (f.cargo || '').toLowerCase()
          const isSecretarioCargo = cargoLower.includes('secret') && !cargoLower.includes('secretário municipal') && !cargoLower.includes('secretario municipal')
          const isNivel3 = (f.acessos_usuarios || []).some((a: any) => a.nivel === 3 && a.ativo)
          return isSecretarioCargo || isNivel3
        })

        // 2. Buscar logs de auditoria do período
        let queryLogs = (supabase as any)
          .from('audit_logs')
          .select('id, user_id, user_name, user_email, user_cargo, action, entity, entity_id, created_at, tenant_id, ip_address, old_data, new_data')
          .gte('created_at', periodoDatas.inicio.toISOString())
          .order('created_at', { ascending: false })
          .limit(5000)

        if (periodoDatas.fim) {
          queryLogs = queryLogs.lte('created_at', periodoDatas.fim.toISOString())
        }

        const { data: logsData, error: logsError } = await queryLogs
        if (logsError) throw logsError

        const logs = logsData || []
        if (isMounted.current) {
          setLogsBrutos(logs)
        }

        // Mapear logs por identificador do usuário (auth_user_id, email ou nome)
        const logsPorSecretario = new Map<string, any[]>()
        logs.forEach((log: any) => {
          const keyId = log.user_id
          const keyEmail = (log.user_email || '').toLowerCase().trim()
          const keyNome = (log.user_name || '').toLowerCase().trim()

          secretariosRaw.forEach((sec: any) => {
            const matchAuth = keyId && sec.auth_user_id && keyId === sec.auth_user_id
            const matchEmail = keyEmail && sec.email && keyEmail === sec.email.toLowerCase().trim()
            const matchNome = keyNome && sec.nome && keyNome === sec.nome.toLowerCase().trim()

            if (matchAuth || matchEmail || matchNome) {
              const currentList = logsPorSecretario.get(sec.id) || []
              currentList.push(log)
              logsPorSecretario.set(sec.id, currentList)
            }
          })
        })

        // 3. Estruturar cada item de secretário com suas métricas
        const secretariosCalculados: SecretarioProdutividadeItem[] = secretariosRaw.map((sec: any) => {
          const secLogs = logsPorSecretario.get(sec.id) || []

          // Descobrir escola vinculada
          const vinculoAtivo = (sec.vinculos_funcionarios || []).find((v: any) => v.ativo && v.escolas && !v.escolas.is_teste)
          const acessoAtivo = (sec.acessos_usuarios || []).find((a: any) => a.ativo && a.escola_id)
          const escolaNome = vinculoAtivo?.escolas?.nome || (acessoAtivo?.escola_id ? (escolas.find(e => e.id === acessoAtivo.escola_id)?.nome) : 'Rede / Não Definida') || 'Rede Geral'
          const escolaId = vinculoAtivo?.escola_id || acessoAtivo?.escola_id || null

          // Contagens por tipo de ação
          let novosCadastros = 0
          let edicoesFichas = 0
          let ocorrencias = 0
          let transferencias = 0
          let ultimaAtividade: string | null = null
          let ultimoIp: string | null = null

          secLogs.forEach((log: any) => {
            if (!ultimaAtividade || new Date(log.created_at) > new Date(ultimaAtividade)) {
              ultimaAtividade = log.created_at
              ultimoIp = log.ip_address || null
            }

            const action = (log.action || '').toUpperCase()
            const entity = (log.entity || '').toLowerCase()

            if (entity.startsWith('alunos') && action === 'CREATE') {
              novosCadastros++
            } else if (entity.startsWith('alunos') && action === 'UPDATE') {
              edicoesFichas++
            } else if (entity.startsWith('ocorrencias')) {
              ocorrencias++
            } else if (entity.startsWith('transferencias')) {
              transferencias++
            }
          })

          const totalAcoes = secLogs.length

          // Calcular status de atividade
          let statusAtividade: 'ativo_hoje' | 'ativo_semana' | 'sem_atividade' = 'sem_atividade'
          if (ultimaAtividade) {
            const diffHoras = (Date.now() - new Date(ultimaAtividade).getTime()) / (1000 * 60 * 60)
            if (diffHoras <= 24) {
              statusAtividade = 'ativo_hoje'
            } else if (diffHoras <= 24 * 7) {
              statusAtividade = 'ativo_semana'
            }
          }

          return {
            id: sec.id,
            nome: sec.nome,
            cpf: sec.cpf,
            cargo: sec.cargo || 'Secretário(a) Escolar',
            foto_url: sec.foto_url,
            escola_id: escolaId,
            escola_nome: escolaNome,
            novos_cadastros: novosCadastros,
            edicoes_fichas: edicoesFichas,
            ocorrencias_lancadas: ocorrencias,
            transferencias_despachadas: transferencias,
            total_acoes: totalAcoes,
            ultima_atividade: ultimaAtividade,
            ultimo_ip: ultimoIp,
            status_atividade: statusAtividade
          }
        })

        if (isMounted.current) {
          setSecretarios(secretariosCalculados)
          setLoading(false)
        }
      } catch (err: any) {
        console.error('Erro ao carregar relatório de produtividade:', err?.message || err)
        if (isMounted.current) {
          toast.error('Erro ao carregar dados de produtividade.')
          setLoading(false)
        }
      }
    }

    carregarProdutividade()
  }, [isSuperAdminOrNivel1, periodoDatas, activeEscola, escolas])

  // Filtragem local
  const secretariosFiltrados = useMemo(() => {
    let list = secretarios

    // Filtro por escola ativa
    if (activeEscola) {
      list = list.filter(s => s.escola_id === activeEscola.id || s.escola_nome.toLowerCase().includes(activeEscola.nome.toLowerCase()))
    }

    // Filtro por busca textual
    if (busca.trim()) {
      const termo = busca.toLowerCase().trim()
      list = list.filter(s => 
        s.nome.toLowerCase().includes(termo) || 
        s.escola_nome.toLowerCase().includes(termo) ||
        (s.cpf && s.cpf.includes(termo))
      )
    }

    // Filtro por tipo de atividade predominante
    if (filtroAtividade === 'cadastros') {
      list = list.filter(s => s.novos_cadastros > 0)
    } else if (filtroAtividade === 'edicoes') {
      list = list.filter(s => s.edicoes_fichas > 0)
    } else if (filtroAtividade === 'outras') {
      list = list.filter(s => s.ocorrencias_lancadas > 0 || s.transferencias_despachadas > 0)
    }

    // Ordenação
    return [...list].sort((a, b) => {
      if (ordenacao === 'acoes') return b.total_acoes - a.total_acoes
      if (ordenacao === 'cadastros') return b.novos_cadastros - a.novos_cadastros
      if (ordenacao === 'edicoes') return b.edicoes_fichas - a.edicoes_fichas
      return a.nome.localeCompare(b.nome)
    })
  }, [secretarios, activeEscola, busca, filtroAtividade, ordenacao])

  // Resumo Executivo (KPIs)
  const resumo: ResumoProdutividadePrint = useMemo(() => {
    const total_secretarios = secretarios.length
    const total_secretarios_ativos = secretarios.filter(s => s.total_acoes > 0).length
    const total_cadastros_novos = secretarios.reduce((acc, s) => acc + s.novos_cadastros, 0)
    const total_edicoes_fichas = secretarios.reduce((acc, s) => acc + s.edicoes_fichas, 0)
    const total_ocorrencias = secretarios.reduce((acc, s) => acc + s.ocorrencias_lancadas, 0)
    const total_transferencias = secretarios.reduce((acc, s) => acc + s.transferencias_despachadas, 0)
    const total_acoes_geral = secretarios.reduce((acc, s) => acc + s.total_acoes, 0)

    // Secretário destaque
    const topSec = [...secretarios].sort((a, b) => b.total_acoes - a.total_acoes)[0]
    const secretario_destaque = topSec && topSec.total_acoes > 0 ? `${topSec.nome} (${topSec.total_acoes} ações)` : 'Nenhum registro'

    // Escola mais produtiva
    const porEscola = new Map<string, number>()
    secretarios.forEach(s => {
      const atual = porEscola.get(s.escola_nome) || 0
      porEscola.set(s.escola_nome, atual + s.total_acoes)
    })
    let topEscolaNome = 'Nenhuma'
    let topEscolaMax = 0
    porEscola.forEach((val, key) => {
      if (val > topEscolaMax) {
        topEscolaMax = val
        topEscolaNome = `${key} (${val} ações)`
      }
    })

    return {
      total_secretarios,
      total_secretarios_ativos,
      total_cadastros_novos,
      total_edicoes_fichas,
      total_ocorrencias,
      total_transferencias,
      total_acoes_geral,
      escola_mais_produtiva: topEscolaNome,
      secretario_destaque,
      periodo_label: periodoDatas.label
    }
  }, [secretarios, periodoDatas])

  // Agrupamento por Escola para visão sintética
  const escolasBreakdown: EscolaProdutividadePrint[] = useMemo(() => {
    const map = new Map<string, EscolaProdutividadePrint>()

    secretarios.forEach(s => {
      const existing = map.get(s.escola_nome) || {
        escola_nome: s.escola_nome,
        secretarios_count: 0,
        novos_cadastros: 0,
        edicoes_fichas: 0,
        outras_atividades: 0,
        total_acoes: 0
      }

      existing.secretarios_count += 1
      existing.novos_cadastros += s.novos_cadastros
      existing.edicoes_fichas += s.edicoes_fichas
      existing.outras_atividades += s.ocorrencias_lancadas + s.transferencias_despachadas
      existing.total_acoes += s.total_acoes

      map.set(s.escola_nome, existing)
    })

    return Array.from(map.values()).sort((a, b) => b.total_acoes - a.total_acoes)
  }, [secretarios])

  // Abrir Modal / Extrato Detalhado de um Secretário
  const abrirExtratoSecretario = async (sec: SecretarioProdutividadeItem) => {
    setSecretarioModal(sec)
    setLoadingModalLogs(true)
    const supabase = createClient()

    try {
      // Filtrar logs em memória ou buscar logs específicos do secretário
      const secLogs = logsBrutos.filter((l: any) => {
        const matchNome = (l.user_name || '').toLowerCase().trim() === sec.nome.toLowerCase().trim()
        return matchNome
      })

      setLogsSecretarioModal(secLogs)
    } catch (e) {
      console.error('Erro ao carregar extrato detalhado:', e)
    } finally {
      setLoadingModalLogs(false)
    }
  }

  // Exportar dados para CSV
  const handleExportCSV = () => {
    if (secretariosFiltrados.length === 0) {
      toast.error('Nenhum dado para exportar.')
      return
    }

    const cabecalho = ['Secretário(a)', 'Escola / Lotação', 'Novos Cadastros', 'Edições de Ficha', 'Ocorrências', 'Transferências', 'Total de Ações', 'Última Atividade', 'Status']
    const linhas = secretariosFiltrados.map(s => [
      `"${s.nome}"`,
      `"${s.escola_nome}"`,
      s.novos_cadastros,
      s.edicoes_fichas,
      s.ocorrencias_lancadas,
      s.transferencias_despachadas,
      s.total_acoes,
      s.ultima_atividade ? `"${new Date(s.ultima_atividade).toLocaleString('pt-BR')}"` : '"Sem registros"',
      `"${s.status_atividade === 'ativo_hoje' ? 'Ativo Hoje' : s.status_atividade === 'ativo_semana' ? 'Ativo esta semana' : 'Sem atividade'}"`
    ])

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [cabecalho.join(';'), ...linhas.map(e => e.join(';'))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `produtividade_secretarios_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Arquivo CSV baixado com sucesso!')
  }

  // Trava de segurança no render
  if (!isSuperAdminOrNivel1) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-card border border-border rounded-2xl text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Acesso Restrito ao Nível 1</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Este relatório executivo de produtividade e auditoria de secretários escolares é reservado exclusivamente à Gestão Macro (Nível 1) e Administradores do Sistema.
        </p>
      </div>
    )
  }

  // Colunas da Tabela de Produtividade
  const columns: TableColumn<SecretarioProdutividadeItem>[] = [
    {
      header: 'Secretário(a) Escolar',
      accessor: (s) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center border border-primary/20 shrink-0 overflow-hidden">
            {s.foto_url ? (
              <img src={s.foto_url} alt={s.nome} className="w-full h-full object-cover" />
            ) : (
              s.nome[0]?.toUpperCase() || 'S'
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-foreground text-xs truncate max-w-[200px]">{s.nome}</span>
            <span className="text-[11px] text-muted-foreground truncate">{s.cargo}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Unidade Escolar',
      accessor: (s) => (
        <div className="flex flex-col text-xs max-w-[220px]">
          <span className="font-medium text-foreground truncate">{s.escola_nome}</span>
          <span className="text-[10px] text-muted-foreground">Lotação Funcional</span>
        </div>
      ),
    },
    {
      header: 'Novos Cadastros',
      accessor: (s) => (
        <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-400">
          <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>{s.novos_cadastros}</span>
        </div>
      ),
    },
    {
      header: 'Edições de Ficha',
      accessor: (s) => (
        <div className="flex items-center gap-1.5 font-medium text-xs text-sky-400">
          <Edit3 className="w-3.5 h-3.5 text-sky-400" />
          <span>{s.edicoes_fichas}</span>
        </div>
      ),
    },
    {
      header: 'Total de Ações',
      accessor: (s) => (
        <div className="flex items-center gap-1.5 font-black text-xs text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-lg w-fit">
          <Activity className="w-3.5 h-3.5 text-purple-400" />
          <span>{s.total_acoes}</span>
        </div>
      ),
    },
    {
      header: 'Última Atividade',
      accessor: (s) => (
        <div className="flex flex-col text-xs text-muted-foreground">
          {s.ultima_atividade ? (
            <>
              <span className="text-foreground font-medium">{new Date(s.ultima_atividade).toLocaleDateString('pt-BR')}</span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {new Date(s.ultima_atividade).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </>
          ) : (
            <span className="text-zinc-500 italic text-[11px]">Nenhuma no período</span>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (s) => {
        if (s.status_atividade === 'ativo_hoje') {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Ativo Hoje
            </span>
          )
        }
        if (s.status_atividade === 'ativo_semana') {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
              Esta Semana
            </span>
          )
        }
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            Sem atividade
          </span>
        )
      },
    },
    {
      header: 'Ações',
      accessor: (s) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => abrirExtratoSecretario(s)}
          className="h-8 px-2.5 text-xs bg-surface-1 border-border text-foreground hover:bg-hoverCustom hover:text-primary rounded-xl gap-1.5 cursor-pointer"
        >
          <History className="w-3.5 h-3.5" />
          Extrato
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Barra Superior com Controles de Exportação & Impressão */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Gestão Macro de Pessoal
          </span>
          <h2 className="text-xl font-bold text-foreground mt-0.5 flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Produtividade dos Secretários Escolares
          </h2>
          <p className="text-xs text-muted-foreground">
            Acompanhamento em tempo real de cadastros de alunos, edições de prontuários e volume operacional por unidade.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 no-print">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="bg-card hover:bg-hoverCustom text-foreground border border-border text-xs rounded-xl px-3.5 py-2 flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            Exportar CSV
          </Button>

          <Button
            variant="outline"
            onClick={() => setPrintModalModo('sintetico')}
            className="bg-card hover:bg-hoverCustom text-foreground border border-border text-xs rounded-xl px-3.5 py-2 flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-muted-foreground" />
            Imprimir Sintético (Escolas)
          </Button>

          <Button
            onClick={() => setPrintModalModo('nominal')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs rounded-xl px-4 py-2 flex items-center gap-2 cursor-pointer shadow-md"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir Nominal (A4)
          </Button>
        </div>
      </div>

      {/* Grid de KPIs Macro no Topo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Novos Alunos Cadastrados</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <PlusCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-foreground">{resumo.total_cadastros_novos}</span>
            <span className="text-[11px] text-muted-foreground block mt-0.5">Alunos inseridos no período</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Edições & Fichas Atualizadas</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20">
              <Edit3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-foreground">{resumo.total_edicoes_fichas}</span>
            <span className="text-[11px] text-muted-foreground block mt-0.5">Dados cadastrais complementados</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Secretários em Atividade</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-300 flex items-center justify-center border border-purple-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-foreground">{resumo.total_secretarios_ativos}</span>
              <span className="text-xs text-muted-foreground font-semibold">/ {resumo.total_secretarios} secretários</span>
            </div>
            <span className="text-[11px] text-muted-foreground block mt-0.5">Com ações registradas no período</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Volume Total de Ações</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-foreground">{resumo.total_acoes_geral}</span>
            <span className="text-[11px] text-muted-foreground block mt-0.5">Operações de auditoria gravadas</span>
          </div>
        </div>
      </div>

      {/* Destaques de Produtividade */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">Secretário(a) Destaque do Período</span>
            <span className="text-sm font-bold text-foreground">{resumo.secretario_destaque}</span>
          </div>
        </div>

        <div className="bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-transparent border border-sky-500/20 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 block">Unidade Escolar com Maior Movimentação</span>
            <span className="text-sm font-bold text-foreground">{resumo.escola_mais_produtiva}</span>
          </div>
        </div>
      </div>

      {/* Painel de Filtros e Busca */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Busca Textual */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar secretário por nome, escola ou CPF..."
              className="w-full bg-surface-1 border border-border text-foreground text-xs rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Filtro por Período */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <select
              value={filtroPeriodo}
              onChange={(e: any) => setFiltroPeriodo(e.target.value)}
              className="bg-surface-1 border border-border text-foreground text-xs rounded-xl px-3 py-2.5 outline-none focus:border-primary cursor-pointer font-medium"
            >
              <option value="hoje">Hoje</option>
              <option value="7dias">Últimos 7 dias</option>
              <option value="30dias">Últimos 30 dias</option>
              <option value="mes">Mês Atual</option>
              <option value="ano">Ano Letivo 2026</option>
              <option value="custom">Personalizado</option>
            </select>

            {/* Filtro por Tipo de Ação */}
            <select
              value={filtroAtividade}
              onChange={(e: any) => setFiltroAtividade(e.target.value)}
              className="bg-surface-1 border border-border text-foreground text-xs rounded-xl px-3 py-2.5 outline-none focus:border-primary cursor-pointer font-medium"
            >
              <option value="todas">Todas as Atividades</option>
              <option value="cadastros">Com Novos Cadastros</option>
              <option value="edicoes">Com Edições de Ficha</option>
              <option value="outras">Ocorrências / Transferências</option>
            </select>

            {/* Ordenação */}
            <select
              value={ordenacao}
              onChange={(e: any) => setOrdenacao(e.target.value)}
              className="bg-surface-1 border border-border text-foreground text-xs rounded-xl px-3 py-2.5 outline-none focus:border-primary cursor-pointer font-medium"
            >
              <option value="acoes">Mais Ações (Maior p/ Menor)</option>
              <option value="cadastros">Mais Novos Cadastros</option>
              <option value="edicoes">Mais Edições</option>
              <option value="nome">Nome (A - Z)</option>
            </select>
          </div>
        </div>

        {/* Inputs de Data Customizada */}
        {filtroPeriodo === 'custom' && (
          <div className="flex items-center gap-3 pt-2 border-t border-border/50 text-xs">
            <span className="text-muted-foreground">Intervalo Personalizado:</span>
            <input
              type="date"
              value={dataInicioCustom}
              onChange={(e) => setDataInicioCustom(e.target.value)}
              className="bg-surface-1 border border-border text-foreground text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-primary"
            />
            <span className="text-muted-foreground">até</span>
            <input
              type="date"
              value={dataFimCustom}
              onChange={(e) => setDataFimCustom(e.target.value)}
              className="bg-surface-1 border border-border text-foreground text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-primary"
            />
          </div>
        )}
      </div>

      {/* Tabela de Produtividade dos Secretários */}
      <div className="space-y-3">
        <StandardTable
          data={secretariosFiltrados}
          columns={columns}
          loading={loading}
          loadingMessage="Calculando indicadores de produtividade..."
          emptyMessage="Nenhum secretário escolar encontrado para os filtros selecionados."
        />
      </div>

      {/* MODAL / EXTRATO DETALHADO DO SECRETÁRIO */}
      {secretarioModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header do Modal */}
            <div className="flex items-center justify-between p-5 border-b border-border bg-surface-1/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center border border-primary/20 shrink-0 overflow-hidden">
                  {secretarioModal.foto_url ? (
                    <img src={secretarioModal.foto_url} alt={secretarioModal.nome} className="w-full h-full object-cover" />
                  ) : (
                    secretarioModal.nome[0]?.toUpperCase() || 'S'
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">{secretarioModal.nome}</h3>
                  <p className="text-xs text-muted-foreground">
                    {secretarioModal.escola_nome} • {secretarioModal.total_acoes} ações no período
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSecretarioModal(null)}
                className="text-muted-foreground hover:text-foreground h-8 w-8 p-0 rounded-xl cursor-pointer"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Resumo de Indicadores do Secretário */}
            <div className="grid grid-cols-3 gap-3 p-5 bg-card border-b border-border text-center">
              <div className="bg-surface-1 border border-border p-2.5 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Novos Cadastros</span>
                <span className="text-lg font-black text-emerald-400">{secretarioModal.novos_cadastros}</span>
              </div>
              <div className="bg-surface-1 border border-border p-2.5 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Edições de Ficha</span>
                <span className="text-lg font-black text-sky-400">{secretarioModal.edicoes_fichas}</span>
              </div>
              <div className="bg-surface-1 border border-border p-2.5 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Outras Ações</span>
                <span className="text-lg font-black text-purple-300">
                  {secretarioModal.ocorrencias_lancadas + secretarioModal.transferencias_despachadas}
                </span>
              </div>
            </div>

            {/* Timeline / Extrato de Auditoria */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                Trilha Cronológica de Atividades
              </span>

              {loadingModalLogs ? (
                <div className="py-8 text-center text-xs text-muted-foreground animate-pulse font-medium">
                  Carregando registros de auditoria...
                </div>
              ) : logsSecretarioModal.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground italic">
                  Nenhuma atividade detalhada encontrada para este secretário no período.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {logsSecretarioModal.map((log) => {
                    const isCreate = log.action === 'CREATE'
                    const isUpdate = log.action === 'UPDATE'
                    const isDelete = log.action === 'DELETE' || log.action === 'PURGE'

                    let alunoNome = log.new_data?.nome || log.old_data?.nome || log.entity_id || 'Registro'
                    if (log.entity?.includes('responsaveis')) {
                      alunoNome = log.new_data?.responsavel_nome || log.new_data?.nome || 'Responsável'
                    }

                    return (
                      <div
                        key={log.id}
                        className="bg-surface-1 border border-border rounded-xl p-3 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={cn(
                              'w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs',
                              isCreate && 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                              isUpdate && 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
                              isDelete && 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
                              !isCreate && !isUpdate && !isDelete && 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                            )}
                          >
                            {isCreate ? '+' : isUpdate ? '✎' : isDelete ? '✕' : '•'}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground">{alunoNome}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground border border-border">
                                {log.entity}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {isCreate ? 'Cadastro efetuado' : isUpdate ? 'Prontuário atualizado' : isDelete ? 'Exclusão de item' : log.action}
                              {log.ip_address && ` • IP: ${log.ip_address}`}
                            </p>
                          </div>
                        </div>

                        <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer do Modal */}
            <div className="p-4 border-t border-border bg-surface-1/50 flex justify-end">
              <Button
                variant="outline"
                onClick={() => setSecretarioModal(null)}
                className="bg-secondary border-border text-foreground hover:bg-hoverCustom rounded-xl text-xs"
              >
                Fechar Extrato
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE IMPRESSÃO A4 */}
      {printModalModo && (
        <PrintRelatorioProdutividadeSecretarios
          modoView={printModalModo}
          escolaNome={activeEscola?.nome || null}
          periodoLabel={periodoDatas.label}
          resumo={resumo}
          escolasBreakdown={escolasBreakdown}
          secretariosLista={secretariosFiltrados}
          onClose={() => setPrintModalModo(null)}
        />
      )}
    </div>
  )
}
