'use client'

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  Calendar as CalendarIcon,
  ArrowLeft,
  UserPlus,
  Search,
  Clock,
  User,
  Heart,
  Trash2,
  ExternalLink,
  Printer,
  Sparkles,
  CalendarDays,
  List,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  Users,
  Check,
  X,
  FileText,
  CalendarRange,
  Info,
  CalendarCheck,
  CalendarX,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IconTile } from '@/components/ui/icon-tile'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { StandardTable } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useSchoolStore } from '@/store/useSchoolStore'
import { useEditModeStore } from '@/store/useEditModeStore'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { ModalAssociarAlunoAEE } from '@/components/modals/modal-associar-aluno-aee'
import { getAvatarUrl } from '@/lib/photoHelper'
import { PrintCalendarioAtendimentos } from '@/components/print/print-calendario-atendimentos'

const DIAS_SEMANA_NOMES: Record<number, string> = {
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
  7: 'Domingo',
}

const DIAS_SEMANA_CURTOS: Record<number, string> = {
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
  7: 'Dom',
}

const MESES_NOMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

// ============================================================================
// Utilitários de Data e Semanas do Ano
// ============================================================================

/** Retorna a Segunda-feira da semana de uma data de referência (às 00:00:00) */
function getSegundaFeira(dataRef: Date): Date {
  const d = new Date(dataRef.getFullYear(), dataRef.getMonth(), dataRef.getDate())
  const diaJs = d.getDay() // 0=Dom, 1=Seg, ..., 6=Sab
  const offset = diaJs === 0 ? -6 : 1 - diaJs
  d.setDate(d.getDate() + offset)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Formata data para YYYY-MM-DD */
function formatarDataIso(d: Date): string {
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

/** Formata data para DD/MM */
function formatarDataCurta(d: Date): string {
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}`
}

/** Formata data para DD/MM/YYYY */
function formatarDataCompleta(d: Date): string {
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const ano = d.getFullYear()
  return `${dia}/${mes}/${ano}`
}

/** Retorna o número da semana ISO do ano e o ano correspondente */
function getNumeroSemanaAno(data: Date): { semana: number; ano: number } {
  const target = new Date(data.valueOf())
  const dayNumber = (data.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNumber + 3)
  const firstThursday = target.valueOf()
  target.setMonth(0, 1)
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7))
  }
  const semana = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000)
  return { semana, ano: new Date(firstThursday).getFullYear() }
}

export default function CalendarioAtendimentosPage() {
  const { selectedEscola } = useSchoolStore()
  const { isEditMode } = useEditModeStore()
  const escolaEmaeeId = selectedEscola?.id
  const supabase = useMemo(() => createClient(), [])

  const [vinculos, setVinculos] = useState<any[]>([])
  const [profissionais, setProfissionais] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Controle de Navegação de Semanas do Ano
  const hoje = useMemo(() => new Date(), [])
  const [dataSemanaBase, setDataSemanaBase] = useState<Date>(() => getSegundaFeira(new Date()))

  // Mapa de Registros de Presença/Status da Semana: Key: `${vinculo_id}_${data_iso}`
  const [registrosSemana, setRegistrosSemana] = useState<Record<string, any>>({})
  const [loadingRegistros, setLoadingRegistros] = useState(false)

  // Filtros
  const [termoBusca, setTermoBusca] = useState('')
  const [filtroProfissional, setFiltroProfissional] = useState<string>('todos')
  const [filtroEspecialidade, setFiltroEspecialidade] = useState<string>('todos')
  const [filtroDiaSemana, setFiltroDiaSemana] = useState<string>('todos')
  const [filtroTurno, setFiltroTurno] = useState<string>('todos') // todos | matutino | vespertino
  const [filtroStatusPresenca, setFiltroStatusPresenca] = useState<string>('todos') // todos | realizado | nao_realizado | pendente

  // Modos de visualização: 'grade' | 'calendario' | 'tabela'
  const [modoVisualizacao, setModoVisualizacao] = useState<'grade' | 'calendario' | 'tabela'>(
    'grade',
  )

  // Controle de Calendário Mensal
  const [anoSelecionado, setAnoSelecionado] = useState(hoje.getFullYear())
  const [mesSelecionado, setMesSelecionado] = useState(hoje.getMonth()) // 0-11
  const [diaSelecionadoData, setDiaSelecionadoData] = useState<Date | null>(null)

  // Modais
  const [modalVincularOpen, setModalVincularOpen] = useState(false)
  const [profParaVincular, setProfParaVincular] = useState<any>(null)

  // Modal de Detalhes e Registro de Presença
  const [modalDetalhesOpen, setModalDetalhesOpen] = useState(false)
  const [atendimentoSelecionado, setAtendimentoSelecionado] = useState<any>(null)
  const [dataAtendimentoSelecionada, setDataAtendimentoSelecionada] = useState<Date | null>(null)

  // Estados do Formulário de Registro dentro do Modal
  const [statusForm, setStatusForm] = useState<'realizado' | 'nao_realizado' | 'pendente'>(
    'pendente',
  )
  const [alunoNaoCompareceuForm, setAlunoNaoCompareceuForm] = useState<boolean>(false)
  const [motivoRecusaForm, setMotivoRecusaForm] = useState<string>('')
  const [observacoesForm, setObservacoesForm] = useState<string>('')
  const [salvandoRegistro, setSalvandoRegistro] = useState<boolean>(false)

  // Modal de Exclusão
  const [modalExcluirOpen, setModalExcluirOpen] = useState(false)
  const [atendimentoParaExcluir, setAtendimentoParaExcluir] = useState<any>(null)
  const [excluindo, setExcluindo] = useState(false)

  // Modal de Impressão Oficial da Grade
  const [modalImprimirOpen, setModalImprimirOpen] = useState(false)

  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // --------------------------------------------------------------------------
  // Cálculo dos 5 Dias da Semana Atual (Segunda a Sexta)
  // --------------------------------------------------------------------------
  const diasDaSemanaObj = useMemo(() => {
    const segunda = getSegundaFeira(dataSemanaBase)
    const lista: {
      diaSemana: number
      data: Date
      dataIso: string
      dataCurta: string
      isHoje: boolean
    }[] = []

    for (let i = 0; i < 5; i++) {
      const d = new Date(segunda)
      d.setDate(segunda.getDate() + i)
      const dataIso = formatarDataIso(d)
      const isHoje = formatarDataIso(hoje) === dataIso
      lista.push({
        diaSemana: i + 1, // 1=Seg, 2=Ter, ..., 5=Sex
        data: d,
        dataIso,
        dataCurta: formatarDataCurta(d),
        isHoje,
      })
    }
    return lista
  }, [dataSemanaBase, hoje])

  const semanaInfo = useMemo(() => {
    const info = getNumeroSemanaAno(dataSemanaBase)
    const segunda = diasDaSemanaObj[0]?.data || dataSemanaBase
    const sexta = diasDaSemanaObj[4]?.data || dataSemanaBase
    return {
      semana: info.semana,
      ano: info.ano,
      dataInicioFormatada: formatarDataCurta(segunda),
      dataFimFormatada: formatarDataCurta(sexta),
      dataFimCompleta: formatarDataCompleta(sexta),
    }
  }, [dataSemanaBase, diasDaSemanaObj])

  // Navegação de Semanas
  const handleNavegarSemana = (direcao: 'anterior' | 'proxima') => {
    setDataSemanaBase((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() + (direcao === 'anterior' ? -7 : 7))
      return d
    })
  }

  const handleIrSemanaAtual = () => {
    setDataSemanaBase(getSegundaFeira(new Date()))
  }

  // --------------------------------------------------------------------------
  // Carregar Vínculos e Profissionais da Unidade EMAEE
  // --------------------------------------------------------------------------
  const carregarDados = useCallback(async () => {
    if (!escolaEmaeeId) {
      if (isMounted.current) setLoading(false)
      return
    }

    setLoading(true)
    try {
      // 1. Busca todos os atendimentos/especialidades ativas vinculadas no EMAEE (com fallback resiliente se data_inicio não tiver sido migrada)
      let espData: any[] | null = null
      let espError: any = null

      const res = await supabase
        .from('emaee_especialidades_vinculadas')
        .select(`
          id,
          emaee_matricula_id,
          profissional_id,
          especialidade,
          especialidade_outros,
          frequencia,
          dia_semana,
          data_inicio,
          horario_inicio,
          horario_fim,
          ativo,
          created_at,
          funcionarios:profissional_id (
            id,
            nome,
            cargo,
            foto_url,
            foto_avatar_path,
            foto_visualizacao_path,
            foto_updated_at,
            telefone
          ),
          emaee_matriculas:emaee_matricula_id (
            id,
            numero_matricula_emaee,
            status,
            turno_atendimento,
            escola_atendimento_id,
            principal_queixa,
            cid_codigo,
            alunos:aluno_id (
              id,
              nome,
              cpf,
              data_nascimento,
              nome_mae,
              telefone,
              endereco
            )
          )
        `)
        .eq('ativo', true)
        .order('dia_semana', { ascending: true })
        .order('horario_inicio', { ascending: true })

      espData = res.data
      espError = res.error

      // Se der erro de coluna inexistente (migration pendente), faz fallback para a query sem data_inicio
      if (espError && (espError.code === '42703' || espError.message?.includes('data_inicio'))) {
        console.warn('[calendario-atendimentos] Coluna data_inicio ainda não existe no banco, executando fallback compatível.')
        const fallbackRes = await supabase
          .from('emaee_especialidades_vinculadas')
          .select(`
            id,
            emaee_matricula_id,
            profissional_id,
            especialidade,
            especialidade_outros,
            frequencia,
            dia_semana,
            horario_inicio,
            horario_fim,
            ativo,
            created_at,
            funcionarios:profissional_id (
              id,
              nome,
              cargo,
              foto_url,
              foto_avatar_path,
              foto_visualizacao_path,
              foto_updated_at,
              telefone
            ),
            emaee_matriculas:emaee_matricula_id (
              id,
              numero_matricula_emaee,
              status,
              turno_atendimento,
              escola_atendimento_id,
              principal_queixa,
              cid_codigo,
              alunos:aluno_id (
                id,
                nome,
                cpf,
                data_nascimento,
                nome_mae,
                telefone,
                endereco
              )
            )
          `)
          .eq('ativo', true)
          .order('dia_semana', { ascending: true })
          .order('horario_inicio', { ascending: true })

        espData = fallbackRes.data
        espError = fallbackRes.error
      }

      if (espError) throw espError

      const filtradosUnidade = (espData || []).filter(
        (item: any) => item.emaee_matriculas?.escola_atendimento_id === escolaEmaeeId,
      )

      // 2. Busca lista de profissionais AEE da unidade
      const { data: profData, error: profError } = await supabase
        .from('funcionarios')
        .select(`
          id, nome, cargo, foto_url, foto_avatar_path, foto_visualizacao_path, foto_updated_at,
          vinculos_funcionarios!inner(escola_id, ativo)
        `)
        .eq('vinculos_funcionarios.escola_id', escolaEmaeeId)
        .eq('vinculos_funcionarios.ativo', true)
        .eq('is_profissional_aee', true)
        .is('deleted_at', null)
        .order('nome')

      if (profError) throw profError

      if (isMounted.current) {
        setVinculos(filtradosUnidade)
        const vistos = new Set<string>()
        const unicos = (profData || []).filter((f: any) => {
          if (!f?.id || vistos.has(f.id)) return false
          vistos.add(f.id)
          return true
        })
        setProfissionais(unicos)
      }
    } catch (err: any) {
      console.error('Erro ao carregar atendimentos do calendário EMAEE:', err)
      toast.error('Erro ao carregar informações de atendimento.')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [escolaEmaeeId, supabase])

  // --------------------------------------------------------------------------
  // Carregar Registros de Presença da Semana Visualizada
  // --------------------------------------------------------------------------
  const carregarRegistrosSemana = useCallback(async () => {
    if (!escolaEmaeeId || diasDaSemanaObj.length === 0) return

    setLoadingRegistros(true)
    const dataInicioIso = diasDaSemanaObj[0].dataIso
    const dataFimIso = diasDaSemanaObj[4].dataIso

    try {
      const res = await fetch(
        `/api/emaee/atendimentos/registros?escolaId=${escolaEmaeeId}&dataInicio=${dataInicioIso}&dataFim=${dataFimIso}`,
      )
      if (!res.ok) throw new Error('Falha ao buscar registros')
      const data = await res.json()

      const map: Record<string, any> = {}
      ;(data.registros || []).forEach((reg: any) => {
        const key = `${reg.vinculo_id}_${reg.data_atendimento}`
        map[key] = reg
      })

      if (isMounted.current) {
        setRegistrosSemana(map)
      }
    } catch (err) {
      console.warn('Aviso ao carregar registros de atendimento:', err)
    } finally {
      if (isMounted.current) setLoadingRegistros(false)
    }
  }, [escolaEmaeeId, diasDaSemanaObj])

  // --------------------------------------------------------------------------
  // Verificar e Notificar Pendências do Dia Anterior (Execução Automática)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!escolaEmaeeId) return
    // Dispara a verificação em background de forma silenciosa e resiliente
    fetch('/api/emaee/atendimentos/verificar-pendencias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ escolaId: escolaEmaeeId }),
    })
      .then((res) => res.json())
      .catch((e) => console.warn('Aviso verificação pendências:', e))
  }, [escolaEmaeeId])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  useEffect(() => {
    carregarRegistrosSemana()
  }, [carregarRegistrosSemana])

  // Normalização de texto para busca dinâmica
  const normalizar = (str: string) =>
    (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()

  // Formatação de horário amigável HH:MM
  const formatarHorario = (h: string | null | undefined) => {
    if (!h) return ''
    return h.slice(0, 5)
  }

  // Obter nome de exibição da especialidade / cargo
  const getEspecialidadeNome = (item: any) => {
    if (!item) return 'AEE'
    const esp = item.especialidade
    if (esp && typeof esp === 'string' && esp.trim() && esp !== 'Outro' && esp !== 'Outros') {
      return esp.trim()
    }
    if (
      item.especialidade_outros &&
      typeof item.especialidade_outros === 'string' &&
      item.especialidade_outros.trim()
    ) {
      return item.especialidade_outros.trim()
    }
    const cargo = item.funcionarios?.cargo
    if (
      cargo &&
      typeof cargo === 'string' &&
      cargo.trim() &&
      cargo !== 'Outro' &&
      cargo !== 'Outros'
    ) {
      return cargo.trim()
    }
    return esp || cargo || 'AEE'
  }

  // Lista de especialidades únicas
  const listaEspecialidades = useMemo(() => {
    const setEsp = new Set<string>()
    profissionais.forEach((p) => {
      if (
        p.cargo &&
        typeof p.cargo === 'string' &&
        p.cargo.trim() &&
        p.cargo !== 'Outro' &&
        p.cargo !== 'Outros'
      ) {
        setEsp.add(p.cargo.trim())
      }
    })
    vinculos.forEach((v) => {
      const espNome = getEspecialidadeNome(v)
      if (espNome && espNome !== 'AEE' && espNome !== 'Outro' && espNome !== 'Outros') {
        setEsp.add(espNome)
      }
    })
    return Array.from(setEsp).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
  }, [profissionais, vinculos])

  // Filtragem dos atendimentos
  const atendimentosFiltrados = useMemo(() => {
    return vinculos.filter((v) => {
      const aluno = v.emaee_matriculas?.alunos
      const prof = v.funcionarios
      const termo = normalizar(termoBusca)

      if (termo) {
        const nomeAluno = normalizar(aluno?.nome || '')
        const nomeMae = normalizar(aluno?.nome_mae || '')
        const nomeProf = normalizar(prof?.nome || '')
        const numMatr = normalizar(v.emaee_matriculas?.numero_matricula_emaee || '')
        const matchesTermo =
          nomeAluno.includes(termo) ||
          nomeMae.includes(termo) ||
          nomeProf.includes(termo) ||
          numMatr.includes(termo)
        if (!matchesTermo) return false
      }

      if (filtroProfissional !== 'todos' && v.profissional_id !== filtroProfissional) {
        return false
      }

      if (filtroEspecialidade !== 'todos') {
        const filtroNorm = normalizar(filtroEspecialidade)
        const espResolvidaNorm = normalizar(getEspecialidadeNome(v))
        const espNorm = normalizar(v.especialidade || '')
        const profCargoNorm = normalizar(prof?.cargo || '')
        if (
          espResolvidaNorm !== filtroNorm &&
          espNorm !== filtroNorm &&
          profCargoNorm !== filtroNorm
        ) {
          return false
        }
      }

      if (filtroDiaSemana !== 'todos' && String(v.dia_semana) !== filtroDiaSemana) {
        return false
      }

      if (filtroTurno !== 'todos') {
        const hInicio = v.horario_inicio || ''
        const isMatutino = hInicio < '12:00:00'
        if (filtroTurno === 'matutino' && !isMatutino) return false
        if (filtroTurno === 'vespertino' && isMatutino) return false
      }

      return true
    })
  }, [vinculos, termoBusca, filtroProfissional, filtroEspecialidade, filtroDiaSemana, filtroTurno])

  // --------------------------------------------------------------------------
  // Lógica de Alternância Quinzenal (Ciclo de 15 dias baseado na data inicial)
  // --------------------------------------------------------------------------
  const isAtendimentoNaSemana = useCallback((item: any, dataSessao: Date): boolean => {
    if (item.frequencia !== 'QUINZENAL') return true
    const dataInicioStr = item.data_inicio || item.created_at
    if (!dataInicioStr) return true

    const dInicioStr = dataInicioStr.includes('T') ? dataInicioStr.split('T')[0] : dataInicioStr
    const [anoI, mesI, diaI] = dInicioStr.split('-').map(Number)
    if (!anoI || !mesI || !diaI) return true
    const dInicio = new Date(anoI, mesI - 1, diaI)

    const segInicio = getSegundaFeira(dInicio)
    const segSessao = getSegundaFeira(dataSessao)

    const diffMs = segSessao.getTime() - segInicio.getTime()
    const diffSemanas = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000))

    // Se a semana visualizada for anterior à data de início, não ocorre
    if (diffSemanas < 0) return false

    // Ocorre nas semanas 0, 2, 4, 6... (a cada 15 dias a partir da data inicial)
    return diffSemanas % 2 === 0
  }, [])

  // Estatísticas e KPIs
  const kpis = useMemo(() => {
    const totalSessoes = vinculos.length
    const profsSet = new Set(vinculos.map((v) => v.profissional_id))
    const alunosSet = new Set(vinculos.map((v) => v.emaee_matricula_id))

    const diaJs = hoje.getDay()
    const diaAeeHoje = diaJs === 0 ? 7 : diaJs
    const atendimentosHoje = vinculos.filter((v) => {
      if (v.dia_semana !== diaAeeHoje) return false
      return isAtendimentoNaSemana(v, hoje)
    }).length

    // Contagem de realizados e não realizados na semana atual
    let totalRealizadosSemana = 0
    let totalNaoRealizadosSemana = 0
    Object.values(registrosSemana).forEach((reg: any) => {
      if (reg.status === 'realizado') totalRealizadosSemana++
      if (reg.status === 'nao_realizado') totalNaoRealizadosSemana++
    })

    return {
      totalSessoes,
      totalProfissionais: profsSet.size,
      totalAlunos: alunosSet.size,
      atendimentosHoje,
      diaAeeHoje,
      totalRealizadosSemana,
      totalNaoRealizadosSemana,
    }
  }, [vinculos, hoje, registrosSemana, isAtendimentoNaSemana])

  // Cores por Especialidade
  const getColorByCargo = (cargo: string | null) => {
    const c = (cargo || '').toLowerCase()
    if (c.includes('neuro')) {
      return {
        badge: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25',
        card: 'border-purple-500/25 bg-purple-500/[0.03] dark:bg-purple-500/10 hover:border-purple-500/50',
        bar: 'bg-purple-500',
      }
    }
    if (c.includes('psicólogo') || c.includes('psicologa')) {
      return {
        badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25',
        card: 'border-blue-500/25 bg-blue-500/[0.03] dark:bg-blue-500/10 hover:border-blue-500/50',
        bar: 'bg-blue-500',
      }
    }
    if (c.includes('fono')) {
      return {
        badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
        card: 'border-emerald-500/25 bg-emerald-500/[0.03] dark:bg-emerald-500/10 hover:border-emerald-500/50',
        bar: 'bg-emerald-500',
      }
    }
    if (c.includes('psicopedagogo') || c.includes('psicopedagoga')) {
      return {
        badge: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/25',
        card: 'border-orange-500/25 bg-orange-500/[0.03] dark:bg-orange-500/10 hover:border-orange-500/50',
        bar: 'bg-orange-500',
      }
    }
    if (c.includes('fisio')) {
      return {
        badge: 'bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/25',
        card: 'border-pink-500/25 bg-pink-500/[0.03] dark:bg-pink-500/10 hover:border-pink-500/50',
        bar: 'bg-pink-500',
      }
    }
    return {
      badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
      card: 'border-border bg-card hover:border-border/80',
      bar: 'bg-amber-500',
    }
  }

  // Agrupamento por dia da semana para a Grade Semanal (respeitando quinzenas)
  const gradePorDia = useMemo(() => {
    const dias = [1, 2, 3, 4, 5]
    const agrupado: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] }

    atendimentosFiltrados.forEach((item) => {
      const diaObj = diasDaSemanaObj.find((d) => d.diaSemana === item.dia_semana)
      if (diaObj && agrupado[item.dia_semana]) {
        if (isAtendimentoNaSemana(item, diaObj.data)) {
          agrupado[item.dia_semana].push(item)
        }
      }
    })

    dias.forEach((d) => {
      agrupado[d].sort((a, b) => (a.horario_inicio || '').localeCompare(b.horario_inicio || ''))
    })

    return agrupado
  }, [atendimentosFiltrados, diasDaSemanaObj, isAtendimentoNaSemana])

  // --------------------------------------------------------------------------
  // Abertura do Modal com Registro da Sessão Específica
  // --------------------------------------------------------------------------
  const handleVerDetalhes = (item: any, dataSessao?: Date) => {
    // Determinar a data exata da sessão
    let dataReferencia: Date
    if (dataSessao) {
      dataReferencia = dataSessao
    } else {
      // Se não passada, calcula com base no dia_semana do atendimento na semana visualizada
      const diaObj = diasDaSemanaObj.find((d) => d.diaSemana === item.dia_semana)
      dataReferencia = diaObj?.data || new Date()
    }

    const dataIso = formatarDataIso(dataReferencia)
    const key = `${item.id}_${dataIso}`
    const regExistente = registrosSemana[key]

    setAtendimentoSelecionado(item)
    setDataAtendimentoSelecionada(dataReferencia)

    if (regExistente) {
      setStatusForm(regExistente.status || 'pendente')
      setAlunoNaoCompareceuForm(Boolean(regExistente.aluno_nao_compareceu))
      setMotivoRecusaForm(regExistente.motivo_recusa_falta || '')
      setObservacoesForm(regExistente.observacoes || '')
    } else {
      setStatusForm('pendente')
      setAlunoNaoCompareceuForm(false)
      setMotivoRecusaForm('')
      setObservacoesForm('')
    }

    setModalDetalhesOpen(true)
  }

  // Salvar Registro de Presença / Atendimento
  const handleSalvarRegistro = async () => {
    if (!atendimentoSelecionado?.id || !dataAtendimentoSelecionada) return

    // Validação de obrigatoriedade caso seja marcado como Não Realizado
    if (statusForm === 'nao_realizado') {
      const temMotivo = alunoNaoCompareceuForm || motivoRecusaForm.trim().length > 0
      if (!temMotivo) {
        toast.error(
          'Informe obrigatoriamente se o aluno faltou ou descreva outras razões para a não realização.',
        )
        return
      }
    }

    setSalvandoRegistro(true)
    const dataIso = formatarDataIso(dataAtendimentoSelecionada)

    try {
      const res = await fetch('/api/emaee/atendimentos/registros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vinculo_id: atendimentoSelecionado.id,
          escola_id: escolaEmaeeId,
          data_atendimento: dataIso,
          status: statusForm,
          aluno_nao_compareceu: alunoNaoCompareceuForm,
          motivo_recusa_falta: motivoRecusaForm,
          observacoes: observacoesForm,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar registro de atendimento')
      }

      const key = `${atendimentoSelecionado.id}_${dataIso}`
      setRegistrosSemana((prev) => ({
        ...prev,
        [key]: data.registro,
      }))

      toast.success(
        statusForm === 'realizado'
          ? 'Atendimento registrado como REALIZADO!'
          : statusForm === 'nao_realizado'
            ? 'Atendimento registrado como NÃO REALIZADO com sucesso!'
            : 'Status de atendimento atualizado.',
      )
      setModalDetalhesOpen(false)
    } catch (err: any) {
      console.error('Erro ao salvar registro:', err)
      toast.error(err?.message || 'Erro ao salvar registro de atendimento.')
    } finally {
      setSalvandoRegistro(false)
    }
  }

  // Modal de exclusão
  const handleConfirmarExcluir = (e: React.MouseEvent, item: any) => {
    e.stopPropagation()
    setAtendimentoParaExcluir(item)
    setModalExcluirOpen(true)
  }

  const handleExecutarExclusao = async () => {
    if (!atendimentoParaExcluir?.id) return
    setExcluindo(true)
    try {
      const { error } = await supabase
        .from('emaee_especialidades_vinculadas')
        .delete()
        .eq('id', atendimentoParaExcluir.id)

      if (error) throw error

      toast.success('Atendimento desvinculado com sucesso.')
      setVinculos((prev) => prev.filter((v) => v.id !== atendimentoParaExcluir.id))
      setModalExcluirOpen(false)
      setAtendimentoParaExcluir(null)
    } catch (err: any) {
      console.error('Erro ao excluir vínculo de atendimento:', err)
      toast.error('Erro ao desvincular atendimento.')
    } finally {
      setExcluindo(false)
    }
  }

  // Cálculos do Calendário Mensal
  const diasDoMes = useMemo(() => {
    const primeiroDia = new Date(anoSelecionado, mesSelecionado, 1)
    const ultimoDia = new Date(anoSelecionado, mesSelecionado + 1, 0)
    const totalDias = ultimoDia.getDate()
    const offsetInicio = primeiroDia.getDay()

    const dias = []
    for (let i = 0; i < offsetInicio; i++) {
      dias.push(null)
    }
    for (let d = 1; d <= totalDias; d++) {
      const dataObj = new Date(anoSelecionado, mesSelecionado, d)
      const diaJs = dataObj.getDay()
      const diaAee = diaJs === 0 ? 7 : diaJs

      const sessoesNesteDia = atendimentosFiltrados.filter(
        (v) => v.dia_semana === diaAee && isAtendimentoNaSemana(v, dataObj),
      )

      dias.push({
        numero: d,
        data: dataObj,
        diaAee,
        dataIso: formatarDataIso(dataObj),
        isHoje:
          dataObj.getDate() === hoje.getDate() &&
          dataObj.getMonth() === hoje.getMonth() &&
          dataObj.getFullYear() === hoje.getFullYear(),
        isFimDeSemana: diaJs === 0 || diaJs === 6,
        sessoes: sessoesNesteDia,
      })
    }
    return dias
  }, [anoSelecionado, mesSelecionado, atendimentosFiltrados, hoje, isAtendimentoNaSemana])

  const handleNavegarMes = (direcao: 'anterior' | 'proximo') => {
    if (direcao === 'anterior') {
      if (mesSelecionado === 0) {
        setMesSelecionado(11)
        setAnoSelecionado((a) => a - 1)
      } else {
        setMesSelecionado((m) => m - 1)
      }
    } else {
      if (mesSelecionado === 11) {
        setMesSelecionado(0)
        setAnoSelecionado((a) => a + 1)
      } else {
        setMesSelecionado((m) => m + 1)
      }
    }
  }

  return (
    <div className="space-y-6 pb-16">
      {/* ==================================================================== */}
      {/* Modal de Detalhes & Registro de Atendimento                          */}
      {/* ==================================================================== */}
      {modalDetalhesOpen && atendimentoSelecionado && dataAtendimentoSelecionada && (
        <StandardDialog
          open={modalDetalhesOpen}
          onOpenChange={setModalDetalhesOpen}
          title="Detalhes do Atendimento & Registro de Presença"
          maxWidth="sm:max-w-[620px]"
          footer={
            <div className="flex items-center justify-between w-full flex-wrap gap-2">
              <Link
                href={`/emaee/pacientes/${atendimentoSelecionado.emaee_matricula_id}`}
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir Prontuário do Paciente</span>
              </Link>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModalDetalhesOpen(false)}
                  disabled={salvandoRegistro}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleSalvarRegistro}
                  disabled={salvandoRegistro}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl px-4 shadow-sm cursor-pointer"
                >
                  {salvandoRegistro ? 'Salvando Registro...' : 'Salvar Registro do Atendimento'}
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 py-1 text-xs max-h-[75vh] overflow-y-auto pr-1">
            {/* Tag da Data da Sessão Selecionada */}
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-bold">
                <CalendarRange className="w-4 h-4 shrink-0" />
                <span>
                  Sessão de {DIAS_SEMANA_NOMES[atendimentoSelecionado.dia_semana]},{' '}
                  {formatarDataCompleta(dataAtendimentoSelecionada)}
                </span>
              </div>
              <span className="text-[10px] font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/20">
                Semana {semanaInfo.semana}
              </span>
            </div>

            {/* Bloco Estudante */}
            <div className="p-3.5 bg-secondary/30 border border-border rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Informações do Estudante
                </span>
                {atendimentoSelecionado.emaee_matriculas?.numero_matricula_emaee && (
                  <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full border border-primary/20">
                    Matrícula: {atendimentoSelecionado.emaee_matriculas.numero_matricula_emaee}
                  </span>
                )}
              </div>
              <div className="text-sm font-bold text-foreground">
                {atendimentoSelecionado.emaee_matriculas?.alunos?.nome ?? 'Sem Nome'}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground">
                <div>
                  <strong className="text-foreground/80">Mãe:</strong>{' '}
                  {atendimentoSelecionado.emaee_matriculas?.alunos?.nome_mae ?? 'Não informada'}
                </div>
                <div>
                  <strong className="text-foreground/80">Telefone:</strong>{' '}
                  {atendimentoSelecionado.emaee_matriculas?.alunos?.telefone ?? 'Não informado'}
                </div>
                <div>
                  <strong className="text-foreground/80">Turno AEE:</strong>{' '}
                  {atendimentoSelecionado.emaee_matriculas?.turno_atendimento ?? 'Matutino'}
                </div>
                <div>
                  <strong className="text-foreground/80">CID / Queixa:</strong>{' '}
                  {atendimentoSelecionado.emaee_matriculas?.cid_codigo ??
                    atendimentoSelecionado.emaee_matriculas?.principal_queixa ??
                    'Não informado'}
                </div>
              </div>
            </div>

            {/* Bloco Profissional & Horário */}
            <div className="p-3.5 bg-secondary/30 border border-border rounded-xl space-y-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Agendamento & Profissional AEE
              </span>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-muted border border-border overflow-hidden shrink-0 flex items-center justify-center">
                  {getAvatarUrl(atendimentoSelecionado.funcionarios) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getAvatarUrl(atendimentoSelecionado.funcionarios)!}
                      alt={atendimentoSelecionado.funcionarios?.nome || ''}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-foreground truncate">
                    {atendimentoSelecionado.funcionarios?.nome ?? 'Profissional não identificado'}
                  </div>
                  <div className="text-amber-500 font-semibold text-[11px]">
                    {getEspecialidadeNome(atendimentoSelecionado)}
                  </div>
                </div>
                <div className="text-right shrink-0 text-muted-foreground">
                  <div className="text-[11px] font-bold text-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span>
                      {formatarHorario(atendimentoSelecionado.horario_inicio)}
                      {atendimentoSelecionado.horario_fim
                        ? ` às ${formatarHorario(atendimentoSelecionado.horario_fim)}`
                        : ''}
                    </span>
                  </div>
                  <span className="text-[10px] capitalize">
                    {atendimentoSelecionado.frequencia?.toLowerCase() ?? 'Semanal'}
                  </span>
                </div>
              </div>
            </div>

            {/* ================================================================ */}
            {/* SEÇÃO PRINCIPAL: REGISTRO SE HOUVE OU NÃO ATENDIMENTO            */}
            {/* ================================================================ */}
            <div className="p-4 bg-card border-2 border-primary/30 rounded-2xl space-y-4 shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs font-black text-foreground flex items-center gap-1.5">
                    <CalendarCheck className="w-4 h-4 text-primary" />
                    <span>Registro do Atendimento desta Data</span>
                  </Label>
                  <span className="text-[10px] text-muted-foreground">
                    Obrigatório registrar realização
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Marque se a sessão clínica foi efetivamente realizada ou registre o motivo da não
                  realização.
                </p>
              </div>

              {/* Botões Seletores de Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Opção 1: Realizado */}
                <button
                  type="button"
                  onClick={() => {
                    setStatusForm('realizado')
                    setAlunoNaoCompareceuForm(false)
                  }}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer ${
                    statusForm === 'realizado'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-300 ring-2 ring-emerald-500/30 font-bold shadow-xs'
                      : 'bg-background border-border text-muted-foreground hover:border-emerald-500/40 hover:text-foreground'
                  }`}
                >
                  <CheckCircle2
                    className={`w-5 h-5 ${statusForm === 'realizado' ? 'text-emerald-500' : 'text-muted-foreground'}`}
                  />
                  <span className="text-xs">Atendimento Realizado</span>
                  <span className="text-[9px] opacity-75 font-normal">Aluno presente</span>
                </button>

                {/* Opção 2: Não Realizado */}
                <button
                  type="button"
                  onClick={() => {
                    setStatusForm('nao_realizado')
                  }}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer ${
                    statusForm === 'nao_realizado'
                      ? 'bg-rose-500/15 border-rose-500 text-rose-600 dark:text-rose-300 ring-2 ring-rose-500/30 font-bold shadow-xs'
                      : 'bg-background border-border text-muted-foreground hover:border-rose-500/40 hover:text-foreground'
                  }`}
                >
                  <XCircle
                    className={`w-5 h-5 ${statusForm === 'nao_realizado' ? 'text-rose-500' : 'text-muted-foreground'}`}
                  />
                  <span className="text-xs">Não Realizado</span>
                  <span className="text-[9px] opacity-75 font-normal">Falta / Não ocorreu</span>
                </button>

                {/* Opção 3: Pendente */}
                <button
                  type="button"
                  onClick={() => {
                    setStatusForm('pendente')
                    setAlunoNaoCompareceuForm(false)
                    setMotivoRecusaForm('')
                  }}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer ${
                    statusForm === 'pendente'
                      ? 'bg-secondary border-primary/50 text-foreground ring-2 ring-primary/20 font-bold shadow-xs'
                      : 'bg-background border-border text-muted-foreground hover:border-border/80 hover:text-foreground'
                  }`}
                >
                  <Clock
                    className={`w-5 h-5 ${statusForm === 'pendente' ? 'text-primary' : 'text-muted-foreground'}`}
                  />
                  <span className="text-xs">Pendente</span>
                  <span className="text-[9px] opacity-75 font-normal">Aguardando registro</span>
                </button>
              </div>

              {/* CAMPOS CONDICIONAIS SE NÃO REALIZADO */}
              {statusForm === 'nao_realizado' && (
                <div className="p-3.5 bg-rose-500/5 border border-rose-500/25 rounded-xl space-y-3 animate-in fade-in-50">
                  <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Registro Obrigatório do Motivo da Não Realização</span>
                  </div>

                  {/* Checkbox Aluno Não Compareceu */}
                  <label className="flex items-start gap-2.5 p-2.5 bg-background border border-border rounded-xl cursor-pointer hover:bg-secondary/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={alunoNaoCompareceuForm}
                      onChange={(e) => setAlunoNaoCompareceuForm(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-foreground block">
                        O aluno não compareceu ao atendimento (Falta)
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Marque se a sessão não ocorreu devido à ausência injustificada ou falta do
                        estudante.
                      </span>
                    </div>
                  </label>

                  {/* Outras razões / Justificativa detalhada */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                      <span>Outras razões ou justificativa adicional:</span>
                      <span className="text-[10px] text-muted-foreground">
                        {alunoNaoCompareceuForm
                          ? '(Opcional)'
                          : '(Obrigatório se não marcar falta)'}
                      </span>
                    </Label>
                    <textarea
                      rows={3}
                      value={motivoRecusaForm}
                      onChange={(e) => setMotivoRecusaForm(e.target.value)}
                      placeholder="Descreva o motivo (ex: atestado médico apresentado, profissional em capacitação, feriado local, solicitação do responsável)..."
                      className="w-full bg-background border border-border text-foreground rounded-xl p-2.5 text-xs outline-none focus:border-rose-500 transition-colors placeholder:text-muted-foreground/60 resize-none"
                    />
                  </div>
                </div>
              )}

              {/* CAMPOS SE REALIZADO */}
              {statusForm === 'realizado' && (
                <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/25 rounded-xl space-y-2 animate-in fade-in-50">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Presença e Atendimento Confirmados</span>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      Observações rápidas da sessão (opcional):
                    </Label>
                    <textarea
                      rows={2}
                      value={observacoesForm}
                      onChange={(e) => setObservacoesForm(e.target.value)}
                      placeholder="Anotações preliminares sobre a sessão clínica..."
                      className="w-full bg-background border border-border text-foreground rounded-xl p-2 text-xs outline-none focus:border-emerald-500 transition-colors placeholder:text-muted-foreground/60 resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </StandardDialog>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {modalExcluirOpen && atendimentoParaExcluir && (
        <StandardDialog
          open={modalExcluirOpen}
          onOpenChange={setModalExcluirOpen}
          title="Desvincular Atendimento"
          maxWidth="sm:max-w-[460px]"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalExcluirOpen(false)}
                disabled={excluindo}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleExecutarExclusao}
                disabled={excluindo}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold px-4 text-xs rounded-xl"
              >
                {excluindo ? 'Desvinculando...' : 'Confirmar Desvinculação'}
              </Button>
            </div>
          }
        >
          <div className="space-y-3 py-2 text-xs">
            <p className="text-muted-foreground">
              Tem certeza que deseja remover o agendamento de atendimento de{' '}
              <strong className="text-foreground">
                {atendimentoParaExcluir.emaee_matriculas?.alunos?.nome ?? 'Aluno'}
              </strong>{' '}
              com o profissional{' '}
              <strong className="text-foreground">
                {atendimentoParaExcluir.funcionarios?.nome ?? 'Profissional'}
              </strong>
              ?
            </p>
            <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-[11px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                Esta ação removerá o horário do calendário de atendimentos deste ano letivo.
              </span>
            </div>
          </div>
        </StandardDialog>
      )}

      {/* Modal de Associação Direta */}
      {modalVincularOpen && (
        <ModalAssociarAlunoAEE
          open={modalVincularOpen}
          onOpenChange={setModalVincularOpen}
          profissionais={profissionais}
          profissionalId={
            profParaVincular?.id ||
            (filtroProfissional !== 'todos' ? filtroProfissional : (profissionais[0]?.id ?? ''))
          }
          profissionalNome={
            profParaVincular?.nome ||
            (filtroProfissional !== 'todos'
              ? profissionais.find((p) => p.id === filtroProfissional)?.nome
              : (profissionais[0]?.nome ?? 'Profissional AEE'))
          }
          profissionalCargo={
            profParaVincular?.cargo ||
            (filtroProfissional !== 'todos'
              ? profissionais.find((p) => p.id === filtroProfissional)?.cargo
              : (profissionais[0]?.cargo ?? 'Especialista'))
          }
          escolaEmaeeId={escolaEmaeeId || ''}
          onSuccess={carregarDados}
        />
      )}

      {/* Modal Oficial de Impressão da Grade */}
      {modalImprimirOpen && (
        <PrintCalendarioAtendimentos
          vinculos={atendimentosFiltrados}
          escolaNome={selectedEscola?.nome}
          escolaLogoUrl={selectedEscola?.logo_url}
          filtroProfissionalNome={
            filtroProfissional !== 'todos'
              ? profissionais.find((p) => p.id === filtroProfissional)?.nome
              : undefined
          }
          filtroEspecialidade={filtroEspecialidade !== 'todos' ? filtroEspecialidade : undefined}
          filtroTurno={
            filtroTurno !== 'todos'
              ? filtroTurno === 'matutino'
                ? 'Matutino'
                : 'Vespertino'
              : undefined
          }
          filtroDiaSemanaNome={
            filtroDiaSemana !== 'todos' ? DIAS_SEMANA_NOMES[Number(filtroDiaSemana)] : undefined
          }
          totalSessoes={kpis.totalSessoes}
          totalProfissionais={kpis.totalProfissionais}
          totalAlunos={kpis.totalAlunos}
          onClose={() => setModalImprimirOpen(false)}
        />
      )}

      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link href="/home">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <IconTile icon={CalendarIcon} variant="primary" className="h-10 w-10 shrink-0" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Calendário de Atendimentos</h1>
            <p className="text-xs text-muted-foreground">
              Escala semanal e anual de atendimentos multidisciplinares com registro de presença
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setModalImprimirOpen(true)}
            className="text-xs rounded-xl border-border bg-card hover:bg-accent text-foreground gap-1.5 shadow-sm cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Grade</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => {
              const profInicial =
                (filtroProfissional !== 'todos' &&
                  profissionais.find((p) => p.id === filtroProfissional)) ||
                profissionais[0] ||
                null
              setProfParaVincular(profInicial)
              setModalVincularOpen(true)
            }}
            disabled={profissionais.length === 0}
            className="text-xs rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1.5 shadow-sm cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Vincular Atendimento</span>
          </Button>
        </div>
      </div>

      {/* Cards de KPIs e Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 bg-card border border-border rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-muted-foreground block">
              Atendimentos Semanais
            </span>
            <span className="text-2xl font-black text-foreground">{kpis.totalSessoes}</span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              Sessões programadas
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <CalendarDays className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-card border border-border rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-muted-foreground block">
              Realizados nesta Semana
            </span>
            <span className="text-2xl font-black text-emerald-500">
              {kpis.totalRealizadosSemana}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              Presenças confirmadas
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-card border border-border rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-muted-foreground block">
              Não Realizados / Faltas
            </span>
            <span className="text-2xl font-black text-rose-500">
              {kpis.totalNaoRealizadosSemana}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              Com justificativa
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-card border border-border rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-muted-foreground block">
              Atendimentos Hoje
            </span>
            <span className="text-2xl font-black text-sky-400">{kpis.atendimentosHoje}</span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              {DIAS_SEMANA_NOMES[kpis.diaAeeHoje] ?? 'Hoje'}
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* BARRA DE NAVEGAÇÃO DE SEMANAS DO ANO (Destaque Superior)             */}
      {/* ==================================================================== */}
      <div className="p-4 bg-card border border-border rounded-2xl shadow-sm space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-background border border-border rounded-xl p-0.5 shadow-2xs">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleNavegarSemana('anterior')}
                className="h-8 w-8 rounded-lg hover:bg-secondary text-foreground"
                title="Semana Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleNavegarSemana('proxima')}
                className="h-8 w-8 rounded-lg hover:bg-secondary text-foreground"
                title="Próxima Semana"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-foreground">
                Semana {semanaInfo.semana} de {semanaInfo.ano}
              </span>
              <span className="text-xs text-muted-foreground font-semibold px-2.5 py-0.5 rounded-full bg-secondary border border-border">
                {semanaInfo.dataInicioFormatada} a {semanaInfo.dataFimFormatada}
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleIrSemanaAtual}
              className="text-xs h-8 rounded-xl border-border bg-background hover:bg-secondary text-foreground font-medium"
            >
              Semana Atual
            </Button>
          </div>

          {/* Alternador de Modo de Visualização */}
          <div className="flex items-center gap-1 bg-background p-1 border border-border rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setModoVisualizacao('grade')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                modoVisualizacao === 'grade'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grade Semanal</span>
            </button>

            <button
              type="button"
              onClick={() => setModoVisualizacao('calendario')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                modoVisualizacao === 'calendario'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Calendário Anual</span>
            </button>

            <button
              type="button"
              onClick={() => setModoVisualizacao('tabela')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                modoVisualizacao === 'tabela'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Tabela Geral</span>
            </button>
          </div>
        </div>

        {/* Barra de Busca e Filtros Rápidos */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome do aluno, nome da mãe ou profissional..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="w-full bg-background border border-border text-foreground rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/60"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
              <span className="inline-block w-3 h-1 bg-emerald-500 rounded-full" /> Realizado
              <span className="inline-block w-3 h-1 bg-rose-500 rounded-full ml-2" /> Não Realizado
              <span className="inline-block w-3 h-1 bg-muted-foreground/40 rounded-full ml-2" />{' '}
              Pendente
            </div>
          </div>
        </div>

        {/* Dropdowns de Filtro */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-border/50">
          <div>
            <Label className="text-[11px] text-muted-foreground block mb-1">Profissional AEE</Label>
            <Select
              value={filtroProfissional}
              onValueChange={(val) => setFiltroProfissional(val || 'todos')}
            >
              <SelectTrigger className="h-8 bg-background border-border text-foreground text-xs">
                <SelectValue placeholder="Todos os Profissionais" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground max-h-56">
                <SelectItem value="todos">Todos os Profissionais</SelectItem>
                {profissionais.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[11px] text-muted-foreground block mb-1">
              Especialidade / Cargo
            </Label>
            <Select
              value={filtroEspecialidade}
              onValueChange={(val) => setFiltroEspecialidade(val || 'todos')}
            >
              <SelectTrigger className="h-8 bg-background border-border text-foreground text-xs">
                <SelectValue placeholder="Todas as Especialidades" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground max-h-56">
                <SelectItem value="todos">Todas as Especialidades</SelectItem>
                {listaEspecialidades.map((esp) => (
                  <SelectItem key={esp} value={esp}>
                    {esp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[11px] text-muted-foreground block mb-1">Dia da Semana</Label>
            <Select
              value={filtroDiaSemana}
              onValueChange={(val) => setFiltroDiaSemana(val || 'todos')}
            >
              <SelectTrigger className="h-8 bg-background border-border text-foreground text-xs">
                <SelectValue placeholder="Todos os Dias" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground">
                <SelectItem value="todos">Todos os Dias</SelectItem>
                <SelectItem value="1">Segunda-feira</SelectItem>
                <SelectItem value="2">Terça-feira</SelectItem>
                <SelectItem value="3">Quarta-feira</SelectItem>
                <SelectItem value="4">Quinta-feira</SelectItem>
                <SelectItem value="5">Sexta-feira</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[11px] text-muted-foreground block mb-1">
              Turno do Atendimento
            </Label>
            <Select value={filtroTurno} onValueChange={(val) => setFiltroTurno(val || 'todos')}>
              <SelectTrigger className="h-8 bg-background border-border text-foreground text-xs">
                <SelectValue placeholder="Todos os Turnos" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground">
                <SelectItem value="todos">Todos os Turnos</SelectItem>
                <SelectItem value="matutino">Matutino (Manhã)</SelectItem>
                <SelectItem value="vespertino">Vespertino (Tarde)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* CONTEÚDO PRINCIPAL                                                   */}
      {/* ==================================================================== */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
          Carregando calendário de atendimentos...
        </div>
      ) : vinculos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-card border border-border rounded-2xl shadow-sm">
          <CalendarIcon className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-lg font-bold text-foreground mb-1">Nenhum Atendimento Cadastrado</h2>
          <p className="text-muted-foreground max-w-md text-xs mb-4">
            Ainda não há alunos vinculados a profissionais AEE nesta unidade do EMAEE.
          </p>
          <Button
            size="sm"
            onClick={() => {
              const profInicial =
                (filtroProfissional !== 'todos' &&
                  profissionais.find((p) => p.id === filtroProfissional)) ||
                profissionais[0] ||
                null
              setProfParaVincular(profInicial)
              setModalVincularOpen(true)
            }}
            disabled={profissionais.length === 0}
            className="text-xs rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
            Criar Primeiro Vínculo
          </Button>
        </div>
      ) : (
        <>
          {/* MODO 1: GRADE SEMANAL COM DATAS REAIS E BORDAS COLORIDAS */}
          {modoVisualizacao === 'grade' && (
            <div className="overflow-x-auto pb-4 -mx-1 px-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5 items-start min-w-[960px] xl:min-w-0">
                {diasDaSemanaObj.map((diaObj) => {
                  const diaNum = diaObj.diaSemana
                  const sessoes = gradePorDia[diaNum] || []
                  const isHojeDia = diaObj.isHoje

                  return (
                    <div
                      key={diaNum}
                      className={`bg-card border rounded-2xl p-3 space-y-3 shadow-sm transition-all ${
                        isHojeDia
                          ? 'border-sky-500/50 ring-1 ring-sky-500/20 bg-sky-500/5'
                          : 'border-border'
                      }`}
                    >
                      {/* Cabeçalho do Dia com Data Real */}
                      <div className="flex items-center justify-between pb-2.5 border-b border-border">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-foreground text-xs">
                              {DIAS_SEMANA_NOMES[diaNum]}
                            </span>
                            {isHojeDia && (
                              <span className="text-[9px] bg-sky-500 text-white font-bold px-1.5 py-0.2 rounded-full">
                                Hoje
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-semibold text-primary block mt-0.5">
                            {diaObj.dataCurta}
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 rounded-full bg-secondary/50 border border-border/60">
                          {sessoes.length} {sessoes.length === 1 ? 'sessão' : 'sessões'}
                        </span>
                      </div>

                      {/* Cards de Atendimento do Dia */}
                      {sessoes.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground/60 text-[11px] border border-dashed border-border/60 rounded-xl bg-background/50">
                          Nenhum atendimento agendado
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {sessoes.map((item) => {
                            const aluno = item.emaee_matriculas?.alunos
                            const prof = item.funcionarios
                            const espNome = getEspecialidadeNome(item)
                            const colors = getColorByCargo(espNome)
                            const avatarUrl = getAvatarUrl(prof)
                            const hInicio = formatarHorario(item.horario_inicio)
                            const hFim = formatarHorario(item.horario_fim)

                            // Status do registro para esta data específica da semana
                            const regKey = `${item.id}_${diaObj.dataIso}`
                            const reg = registrosSemana[regKey]
                            const status = reg?.status || 'pendente'

                            // Classes de Borda Superior conforme especificação:
                            // Verde: Houve atendimento
                            // Vermelho: Não houve atendimento
                            // Neutro: Pendente
                            let borderTopClass = 'border-t border-t-border'
                            if (status === 'realizado') {
                              borderTopClass =
                                'border-t-4 border-t-emerald-500 shadow-emerald-500/5'
                            } else if (status === 'nao_realizado') {
                              borderTopClass = 'border-t-4 border-t-rose-500 shadow-rose-500/5'
                            }

                            return (
                              <div
                                key={item.id}
                                onClick={() => handleVerDetalhes(item, diaObj.data)}
                                className={`p-3 rounded-xl border ${colors.card} ${borderTopClass} cursor-pointer transition-all hover:scale-[1.01] shadow-xs relative group overflow-hidden flex flex-col justify-between`}
                              >
                                <div>
                                  {/* Topo: Horário e Badge de Status / Especialidade */}
                                  <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                                    <div className="flex items-center gap-1 text-[11px] font-bold text-foreground shrink-0">
                                      <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                                      <span>
                                        {hInicio}
                                        {hFim ? ` - ${hFim}` : ''}
                                      </span>
                                    </div>

                                    {/* Indicador de Status de Presença */}
                                    {status === 'realizado' ? (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                        <CheckCircle2 className="w-2.5 h-2.5" />
                                        <span>Realizado</span>
                                      </span>
                                    ) : status === 'nao_realizado' ? (
                                      <span
                                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30 flex items-center gap-1"
                                        title={
                                          reg?.motivo_recusa_falta ||
                                          (reg?.aluno_nao_compareceu
                                            ? 'Aluno não compareceu'
                                            : 'Não realizado')
                                        }
                                      >
                                        <XCircle className="w-2.5 h-2.5" />
                                        <span>
                                          {reg?.aluno_nao_compareceu
                                            ? 'Falta Aluno'
                                            : 'Não Realizado'}
                                        </span>
                                      </span>
                                    ) : (
                                      <span
                                        className={`text-[9px] font-semibold px-2 py-0.5 rounded border uppercase tracking-normal break-words max-w-[130px] leading-tight text-center ${colors.badge}`}
                                        title={espNome}
                                      >
                                        {espNome}
                                      </span>
                                    )}
                                  </div>

                                  {/* Nome do Aluno e Nome da Mãe */}
                                  <div className="space-y-0.5 mb-2.5">
                                    <div
                                      className="font-bold text-foreground text-xs leading-snug break-words"
                                      title={aluno?.nome}
                                    >
                                      {aluno?.nome ?? 'Aluno'}
                                    </div>
                                    <div
                                      className="text-[10px] text-muted-foreground leading-snug break-words"
                                      title={aluno?.nome_mae}
                                    >
                                      <span className="font-medium text-foreground/70">Mãe:</span>{' '}
                                      {aluno?.nome_mae ?? 'Não informada'}
                                    </div>
                                    {status === 'nao_realizado' && reg?.motivo_recusa_falta && (
                                      <div className="text-[9.5px] text-rose-500 font-medium italic truncate mt-1">
                                        Obs: {reg.motivo_recusa_falta}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Rodapé: Profissional e Ações */}
                                <div className="pt-2 border-t border-border/40 flex items-start justify-between gap-1.5 mt-auto">
                                  <div className="flex items-start gap-2 min-w-0 flex-1">
                                    <div className="h-6 w-6 rounded-full bg-muted border border-border overflow-hidden shrink-0 flex items-center justify-center mt-0.5">
                                      {avatarUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={avatarUrl}
                                          alt={prof?.nome || ''}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <span
                                        className="text-[11px] font-semibold text-foreground/90 leading-tight block break-words"
                                        title={prof?.nome}
                                      >
                                        {prof?.nome ?? 'Profissional AEE'}
                                      </span>
                                    </div>
                                  </div>

                                  {isEditMode && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleConfirmarExcluir(e, item)}
                                      className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-all shrink-0 mt-0.5"
                                      title="Desvincular atendimento"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* MODO 2: CALENDÁRIO MENSAL / ANUAL */}
          {modoVisualizacao === 'calendario' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-card border border-border p-3.5 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleNavegarMes('anterior')}
                    className="h-8 w-8 rounded-xl border-border"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleNavegarMes('proximo')}
                    className="h-8 w-8 rounded-xl border-border"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <h2 className="text-base font-bold text-foreground ml-2">
                    {MESES_NOMES[mesSelecionado]} de {anoSelecionado}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAnoSelecionado(hoje.getFullYear())
                      setMesSelecionado(hoje.getMonth())
                    }}
                    className="text-xs rounded-xl h-8"
                  >
                    Hoje
                  </Button>
                </div>
              </div>

              {/* Grade do Mês */}
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-muted-foreground pb-2 border-b border-border">
                  <span>Dom</span>
                  <span>Seg</span>
                  <span>Ter</span>
                  <span>Qua</span>
                  <span>Qui</span>
                  <span>Sex</span>
                  <span>Sáb</span>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {diasDoMes.map((dia, idx) => {
                    if (!dia) {
                      return (
                        <div
                          key={`empty-${idx}`}
                          className="h-24 rounded-xl bg-muted/20 border border-transparent"
                        />
                      )
                    }

                    const isSelected =
                      diaSelecionadoData &&
                      dia.data.getDate() === diaSelecionadoData.getDate() &&
                      dia.data.getMonth() === diaSelecionadoData.getMonth() &&
                      dia.data.getFullYear() === diaSelecionadoData.getFullYear()

                    return (
                      <div
                        key={`dia-${dia.numero}`}
                        onClick={() => setDiaSelecionadoData(dia.data)}
                        className={`h-24 p-2 rounded-xl border flex flex-col justify-between transition-all cursor-pointer ${
                          dia.isHoje
                            ? 'border-sky-500 ring-1 ring-sky-500 bg-sky-500/5'
                            : isSelected
                              ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
                              : dia.isFimDeSemana
                                ? 'border-border/40 bg-muted/20 text-muted-foreground/50'
                                : 'border-border bg-background hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-bold ${
                              dia.isHoje ? 'text-sky-400 font-extrabold' : 'text-foreground'
                            }`}
                          >
                            {dia.numero}
                          </span>
                          {dia.sessoes.length > 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20">
                              {dia.sessoes.length} atend.
                            </span>
                          )}
                        </div>

                        {dia.sessoes.length > 0 ? (
                          <div className="space-y-1 overflow-hidden">
                            {dia.sessoes.slice(0, 2).map((s) => (
                              <div
                                key={s.id}
                                className="text-[9px] font-medium truncate bg-secondary/40 text-foreground px-1 py-0.5 rounded border border-border/50"
                              >
                                {formatarHorario(s.horario_inicio)} -{' '}
                                {s.emaee_matriculas?.alunos?.nome?.split(' ')[0]}
                              </div>
                            ))}
                            {dia.sessoes.length > 2 && (
                              <span className="text-[8px] text-muted-foreground block font-medium">
                                +{dia.sessoes.length - 2} outros...
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-[9px] text-muted-foreground/40 text-center">
                            {dia.isFimDeSemana ? 'Recesso' : 'Sem agendamento'}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Detalhes do Dia Selecionado */}
              {diaSelecionadoData && (
                <div className="p-4 bg-card border border-border rounded-2xl shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-primary" />
                      <span>
                        Atendimentos de {diaSelecionadoData.getDate()} de{' '}
                        {MESES_NOMES[diaSelecionadoData.getMonth()]} de{' '}
                        {diaSelecionadoData.getFullYear()} (
                        {
                          DIAS_SEMANA_NOMES[
                            diaSelecionadoData.getDay() === 0 ? 7 : diaSelecionadoData.getDay()
                          ]
                        }
                        )
                      </span>
                    </h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDiaSelecionadoData(null)}
                      className="text-xs text-muted-foreground"
                    >
                      Fechar Pauta
                    </Button>
                  </div>

                  {(() => {
                    const diaJs = diaSelecionadoData.getDay()
                    const diaAee = diaJs === 0 ? 7 : diaJs
                    const sessoesDoDia = atendimentosFiltrados.filter(
                      (v) => v.dia_semana === diaAee,
                    )

                    if (sessoesDoDia.length === 0) {
                      return (
                        <div className="py-6 text-center text-xs text-muted-foreground">
                          Nenhum atendimento programado para este dia da semana.
                        </div>
                      )
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {sessoesDoDia.map((item) => {
                          const aluno = item.emaee_matriculas?.alunos
                          const prof = item.funcionarios
                          const espNome = getEspecialidadeNome(item)
                          const colors = getColorByCargo(espNome)
                          const avatarUrl = getAvatarUrl(prof)
                          const regKey = `${item.id}_${formatarDataIso(diaSelecionadoData)}`
                          const reg = registrosSemana[regKey]
                          const status = reg?.status || 'pendente'

                          let borderTopClass = 'border-t border-t-border'
                          if (status === 'realizado')
                            borderTopClass = 'border-t-4 border-t-emerald-500'
                          if (status === 'nao_realizado')
                            borderTopClass = 'border-t-4 border-t-rose-500'

                          return (
                            <div
                              key={item.id}
                              onClick={() => handleVerDetalhes(item, diaSelecionadoData)}
                              className={`p-3 rounded-xl border ${colors.card} ${borderTopClass} cursor-pointer transition-all hover:scale-[1.01] overflow-hidden flex flex-col justify-between`}
                            >
                              <div>
                                <div className="flex flex-wrap items-center justify-between mb-2 gap-1.5 min-w-0">
                                  <span className="text-xs font-bold text-foreground flex items-center gap-1 shrink-0">
                                    <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    {formatarHorario(item.horario_inicio)}
                                    {item.horario_fim
                                      ? ` às ${formatarHorario(item.horario_fim)}`
                                      : ''}
                                  </span>
                                  {status === 'realizado' ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                                      Realizado
                                    </span>
                                  ) : status === 'nao_realizado' ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30">
                                      Não Realizado
                                    </span>
                                  ) : (
                                    <span
                                      className={`text-[9px] font-semibold px-2 py-0.5 rounded border uppercase tracking-normal break-words max-w-[140px] leading-tight text-center ${colors.badge}`}
                                      title={espNome}
                                    >
                                      {espNome}
                                    </span>
                                  )}
                                </div>

                                <div
                                  className="text-xs font-bold text-foreground break-words leading-snug"
                                  title={aluno?.nome}
                                >
                                  {aluno?.nome}
                                </div>
                                <div
                                  className="text-[11px] text-muted-foreground break-words leading-snug mt-0.5"
                                  title={aluno?.nome_mae}
                                >
                                  <span className="font-medium text-foreground/70">Mãe:</span>{' '}
                                  {aluno?.nome_mae ?? 'Não informada'}
                                </div>
                              </div>

                              <div className="mt-2.5 pt-2 border-t border-border/50 flex items-start gap-2">
                                <div className="h-6 w-6 rounded-full bg-muted border border-border overflow-hidden shrink-0 flex items-center justify-center mt-0.5">
                                  {avatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={avatarUrl}
                                      alt={prof?.nome || ''}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span
                                    className="text-[11px] font-semibold text-foreground/90 leading-tight block break-words"
                                    title={prof?.nome}
                                  >
                                    {prof?.nome}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          )}

          {/* MODO 3: TABELA GERAL CONSOLIDADA */}
          {modoVisualizacao === 'tabela' && (
            <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
              <StandardTable
                data={atendimentosFiltrados}
                keyExtractor={(item) => item.id}
                emptyMessage="Nenhum atendimento corresponde aos filtros selecionados."
                columns={[
                  {
                    header: 'Dia',
                    accessor: (item) => (
                      <span className="font-semibold text-xs text-foreground">
                        {DIAS_SEMANA_NOMES[item.dia_semana] ?? '-'}
                      </span>
                    ),
                  },
                  {
                    header: 'Horário',
                    accessor: (item) => (
                      <span className="font-bold text-xs text-primary">
                        {formatarHorario(item.horario_inicio)}
                        {item.horario_fim ? ` às ${formatarHorario(item.horario_fim)}` : ''}
                      </span>
                    ),
                  },
                  {
                    header: 'Aluno',
                    accessor: (item) => (
                      <div className="space-y-0.5">
                        <div className="font-bold text-xs text-foreground">
                          {item.emaee_matriculas?.alunos?.nome ?? 'Sem Nome'}
                        </div>
                        {item.emaee_matriculas?.numero_matricula_emaee && (
                          <div className="text-[10px] text-muted-foreground">
                            Matrícula: {item.emaee_matriculas.numero_matricula_emaee}
                          </div>
                        )}
                      </div>
                    ),
                  },
                  {
                    header: 'Nome da Mãe',
                    accessor: (item) => (
                      <span className="text-xs text-muted-foreground">
                        {item.emaee_matriculas?.alunos?.nome_mae ?? 'Não informada'}
                      </span>
                    ),
                  },
                  {
                    header: 'Profissional AEE',
                    accessor: (item) => {
                      const prof = item.funcionarios
                      const avatarUrl = getAvatarUrl(prof)
                      return (
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-muted border border-border overflow-hidden shrink-0 flex items-center justify-center">
                            {avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={avatarUrl}
                                alt={prof?.nome || ''}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-xs text-foreground truncate">
                              {prof?.nome}
                            </div>
                            <div className="text-[10px] text-amber-500">
                              {getEspecialidadeNome(item)}
                            </div>
                          </div>
                        </div>
                      )
                    },
                  },
                  {
                    header: 'Status na Semana',
                    accessor: (item) => {
                      const diaObj = diasDaSemanaObj.find((d) => d.diaSemana === item.dia_semana)
                      const regKey = diaObj ? `${item.id}_${diaObj.dataIso}` : ''
                      const reg = registrosSemana[regKey]
                      const status = reg?.status || 'pendente'

                      if (status === 'realizado') {
                        return (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Realizado</span>
                          </span>
                        )
                      }
                      if (status === 'nao_realizado') {
                        return (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                            <XCircle className="w-3 h-3" />
                            <span>Não Realizado</span>
                          </span>
                        )
                      }
                      return <span className="text-[11px] text-muted-foreground">Pendente</span>
                    },
                  },
                  {
                    header: 'Ações',
                    className: 'text-right',
                    accessor: (item) => (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVerDetalhes(item)}
                          className="h-7 px-2 text-xs text-primary hover:bg-primary/10 cursor-pointer"
                        >
                          Ver Detalhes / Presença
                        </Button>
                        {isEditMode && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleConfirmarExcluir(e, item)}
                            className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
