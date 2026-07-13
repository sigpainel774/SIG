'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Calendar, Loader2, Save, Sparkles, Check, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useSchoolStore } from '@/store/useSchoolStore'

interface Turma {
  id: string
  nome: string
  turno: string
  ano_letivo: number
}

interface Materia {
  id: string
  nome: string
  professor_id: string | null
  funcionarios?: {
    nome: string
  }
}

interface HorarioSlot {
  id: string
  ordem_aula: number
  horario_inicio: string
  horario_fim: string
  turno: string
}

interface GradeItem {
  id?: string
  turma_id: string
  materia_id: string
  ordem_aula: number
  dia_semana: number
}

export function GradeSemanalSection() {
  const { selectedEscola } = useSchoolStore()
  const supabase = createClient()

  // Data states
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>('')
  const [materias, setMaterias] = useState<Materia[]>([])
  const [slots, setSlots] = useState<HorarioSlot[]>([])
  const [grade, setGrade] = useState<GradeItem[]>([])

  // Loading states
  const [loadingTurmas, setLoadingTurmas] = useState(false)
  const [loadingGrid, setLoadingGrid] = useState(false)
  const [gerandoAgenda, setGerandoAgenda] = useState(false)

  // Calendar generation form state
  const [anoLetivo, setAnoLetivo] = useState<number>(new Date().getFullYear())
  const [dataInicio, setDataInicio] = useState<string>(`${new Date().getFullYear()}-02-01`)
  const [dataFim, setDataFim] = useState<string>(`${new Date().getFullYear()}-12-15`)

  const weekdays = [
    { value: 1, label: 'Segunda-feira' },
    { value: 2, label: 'Terça-feira' },
    { value: 3, label: 'Quarta-feira' },
    { value: 4, label: 'Quinta-feira' },
    { value: 5, label: 'Sexta-feira' }
  ]

  // 1. Carregar turmas da escola
  const fetchTurmas = async () => {
    if (!selectedEscola?.id) return
    setLoadingTurmas(true)
    try {
      const { data, error } = await (supabase as any)
        .from('turmas')
        .select('id, nome, turno, ano_letivo')
        .eq('escola_id', selectedEscola.id)
        .is('deleted_at', null)
        .order('nome')

      if (error) throw error
      const list = (data || []) as Turma[]
      setTurmas(list)
      if (list.length > 0) {
        setSelectedTurmaId(list[0].id)
      }
    } catch (err: any) {
      toast.error('Erro ao carregar turmas: ' + err.message)
    } finally {
      setLoadingTurmas(false)
    }
  }

  useEffect(() => {
    fetchTurmas()
  }, [selectedEscola?.id])

  // 2. Carregar informações da turma selecionada (slots, matérias, grade semanal)
  const fetchTurmaGridData = async () => {
    if (!selectedTurmaId || !selectedEscola?.id) return
    setLoadingGrid(true)
    const turma = turmas.find(t => t.id === selectedTurmaId)
    if (!turma) return

    try {
      // Carregar matérias da turma
      const materiasPromise = supabase
        .from('materias')
        .select('id, nome, professor_id, funcionarios:professor_id (nome)')
        .eq('turma_id', selectedTurmaId)

      // Carregar slots do turno da turma (de forma case-insensitive usando ilike)
      const slotsPromise = (supabase as any)
        .from('horarios_aulas_slots')
        .select('*')
        .eq('escola_id', selectedEscola.id)
        .ilike('turno', turma.turno)
        .order('ordem_aula')

      // Carregar grade semanal salva para a turma e ano letivo atual
      const gradePromise = (supabase as any)
        .from('grade_semanal')
        .select('*')
        .eq('turma_id', selectedTurmaId)
        .eq('ano_letivo', turma.ano_letivo)
        .eq('ativo', true)

      const [matRes, slotsRes, gradeRes] = await Promise.all([
        materiasPromise,
        slotsPromise,
        gradePromise
      ])

      if (matRes.error) throw matRes.error
      if (slotsRes.error) throw slotsRes.error
      if (gradeRes.error) throw gradeRes.error

      // Mapear professores
      const mappedMaterias = (matRes.data || []).map((m: any) => ({
        id: m.id,
        nome: m.nome,
        professor_id: m.professor_id,
        funcionarios: m.funcionarios ? { nome: m.funcionarios.nome } : undefined
      }))

      setMaterias(mappedMaterias)
      setSlots((slotsRes.data || []) as HorarioSlot[])
      setGrade((gradeRes.data || []) as GradeItem[])
    } catch (err: any) {
      toast.error('Erro ao carregar grade: ' + err.message)
    } finally {
      setLoadingGrid(false)
    }
  }

  useEffect(() => {
    fetchTurmaGridData()
  }, [selectedTurmaId, turmas])

  // 3. Atualizar/Inserir slot na grade semanal
  const handleCellChange = async (diaSemana: number, ordemAula: number, materiaId: string) => {
    if (!selectedTurmaId || !selectedEscola?.id) return
    const turma = turmas.find(t => t.id === selectedTurmaId)
    if (!turma) return

    const existingIndex = grade.findIndex(g => g.dia_semana === diaSemana && g.ordem_aula === ordemAula)

    try {
      if (materiaId === '') {
        // Remover da grade se selecionado vazio
        if (existingIndex !== -1) {
          const item = grade[existingIndex]
          if (item.id) {
            const { error } = await (supabase as any)
              .from('grade_semanal')
              .delete()
              .eq('id', item.id)

            if (error) throw error
          }
          const newGrade = [...grade]
          newGrade.splice(existingIndex, 1)
          setGrade(newGrade)
          toast.success('Horário desvinculado!')
        }
      } else {
        // Inserir ou atualizar no banco
        const payload = {
          escola_id: selectedEscola.id,
          turma_id: selectedTurmaId,
          materia_id: materiaId,
          dia_semana: diaSemana,
          ordem_aula: ordemAula,
          ano_letivo: turma.ano_letivo,
          ativo: true
        }

        if (existingIndex !== -1) {
          const item = grade[existingIndex]
          const { data, error } = await (supabase as any)
            .from('grade_semanal')
            .update(payload)
            .eq('id', item.id)
            .select()

          if (error) throw error
          const newGrade = [...grade]
          newGrade[existingIndex] = { ...newGrade[existingIndex], materia_id: materiaId }
          setGrade(newGrade)
          toast.success('Grade atualizada!')
        } else {
          const { data, error } = await (supabase as any)
            .from('grade_semanal')
            .insert(payload)
            .select()

          if (error) throw error
          if (data && data[0]) {
            setGrade([...grade, data[0] as GradeItem])
            toast.success('Horário alocado!')
          }
        }
      }
    } catch (err: any) {
      toast.error('Erro ao salvar horário: ' + err.message)
    }
  }

  // 4. Gerar agenda do ano letivo
  const handleGerarAgenda = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEscola?.id) return

    if (!confirm(`Confirmar a geração de todas as aulas de ${anoLetivo} baseada na grade semanal atual? Aulas já existentes não serão duplicadas.`)) {
      return
    }

    setGerandoAgenda(true)
    try {
      const { data, error } = await (supabase as any).rpc('gerar_agenda_ano_letivo', {
        p_escola_id: selectedEscola.id,
        p_ano_letivo: anoLetivo,
        p_data_inicio: dataInicio,
        p_data_fim: dataFim
      })

      if (error) throw error

      toast.success(`Sucesso! Foram geradas/atualizadas ${data} instâncias de aulas no calendário.`);
    } catch (err: any) {
      toast.error('Erro ao gerar agenda: ' + err.message)
    } finally {
      setGerandoAgenda(false)
    }
  }

  const getMateriaInSlot = (diaSemana: number, ordemAula: number) => {
    const item = grade.find(g => g.dia_semana === diaSemana && g.ordem_aula === ordemAula)
    return item ? item.materia_id : ''
  }

  const getProfessorLabel = (materiaId: string) => {
    if (!materiaId) return ''
    const mat = materias.find(m => m.id === materiaId)
    return mat?.funcionarios?.nome ? `(${mat.funcionarios.nome})` : '(Sem Professor)'
  }

  const currentTurma = turmas.find(t => t.id === selectedTurmaId)

  return (
    <div className="space-y-6">
      {/* Seletor de Turma e Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#121212] border border-borderCustom rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Turma Ativa:</span>
          {loadingTurmas ? (
            <Loader2 className="w-4 h-4 animate-spin text-highlight" />
          ) : (
            <select
              value={selectedTurmaId}
              onChange={(e) => setSelectedTurmaId(e.target.value)}
              className="rounded-lg border border-borderCustom bg-[#1c1c1e] text-white px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-highlight cursor-pointer"
            >
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} ({t.turno.toUpperCase()})
                </option>
              ))}
            </select>
          )}
        </div>

        {currentTurma && (
          <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground bg-[#0d0d0d] px-3 py-1.5 rounded-xl border border-borderCustom">
            <span>Turno: <strong className="text-white uppercase">{currentTurma.turno}</strong></span>
            <span className="h-3 w-px bg-borderCustom"></span>
            <span>Ano Letivo: <strong className="text-white">{currentTurma.ano_letivo}</strong></span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Lado Esquerdo: Ações e Geração */}
        <div className="space-y-6 xl:col-span-1">
          {/* Instruções */}
          <Card className="bg-[#121212] border-borderCustom p-5 space-y-3 shadow-md">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-highlight animate-pulse" />
              Como funciona?
            </h4>
            <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-4 leading-relaxed">
              <li>Configure os horários de slots na aba anterior.</li>
              <li>Aloque as disciplinas correspondentes a cada slot na grade semanal ao lado.</li>
              <li>A grade é salva <strong>automaticamente</strong> a cada alteração.</li>
              <li>Quando finalizar a grade semanal de todas as turmas, preencha as datas ao lado e clique em <strong>Gerar Calendário</strong> para criar a agenda do ano todo.</li>
            </ul>
          </Card>

          {/* Form Gerador */}
          <Card className="bg-[#121212] border-borderCustom p-5 shadow-md">
            <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-highlight" />
              Gerar Agenda Escolar
            </h4>
            <form onSubmit={handleGerarAgenda} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Ano Letivo</label>
                <Input
                  type="number"
                  value={anoLetivo}
                  onChange={(e) => setAnoLetivo(parseInt(e.target.value) || new Date().getFullYear())}
                  className="bg-[#1c1c1e] border-borderCustom text-white text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Data de Início das Aulas</label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="bg-[#1c1c1e] border-borderCustom text-white text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Data de Fim das Aulas</label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="bg-[#1c1c1e] border-borderCustom text-white text-sm"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={gerandoAgenda || slots.length === 0}
                className="w-full bg-highlight text-background hover:bg-highlight/90 font-bold gap-2 cursor-pointer text-xs"
              >
                {gerandoAgenda ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Calendar className="w-4 h-4" />
                )}
                Gerar Calendário Escolar
              </Button>
            </form>
          </Card>
        </div>

        {/* Lado Direito: A Grade Semanal */}
        <div className="xl:col-span-3">
          <Card className="bg-[#121212] border-borderCustom p-5 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Quadro de Horários Semanais</h3>
              {loadingGrid && <Loader2 className="w-4 h-4 animate-spin text-highlight" />}
            </div>

            {slots.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-borderCustom rounded-2xl text-muted-foreground space-y-3">
                <AlertCircle className="w-10 h-10 mx-auto text-amber-500/70" />
                <p className="text-sm font-medium">Nenhum slot de horário cadastrado para o turno {currentTurma?.turno.toUpperCase()}.</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Acesse a aba <strong>Configurar Horários</strong> para adicionar os slots de aula da escola correspondentes a este turno.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-borderCustom overflow-hidden bg-[#0d0d0d] overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader className="bg-[#080808]">
                    <TableRow className="border-borderCustom hover:bg-transparent">
                      <TableHead className="text-white w-32 font-semibold">Horário</TableHead>
                      {weekdays.map((day) => (
                        <TableHead key={day.value} className="text-white text-center font-semibold">
                          {day.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slots.map((slot) => (
                      <TableRow key={slot.id} className="border-borderCustom hover:bg-[#151517] transition-colors">
                        <TableCell className="font-semibold text-white text-xs">
                          <div className="text-white font-bold">{slot.ordem_aula}º Horário</div>
                          <div className="text-muted-foreground font-mono text-[10px] mt-0.5">
                            {slot.horario_inicio.slice(0, 5)} - {slot.horario_fim.slice(0, 5)}
                          </div>
                        </TableCell>
                        {weekdays.map((day) => {
                          const val = getMateriaInSlot(day.value, slot.ordem_aula)
                          return (
                            <TableCell key={day.value} className="p-3 text-center">
                              <div className="space-y-1">
                                <select
                                  value={val}
                                  onChange={(e) => handleCellChange(day.value, slot.ordem_aula, e.target.value)}
                                  className="w-full text-center rounded-lg border border-borderCustom bg-[#1c1c1e] text-white px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-highlight cursor-pointer"
                                >
                                  <option value="">-- Vazio --</option>
                                  {materias.map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.nome}
                                    </option>
                                  ))}
                                </select>
                                {val && (
                                  <div className="text-[10px] text-muted-foreground truncate max-w-[130px] mx-auto font-medium">
                                    {getProfessorLabel(val)}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
