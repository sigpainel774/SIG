'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  BookOpenCheck,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Plus,
  Save,
  Trash2,
  Clock,
  Sparkles,
  Search,
  Filter,
  FileText,
  HelpCircle,
  History,
  Layers,
  GraduationCap
} from 'lucide-react'
import { toast } from 'sonner'
import {
  ESTRUTURA_FUNDAMENTAL_BNCC,
  CAMPOS_EXPERIENCIA_INFANTIL,
  DIREITOS_APRENDIZAGEM_INFANTIL,
  COMPETENCIAS_GERAIS_BNCC,
  getAreasDoConhecimento,
  getComponentesPorArea
} from '@/lib/bnccData'
import { cn } from '@/lib/utils'

interface TabDiarioConteudoTurmaProps {
  turma: any
  materias: any[]
  selectedMateriaId?: string
  setSelectedMateriaId?: (id: string) => void
  dataAula: string
  setDataAula: (d: string) => void
  onNavigateToFrequencia?: () => void
}

export function TabDiarioConteudoTurma({
  turma,
  materias,
  selectedMateriaId,
  setSelectedMateriaId,
  dataAula,
  setDataAula,
  onNavigateToFrequencia
}: TabDiarioConteudoTurmaProps) {
  const supabase = createClient() as any
  const { funcionario, isProfessor } = useAuthStore()

  // Verifica se é turma/escola de EMAEE ou Cursinho Pré-Universitário
  const isEmaeeOuCursinho = useMemo(() => {
    const nomeTurma = (turma?.nome || '').toLowerCase()
    const nomeEscola = (turma?.escola_nome || '').toLowerCase()
    const tipoEscola = (turma?.escola_tipo || '').toLowerCase()
    return (
      tipoEscola === 'emaee' ||
      nomeEscola.includes('emaee') ||
      nomeEscola.includes('cursinho') ||
      nomeEscola.includes('pré universitário') ||
      nomeTurma.includes('emaee') ||
      nomeTurma.includes('cursinho')
    )
  }, [turma])

  // Estados de Verificação de Frequência (RN01)
  const [checkingFreq, setCheckingFreq] = useState(true)
  const [hasFrequenciaLancada, setHasFrequenciaLancada] = useState(false)
  const [totalPresentes, setTotalPresentes] = useState(0)
  const [totalAlunosFreq, setTotalAlunosFreq] = useState(0)

  // Estados de Dados do Diário
  const [diarioId, setDiarioId] = useState<string | null>(null)
  const [loadingDiario, setLoadingDiario] = useState(false)
  const [savingDiario, setSavingDiario] = useState(false)
  const [historicoAulas, setHistoricoAulas] = useState<any[]>([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)

  // Modo de Ensino
  const isInfantilDetectado = useMemo(() => {
    const nome = (turma?.nome || '').toLowerCase()
    return nome.includes('infantil') || nome.includes('creche') || nome.includes('maternal') || nome.includes('pré')
  }, [turma])

  const [etapaEnsino, setEtapaEnsino] = useState<'FUNDAMENTAL' | 'INFANTIL'>(
    isInfantilDetectado ? 'INFANTIL' : 'FUNDAMENTAL'
  )

  // Form Fields - Ensino Fundamental
  const [areaSelecionada, setAreaSelecionada] = useState<string>('')
  const [componenteSelecionado, setComponenteSelecionado] = useState<string>('')
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<string>('')
  const [objetoSelecionado, setObjetoSelecionado] = useState<string>('')
  const [habilidadesSelecionadas, setHabilidadesSelecionadas] = useState<string[]>([])
  const [competenciasSelecionadas, setCompetenciasSelecionadas] = useState<string[]>([])

  // Form Fields - Educação Infantil
  const [direitosSelecionados, setDireitosSelecionados] = useState<string[]>([])
  const [campoExpSelecionado, setCampoExpSelecionado] = useState<string>('')
  const [objetivosInfantilSelecionados, setObjetivosInfantilSelecionados] = useState<string[]>([])

  // Form Fields - Conteúdo da Aula
  const [horarioSlot, setHorarioSlot] = useState<string>('1º Horário')
  const [conteudoResumo, setConteudoResumo] = useState<string>('')
  const [metodologia, setMetodologia] = useState<string>('')
  const [recursosDidaticos, setRecursosDidaticos] = useState<string>('')
  const [tarefaCasa, setTarefaCasa] = useState<string>('')
  const [observacoesPedagogicas, setObservacoesPedagogicas] = useState<string>('')

  // Filtro de Histórico
  const [filtroMesHistorico, setFiltroMesHistorico] = useState<string>('todos')

  // Auto-seleciona matéria atual se houver
  const materiaAtiva = useMemo(() => {
    if (!selectedMateriaId) return materias[0] || null
    return materias.find((m) => m.id === selectedMateriaId) || materias[0] || null
  }, [materias, selectedMateriaId])

  // Ajusta área e componente ao trocar de matéria
  useEffect(() => {
    if (materiaAtiva && etapaEnsino === 'FUNDAMENTAL') {
      const nomeMat = materiaAtiva.nome
      // Procura componente compatível
      const compKey = Object.keys(ESTRUTURA_FUNDAMENTAL_BNCC).find(
        (k) => k.toLowerCase() === nomeMat.toLowerCase() || nomeMat.toLowerCase().includes(k.toLowerCase())
      )
      if (compKey) {
        const comp = ESTRUTURA_FUNDAMENTAL_BNCC[compKey]
        setComponenteSelecionado(comp.nome)
        setAreaSelecionada(comp.area)
      } else {
        setComponenteSelecionado(nomeMat)
      }
    }
  }, [materiaAtiva, etapaEnsino])

  // 1. RN01 - Verificar se a frequência daquela aula/data foi lançada e salva
  const checkFrequenciaStatus = useCallback(async () => {
    if (!turma?.id || !dataAula) return
    setCheckingFreq(true)

    try {
      let query = supabase
        .from('frequencias')
        .select('id, presenca', { count: 'exact' })
        .eq('turma_id', turma.id)
        .eq('data', dataAula)

      if (materiaAtiva?.id) {
        query = query.eq('materia_id', materiaAtiva.id)
      }

      const { data, count, error } = await query

      if (error) {
        console.error('Erro ao verificar frequência para RN01:', error)
        setHasFrequenciaLancada(false)
      } else {
        const total = count || 0
        const presentes = (data || []).filter((f: any) => f.presenca === true).length
        setHasFrequenciaLancada(total > 0)
        setTotalAlunosFreq(total)
        setTotalPresentes(presentes)
      }
    } catch (err) {
      console.error(err)
      setHasFrequenciaLancada(false)
    } finally {
      setCheckingFreq(false)
    }
  }, [turma?.id, dataAula, materiaAtiva?.id, supabase])

  // 2. Carregar Diário de Conteúdo existente para a data/matéria
  const carregarDiarioAula = useCallback(async () => {
    if (!turma?.id || !dataAula) return
    setLoadingDiario(true)

    try {
      let query = supabase
        .from('diario_conteudo')
        .select('*')
        .eq('turma_id', turma.id)
        .eq('data_aula', dataAula)

      if (materiaAtiva?.id) {
        query = query.eq('materia_id', materiaAtiva.id)
      }

      const { data, error } = await query.maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar diário da aula:', error)
      }

      if (data) {
        setDiarioId(data.id)
        setEtapaEnsino(data.etapa_ensino || 'FUNDAMENTAL')
        setHorarioSlot(data.horario_slot || '1º Horário')
        setAreaSelecionada(data.bncc_area || '')
        setComponenteSelecionado(data.bncc_componente || '')
        setUnidadeSelecionada(data.bncc_unidade_tematica || '')
        setObjetoSelecionado(data.bncc_objeto_conhecimento || '')
        setHabilidadesSelecionadas(data.bncc_habilidades || [])
        setCompetenciasSelecionadas(data.bncc_competencias || [])
        setDireitosSelecionados(data.infantil_direitos || [])
        setCampoExpSelecionado(data.infantil_campos_experiencia?.[0] || '')
        setObjetivosInfantilSelecionados(data.infantil_objetivos || [])
        setConteudoResumo(data.conteudo_resumo || '')
        setMetodologia(data.metodologia_desenvolvimento || '')
        setRecursosDidaticos(data.recursos_didaticos || '')
        setTarefaCasa(data.tarefa_casa || '')
        setObservacoesPedagogicas(data.observacoes_pedagogicas || '')
      } else {
        // Limpa campos para novo registro
        setDiarioId(null)
        setConteudoResumo('')
        setMetodologia('')
        setRecursosDidaticos('')
        setTarefaCasa('')
        setObservacoesPedagogicas('')
        setHabilidadesSelecionadas([])
        setCompetenciasSelecionadas([])
        setObjetivosInfantilSelecionados([])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingDiario(false)
    }
  }, [turma?.id, dataAula, materiaAtiva?.id, supabase])

  // 3. Carregar Histórico Geral de Diários da Turma
  const carregarHistoricoAulas = useCallback(async () => {
    if (!turma?.id) return
    setLoadingHistorico(true)

    try {
      const { data, error } = await supabase
        .from('diario_conteudo')
        .select('*, materias(nome), funcionarios(nome)')
        .eq('turma_id', turma.id)
        .order('data_aula', { ascending: false })

      if (error) throw error
      setHistoricoAulas(data || [])
    } catch (err) {
      console.error('Erro ao carregar histórico de diários:', err)
    } finally {
      setLoadingHistorico(false)
    }
  }, [turma?.id, supabase])

  useEffect(() => {
    if (!isEmaeeOuCursinho) {
      checkFrequenciaStatus()
      carregarDiarioAula()
      carregarHistoricoAulas()
    }
  }, [checkFrequenciaStatus, carregarDiarioAula, carregarHistoricoAulas, isEmaeeOuCursinho])

  // Salvar Diário de Conteúdo
  const handleSalvarDiario = async () => {
    if (!hasFrequenciaLancada) {
      toast.error('RN01 - Bloqueio: Realize e salve a frequência desta aula antes de registrar o diário de conteúdo.')
      return
    }

    if (!conteudoResumo.trim()) {
      toast.warning('Por favor, informe o resumo do conteúdo ministrado na aula.')
      return
    }

    if (etapaEnsino === 'FUNDAMENTAL' && habilidadesSelecionadas.length === 0) {
      toast.warning('Selecione ao menos 1 código oficial de Habilidade BNCC trabalhada.')
      return
    }

    if (etapaEnsino === 'INFANTIL' && objetivosInfantilSelecionados.length === 0) {
      toast.warning('Selecione ao menos 1 Objetivo de Aprendizagem da Educação Infantil.')
      return
    }

    setSavingDiario(true)

    try {
      const payload: any = {
        escola_id: turma.escola_id,
        turma_id: turma.id,
        materia_id: materiaAtiva?.id || null,
        professor_id: funcionario?.id || null,
        data_aula: dataAula,
        horario_slot: horarioSlot,
        etapa_ensino: etapaEnsino,
        conteudo_resumo: conteudoResumo.trim(),
        metodologia_desenvolvimento: metodologia.trim() || null,
        recursos_didaticos: recursosDidaticos.trim() || null,
        tarefa_casa: tarefaCasa.trim() || null,
        observacoes_pedagogicas: observacoesPedagogicas.trim() || null,
        updated_at: new Date().toISOString()
      }

      if (etapaEnsino === 'FUNDAMENTAL') {
        payload.bncc_area = areaSelecionada || null
        payload.bncc_componente = componenteSelecionado || null
        payload.bncc_unidade_tematica = unidadeSelecionada || null
        payload.bncc_objeto_conhecimento = objetoSelecionado || null
        payload.bncc_habilidades = habilidadesSelecionadas
        payload.bncc_competencias = competenciasSelecionadas
        payload.infantil_direitos = []
        payload.infantil_campos_experiencia = []
        payload.infantil_objetivos = []
      } else {
        payload.bncc_area = null
        payload.bncc_componente = null
        payload.bncc_unidade_tematica = null
        payload.bncc_objeto_conhecimento = null
        payload.bncc_habilidades = []
        payload.bncc_competencias = []
        payload.infantil_direitos = direitosSelecionados
        payload.infantil_campos_experiencia = campoExpSelecionado ? [campoExpSelecionado] : []
        payload.infantil_objetivos = objetivosInfantilSelecionados
      }

      let res
      if (diarioId) {
        res = await supabase.from('diario_conteudo').update(payload).eq('id', diarioId)
      } else {
        res = await supabase.from('diario_conteudo').insert([payload]).select('id').single()
        if (res.data?.id) {
          setDiarioId(res.data.id)
        }
      }

      if (res.error) throw res.error

      toast.success('Diário de Conteúdo BNCC registrado e salvo com sucesso!')
      carregarHistoricoAulas()
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao salvar Diário de Conteúdo: ' + (err.message || 'Falha na gravação'))
    } finally {
      setSavingDiario(false)
    }
  }

  // Deletar Diário
  const handleDeletarDiario = async (idParaDeletar: string) => {
    if (!confirm('Deseja realmente excluir este registro de diário de aula?')) return

    try {
      const { error } = await supabase.from('diario_conteudo').delete().eq('id', idParaDeletar)
      if (error) throw error

      toast.success('Registro de diário excluído.')
      if (diarioId === idParaDeletar) {
        setDiarioId(null)
        setConteudoResumo('')
        setMetodologia('')
        setRecursosDidaticos('')
        setTarefaCasa('')
        setObservacoesPedagogicas('')
        setHabilidadesSelecionadas([])
      }
      carregarHistoricoAulas()
    } catch (err: any) {
      toast.error('Erro ao excluir registro: ' + err.message)
    }
  }

  // Listas de Opções BNCC Baseadas na Seleção
  const componenteDados = useMemo(() => {
    if (!componenteSelecionado) return null
    return ESTRUTURA_FUNDAMENTAL_BNCC[componenteSelecionado] || null
  }, [componenteSelecionado])

  const unidadesDisponiveis = useMemo(() => {
    return componenteDados?.unidades || []
  }, [componenteDados])

  const unidadeDados = useMemo(() => {
    if (!unidadeSelecionada || !componenteDados) return null
    return componenteDados.unidades.find((u) => u.unidade === unidadeSelecionada) || null
  }, [unidadeSelecionada, componenteDados])

  const objetosDisponiveis = useMemo(() => {
    return unidadeDados?.objetos || []
  }, [unidadeDados])

  const objetoDados = useMemo(() => {
    if (!objetoSelecionado || !unidadeDados) return null
    return unidadeDados.objetos.find((o) => o.objeto === objetoSelecionado) || null
  }, [objetoSelecionado, unidadeDados])

  const habilidadesDisponiveis = useMemo(() => {
    return objetoDados?.habilidades || []
  }, [objetoDados])

  const campoExpDados = useMemo(() => {
    if (!campoExpSelecionado) return null
    return CAMPOS_EXPERIENCIA_INFANTIL.find((c) => c.nome === campoExpSelecionado) || null
  }, [campoExpSelecionado])

  // Se for EMAEE ou Cursinho, exibe bloqueio amigável de escopo
  if (isEmaeeOuCursinho) {
    return (
      <div className="p-8 text-center bg-card/40 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-3">
        <div className="p-3 bg-muted rounded-full text-muted-foreground">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h4 className="font-bold text-base text-foreground">Diário de Conteúdo / BNCC Indisponível</h4>
        <p className="text-sm text-muted-foreground max-w-md">
          O Diário de Conteúdo BNCC aplica-se à Educação Básica regular (Infantil, Fundamental e EJA). Unidades especializadas do tipo EMAEE e turmas preparatórias de Cursinho Pré-Universitário possuem fluxos de atendimento específicos.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. Barra de Parâmetros da Aula (Data, Matéria, Horário) */}
      <div className="bg-card/70 border border-border p-4 rounded-2xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpenCheck className="w-5 h-5 text-sky-500" />
            <h3 className="font-bold text-sm text-foreground">Diário de Conteúdo Pedagógico</h3>
            <Badge variant="outline" className="text-[11px] font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20">
              Alinhado à BNCC
            </Badge>
          </div>

          {/* Toggle de Etapa */}
          <div className="flex items-center bg-muted p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setEtapaEnsino('FUNDAMENTAL')}
              className={cn(
                'px-3 py-1 rounded-lg transition-all',
                etapaEnsino === 'FUNDAMENTAL'
                  ? 'bg-card text-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Ensino Fundamental / EJA
            </button>
            <button
              onClick={() => setEtapaEnsino('INFANTIL')}
              className={cn(
                'px-3 py-1 rounded-lg transition-all',
                etapaEnsino === 'INFANTIL'
                  ? 'bg-card text-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Educação Infantil
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Data da Aula
            </label>
            <Input
              type="date"
              value={dataAula}
              onChange={(e) => setDataAula(e.target.value)}
              className="bg-background border-border text-sm h-9"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Disciplina / Componente
            </label>
            <select
              value={selectedMateriaId || materiaAtiva?.id || ''}
              onChange={(e) => setSelectedMateriaId && setSelectedMateriaId(e.target.value)}
              className="w-full bg-background border border-border rounded-xl text-sm h-9 px-3 text-foreground focus:ring-1 focus:ring-primary outline-none"
            >
              {materias.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Horário / Turno
            </label>
            <select
              value={horarioSlot}
              onChange={(e) => setHorarioSlot(e.target.value)}
              className="w-full bg-background border border-border rounded-xl text-sm h-9 px-3 text-foreground focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="1º Horário (07:30 - 08:20)">1º Horário (07:30 - 08:20)</option>
              <option value="2º Horário (08:20 - 09:10)">2º Horário (08:20 - 09:10)</option>
              <option value="3º Horário (09:30 - 10:20)">3º Horário (09:30 - 10:20)</option>
              <option value="4º Horário (10:20 - 11:10)">4º Horário (10:20 - 11:10)</option>
              <option value="5º Horário (11:10 - 12:00)">5º Horário (11:10 - 12:00)</option>
              <option value="Vespertino / Noturno">Vespertino / Noturno</option>
              <option value="Aula Dupla / Bloco">Aula Dupla / Bloco</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. REGRA DE NEGÓCIO RN01: Bloqueio por Chamada Pendente */}
      {checkingFreq ? (
        <div className="p-4 bg-muted/40 rounded-2xl border border-border text-center text-xs text-muted-foreground animate-pulse">
          Validando integridade jurídica e registros de frequência da aula...
        </div>
      ) : !hasFrequenciaLancada ? (
        <div className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-900 dark:text-amber-300 space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Bloqueio por Chamada Pendente (RN01)</h4>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-1 leading-relaxed">
                Por exigência legal do MEC e auditoria de registros letivos, o Diário de Conteúdo fica bloqueado até que a chamada (frequência) desta aula seja realizada e gravada no sistema.
              </p>
            </div>
          </div>

          {onNavigateToFrequencia && (
            <div className="pt-2 flex justify-end">
              <Button
                onClick={onNavigateToFrequencia}
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2 text-xs rounded-xl shadow-xs cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                Realizar Frequência Desta Data Agora
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              <strong>Frequência Validada:</strong> {totalPresentes} de {totalAlunosFreq} alunos com presença registrada nesta aula.
            </span>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-none font-bold text-[10px]">
            RN01 OK
          </Badge>
        </div>
      )}

      {/* 3. Formulário de Conteúdo e Taxonomia BNCC (Habilitado se RN01 atendido) */}
      <div className={cn('space-y-4 transition-opacity', !hasFrequenciaLancada && 'opacity-40 pointer-events-none')}>
        {/* ETAPA ENSINO FUNDAMENTAL */}
        {etapaEnsino === 'FUNDAMENTAL' && (
          <div className="bg-card border border-border p-4 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Taxonomia BNCC - Ensino Fundamental
              </span>
              <span className="text-[11px] text-muted-foreground">Amarração Curricular Obrigatória</span>
            </div>

            {/* Hierarquia em Cascata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Unidade Temática */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  3. Unidade Temática / Eixo
                </label>
                <select
                  value={unidadeSelecionada}
                  onChange={(e) => {
                    setUnidadeSelecionada(e.target.value)
                    setObjetoSelecionado('')
                    setHabilidadesSelecionadas([])
                  }}
                  className="w-full bg-background border border-border rounded-xl text-xs h-9 px-3 text-foreground focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="">Selecione a Unidade Temática...</option>
                  {unidadesDisponiveis.map((u) => (
                    <option key={u.unidade} value={u.unidade}>
                      {u.unidade}
                    </option>
                  ))}
                </select>
              </div>

              {/* Objeto de Conhecimento */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  4. Objeto de Conhecimento (Conteúdo Específico)
                </label>
                <select
                  value={objetoSelecionado}
                  onChange={(e) => {
                    setObjetoSelecionado(e.target.value)
                    setHabilidadesSelecionadas([])
                  }}
                  disabled={!unidadeSelecionada}
                  className="w-full bg-background border border-border rounded-xl text-xs h-9 px-3 text-foreground focus:ring-1 focus:ring-primary outline-none disabled:opacity-50"
                >
                  <option value="">Selecione o Objeto de Conhecimento...</option>
                  {objetosDisponiveis.map((o) => (
                    <option key={o.objeto} value={o.objeto}>
                      {o.objeto}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 5. Habilidades Oficiais (Códigos Alfanuméricos) */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                5. Habilidades Oficiais da BNCC (Selecione uma ou mais)
              </label>

              {habilidadesDisponiveis.length === 0 ? (
                <p className="text-xs text-muted-foreground italic bg-muted/30 p-2.5 rounded-xl border border-border/50">
                  {objetoSelecionado
                    ? 'Nenhuma habilidade específica mapeada para este objeto. Digite o código nos campos de anotação se necessário.'
                    : 'Selecione a Unidade Temática e o Objeto de Conhecimento acima para listar os códigos de habilidades oficiais (ex: EF04MA19).'}
                </p>
              ) : (
                <div className="space-y-2">
                  {habilidadesDisponiveis.map((hab) => {
                    const isSelected = habilidadesSelecionadas.includes(hab.codigo)
                    return (
                      <div
                        key={hab.codigo}
                        onClick={() => {
                          if (isSelected) {
                            setHabilidadesSelecionadas(habilidadesSelecionadas.filter((c) => c !== hab.codigo))
                          } else {
                            setHabilidadesSelecionadas([...habilidadesSelecionadas, hab.codigo])
                          }
                        }}
                        className={cn(
                          'p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5',
                          isSelected
                            ? 'bg-primary/10 border-primary/40 text-foreground font-medium'
                            : 'bg-background hover:bg-muted/50 border-border text-muted-foreground'
                        )}
                      >
                        <Badge
                          className={cn(
                            'text-[10px] font-bold shrink-0',
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {hab.codigo}
                        </Badge>
                        <span className="leading-relaxed">{hab.descricao}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 6. Competências Gerais da Educação Básica */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                6. Competências Gerais Trabalhadas nesta Aula (Opcional)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMPETENCIAS_GERAIS_BNCC.map((comp) => {
                  const cod = `CG${comp.numero}`
                  const isSelected = competenciasSelecionadas.includes(cod)
                  return (
                    <button
                      type="button"
                      key={comp.numero}
                      onClick={() => {
                        if (isSelected) {
                          setCompetenciasSelecionadas(competenciasSelecionadas.filter((c) => c !== cod))
                        } else {
                          setCompetenciasSelecionadas([...competenciasSelecionadas, cod])
                        }
                      }}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5',
                        isSelected
                          ? 'bg-violet-500/20 border-violet-500/40 text-violet-700 dark:text-violet-300 font-bold'
                          : 'bg-background border-border text-muted-foreground hover:text-foreground'
                      )}
                      title={comp.descricao}
                    >
                      <span className="text-[10px] opacity-70">#{comp.numero}</span>
                      <span>{comp.titulo}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ETAPA EDUCAÇÃO INFANTIL */}
        {etapaEnsino === 'INFANTIL' && (
          <div className="bg-card border border-border p-4 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Taxonomia BNCC - Educação Infantil
              </span>
              <span className="text-[11px] text-muted-foreground">Direitos e Campos de Experiência</span>
            </div>

            {/* Direitos de Aprendizagem */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                1. Direitos de Aprendizagem e Desenvolvimento Assegurados
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DIREITOS_APRENDIZAGEM_INFANTIL.map((dir) => {
                  const isSelected = direitosSelecionados.includes(dir.nome)
                  return (
                    <button
                      type="button"
                      key={dir.nome}
                      onClick={() => {
                        if (isSelected) {
                          setDireitosSelecionados(direitosSelecionados.filter((d) => d !== dir.nome))
                        } else {
                          setDireitosSelecionados([...direitosSelecionados, dir.nome])
                        }
                      }}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer',
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold'
                          : 'bg-background border-border text-muted-foreground hover:text-foreground'
                      )}
                      title={dir.descricao}
                    >
                      {dir.nome}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Campos de Experiência */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                2. Campo de Experiência Normativo
              </label>
              <select
                value={campoExpSelecionado}
                onChange={(e) => {
                  setCampoExpSelecionado(e.target.value)
                  setObjetivosInfantilSelecionados([])
                }}
                className="w-full bg-background border border-border rounded-xl text-xs h-9 px-3 text-foreground focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="">Selecione o Campo de Experiência...</option>
                {CAMPOS_EXPERIENCIA_INFANTIL.map((c) => (
                  <option key={c.codigo} value={c.nome}>
                    [{c.codigo}] {c.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Objetivos de Aprendizagem */}
            {campoExpDados && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  3. Objetivos de Aprendizagem e Desenvolvimento (Códigos EI)
                </label>
                <div className="space-y-2">
                  {campoExpDados.objetivos.map((obj) => {
                    const isSelected = objetivosInfantilSelecionados.includes(obj.codigo)
                    return (
                      <div
                        key={obj.codigo}
                        onClick={() => {
                          if (isSelected) {
                            setObjetivosInfantilSelecionados(
                              objetivosInfantilSelecionados.filter((c) => c !== obj.codigo)
                            )
                          } else {
                            setObjetivosInfantilSelecionados([...objetivosInfantilSelecionados, obj.codigo])
                          }
                        }}
                        className={cn(
                          'p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5',
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/40 text-foreground font-medium'
                            : 'bg-background hover:bg-muted/50 border-border text-muted-foreground'
                        )}
                      >
                        <Badge
                          className={cn(
                            'text-[10px] font-bold shrink-0',
                            isSelected
                              ? 'bg-amber-600 text-white'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {obj.codigo}
                        </Badge>
                        <span className="leading-relaxed">{obj.descricao}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* DETALHAMENTO DA AULA */}
        <div className="bg-card border border-border p-4 rounded-2xl space-y-3">
          <h4 className="font-bold text-xs text-foreground uppercase tracking-wider text-muted-foreground">
            Detalhamento & Desenvolvimento Didático da Aula
          </h4>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
              Resumo do Conteúdo Ministrado * <span className="text-destructive font-normal">(Obrigatório)</span>
            </label>
            <Input
              value={conteudoResumo}
              onChange={(e) => setConteudoResumo(e.target.value)}
              placeholder="Ex: Introdução à simetria reflexiva através de figuras geométricas e recorte em papel..."
              className="bg-background border-border text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Metodologia & Procedimentos Didáticos
              </label>
              <Textarea
                value={metodologia}
                onChange={(e) => setMetodologia(e.target.value)}
                placeholder="Ex: Aula expositiva dialogada com dinâmicas em grupo e resolução de problemas no quadro..."
                rows={3}
                className="bg-background border-border text-xs resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Recursos Didáticos Utilizados
              </label>
              <Textarea
                value={recursosDidaticos}
                onChange={(e) => setRecursosDidaticos(e.target.value)}
                placeholder="Ex: Livro didático PNLD (pág. 42-45), régua, papel quadriculado, projetor..."
                rows={3}
                className="bg-background border-border text-xs resize-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Tarefa de Casa / Atividade de Fixação (Opcional)
              </label>
              <Input
                value={tarefaCasa}
                onChange={(e) => setTarefaCasa(e.target.value)}
                placeholder="Ex: Exercícios 1 a 4 da página 46 no caderno."
                className="bg-background border-border text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Observações Pedagógicas / Alunos com Dificuldade
              </label>
              <Input
                value={observacoesPedagogicas}
                onChange={(e) => setObservacoesPedagogicas(e.target.value)}
                placeholder="Ex: Alunos com necessidade de reforço em geometria básica."
                className="bg-background border-border text-xs"
              />
            </div>
          </div>

          {/* Botão Salvar Diário */}
          <div className="pt-2 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {diarioId ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ Registro existente carregado para edição
                </span>
              ) : (
                <span>Novo registro para a data {dataAula}</span>
              )}
            </div>

            <Button
              onClick={handleSalvarDiario}
              disabled={savingDiario || !hasFrequenciaLancada}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2 px-5 rounded-xl shadow-md cursor-pointer text-xs"
            >
              <Save className="w-4 h-4" />
              {savingDiario ? 'Gravando Diário...' : diarioId ? 'Atualizar Diário da Aula' : 'Salvar Diário de Conteúdo'}
            </Button>
          </div>
        </div>
      </div>

      {/* 4. Histórico de Aulas Registradas da Turma */}
      <div className="bg-card/50 border border-border p-4 rounded-2xl space-y-3">
        <div className="flex items-center justify-between border-b border-border/70 pb-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">
              Histórico de Diários Registrados ({historicoAulas.length})
            </h4>
          </div>
        </div>

        {loadingHistorico ? (
          <div className="text-xs text-muted-foreground text-center py-4">Carregando histórico...</div>
        ) : historicoAulas.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            Nenhum diário de aula registrado ainda para esta turma.
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {historicoAulas.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-card border border-border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-bold bg-muted text-foreground border-border">
                      {item.data_aula.split('-').reverse().join('/')}
                    </Badge>
                    <span className="font-bold text-foreground">
                      {item.materias?.nome || item.bncc_componente || 'Geral'}
                    </span>
                    <span className="text-muted-foreground">• {item.horario_slot}</span>
                  </div>

                  <p className="text-muted-foreground line-clamp-1 font-medium">
                    {item.conteudo_resumo}
                  </p>

                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {(item.bncc_habilidades || []).map((h: string) => (
                      <span key={h} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono font-bold">
                        {h}
                      </span>
                    ))}
                    {(item.infantil_objetivos || []).map((o: string) => (
                      <span key={o} className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-mono font-bold">
                        {o}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setDataAula(item.data_aula)
                      if (item.materia_id && setSelectedMateriaId) {
                        setSelectedMateriaId(item.materia_id)
                      }
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    className="h-8 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 rounded-lg cursor-pointer"
                  >
                    Editar Aula
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeletarDiario(item.id)}
                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
