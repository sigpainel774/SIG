'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, User, Clock, CalendarDays, ArrowLeft, Check, Sparkles, Clock3, AlertCircle } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { getAvatarUrl } from '@/lib/photoHelper'

import {
  ESPECIALIDADES_CANONICAS_PADRAO,
  deduzirEspecialidadeDeCargo,
  obterEspecialidadesEmaee,
  saoEspecialidadesEquivalentes
} from '@/lib/emaeeEspecialidades'

export const ESPECIALIDADES_CANONICAS = ESPECIALIDADES_CANONICAS_PADRAO
export type EspecialidadeCanonicasTipo = (typeof ESPECIALIDADES_CANONICAS)[number]
export { deduzirEspecialidadeDeCargo }

export interface ProfissionalAEEItem {
  id: string
  nome: string
  cargo: string | null
  registro_profissional: string | null
  foto_url: string | null
  foto_avatar_path: string | null
  foto_visualizacao_path: string | null
  foto_updated_at: string | null
}

export interface VinculoAEEConfig {
  id?: string // Se já persistido no banco
  tempId: string // Identificador único local para react key
  status?: 'EM_ATENDIMENTO' | 'FILA_ESPERA' | 'EM_INVESTIGACAO' | 'CONCLUIDO_ALTA' | 'DESISTENCIA'
  prioridade?: 'NORMAL' | 'PRIORITARIO' | 'JUDICIAL'
  motivoFila?: string | null
  especialidade: string
  especialidadeOutros?: string | null
  profissionalId?: string | null
  profissionalNome?: string | null
  profissionalCargo?: string | null
  profissionalFoto?: string | null
  frequencia?: 'SEMANAL' | 'QUINZENAL' | null
  diaSemana?: number | null
  dataInicio?: string | null // 'YYYY-MM-DD'
  dataSolicitacao?: string | null
  horarioInicio?: string | null
  horarioFim?: string | null
  isNovo?: boolean // Flag local para indicar inserção pendente
  isRemovido?: boolean // Flag local para indicar inativação pendente
  isEditado?: boolean // Flag local para indicar alteração pendente
}

export interface ModalVincularProfissionalAlunoAEEProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vinculosExistentes: VinculoAEEConfig[]
  onAdicionarVinculo: (novoVinculo: VinculoAEEConfig) => void
  vinculoParaEditar?: VinculoAEEConfig | null
  onSalvarEdicao?: (vinculoEditado: VinculoAEEConfig) => void
  escolaEmaeeId?: string
  modoInicial?: 'ATENDIMENTO' | 'FILA_ESPERA'
}

export const DIAS_SEMANA = [
  { valor: 1, label: 'Segunda-feira' },
  { valor: 2, label: 'Terça-feira' },
  { valor: 3, label: 'Quarta-feira' },
  { valor: 4, label: 'Quinta-feira' },
  { valor: 5, label: 'Sexta-feira' },
  { valor: 6, label: 'Sábado' }
]

export function ModalVincularProfissionalAlunoAEE({
  open,
  onOpenChange,
  vinculosExistentes,
  onAdicionarVinculo,
  vinculoParaEditar,
  onSalvarEdicao,
  escolaEmaeeId,
  modoInicial = 'ATENDIMENTO'
}: ModalVincularProfissionalAlunoAEEProps) {
  const isEditing = Boolean(vinculoParaEditar)
  const [tipoModal, setTipoModal] = useState<'ATENDIMENTO' | 'FILA_ESPERA'>(modoInicial)
  const [etapa, setEtapa] = useState<'selecionar' | 'configurar'>('selecionar')
  const [profissionais, setProfissionais] = useState<ProfissionalAEEItem[]>([])
  const [loading, setLoading] = useState(false)
  const [termoBusca, setTermoBusca] = useState('')

  // Profissional selecionado para configuração
  const [profSelecionado, setProfSelecionado] = useState<ProfissionalAEEItem | null>(null)

  // Estados da Escala / Atendimento
  const [frequencia, setFrequencia] = useState<'SEMANAL' | 'QUINZENAL'>('SEMANAL')
  const [dataInicio, setDataInicio] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [diaSemana, setDiaSemana] = useState<number>(1)
  const [horarioInicio, setHorarioInicio] = useState('08:00')
  const [horarioFim, setHorarioFim] = useState('09:00')

  // Estados da Fila de Espera
  const [listaEspecialidades, setListaEspecialidades] = useState<string[]>(Array.from(ESPECIALIDADES_CANONICAS_PADRAO))
  const [especialidadeFila, setEspecialidadeFila] = useState<string>('Psicologia')
  const [especialidadeOutrosFila, setEspecialidadeOutrosFila] = useState<string>('')
  const [prioridadeFila, setPrioridadeFila] = useState<'NORMAL' | 'PRIORITARIO' | 'JUDICIAL'>('NORMAL')
  const [motivoFila, setMotivoFila] = useState<string>('')

  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // Handler para sincronizar dia da semana a partir da data de início escolhida
  const handleDataInicioChange = (novaData: string) => {
    setDataInicio(novaData)
    if (novaData) {
      const parts = novaData.split('-').map(Number)
      if (parts.length === 3) {
        const [ano, mes, dia] = parts
        if (ano && mes && dia) {
          const dt = new Date(ano, mes - 1, dia)
          const jsDay = dt.getDay() // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
          if (jsDay >= 1 && jsDay <= 6) {
            setDiaSemana(jsDay)
          } else if (jsDay === 0) {
            setDiaSemana(1)
          }
        }
      }
    }
  }

  // Reset / Inicialização ao fechar/abrir
  useEffect(() => {
    if (open) {
      obterEspecialidadesEmaee(escolaEmaeeId).then((esps) => {
        if (isMounted.current && esps && esps.length > 0) {
          setListaEspecialidades(esps)
        }
      }).catch((err) => {
        console.warn('Erro ao carregar especialidades dinâmicas do EMAEE:', err)
      })

      if (vinculoParaEditar) {
        const isFila = vinculoParaEditar.status === 'FILA_ESPERA' || !vinculoParaEditar.profissionalId
        if (isFila) {
          setTipoModal('FILA_ESPERA')
          setEspecialidadeFila(vinculoParaEditar.especialidade || 'Psicologia')
          setEspecialidadeOutrosFila(vinculoParaEditar.especialidadeOutros || '')
          setPrioridadeFila(vinculoParaEditar.prioridade || 'NORMAL')
          setMotivoFila(vinculoParaEditar.motivoFila || '')
        } else {
          setTipoModal('ATENDIMENTO')
          setEtapa('configurar')
          setProfSelecionado({
            id: vinculoParaEditar.profissionalId!,
            nome: vinculoParaEditar.profissionalNome || 'Profissional AEE',
            cargo: vinculoParaEditar.profissionalCargo || 'Especialista AEE',
            registro_profissional: null,
            foto_url: vinculoParaEditar.profissionalFoto || null,
            foto_avatar_path: null,
            foto_visualizacao_path: null,
            foto_updated_at: null,
          })
          setFrequencia(vinculoParaEditar.frequencia || 'SEMANAL')
          setDataInicio(vinculoParaEditar.dataInicio || new Date().toISOString().split('T')[0])
          setDiaSemana(vinculoParaEditar.diaSemana || 1)
          setHorarioInicio(vinculoParaEditar.horarioInicio?.slice(0, 5) || '08:00')
          setHorarioFim(vinculoParaEditar.horarioFim?.slice(0, 5) || '09:00')
        }
        carregarProfissionaisAEE()
      } else {
        setTipoModal(modoInicial)
        setEtapa('selecionar')
        setProfSelecionado(null)
        setTermoBusca('')
        setFrequencia('SEMANAL')
        setDataInicio(new Date().toISOString().split('T')[0])
        setDiaSemana(1)
        setHorarioInicio('08:00')
        setHorarioFim('09:00')
        setEspecialidadeFila('Psicologia')
        setEspecialidadeOutrosFila('')
        setPrioridadeFila('NORMAL')
        setMotivoFila('')
        carregarProfissionaisAEE()
      }
    }
  }, [open, vinculoParaEditar, escolaEmaeeId, modoInicial])

  const carregarProfissionaisAEE = async () => {
    setLoading(true)
    const supabase = createBrowserClient()
    try {
      const query = supabase
        .from('funcionarios')
        .select(`
          id, nome, cargo, registro_profissional,
          foto_url, foto_avatar_path, foto_visualizacao_path, foto_updated_at,
          is_profissional_aee, status
        `)
        .eq('is_profissional_aee', true)
        .eq('status', 'ativo')
        .is('deleted_at', null)
        .order('nome', { ascending: true })

      const { data, error } = await query

      if (error) throw error

      if (isMounted.current && data) {
        setProfissionais(data as ProfissionalAEEItem[])
      }
    } catch (err: any) {
      console.error('Erro ao buscar catálogo de profissionais AEE:', err)
      toast.error('Erro ao listar profissionais AEE da rede.')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  // Filtragem com busca textual sem acentos
  const profissionaisFiltrados = useMemo(() => {
    if (!termoBusca.trim()) return profissionais

    const normalizar = (str: string) =>
      (str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()

    const termoNorm = normalizar(termoBusca)

    return profissionais.filter((p) => {
      const nomeNorm = normalizar(p.nome)
      const cargoNorm = normalizar(p.cargo ?? '')
      const regNorm = normalizar(p.registro_profissional ?? '')
      return (
        nomeNorm.includes(termoNorm) ||
        cargoNorm.includes(termoNorm) ||
        regNorm.includes(termoNorm)
      )
    })
  }, [profissionais, termoBusca])

  const handleSelecionarProfissional = (prof: ProfissionalAEEItem) => {
    setProfSelecionado(prof)
    setEtapa('configurar')
  }

  const handleConfirmarAtendimento = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!profSelecionado) return

    if (!horarioInicio || !horarioFim) {
      toast.error('Informe os horários de início e término do atendimento.')
      return
    }

    if (horarioInicio >= horarioFim) {
      toast.error('O horário de término deve ser posterior ao horário de início.')
      return
    }

    const espNome = deduzirEspecialidadeDeCargo(profSelecionado.cargo)

    // Verificar se já existe vínculo igual (mesmo profissional, mesmo dia e mesmo horário)
    const conflitoExistente = vinculosExistentes.some((v) => {
      if (v.isRemovido) return false
      // Se estiver editando, desconsidera o próprio registro sendo editado
      if (vinculoParaEditar) {
        const mesmoId = vinculoParaEditar.id && v.id === vinculoParaEditar.id
        const mesmoTempId = vinculoParaEditar.tempId && v.tempId === vinculoParaEditar.tempId
        if (mesmoId || mesmoTempId) return false
      }
      return (
        v.status !== 'FILA_ESPERA' &&
        v.profissionalId === profSelecionado.id &&
        v.diaSemana === diaSemana &&
        v.horarioInicio === horarioInicio
      )
    })

    if (conflitoExistente) {
      toast.error('Já existe um atendimento agendado para este profissional no mesmo dia e horário.')
      return
    }

    const avatarUrl = getAvatarUrl(profSelecionado) || profSelecionado.foto_url

    if (vinculoParaEditar && onSalvarEdicao) {
      const vinculoAtualizado: VinculoAEEConfig = {
        ...vinculoParaEditar,
        status: 'EM_ATENDIMENTO',
        especialidade: espNome,
        profissionalId: profSelecionado.id,
        profissionalNome: profSelecionado.nome,
        profissionalCargo: profSelecionado.cargo ?? 'Especialista AEE',
        profissionalFoto: avatarUrl,
        frequencia,
        diaSemana,
        dataInicio,
        horarioInicio,
        horarioFim,
        isEditado: true
      }
      onSalvarEdicao(vinculoAtualizado)
      toast.success(`Atendimento de ${profSelecionado.nome} atualizado!`)
      onOpenChange(false)
      return
    }

    const novoVinculo: VinculoAEEConfig = {
      tempId: crypto.randomUUID(),
      status: 'EM_ATENDIMENTO',
      especialidade: espNome,
      profissionalId: profSelecionado.id,
      profissionalNome: profSelecionado.nome,
      profissionalCargo: profSelecionado.cargo ?? 'Especialista AEE',
      profissionalFoto: avatarUrl,
      frequencia,
      diaSemana,
      dataInicio,
      horarioInicio,
      horarioFim,
      isNovo: true
    }

    onAdicionarVinculo(novoVinculo)
    toast.success(`Profissional ${profSelecionado.nome} vinculado com sucesso!`)
    onOpenChange(false)
  }

  const handleConfirmarFila = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const espFinal = especialidadeFila === 'Outros' && especialidadeOutrosFila.trim()
      ? especialidadeOutrosFila.trim()
      : especialidadeFila

    // Verificar se a especialidade já está cadastrada
    const jaCadastrada = vinculosExistentes.some((v) => {
      if (v.isRemovido) return false
      if (vinculoParaEditar) {
        const mesmoId = vinculoParaEditar.id && v.id === vinculoParaEditar.id
        const mesmoTempId = vinculoParaEditar.tempId && v.tempId === vinculoParaEditar.tempId
        if (mesmoId || mesmoTempId) return false
      }
      return saoEspecialidadesEquivalentes(v.especialidade, espFinal)
    })

    if (jaCadastrada) {
      toast.error(`A especialidade "${espFinal}" já consta na ficha do aluno (em atendimento ou na fila).`)
      return
    }

    if (vinculoParaEditar && onSalvarEdicao) {
      const vinculoAtualizado: VinculoAEEConfig = {
        ...vinculoParaEditar,
        status: 'FILA_ESPERA',
        especialidade: espFinal,
        especialidadeOutros: especialidadeFila === 'Outros' ? especialidadeOutrosFila : null,
        prioridade: prioridadeFila,
        motivoFila: motivoFila.trim() || null,
        profissionalId: null,
        profissionalNome: null,
        profissionalCargo: null,
        profissionalFoto: null,
        diaSemana: null,
        horarioInicio: null,
        horarioFim: null,
        isEditado: true
      }
      onSalvarEdicao(vinculoAtualizado)
      toast.success(`Demanda de ${espFinal} atualizada na fila de espera!`)
      onOpenChange(false)
      return
    }

    const novoVinculo: VinculoAEEConfig = {
      tempId: crypto.randomUUID(),
      status: 'FILA_ESPERA',
      especialidade: espFinal,
      especialidadeOutros: especialidadeFila === 'Outros' ? especialidadeOutrosFila : null,
      prioridade: prioridadeFila,
      motivoFila: motivoFila.trim() || null,
      dataSolicitacao: new Date().toISOString().split('T')[0],
      profissionalId: null,
      profissionalNome: null,
      profissionalCargo: null,
      profissionalFoto: null,
      diaSemana: null,
      horarioInicio: null,
      horarioFim: null,
      isNovo: true
    }

    onAdicionarVinculo(novoVinculo)
    toast.success(`Especialidade ${espFinal} incluída na fila de espera!`)
    onOpenChange(false)
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        isEditing
          ? tipoModal === 'FILA_ESPERA'
            ? 'Editar Demanda em Fila de Espera'
            : `Editar Atendimento: ${profSelecionado?.nome ?? ''}`
          : tipoModal === 'FILA_ESPERA'
            ? 'Adicionar Demanda na Fila de Espera'
            : etapa === 'selecionar'
              ? 'Selecionar Especialista AEE — EMAEE'
              : `Definir Atendimento: ${profSelecionado?.nome ?? ''}`
      }
      description={
        tipoModal === 'FILA_ESPERA'
          ? 'Cadastre uma especialidade que o aluno necessita para inclusão na fila de espera do EMAEE.'
          : etapa === 'selecionar'
            ? 'Escolha o profissional do corpo técnico do EMAEE para realizar o atendimento especializado do estudante.'
            : 'Configure a frequência, o dia da semana e a faixa de horários do atendimento.'
      }
      maxWidth="sm:max-w-xl"
    >
      <div className="space-y-4 py-1">
        {/* Seletor de Modo (Apenas ao criar novo registro) */}
        {!isEditing && (
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted/60 dark:bg-[#141416] rounded-xl border border-border">
            <button
              type="button"
              onClick={() => {
                setTipoModal('ATENDIMENTO')
                setEtapa('selecionar')
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                tipoModal === 'ATENDIMENTO'
                  ? 'bg-card dark:bg-[#1f1f23] text-primary border border-border shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="w-4 h-4" />
              Vincular Especialista (Com Vaga)
            </button>
            <button
              type="button"
              onClick={() => setTipoModal('FILA_ESPERA')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                tipoModal === 'FILA_ESPERA'
                  ? 'bg-card dark:bg-[#1f1f23] text-amber-500 border border-border shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Clock3 className="w-4 h-4" />
              Adicionar à Fila de Espera
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODO 1: FILA DE ESPERA POR ESPECIALIDADE                                  */}
        {/* ========================================================================= */}
        {tipoModal === 'FILA_ESPERA' && (
          <form onSubmit={handleConfirmarFila} className="space-y-4">
            <div className="p-4 rounded-xl border border-border bg-card dark:bg-[#141416] space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Especialidade Demandada <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={especialidadeFila}
                  onValueChange={(val) => setEspecialidadeFila(val || 'Psicologia')}
                >
                  <SelectTrigger className="h-10 bg-background dark:bg-[#181818] border-border text-foreground text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card dark:bg-[#181818] border-border text-foreground text-xs">
                    {listaEspecialidades.map((esp) => (
                      <SelectItem key={esp} value={esp}>
                        {esp}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {especialidadeFila === 'Outros' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Especifique a Especialidade <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    placeholder="Ex: Terapia de Integração Sensorial"
                    value={especialidadeOutrosFila}
                    onChange={(e) => setEspecialidadeOutrosFila(e.target.value)}
                    required
                    className="h-9 bg-background dark:bg-[#181818] border-border text-foreground text-xs rounded-xl"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Prioridade do Acolhimento
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPrioridadeFila('NORMAL')}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      prioridadeFila === 'NORMAL'
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-border bg-background dark:bg-[#181818] text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    Normal (Ordem Cronológica)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrioridadeFila('PRIORITARIO')}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      prioridadeFila === 'PRIORITARIO'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-500 shadow-sm'
                        : 'border-border bg-background dark:bg-[#181818] text-muted-foreground hover:border-amber-500/40'
                    }`}
                  >
                    Prioritário (Laudo Urgente)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrioridadeFila('JUDICIAL')}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      prioridadeFila === 'JUDICIAL'
                        ? 'border-rose-500 bg-rose-500/10 text-rose-500 shadow-sm'
                        : 'border-border bg-background dark:bg-[#181818] text-muted-foreground hover:border-rose-500/40'
                    }`}
                  >
                    Mandado Judicial
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Motivo / Observações da Fila (Opcional)
                </Label>
                <Input
                  type="text"
                  placeholder="Ex: Aguardando abertura de vaga no turno matutino"
                  value={motivoFila}
                  onChange={(e) => setMotivoFila(e.target.value)}
                  className="h-9 bg-background dark:bg-[#181818] border-border text-foreground text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-xs text-muted-foreground hover:text-foreground h-9 rounded-xl cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9 px-4 rounded-xl gap-1.5 shadow-sm cursor-pointer"
              >
                <Check className="w-4 h-4" />
                {isEditing ? 'Salvar Demanda' : 'Adicionar à Fila'}
              </Button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* MODO 2: ATENDIMENTO COM PROFISSIONAL                                      */}
        {/* ========================================================================= */}
        {tipoModal === 'ATENDIMENTO' && etapa === 'selecionar' && (
          <div className="space-y-3">
            {/* Campo de Busca */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Buscar por nome, cargo ou registro profissional..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                className="pl-9 bg-background dark:bg-[#141416] border-border text-foreground text-xs rounded-xl focus-visible:ring-1 focus-visible:ring-primary"
                autoFocus
              />
            </div>

            {/* Listagem com Scroll */}
            <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {loading ? (
                <div className="p-8 text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-muted-foreground">Carregando catálogo de especialistas AEE...</p>
                </div>
              ) : profissionaisFiltrados.length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed border-border bg-muted/30 dark:bg-[#181818]/60 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-muted dark:bg-[#1f1f23] border border-border flex items-center justify-center mx-auto text-muted-foreground">
                    <User className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">
                    {termoBusca ? 'Nenhum profissional encontrado para esta busca.' : 'Nenhum profissional AEE cadastrado.'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {termoBusca
                      ? 'Tente buscar por termos diferentes ou confira a ortografia.'
                      : 'Certifique-se de que os funcionários estejam marcados como "Profissional AEE" no cadastro de Servidores.'}
                  </p>
                </div>
              ) : (
                profissionaisFiltrados.map((prof) => {
                  const avatarUrl = getAvatarUrl(prof) || prof.foto_url
                  const jaVinculadoCount = vinculosExistentes.filter(
                    (v) => !v.isRemovido && v.profissionalId === prof.id
                  ).length

                  return (
                    <div
                      key={prof.id}
                      onClick={() => handleSelecionarProfissional(prof)}
                      className="p-3 rounded-xl border border-border bg-card dark:bg-[#141416] hover:bg-muted/60 dark:hover:bg-[#1c1c20] hover:border-primary/50 transition-all flex items-center justify-between gap-3 cursor-pointer group shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-muted dark:bg-[#1f1f23] border border-border overflow-hidden shrink-0 flex items-center justify-center">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={prof.nome}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none'
                              }}
                            />
                          ) : (
                            <User className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            {prof.nome}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="truncate">{prof.cargo ?? 'Especialista AEE'}</span>
                            {prof.registro_profissional && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-[10px] bg-muted dark:bg-[#1f1f23] px-1.5 py-0.5 rounded border border-border">
                                  {prof.registro_profissional}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {jaVinculadoCount > 0 && (
                          <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold">
                            {jaVinculadoCount} {jaVinculadoCount === 1 ? 'horário' : 'horários'}
                          </span>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-primary font-bold hover:bg-primary/10 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-all cursor-pointer"
                        >
                          Selecionar
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODO 2: CONFIGURAÇÃO DE ATENDIMENTO COM PROFISSIONAL                      */}
        {/* ========================================================================= */}
        {tipoModal === 'ATENDIMENTO' && etapa === 'configurar' && profSelecionado && (
          <form onSubmit={handleConfirmarAtendimento} className="space-y-4">
            {/* Header com Profissional Selecionado */}
            <div className="p-3 rounded-xl border border-border bg-muted/40 dark:bg-[#141416] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-muted dark:bg-[#1f1f23] border border-border overflow-hidden shrink-0 flex items-center justify-center">
                  {getAvatarUrl(profSelecionado) || profSelecionado.foto_url ? (
                    <img
                      src={(getAvatarUrl(profSelecionado) || profSelecionado.foto_url)!}
                      alt={profSelecionado.nome}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{profSelecionado.nome}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{profSelecionado.cargo ?? 'Especialista AEE'}</p>
                </div>
              </div>

              {!isEditing && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEtapa('selecionar')}
                  className="text-xs text-muted-foreground hover:text-foreground h-7 gap-1 rounded-lg cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Trocar
                </Button>
              )}
            </div>

            {/* Configurações de Atendimento */}
            <div className="space-y-3.5 p-4 rounded-xl border border-border bg-card dark:bg-[#141416]">
              {/* 1. Periodicidade */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Periodicidade do Atendimento
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFrequencia('SEMANAL')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      frequencia === 'SEMANAL'
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-border bg-background dark:bg-[#181818] text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    Semanal (Toda semana)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFrequencia('QUINZENAL')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      frequencia === 'QUINZENAL'
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-border bg-background dark:bg-[#181818] text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    Quinzenal (A cada 15 dias)
                  </button>
                </div>

                {frequencia === 'QUINZENAL' && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 leading-relaxed">
                    💡 <strong>Atendimento Quinzenal:</strong> A data inicial abaixo definirá em qual semana o ciclo de 15 dias começará, alternando as semanas automaticamente na agenda.
                  </p>
                )}
              </div>

              {/* 2. Data Inicial e Dia da Semana */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-primary" />
                      Data Inicial do Atendimento <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => handleDataInicioChange(e.target.value)}
                      required
                      className="h-9 bg-background dark:bg-[#181818] border-border text-foreground text-xs rounded-xl cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-primary" />
                      Dia da Semana <span className="text-rose-500">*</span>
                    </Label>
                    <Select
                      value={String(diaSemana)}
                      onValueChange={(val) => setDiaSemana(Number(val))}
                    >
                      <SelectTrigger className="h-9 bg-background dark:bg-[#181818] border-border text-foreground text-xs rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card dark:bg-[#181818] border-border text-foreground text-xs">
                        {DIAS_SEMANA.map((dia) => (
                          <SelectItem key={dia.valor} value={String(dia.valor)}>
                            {dia.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  📅 <strong>Preenchimento no Calendário:</strong> Ao definir uma data inicial retroativa (ex: meses anteriores de 2026), a grade do calendário exibirá automaticamente essas sessões para você registrar presenças e faltas passadas.
                </p>
              </div>

              {/* 3. Horários (Início e Término) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    Horário de Início <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="time"
                    value={horarioInicio}
                    onChange={(e) => setHorarioInicio(e.target.value)}
                    required
                    className="h-9 bg-background dark:bg-[#181818] border-border text-foreground text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    Horário de Término <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="time"
                    value={horarioFim}
                    onChange={(e) => setHorarioFim(e.target.value)}
                    required
                    className="h-9 bg-background dark:bg-[#181818] border-border text-foreground text-xs rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => (isEditing ? onOpenChange(false) : setEtapa('selecionar'))}
                className="text-xs text-muted-foreground hover:text-foreground h-9 rounded-xl cursor-pointer"
              >
                {isEditing ? 'Cancelar' : 'Voltar'}
              </Button>

              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 px-4 rounded-xl gap-1.5 shadow-sm cursor-pointer"
              >
                <Check className="w-4 h-4" />
                {isEditing ? 'Salvar Alterações' : 'Confirmar Vínculo'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </StandardDialog>
  )
}
