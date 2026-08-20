'use client'

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { useEditModeStore } from '@/store/useEditModeStore'
import {
  Search,
  Printer,
  UserPlus,
  Trash2,
  Clock,
  Calendar,
  School,
  X,
  Sparkles,
  Users,
  AlertCircle,
  GraduationCap
} from 'lucide-react'
import { getAvatarUrl } from '@/lib/photoHelper'
import { ModalAssociarAlunoAEE } from '@/components/modals/modal-associar-aluno-aee'
import {
  PrintPacientesProfissionalEmaee,
  PacienteProfissionalPrintData
} from '@/components/print/print-pacientes-profissional-emaee'

interface ModalPacientesProfissionalAEEProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profissional: {
    id: string
    nome: string
    cargo?: string | null
    foto_url?: string | null
    foto_avatar_path?: string | null
    foto_visualizacao_path?: string | null
    foto_updated_at?: string | null
    registro_profissional?: string | null
  } | null
  escolaEmaeeId: string
  escolaNome?: string
  escolaLogoUrl?: string | null
  onSuccess?: () => void
}

const DIAS_SEMANA_NOMES: Record<number, string> = {
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
  7: 'Domingo'
}

function formatarHora(hora?: string | null): string {
  if (!hora) return '--:--'
  const partes = hora.split(':')
  if (partes.length >= 2) {
    return `${partes[0].padStart(2, '0')}:${partes[1].padStart(2, '0')}`
  }
  return hora
}

function calcularIdade(dataNasc?: string | null): string {
  if (!dataNasc) return ''
  try {
    const hoje = new Date()
    const nasc = new Date(dataNasc)
    let idade = hoje.getFullYear() - nasc.getFullYear()
    const m = hoje.getMonth() - nasc.getMonth()
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
      idade--
    }
    return idade > 0 ? `${idade} anos` : ''
  } catch {
    return ''
  }
}

export function ModalPacientesProfissionalAEE({
  open,
  onOpenChange,
  profissional,
  escolaEmaeeId,
  escolaNome,
  escolaLogoUrl,
  onSuccess
}: ModalPacientesProfissionalAEEProps) {
  const { isEditMode } = useEditModeStore()
  const supabase = useMemo(() => createClient(), [])
  const isMounted = useRef(true)

  const [pacientes, setPacientes] = useState<PacienteProfissionalPrintData[]>([])
  const [loading, setLoading] = useState(false)
  const [termoBusca, setTermoBusca] = useState('')
  const [modalVincularOpen, setModalVincularOpen] = useState(false)
  const [printOpen, setPrintOpen] = useState(false)
  const [desvinculandoId, setDesvinculandoId] = useState<string | null>(null)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const carregarPacientes = useCallback(async () => {
    if (!open || !profissional?.id || !escolaEmaeeId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('emaee_especialidades_vinculadas')
        .select(`
          id,
          especialidade,
          frequencia,
          dia_semana,
          horario_inicio,
          horario_fim,
          ativo,
          matricula:emaee_matriculas!inner (
            id,
            numero_matricula_emaee,
            status,
            ano_escolarizacao,
            turma_regular,
            turno_atendimento,
            escola_origem_fora_rede,
            escola_origem_nome,
            escola_atendimento_id,
            deleted_at,
            escolas:escola_regular_id (
              nome
            ),
            aluno:alunos!inner (
              id,
              nome,
              cpf,
              data_nascimento,
              nome_mae,
              foto_url,
              foto_avatar_path,
              foto_visualizacao_path,
              foto_updated_at,
              deleted_at
            )
          )
        `)
        .eq('profissional_id', profissional.id)
        .eq('ativo', true)
        .eq('matricula.escola_atendimento_id', escolaEmaeeId)
        .is('matricula.deleted_at', null)
        .is('matricula.aluno.deleted_at', null)
        .order('dia_semana', { ascending: true })
        .order('horario_inicio', { ascending: true })

      if (error) throw error

      if (isMounted.current) {
        // Ordena com segurança por dia da semana e depois nome do aluno
        const listaFormatada = (data || []).map((item: any) => ({
          id: item.id,
          especialidade: item.especialidade ?? 'Atendimento Especializado',
          frequencia: item.frequencia ?? 'SEMANAL',
          dia_semana: item.dia_semana ?? 1,
          horario_inicio: item.horario_inicio ?? '08:00',
          horario_fim: item.horario_fim ?? null,
          ativo: item.ativo ?? true,
          matricula: {
            id: item.matricula?.id,
            numero_matricula_emaee: item.matricula?.numero_matricula_emaee,
            status: item.matricula?.status,
            ano_escolarizacao: item.matricula?.ano_escolarizacao,
            turma_regular: item.matricula?.turma_regular,
            turno_atendimento: item.matricula?.turno_atendimento,
            escola_origem_fora_rede: item.matricula?.escola_origem_fora_rede,
            escola_origem_nome: item.matricula?.escola_origem_nome,
            escolas: item.matricula?.escolas,
            aluno: item.matricula?.aluno
          }
        })) as PacienteProfissionalPrintData[]

        setPacientes(listaFormatada)
      }
    } catch (err) {
      console.error('Erro ao carregar pacientes do profissional:', err)
      toast.error('Erro ao carregar pacientes do profissional.')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [open, profissional?.id, escolaEmaeeId, supabase])

  useEffect(() => {
    if (open) {
      setTermoBusca('')
      carregarPacientes()
    }
  }, [open, carregarPacientes])

  // Desvincular aluno do profissional (somente com isEditMode ativo)
  const handleDesvincular = async (vinculoId: string, nomeAluno: string) => {
    if (!isEditMode) return
    const confirmou = window.confirm(`Deseja realmente desvincular o paciente "${nomeAluno}" deste profissional?`)
    if (!confirmou) return

    setDesvinculandoId(vinculoId)
    try {
      const { error } = await supabase
        .from('emaee_especialidades_vinculadas')
        .update({ ativo: false } as any)
        .eq('id', vinculoId)

      if (error) throw error

      toast.success(`Paciente ${nomeAluno} desvinculado com sucesso.`)
      if (onSuccess) onSuccess()
      await carregarPacientes()
    } catch (err: any) {
      console.error('Erro ao desvincular paciente:', err)
      toast.error('Erro ao desvincular paciente do profissional.')
    } finally {
      if (isMounted.current) setDesvinculandoId(null)
    }
  }

  // Filtragem dinâmica instantânea com normalização NFD sem acento
  const pacientesFiltrados = useMemo(() => {
    if (!termoBusca.trim()) return pacientes

    const normalizar = (str: string) =>
      (str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()

    const termoNorm = normalizar(termoBusca)

    return pacientes.filter((item) => {
      const aluno = item.matricula?.aluno
      const nomeAluno = normalizar(aluno?.nome || '')
      const numMatricula = normalizar(item.matricula?.numero_matricula_emaee || '')
      const cpf = normalizar(aluno?.cpf || '')
      const escolaNome = normalizar(
        item.matricula?.escolas?.nome || item.matricula?.escola_origem_nome || ''
      )
      const diaNome = normalizar(DIAS_SEMANA_NOMES[item.dia_semana] || '')
      const especialidade = normalizar(item.especialidade || '')

      return (
        nomeAluno.includes(termoNorm) ||
        numMatricula.includes(termoNorm) ||
        cpf.includes(termoNorm) ||
        escolaNome.includes(termoNorm) ||
        diaNome.includes(termoNorm) ||
        especialidade.includes(termoNorm)
      )
    })
  }, [pacientes, termoBusca])

  if (!profissional) return null

  const profAvatarUrl = getAvatarUrl(profissional)

  return (
    <>
      {/* Modal de Impressão Oficial */}
      {printOpen && (
        <PrintPacientesProfissionalEmaee
          profissional={profissional}
          pacientes={pacientesFiltrados}
          escolaNome={escolaNome}
          escolaLogoUrl={escolaLogoUrl}
          onClose={() => setPrintOpen(false)}
        />
      )}

      {/* Modal de Associação de Novo Aluno (aberto sob demanda se isEditMode) */}
      {modalVincularOpen && (
        <ModalAssociarAlunoAEE
          open={modalVincularOpen}
          onOpenChange={(v) => {
            setModalVincularOpen(v)
            if (!v) {
              carregarPacientes()
              if (onSuccess) onSuccess()
            }
          }}
          profissionalId={profissional.id}
          profissionalNome={profissional.nome}
          profissionalCargo={profissional.cargo ?? 'Especialista AEE'}
          escolaEmaeeId={escolaEmaeeId}
          onSuccess={() => {
            carregarPacientes()
            if (onSuccess) onSuccess()
          }}
        />
      )}

      <StandardDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Pacientes em Atendimento"
        maxWidth="sm:max-w-4xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-muted-foreground">
              Total de {pacientes.length} paciente(s) vinculado(s)
            </div>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-foreground bg-card hover:bg-accent border-border text-xs px-5 rounded-xl h-9"
            >
              Fechar
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Cartão de Destaque do Profissional no Topo */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-secondary/50 via-secondary/30 to-background border border-border/80 shadow-sm">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="h-14 w-14 shrink-0 rounded-full border-2 border-primary/30 overflow-hidden bg-muted flex items-center justify-center shadow-md">
                {profAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profAvatarUrl}
                    alt={profissional.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-bold text-primary">
                    {profissional.nome.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-foreground truncate">{profissional.nome}</h3>
                  <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-semibold border border-primary/20">
                    {profissional.cargo ?? 'Profissional AEE'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                  {profissional.registro_profissional && (
                    <span className="text-foreground/80 font-medium">
                      Reg.: {profissional.registro_profissional}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                    <Users className="w-3.5 h-3.5" />
                    {pacientes.length} paciente(s) ativo(s)
                  </span>
                </div>
              </div>
            </div>

            {/* Ações Rápidas Condicionadas a isEditMode */}
            <div className="flex items-center gap-2 shrink-0">
              {isEditMode && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPrintOpen(true)}
                    disabled={pacientes.length === 0}
                    className="h-9 px-3 text-xs gap-1.5 border-border bg-card hover:bg-accent text-foreground rounded-xl shadow-sm transition-all"
                    title="Imprimir relação de pacientes atendidos"
                  >
                    <Printer className="w-3.5 h-3.5 text-primary" />
                    <span>Imprimir</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setModalVincularOpen(true)}
                    className="h-9 px-3 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-sm transition-all"
                    title="Vincular novo aluno a este profissional"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Vincular Aluno</span>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Barra de Busca Dinâmica */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar paciente por nome, matrícula EMAEE, CPF ou dia..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                className="w-full bg-background border border-border text-foreground rounded-xl pl-9 pr-8 py-2 text-xs outline-none focus:border-primary transition-all placeholder:text-muted-foreground/60"
              />
              {termoBusca && (
                <button
                  type="button"
                  onClick={() => setTermoBusca('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="text-[11px] text-muted-foreground px-1 shrink-0">
              Exibindo <strong className="text-foreground">{pacientesFiltrados.length}</strong> de{' '}
              <strong className="text-foreground">{pacientes.length}</strong>
            </div>
          </div>

          {/* Lista de Pacientes */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-xs space-y-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Carregando lista de pacientes...</span>
            </div>
          ) : pacientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-card border border-border rounded-2xl">
              <GraduationCap className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <h4 className="text-sm font-bold text-foreground mb-1">Nenhum Paciente Vinculado</h4>
              <p className="text-xs text-muted-foreground max-w-sm">
                Este profissional ainda não possui alunos vinculados aos seus horários de atendimento multidisciplinar.
              </p>
              {isEditMode && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setModalVincularOpen(true)}
                  className="mt-4 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Vincular Primeiro Paciente
                </Button>
              )}
            </div>
          ) : pacientesFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-card border border-border rounded-2xl">
              <AlertCircle className="w-10 h-10 text-muted-foreground/40 mb-2" />
              <h4 className="text-sm font-semibold text-foreground">Nenhum paciente encontrado</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Nenhum resultado corresponde à busca &quot;{termoBusca}&quot;.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1">
              {pacientesFiltrados.map((item) => {
                const aluno = item.matricula?.aluno
                const avatarUrl = aluno ? getAvatarUrl(aluno) : undefined
                const escolaRegularNome =
                  item.matricula?.escolas?.nome ??
                  item.matricula?.escola_origem_nome ??
                  'Escola não informada'
                const diaNome = DIAS_SEMANA_NOMES[item.dia_semana] ?? `Dia ${item.dia_semana}`
                const horarioFormatado = `${formatarHora(item.horario_inicio)} às ${formatarHora(item.horario_fim)}`
                const idadeTxt = calcularIdade(aluno?.data_nascimento)
                const isDesvinculando = desvinculandoId === item.id

                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between p-3.5 rounded-2xl bg-card border border-border/80 hover:border-primary/40 hover:shadow-md transition-all group relative"
                  >
                    <div>
                      {/* Topo do Card com Foto e Identificação */}
                      <div className="flex items-start gap-3 mb-2.5">
                        <div className="h-12 w-12 shrink-0 rounded-full border border-border overflow-hidden bg-muted flex items-center justify-center shadow-sm">
                          {avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={avatarUrl}
                              alt={aluno?.nome ?? 'Aluno'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-base font-bold text-muted-foreground">
                              {(aluno?.nome ?? 'A').charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4
                              className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors"
                              title={aluno?.nome}
                            >
                              {aluno?.nome ?? 'Aluno não identificado'}
                            </h4>
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap mt-0.5">
                            <span className="font-mono text-primary/90 font-semibold">
                              Matrícula: {item.matricula?.numero_matricula_emaee ?? 'Pendente'}
                            </span>
                            {idadeTxt && <span>• {idadeTxt}</span>}
                          </div>

                          {aluno?.nome_mae && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              Mãe: {aluno.nome_mae}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Informações Escolares e de Atendimento */}
                      <div className="space-y-1.5 text-[11px] bg-secondary/30 rounded-xl p-2.5 border border-border/50">
                        <div className="flex items-center gap-1.5 text-foreground/90 truncate">
                          <School className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="font-medium truncate">{escolaRegularNome}</span>
                          {item.matricula?.ano_escolarizacao && (
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              ({item.matricula.ano_escolarizacao}
                              {item.matricula.turma_regular ? ` - ${item.matricula.turma_regular}` : ''})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40 text-[10px]">
                          <div className="flex items-center gap-1 text-foreground/80">
                            <Calendar className="w-3 h-3 text-amber-500 shrink-0" />
                            <span className="font-semibold">{diaNome}</span>
                          </div>
                          <div className="flex items-center gap-1 font-mono text-foreground/90 font-bold">
                            <Clock className="w-3 h-3 text-primary shrink-0" />
                            <span>{horarioFormatado}</span>
                          </div>
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                            {item.frequencia?.toLowerCase() ?? 'Semanal'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Botão de Desvincular Condicionado ao Modo de Edição */}
                    {isEditMode && (
                      <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isDesvinculando}
                          onClick={() => handleDesvincular(item.id, aluno?.nome ?? 'Aluno')}
                          className="h-7 px-2.5 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg gap-1 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{isDesvinculando ? 'Removendo...' : 'Desvincular Atendimento'}</span>
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </StandardDialog>
    </>
  )
}
