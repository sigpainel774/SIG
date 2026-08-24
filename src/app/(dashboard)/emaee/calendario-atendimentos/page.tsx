'use client'

import React, { useEffect, useState, useMemo, useRef } from 'react'
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
  AlertCircle,
  Filter,
  Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IconTile } from '@/components/ui/icon-tile'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { StandardTable } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  7: 'Domingo'
}

const DIAS_SEMANA_CURTOS: Record<number, string> = {
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
  7: 'Dom'
}

const MESES_NOMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export default function CalendarioAtendimentosPage() {
  const { selectedEscola } = useSchoolStore()
  const { isEditMode } = useEditModeStore()
  const escolaEmaeeId = selectedEscola?.id
  const supabase = useMemo(() => createClient(), [])

  const [vinculos, setVinculos] = useState<any[]>([])
  const [profissionais, setProfissionais] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [termoBusca, setTermoBusca] = useState('')
  const [filtroProfissional, setFiltroProfissional] = useState<string>('todos')
  const [filtroEspecialidade, setFiltroEspecialidade] = useState<string>('todos')
  const [filtroDiaSemana, setFiltroDiaSemana] = useState<string>('todos')
  const [filtroTurno, setFiltroTurno] = useState<string>('todos') // todos | matutino | vespertino

  // Modos de visualização: 'grade' | 'calendario' | 'tabela'
  const [modoVisualizacao, setModoVisualizacao] = useState<'grade' | 'calendario' | 'tabela'>('grade')

  // Controle de Calendário Mensal
  const hoje = useMemo(() => new Date(), [])
  const [anoSelecionado, setAnoSelecionado] = useState(hoje.getFullYear())
  const [mesSelecionado, setMesSelecionado] = useState(hoje.getMonth()) // 0-11
  const [diaSelecionadoData, setDiaSelecionadoData] = useState<Date | null>(null)

  // Modais
  const [modalVincularOpen, setModalVincularOpen] = useState(false)
  const [profParaVincular, setProfParaVincular] = useState<any>(null)
  const [modalDetalhesOpen, setModalDetalhesOpen] = useState(false)
  const [atendimentoSelecionado, setAtendimentoSelecionado] = useState<any>(null)

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

  // Carregar todos os vínculos de especialidades da unidade EMAEE
  const carregarDados = async () => {
    if (!escolaEmaeeId) {
      if (isMounted.current) setLoading(false)
      return
    }

    setLoading(true)
    try {
      // 1. Busca todos os atendimentos/especialidades ativas vinculadas no EMAEE
      const { data: espData, error: espError } = await supabase
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

      if (espError) throw espError

      // Filtra apenas as matrículas pertencentes à escola EMAEE atual
      const filtradosUnidade = (espData || []).filter(
        (item: any) => item.emaee_matriculas?.escola_atendimento_id === escolaEmaeeId
      )

      // 2. Busca lista de profissionais AEE da unidade para preencher os seletores
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
  }

  useEffect(() => {
    carregarDados()
  }, [escolaEmaeeId])

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

  // Lista de especialidades / profissões únicas dos profissionais AEE ativos e atendimentos
  const listaEspecialidades = useMemo(() => {
    const setEsp = new Set<string>()
    // 1. Profissões / cargos dos profissionais AEE ativos na unidade EMAEE
    profissionais.forEach((p) => {
      if (p.cargo && typeof p.cargo === 'string' && p.cargo.trim()) {
        setEsp.add(p.cargo.trim())
      }
    })
    // 2. Especialidades ou cargos dos atendimentos já cadastrados
    vinculos.forEach((v) => {
      if (v.especialidade && typeof v.especialidade === 'string' && v.especialidade.trim()) {
        setEsp.add(v.especialidade.trim())
      }
      if (v.funcionarios?.cargo && typeof v.funcionarios.cargo === 'string' && v.funcionarios.cargo.trim()) {
        setEsp.add(v.funcionarios.cargo.trim())
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

      // Busca por nome do aluno, nome da mãe, matrícula ou profissional
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

      // Filtro Profissional
      if (filtroProfissional !== 'todos' && v.profissional_id !== filtroProfissional) {
        return false
      }

      // Filtro Especialidade / Profissão
      if (filtroEspecialidade !== 'todos') {
        const filtroNorm = normalizar(filtroEspecialidade)
        const espNorm = normalizar(v.especialidade || '')
        const profCargoNorm = normalizar(prof?.cargo || '')
        if (espNorm !== filtroNorm && profCargoNorm !== filtroNorm) {
          return false
        }
      }

      // Filtro Dia da Semana
      if (filtroDiaSemana !== 'todos' && String(v.dia_semana) !== filtroDiaSemana) {
        return false
      }

      // Filtro Turno
      if (filtroTurno !== 'todos') {
        const hInicio = v.horario_inicio || ''
        const isMatutino = hInicio < '12:00:00'
        if (filtroTurno === 'matutino' && !isMatutino) return false
        if (filtroTurno === 'vespertino' && isMatutino) return false
      }

      return true
    })
  }, [vinculos, termoBusca, filtroProfissional, filtroEspecialidade, filtroDiaSemana, filtroTurno])

  // Estatísticas e KPIs
  const kpis = useMemo(() => {
    const totalSessoes = vinculos.length
    const profsSet = new Set(vinculos.map((v) => v.profissional_id))
    const alunosSet = new Set(vinculos.map((v) => v.emaee_matricula_id))

    // Dia da semana de hoje (JS 0=Dom, 1=Seg... -> AEE: 1=Seg ... 5=Sex)
    const diaJs = hoje.getDay()
    const diaAeeHoje = diaJs === 0 ? 7 : diaJs
    const atendimentosHoje = vinculos.filter((v) => v.dia_semana === diaAeeHoje).length

    return {
      totalSessoes,
      totalProfissionais: profsSet.size,
      totalAlunos: alunosSet.size,
      atendimentosHoje,
      diaAeeHoje
    }
  }, [vinculos, hoje])

  // Cores por Especialidade
  const getColorByCargo = (cargo: string | null) => {
    const c = (cargo || '').toLowerCase()
    if (c.includes('psicólogo') || c.includes('psicologa')) {
      return {
        badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        card: 'border-blue-500/30 bg-blue-500/5 hover:border-blue-500/60',
        bar: 'bg-blue-500'
      }
    }
    if (c.includes('fono')) {
      return {
        badge: 'bg-green-500/10 text-green-400 border-green-500/20',
        card: 'border-green-500/30 bg-green-500/5 hover:border-green-500/60',
        bar: 'bg-green-500'
      }
    }
    if (c.includes('psicopedagogo') || c.includes('psicopedagoga')) {
      return {
        badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        card: 'border-orange-500/30 bg-orange-500/5 hover:border-orange-500/60',
        bar: 'bg-orange-500'
      }
    }
    if (c.includes('neuro')) {
      return {
        badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        card: 'border-purple-500/30 bg-purple-500/5 hover:border-purple-500/60',
        bar: 'bg-purple-500'
      }
    }
    if (c.includes('fisio')) {
      return {
        badge: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
        card: 'border-pink-500/30 bg-pink-500/5 hover:border-pink-500/60',
        bar: 'bg-pink-500'
      }
    }
    return {
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      card: 'border-border bg-card hover:border-border/80',
      bar: 'bg-amber-500'
    }
  }

  // Agrupamento por dia da semana para a Grade Semanal
  const gradePorDia = useMemo(() => {
    const dias = [1, 2, 3, 4, 5]
    const agrupado: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] }

    atendimentosFiltrados.forEach((item) => {
      if (agrupado[item.dia_semana]) {
        agrupado[item.dia_semana].push(item)
      }
    })

    // Ordena cada dia por horário de início
    dias.forEach((d) => {
      agrupado[d].sort((a, b) => (a.horario_inicio || '').localeCompare(b.horario_inicio || ''))
    })

    return agrupado
  }, [atendimentosFiltrados])

  // Abertura de modal de detalhes
  const handleVerDetalhes = (item: any) => {
    setAtendimentoSelecionado(item)
    setModalDetalhesOpen(true)
  }

  // Abertura de modal de exclusão
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
    const offsetInicio = primeiroDia.getDay() // 0 = Domingo

    const dias = []
    // Dias em branco antes do dia 1
    for (let i = 0; i < offsetInicio; i++) {
      dias.push(null)
    }
    // Dias do mês
    for (let d = 1; d <= totalDias; d++) {
      const dataObj = new Date(anoSelecionado, mesSelecionado, d)
      const diaJs = dataObj.getDay()
      const diaAee = diaJs === 0 ? 7 : diaJs

      // Atendimentos que ocorrem nesse dia da semana
      const sessoesNesteDia = atendimentosFiltrados.filter((v) => v.dia_semana === diaAee)

      dias.push({
        numero: d,
        data: dataObj,
        diaAee,
        isHoje:
          dataObj.getDate() === hoje.getDate() &&
          dataObj.getMonth() === hoje.getMonth() &&
          dataObj.getFullYear() === hoje.getFullYear(),
        isFimDeSemana: diaJs === 0 || diaJs === 6,
        sessoes: sessoesNesteDia
      })
    }
    return dias
  }, [anoSelecionado, mesSelecionado, atendimentosFiltrados, hoje])

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
      {/* Modal de Detalhes do Atendimento */}
      {modalDetalhesOpen && atendimentoSelecionado && (
        <StandardDialog
          open={modalDetalhesOpen}
          onOpenChange={setModalDetalhesOpen}
          title="Detalhes do Atendimento AEE"
          maxWidth="sm:max-w-[560px]"
          footer={
            <div className="flex items-center justify-between w-full">
              <Link
                href={`/emaee/pacientes/${atendimentoSelecionado.emaee_matricula_id}`}
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir Prontuário do Paciente</span>
              </Link>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalDetalhesOpen(false)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                Fechar
              </Button>
            </div>
          }
        >
          <div className="space-y-4 py-1 text-xs">
            {/* Bloco Aluno & Mãe */}
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
                <div className="h-10 w-10 rounded-full bg-muted border border-border overflow-hidden shrink-0 flex items-center justify-center">
                  {getAvatarUrl(atendimentoSelecionado.funcionarios) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getAvatarUrl(atendimentoSelecionado.funcionarios)!}
                      alt={atendimentoSelecionado.funcionarios?.nome || ''}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-foreground truncate">
                    {atendimentoSelecionado.funcionarios?.nome ?? 'Profissional não identificado'}
                  </div>
                  <div className="text-amber-500 font-semibold text-[11px]">
                    {atendimentoSelecionado.especialidade ?? atendimentoSelecionado.funcionarios?.cargo}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-border/50 text-muted-foreground">
                <div>
                  <strong className="text-foreground/80 block">Dia da Semana:</strong>
                  <span>{DIAS_SEMANA_NOMES[atendimentoSelecionado.dia_semana] ?? '-'}</span>
                </div>
                <div>
                  <strong className="text-foreground/80 block">Horário:</strong>
                  <span>
                    {formatarHorario(atendimentoSelecionado.horario_inicio)}
                    {atendimentoSelecionado.horario_fim
                      ? ` às ${formatarHorario(atendimentoSelecionado.horario_fim)}`
                      : ''}
                  </span>
                </div>
                <div>
                  <strong className="text-foreground/80 block">Frequência:</strong>
                  <span className="capitalize">{atendimentoSelecionado.frequencia?.toLowerCase() ?? 'Semanal'}</span>
                </div>
              </div>
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
              <span>Esta ação removerá o horário do calendário de atendimentos deste ano letivo.</span>
            </div>
          </div>
        </StandardDialog>
      )}

      {/* Modal de Associação Direta */}
      {modalVincularOpen && (
        <ModalAssociarAlunoAEE
          open={modalVincularOpen}
          onOpenChange={setModalVincularOpen}
          profissionalId={profParaVincular?.id || (profissionais[0]?.id ?? '')}
          profissionalNome={profParaVincular?.nome || (profissionais[0]?.nome ?? 'Profissional AEE')}
          profissionalCargo={profParaVincular?.cargo || (profissionais[0]?.cargo ?? 'Especialista')}
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
            filtroDiaSemana !== 'todos'
              ? DIAS_SEMANA_NOMES[Number(filtroDiaSemana)]
              : undefined
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
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <IconTile icon={CalendarIcon} variant="primary" className="h-10 w-10 shrink-0" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Calendário de Atendimentos</h1>
            <p className="text-xs text-muted-foreground">
              Escala anual de atendimentos multidisciplinares e vinculação de profissionais aos alunos
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
              setProfParaVincular(profissionais[0] || null)
              setModalVincularOpen(true)
            }}
            disabled={profissionais.length === 0}
            className="text-xs rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1.5 shadow-sm"
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
            <span className="text-[11px] font-medium text-muted-foreground block">Atendimentos Semanais</span>
            <span className="text-2xl font-black text-foreground">{kpis.totalSessoes}</span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">Sessões programadas</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <CalendarDays className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-card border border-border rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-muted-foreground block">Profissionais em Atendimento</span>
            <span className="text-2xl font-black text-foreground">{kpis.totalProfissionais}</span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">Especialistas com agenda</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-card border border-border rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-muted-foreground block">Alunos Assistidos</span>
            <span className="text-2xl font-black text-foreground">{kpis.totalAlunos}</span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">Prontuários com vínculo</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Heart className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-card border border-border rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-muted-foreground block">Atendimentos Hoje</span>
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

      {/* Barra de Filtros e Alternador de Visão */}
      <div className="p-4 bg-card border border-border rounded-2xl shadow-sm space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Campo de Busca Rápida */}
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

          {/* Alternador de Modo de Visualização */}
          <div className="flex items-center gap-1 bg-background p-1 border border-border rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setModoVisualizacao('grade')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
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

        {/* Dropdowns de Filtro Adicionais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-border/50">
          <div>
            <Label className="text-[11px] text-muted-foreground block mb-1">Profissional AEE</Label>
            <Select value={filtroProfissional} onValueChange={(val) => setFiltroProfissional(val || 'todos')}>
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
            <Label className="text-[11px] text-muted-foreground block mb-1">Especialidade / Cargo</Label>
            <Select value={filtroEspecialidade} onValueChange={(val) => setFiltroEspecialidade(val || 'todos')}>
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
            <Select value={filtroDiaSemana} onValueChange={(val) => setFiltroDiaSemana(val || 'todos')}>
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
            <Label className="text-[11px] text-muted-foreground block mb-1">Turno do Atendimento</Label>
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

      {/* Conteúdo Principal conforme Modo de Visualização */}
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
              setProfParaVincular(profissionais[0] || null)
              setModalVincularOpen(true)
            }}
            disabled={profissionais.length === 0}
            className="text-xs rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
          >
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
            Criar Primeiro Vínculo
          </Button>
        </div>
      ) : (
        <>
          {/* MODO 1: GRADE SEMANAL (Colunas de Segunda a Sexta) */}
          {modoVisualizacao === 'grade' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
              {[1, 2, 3, 4, 5].map((diaNum) => {
                const sessoes = gradePorDia[diaNum] || []
                const isHojeDia = kpis.diaAeeHoje === diaNum

                return (
                  <div
                    key={diaNum}
                    className={`bg-card border rounded-2xl p-3.5 space-y-3 shadow-sm transition-all ${
                      isHojeDia
                        ? 'border-sky-500/50 ring-1 ring-sky-500/20 bg-sky-500/5'
                        : 'border-border'
                    }`}
                  >
                    {/* Cabeçalho do Dia */}
                    <div className="flex items-center justify-between pb-2.5 border-b border-border">
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
                          const colors = getColorByCargo(item.especialidade || prof?.cargo)
                          const avatarUrl = getAvatarUrl(prof)
                          const hInicio = formatarHorario(item.horario_inicio)
                          const hFim = formatarHorario(item.horario_fim)

                          return (
                            <div
                              key={item.id}
                              onClick={() => handleVerDetalhes(item)}
                              className={`p-3 rounded-xl border ${colors.card} cursor-pointer transition-all hover:scale-[1.01] shadow-sm relative group`}
                            >
                              {/* Barra de cor superior/lateral */}
                              <div className="flex items-center justify-between gap-1 mb-2">
                                <div className="flex items-center gap-1 text-[11px] font-bold text-foreground">
                                  <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                                  <span>
                                    {hInicio}
                                    {hFim ? ` - ${hFim}` : ''}
                                  </span>
                                </div>
                                <span
                                  className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wider ${colors.badge}`}
                                >
                                  {item.especialidade || 'AEE'}
                                </span>
                              </div>

                              {/* Aluno e Nome da Mãe */}
                              <div className="space-y-0.5 mb-2.5">
                                <div className="font-bold text-foreground text-xs leading-tight truncate" title={aluno?.nome}>
                                  {aluno?.nome ?? 'Aluno'}
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate" title={aluno?.nome_mae}>
                                  <span className="font-medium text-foreground/70">Mãe:</span>{' '}
                                  {aluno?.nome_mae ?? 'Não informada'}
                                </div>
                              </div>

                              {/* Rodapé: Profissional e Ações */}
                              <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  <div className="h-5 w-5 rounded-full bg-muted border border-border overflow-hidden shrink-0 flex items-center justify-center">
                                    {avatarUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={avatarUrl} alt={prof?.nome || ''} className="w-full h-full object-cover" />
                                    ) : (
                                      <User className="w-3 h-3 text-muted-foreground" />
                                    )}
                                  </div>
                                  <span className="text-[10px] font-medium text-muted-foreground truncate" title={prof?.nome}>
                                    {prof?.nome}
                                  </span>
                                </div>

                                {isEditMode && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleConfirmarExcluir(e, item)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-all"
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
          )}

          {/* MODO 2: CALENDÁRIO MENSAL / ANUAL */}
          {modoVisualizacao === 'calendario' && (
            <div className="space-y-4">
              {/* Barra de Navegação do Mês */}
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
                {/* Dias da semana cabeçalho */}
                <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-muted-foreground pb-2 border-b border-border">
                  <span>Dom</span>
                  <span>Seg</span>
                  <span>Ter</span>
                  <span>Qua</span>
                  <span>Qui</span>
                  <span>Sex</span>
                  <span>Sáb</span>
                </div>

                {/* Dias do mês */}
                <div className="grid grid-cols-7 gap-2">
                  {diasDoMes.map((dia, idx) => {
                    if (!dia) {
                      return <div key={`empty-${idx}`} className="h-24 rounded-xl bg-muted/20 border border-transparent" />
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
                              {dia.sessoes.length} {dia.sessoes.length === 1 ? 'atend.' : 'atend.'}
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
                                {formatarHorario(s.horario_inicio)} - {s.emaee_matriculas?.alunos?.nome?.split(' ')[0]}
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
                        {MESES_NOMES[diaSelecionadoData.getMonth()]} de {diaSelecionadoData.getFullYear()} (
                        {DIAS_SEMANA_NOMES[diaSelecionadoData.getDay() === 0 ? 7 : diaSelecionadoData.getDay()]})
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
                    const sessoesDoDia = atendimentosFiltrados.filter((v) => v.dia_semana === diaAee)

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
                          const colors = getColorByCargo(item.especialidade || prof?.cargo)
                          const avatarUrl = getAvatarUrl(prof)

                          return (
                            <div
                              key={item.id}
                              onClick={() => handleVerDetalhes(item)}
                              className={`p-3 rounded-xl border ${colors.card} cursor-pointer transition-all hover:scale-[1.01]`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-foreground flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                  {formatarHorario(item.horario_inicio)}
                                  {item.horario_fim ? ` às ${formatarHorario(item.horario_fim)}` : ''}
                                </span>
                                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded border ${colors.badge}`}>
                                  {item.especialidade}
                                </span>
                              </div>

                              <div className="text-xs font-bold text-foreground truncate">{aluno?.nome}</div>
                              <div className="text-[11px] text-muted-foreground truncate">
                                Mãe: {aluno?.nome_mae ?? 'Não informada'}
                              </div>

                              <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-2">
                                <div className="h-5 w-5 rounded-full bg-muted border border-border overflow-hidden shrink-0 flex items-center justify-center">
                                  {avatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={avatarUrl} alt={prof?.nome || ''} className="w-full h-full object-cover" />
                                  ) : (
                                    <User className="w-3 h-3 text-muted-foreground" />
                                  )}
                                </div>
                                <span className="text-[10px] text-muted-foreground truncate">{prof?.nome}</span>
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
                    )
                  },
                  {
                    header: 'Horário',
                    accessor: (item) => (
                      <span className="font-bold text-xs text-primary">
                        {formatarHorario(item.horario_inicio)}
                        {item.horario_fim ? ` às ${formatarHorario(item.horario_fim)}` : ''}
                      </span>
                    )
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
                    )
                  },
                  {
                    header: 'Nome da Mãe',
                    accessor: (item) => (
                      <span className="text-xs text-muted-foreground">
                        {item.emaee_matriculas?.alunos?.nome_mae ?? 'Não informada'}
                      </span>
                    )
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
                              <img src={avatarUrl} alt={prof?.nome || ''} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-xs text-foreground truncate">{prof?.nome}</div>
                            <div className="text-[10px] text-amber-500">{item.especialidade}</div>
                          </div>
                        </div>
                      )
                    }
                  },
                  {
                    header: 'Frequência',
                    accessor: (item) => (
                      <span className="text-xs text-muted-foreground capitalize">
                        {item.frequencia?.toLowerCase() ?? 'Semanal'}
                      </span>
                    )
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
                          className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
                        >
                          Ver Detalhes
                        </Button>
                        {isEditMode && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleConfirmarExcluir(e, item)}
                            className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    )
                  }
                ]}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
