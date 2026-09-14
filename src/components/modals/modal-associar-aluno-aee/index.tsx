'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Search, User, Clock, CalendarDays, AlertCircle } from 'lucide-react'

export interface ProfissionalOpcao {
  id: string
  nome: string
  cargo?: string | null
  registro_profissional?: string | null
  foto_url?: string | null
  foto_avatar_path?: string | null
  foto_visualizacao_path?: string | null
  foto_updated_at?: string | null
}

interface ModalAssociarAlunoAEEProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  profissionalId?: string
  profissionalNome?: string
  profissionalCargo?: string
  profissionais?: ProfissionalOpcao[]
  escolaEmaeeId: string
  onSuccess?: () => void
}

export function ModalAssociarAlunoAEE({
  open,
  onOpenChange,
  profissionalId,
  profissionalNome,
  profissionalCargo,
  profissionais,
  escolaEmaeeId,
  onSuccess
}: ModalAssociarAlunoAEEProps) {
  const [isOpen, setIsOpen] = useState(false)
  const activeOpen = open !== undefined ? open : isOpen

  const [loading, setLoading] = useState(false)
  const [loadingProfs, setLoadingProfs] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [listaProfs, setListaProfs] = useState<ProfissionalOpcao[]>(profissionais || [])
  const [selectedProfId, setSelectedProfId] = useState<string>(
    profissionalId || (profissionais && profissionais.length > 0 ? profissionais[0].id : '')
  )
  const [alunosDisponiveis, setAlunosDisponiveis] = useState<any[]>([])
  const [termoBusca, setTermoBusca] = useState<string>('')
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState<string>('')
  const [frequencia, setFrequencia] = useState<string>('SEMANAL')
  const [dataInicio, setDataInicio] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [diaSemana, setDiaSemana] = useState<number>(1)
  const [horarioInicio, setHorarioInicio] = useState<string>('')
  const [horarioFim, setHorarioFim] = useState<string>('')

  const handleDataInicioChange = (novaData: string) => {
    setDataInicio(novaData)
    if (novaData) {
      const [ano, mes, dia] = novaData.split('-').map(Number)
      if (ano && mes && dia) {
        const dt = new Date(ano, mes - 1, dia)
        const jsDay = dt.getDay() // 0=Dom, 1=Seg...
        if (jsDay >= 1 && jsDay <= 6) {
          setDiaSemana(jsDay)
        }
      }
    }
  }

  const supabase = useMemo(() => createClient(), [])

  // Sincroniza lista de profissionais quando a prop mudar
  useEffect(() => {
    if (profissionais && profissionais.length > 0) {
      setListaProfs(profissionais)
    }
  }, [profissionais])

  // Sincroniza profissional selecionado inicial quando abrir ou quando mudar a prop
  useEffect(() => {
    if (activeOpen) {
      if (profissionalId) {
        setSelectedProfId(profissionalId)
      } else if (profissionais && profissionais.length > 0 && !selectedProfId) {
        setSelectedProfId(profissionais[0].id)
      }
    }
  }, [activeOpen, profissionalId, profissionais])

  // Busca lista de profissionais caso não tenha sido passada por prop
  useEffect(() => {
    let isMounted = true

    const fetchProfissionais = async () => {
      if (!activeOpen || (profissionais && profissionais.length > 0) || !escolaEmaeeId) return
      setLoadingProfs(true)
      try {
        const { data: profData, error: profError } = await supabase
          .from('funcionarios')
          .select(`
            id, nome, cargo, registro_profissional, foto_url, foto_avatar_path, foto_visualizacao_path, foto_updated_at,
            vinculos_funcionarios!inner(escola_id, ativo)
          `)
          .eq('vinculos_funcionarios.escola_id', escolaEmaeeId)
          .eq('vinculos_funcionarios.ativo', true)
          .eq('is_profissional_aee', true)
          .is('deleted_at', null)
          .order('nome')

        if (profError) throw profError

        if (isMounted) {
          const vistos = new Set<string>()
          const unicos: ProfissionalOpcao[] = []
          ;(profData || []).forEach((f: any) => {
            if (f?.id && !vistos.has(f.id)) {
              vistos.add(f.id)
              unicos.push(f)
            }
          })
          setListaProfs(unicos)
          if (!selectedProfId && unicos.length > 0) {
            setSelectedProfId(unicos[0].id)
          }
        }
      } catch (err: any) {
        console.error('Erro ao buscar profissionais AEE:', err)
      } finally {
        if (isMounted) setLoadingProfs(false)
      }
    }

    fetchProfissionais()

    return () => {
      isMounted = false
    }
  }, [activeOpen, profissionais, escolaEmaeeId, selectedProfId, supabase])

  // Identifica o profissional atualmente selecionado
  const currentProfObj = useMemo(() => {
    const found = listaProfs.find((p) => p.id === selectedProfId)
    if (found) return found
    if (profissionalId && (profissionalNome || profissionalCargo)) {
      return {
        id: profissionalId,
        nome: profissionalNome || 'Profissional AEE',
        cargo: profissionalCargo || 'Especialista AEE',
      }
    }
    return null
  }, [listaProfs, selectedProfId, profissionalId, profissionalNome, profissionalCargo])

  // Busca alunos disponíveis para o profissional selecionado
  useEffect(() => {
    let isMounted = true

    const fetchAlunos = async () => {
      if (!activeOpen || !escolaEmaeeId || !selectedProfId) {
        if (isMounted) setAlunosDisponiveis([])
        return
      }
      setLoading(true)
      try {
        // Busca matrículas EMAEE desta escola
        const { data: matriculas, error } = await supabase
          .from('emaee_matriculas')
          .select(`
            id,
            status,
            numero_matricula_emaee,
            aluno_id,
            alunos ( id, nome, cpf, nome_mae )
          `)
          .eq('escola_atendimento_id', escolaEmaeeId)
          .is('deleted_at', null)

        if (error) throw error

        // Busca vínculos deste profissional específico para filtrar
        const { data: vinculados, error: vincError } = await supabase
          .from('emaee_especialidades_vinculadas')
          .select('emaee_matricula_id')
          .eq('profissional_id', selectedProfId)
          .eq('ativo', true)

        if (vincError) throw vincError

        const vinculadosIds = (vinculados || []).map((v) => v.emaee_matricula_id)

        if (isMounted) {
          const disponiveis = (matriculas || []).filter((m) => !vinculadosIds.includes(m.id))
          // Ordena por nome do aluno
          disponiveis.sort((a, b) => {
            const nomeA = (a.alunos as any)?.nome || ''
            const nomeB = (b.alunos as any)?.nome || ''
            return nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' })
          })
          setAlunosDisponiveis(disponiveis)
        }
      } catch (err: any) {
        console.error('Erro ao buscar alunos disponíveis:', err)
        toast.error('Erro ao buscar alunos disponíveis para atendimento.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchAlunos()

    return () => {
      isMounted = false
    }
  }, [activeOpen, escolaEmaeeId, selectedProfId, supabase])

  const handleOpenChange = (val: boolean) => {
    if (onOpenChange) onOpenChange(val)
    setIsOpen(val)
    if (!val) {
      setAlunoSelecionadoId('')
      setTermoBusca('')
      setFrequencia('SEMANAL')
      setDiaSemana(1)
      setHorarioInicio('')
      setHorarioFim('')
    }
  }

  // Filtragem dinâmica por nome do aluno ou nome da mãe com normalização NFD sem acento
  const alunosFiltrados = useMemo(() => {
    if (!termoBusca.trim()) return alunosDisponiveis

    const normalizar = (str: string) =>
      (str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()

    const termoNorm = normalizar(termoBusca)

    return alunosDisponiveis.filter((m) => {
      const aluno = m.alunos as any
      const nomeAluno = normalizar(aluno?.nome || '')
      const nomeMae = normalizar(aluno?.nome_mae || '')
      const numMatricula = normalizar(m.numero_matricula_emaee || '')

      return nomeAluno.includes(termoNorm) || nomeMae.includes(termoNorm) || numMatricula.includes(termoNorm)
    })
  }, [alunosDisponiveis, termoBusca])

  const alunoSelecionadoObj = useMemo(() => {
    return alunosDisponiveis.find((m) => m.id === alunoSelecionadoId)
  }, [alunosDisponiveis, alunoSelecionadoId])

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedProfId) {
      toast.error('Selecione um profissional responsável.')
      return
    }

    if (!alunoSelecionadoId) {
      toast.error('Selecione um aluno da lista.')
      return
    }

    if (!horarioInicio.trim()) {
      toast.error('Informe o Horário de Início do atendimento.')
      return
    }

    if (!horarioFim.trim()) {
      toast.error('Informe o Horário Final do atendimento.')
      return
    }

    // Validação de intervalo de horários
    if (horarioInicio && horarioFim && horarioInicio >= horarioFim) {
      toast.error('O Horário Final deve ser posterior ao Horário de Início.')
      return
    }

    setSalvando(true)
    try {
      const formattedInicio = horarioInicio.length === 5 ? `${horarioInicio}:00` : horarioInicio
      const formattedFim = horarioFim.length === 5 ? `${horarioFim}:00` : horarioFim
      const cargoProfissional = currentProfObj?.cargo || profissionalCargo || 'Outros'

      const { error } = await supabase
        .from('emaee_especialidades_vinculadas')
        .insert({
          emaee_matricula_id: alunoSelecionadoId,
          profissional_id: selectedProfId,
          especialidade: cargoProfissional,
          frequencia: frequencia,
          dia_semana: diaSemana,
          data_inicio: dataInicio || new Date().toISOString().split('T')[0],
          horario_inicio: formattedInicio,
          horario_fim: formattedFim,
          ativo: true
        } as any)

      if (error) throw error

      toast.success('Aluno vinculado com sucesso!')
      if (onSuccess) onSuccess()
      handleOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao vincular aluno ao profissional:', err)
      toast.error(err?.message || 'Erro ao vincular aluno ao profissional.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <StandardDialog
      open={activeOpen}
      onOpenChange={handleOpenChange}
      title="Vincular Aluno a Profissional AEE"
      maxWidth="sm:max-w-[560px]"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={salvando}
            className="text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="form-vincular-aee"
            disabled={salvando || loading || !selectedProfId || !alunoSelecionadoId || !horarioInicio || !horarioFim}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 shadow-sm cursor-pointer"
          >
            {salvando ? 'Salvando...' : 'Vincular Atendimento'}
          </Button>
        </div>
      }
    >
      <form id="form-vincular-aee" onSubmit={handleSalvar} className="space-y-5 pb-2">
        {/* Seção de Seleção do Profissional Responsável */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">
            Profissional Responsável (AEE) <span className="text-destructive">*</span>
          </Label>

          {listaProfs.length > 1 ? (
            <Select
              value={selectedProfId}
              onValueChange={(val) => {
                if (val && val !== selectedProfId) {
                  setSelectedProfId(val)
                  setAlunoSelecionadoId('')
                }
              }}
            >
              <SelectTrigger className="w-full bg-background border-border text-foreground text-xs py-2 px-3 h-auto rounded-xl">
                <SelectValue placeholder="Selecione o profissional AEE..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground max-h-60">
                {listaProfs.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="cursor-pointer py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                        AEE
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="font-semibold text-foreground">{p.nome}</span>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                          {p.cargo || 'Especialista AEE'}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="p-3 bg-secondary/30 border border-border rounded-xl flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                AEE
              </div>
              <div className="min-w-0 flex-1 text-xs">
                <span className="text-muted-foreground block text-[11px]">Profissional Responsável</span>
                <span className="font-bold text-foreground truncate block">
                  {currentProfObj?.nome || profissionalNome || 'Nenhum profissional selecionado'}
                </span>
                <span className="text-amber-600 dark:text-amber-400 font-medium text-[11px]">
                  {currentProfObj?.cargo || profissionalCargo || 'Especialista AEE'}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Seção de Seleção com Busca Dinâmica */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">
                Aluno (Prontuário EMAEE) <span className="text-destructive">*</span>
              </Label>
              {alunoSelecionadoObj && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Selecionado
                </span>
              )}
            </div>

            {/* Campo de Busca Textual Instantânea */}
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nome do aluno ou nome da mãe..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                className="w-full bg-background border border-border text-foreground rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/60"
              />
            </div>

            {/* Caixa de Listagem com Scroll e Informações Detalhadas do Aluno + Mãe */}
            <div className="max-h-48 overflow-y-auto rounded-xl border border-border bg-background divide-y divide-border/60">
              {loading || loadingProfs ? (
                <div className="p-4 text-xs text-muted-foreground text-center animate-pulse">
                  Carregando prontuários disponíveis...
                </div>
              ) : alunosFiltrados.length === 0 ? (
                <div className="p-4 text-xs text-muted-foreground text-center space-y-1">
                  <p>Nenhum aluno encontrado.</p>
                  {termoBusca && (
                    <span className="text-[11px] text-muted-foreground/70">
                      Tente outro termo de busca ou verifique se o aluno já está vinculado a este profissional.
                    </span>
                  )}
                </div>
              ) : (
                alunosFiltrados.map((m) => {
                  const aluno = m.alunos as any
                  const isSelected = alunoSelecionadoId === m.id
                  const nomeAluno = aluno?.nome ?? 'Sem Nome'
                  const nomeMae = aluno?.nome_mae ?? 'Não informada'
                  const statusLabel = m.status === 'FILA_ESPERA' ? 'Fila de Espera' : null

                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setAlunoSelecionadoId(m.id)}
                      className={`w-full text-left p-2.5 transition-colors flex items-start justify-between gap-3 text-xs cursor-pointer ${
                        isSelected
                          ? 'bg-primary/10 border-l-4 border-l-primary'
                          : 'hover:bg-accent/40'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <User className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className={`font-semibold truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                            {nomeAluno}
                          </span>
                        </div>
                        <div className="pl-5 text-[11px] text-muted-foreground mt-0.5 truncate">
                          <span className="font-medium text-foreground/70">Mãe:</span> {nomeMae}
                        </div>
                      </div>

                      {statusLabel && (
                        <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
                          {statusLabel}
                        </span>
                      )}
                    </button>
                  )
                })
              )}
            </div>

            {/* Exibição do Aluno Selecionado Atual */}
            {alunoSelecionadoObj && (
              <div className="p-2.5 bg-primary/5 border border-primary/20 rounded-xl text-xs flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-foreground truncate">
                    {(alunoSelecionadoObj.alunos as any)?.nome ?? 'Aluno Selecionado'}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    Mãe: {(alunoSelecionadoObj.alunos as any)?.nome_mae ?? 'Não informada'}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAlunoSelecionadoId('')}
                  className="h-6 text-[11px] text-muted-foreground hover:text-destructive px-2"
                >
                  Trocar
                </Button>
              </div>
            )}
          </div>

          {/* Frequência de Atendimento */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Frequência de Atendimento</Label>
            <Select value={frequencia} onValueChange={(val) => setFrequencia(val || 'SEMANAL')}>
              <SelectTrigger className="bg-background border-border text-foreground text-xs">
                <SelectValue placeholder="Selecione a frequência..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground">
                <SelectItem value="SEMANAL">Semanal (1x por semana)</SelectItem>
                <SelectItem value="QUINZENAL">Quinzenal (A cada 15 dias)</SelectItem>
                <SelectItem value="MENSAL">Mensal (1x por mês)</SelectItem>
              </SelectContent>
            </Select>

            {frequencia === 'QUINZENAL' && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 leading-relaxed">
                💡 <strong>Atendimento Quinzenal:</strong> A data inicial definirá a semana de início do ciclo de 15 dias no calendário.
              </p>
            )}
          </div>

          {/* Data Inicial e Dia da Semana */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-foreground">
                Data Inicial do Atendimento <span className="text-destructive">*</span>
              </Label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => handleDataInicioChange(e.target.value)}
                className="w-full bg-background border border-border text-foreground rounded-xl p-2 text-xs mt-1 outline-none focus:border-primary transition-colors"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-foreground">
                Dia da Semana <span className="text-destructive">*</span>
              </Label>
              <Select value={String(diaSemana)} onValueChange={(val) => setDiaSemana(Number(val) || 1)}>
                <SelectTrigger className="bg-background border-border text-foreground mt-1 text-xs">
                  <SelectValue placeholder="Dia da Semana" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground">
                  <SelectItem value="1">Segunda-feira</SelectItem>
                  <SelectItem value="2">Terça-feira</SelectItem>
                  <SelectItem value="3">Quarta-feira</SelectItem>
                  <SelectItem value="4">Quinta-feira</SelectItem>
                  <SelectItem value="5">Sexta-feira</SelectItem>
                  <SelectItem value="6">Sábado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Horários */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-foreground">
                Horário de Início <span className="text-destructive">*</span>
              </Label>
              <input
                type="time"
                value={horarioInicio}
                onChange={(e) => setHorarioInicio(e.target.value)}
                className="w-full bg-background border border-border text-foreground rounded-xl p-2 text-xs mt-1 outline-none focus:border-primary transition-colors"
                required
                placeholder="--:--"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-foreground">
                Horário Final <span className="text-destructive">*</span>
              </Label>
              <input
                type="time"
                value={horarioFim}
                onChange={(e) => setHorarioFim(e.target.value)}
                className="w-full bg-background border border-border text-foreground rounded-xl p-2 text-xs mt-1 outline-none focus:border-primary transition-colors"
                required
                placeholder="--:--"
              />
            </div>
          </div>
        </div>
      </form>
    </StandardDialog>
  )
}

