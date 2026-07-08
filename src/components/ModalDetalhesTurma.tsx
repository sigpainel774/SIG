'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import {
  Users,
  BookOpen,
  CalendarDays,
  FileSpreadsheet,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Save,
  Printer,
  CheckCircle2,
  XCircle,
  X
} from 'lucide-react'
import { ModalDetalhesAluno } from './ModalDetalhesAluno'
import { PrintBoletimAluno } from './print/print-boletim-aluno'

interface ModalDetalhesTurmaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  turma: any // Objeto da turma selecionada
}

export function ModalDetalhesTurma({
  open,
  onOpenChange,
  turma
}: ModalDetalhesTurmaProps) {
  const [activeTab, setActiveTab] = useState('materias')
  const [loading, setLoading] = useState(false)
  
  // Alunos e Matérias
  const [alunos, setAlunos] = useState<any[]>([])
  const [materias, setMaterias] = useState<any[]>([])
  
  // Filtros locais de busca de alunos
  const [searchAluno, setSearchAluno] = useState('')

  // Frequência
  const [dataFreq, setDataFreq] = useState(new Date().toISOString().split('T')[0])
  const [frequencias, setFrequencias] = useState<Record<string, boolean>>({}) // alunoId -> presenca
  const [loadingFreq, setLoadingFreq] = useState(false)

  // Notas
  const [notasState, setNotasState] = useState<Record<string, { nota1: number | null; nota2: number | null; nota3: number | null }>>({}) // alunoId_materiaId_unidade -> notas
  const [unidadesAtivas, setUnidadesAtivas] = useState<Record<string, number>>({}) // materiaId -> unidade ativa (1, 2 ou 3)
  const [savingNotas, setSavingNotas] = useState<Record<string, boolean>>({}) // materiaId -> loading de salvar
  const [materiaAberta, setMateriaAberta] = useState<string | null>(null) // Controlar Accordion manual
  
  // Modais de detalhe e impressão
  const [selectedAluno, setSelectedAluno] = useState<any>(null)
  const [alunoImprimir, setAlunoImprimir] = useState<any>(null)

  const supabase = createClient()
  const { escolaAtivaId } = useAuthStore()
  const selectedEscola = useSchoolStore((state) => state.selectedEscola)
  const escolaNome = selectedEscola?.nome ?? 'Sem Escola'

  // Buscar dados iniciais
  const fetchData = async () => {
    if (!turma?.id || !escolaAtivaId) return
    setLoading(true)
    try {
      // 1. Buscar Alunos
      const { data: AlunosData } = await supabase
        .from('alunos')
        .select('*')
        .eq('turma_id', turma.id)
        .eq('escola_id', escolaAtivaId)
        .is('deleted_at', null)
        .order('nome', { ascending: true })

      setAlunos(AlunosData || [])

      // 2. Buscar Matérias com o respectivo professor
      const { data: MateriasData } = await supabase
        .from('materias')
        .select('*, funcionarios:professor_id(id, nome)')
        .eq('turma_id', turma.id)
        .eq('escola_id', escolaAtivaId)
        .order('nome', { ascending: true })

      setMaterias(MateriasData || [])
    } catch (err) {
      console.error('Erro ao buscar dados do modal de turma:', err)
      toast.error('Erro ao carregar dados da turma')
    } finally {
      setLoading(false)
    }
  }

  // Buscar Frequências do dia selecionado
  const fetchFrequencias = async () => {
    if (!turma?.id) return
    setLoadingFreq(true)
    try {
      const { data } = await supabase
        .from('frequencias')
        .select('aluno_id, presenca')
        .eq('turma_id', turma.id)
        .eq('data', dataFreq)

      const map: Record<string, boolean> = {}
      if (data) {
        data.forEach(f => {
          map[f.aluno_id] = f.presenca
        })
      }
      setFrequencias(map)
    } catch (err) {
      console.error('Erro ao buscar frequências:', err)
    } finally {
      setLoadingFreq(false)
    }
  }

  // Buscar todas as Notas da turma
  const fetchNotas = async () => {
    if (!turma?.id) return
    try {
      const { data } = await supabase
        .from('notas')
        .select('*')
        .eq('turma_id', turma.id)

      const map: typeof notasState = {}
      if (data) {
        data.forEach((n: any) => {
          const key = `${n.aluno_id}_${n.materia_id}_${n.unidade}`
          map[key] = {
            nota1: n.nota1 !== null ? Number(n.nota1) : null,
            nota2: n.nota2 !== null ? Number(n.nota2) : null,
            nota3: n.nota3 !== null ? Number(n.nota3) : null
          }
        })
      }
      setNotasState(map)
    } catch (err) {
      console.error('Erro ao buscar notas:', err)
    }
  }

  useEffect(() => {
    if (open && turma?.id) {
      fetchData()
      fetchFrequencias()
      fetchNotas()
      setActiveTab('materias')
    }
  }, [open, turma, escolaAtivaId])

  useEffect(() => {
    if (open && turma?.id) {
      fetchFrequencias()
    }
  }, [dataFreq])

  // Busca Dinâmica de Alunos
  const filteredAlunos = useMemo(() => {
    return alunos.filter(a => a.nome.toLowerCase().includes(searchAluno.toLowerCase()))
  }, [alunos, searchAluno])

  // Navegação de Datas na Frequência
  const alterarData = (dias: number) => {
    const d = new Date(dataFreq + 'T00:00:00')
    d.setDate(d.getDate() + dias)
    setDataFreq(d.toISOString().split('T')[0])
  }

  // Gravar Frequência (Upsert Imediato com feedback reativo)
  const handleLancarFrequencia = async (alunoId: string, presenca: boolean) => {
    if (!escolaAtivaId) return

    // Atualização otimista
    const anterior = frequencias[alunoId]
    setFrequencias(prev => ({ ...prev, [alunoId]: presenca }))

    try {
      const { error } = await supabase
        .from('frequencias')
        .upsert({
          aluno_id: alunoId,
          turma_id: turma.id,
          escola_id: escolaAtivaId,
          data: dataFreq,
          presenca: presenca
        }, { onConflict: 'aluno_id, data' })

      if (error) throw error
    } catch (err: any) {
      console.error('Erro ao salvar frequência:', err)
      toast.error('Erro ao salvar presença: ' + err.message)
      // Reverter alteração otimista
      setFrequencias(prev => {
        if (anterior === undefined) {
          const next = { ...prev }
          delete next[alunoId]
          return next
        }
        return { ...prev, [alunoId]: anterior }
      })
    }
  }

  // Manipular notas
  const handleNotaChange = (
    alunoId: string,
    materiaId: string,
    unidade: number,
    campo: 'nota1' | 'nota2' | 'nota3',
    valor: string
  ) => {
    const rawVal = valor.replace(',', '.')
    if (rawVal === '') {
      const key = `${alunoId}_${materiaId}_${unidade}`
      setNotasState(prev => ({
        ...prev,
        [key]: {
          ...(prev[key] || { nota1: null, nota2: null, nota3: null }),
          [campo]: null
        }
      }))
      return
    }

    const num = Number(rawVal)
    if (isNaN(num) || num < 0 || num > 10) return // Validação de 0 a 10 silenciosa

    // Arredondar para 1 casa decimal
    const formattedNum = parseFloat(num.toFixed(1))
    
    const key = `${alunoId}_${materiaId}_${unidade}`
    setNotasState(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || { nota1: null, nota2: null, nota3: null }),
        [campo]: formattedNum
      }
    }))
  }

  // Salvar notas da matéria e unidade ativas em lote (Upsert seguro)
  const handleSalvarNotas = async (materiaId: string) => {
    if (!escolaAtivaId) return
    const unidade = unidadesAtivas[materiaId] || 1
    
    setSavingNotas(prev => ({ ...prev, [materiaId]: true }))

    try {
      const upserts = alunos.map(aluno => {
        const key = `${aluno.id}_${materiaId}_${unidade}`
        const n = notasState[key] || { nota1: null, nota2: null, nota3: null }
        return {
          aluno_id: aluno.id,
          turma_id: turma.id,
          materia_id: materiaId,
          escola_id: escolaAtivaId,
          unidade: unidade,
          nota1: n.nota1,
          nota2: n.nota2,
          nota3: n.nota3
        }
      })

      const { error } = await supabase
        .from('notas')
        .upsert(upserts, { onConflict: 'aluno_id, materia_id, unidade' })

      if (error) throw error

      toast.success('Notas salvas com sucesso!')
      fetchNotas()
    } catch (err: any) {
      console.error('Erro ao salvar notas:', err)
      toast.error('Erro ao salvar notas: ' + err.message)
    } finally {
      setSavingNotas(prev => ({ ...prev, [materiaId]: false }))
    }
  }

  // Funções utilitárias auxiliares de cálculo de média
  const obterNotas = (alunoId: string, materiaId: string, unidade: number) => {
    const key = `${alunoId}_${materiaId}_${unidade}`
    return notasState[key] || { nota1: null, nota2: null, nota3: null }
  }

  const calcularMediaUnidade = (alunoId: string, materiaId: string, unidade: number) => {
    const n = obterNotas(alunoId, materiaId, unidade)
    const validas = [n.nota1, n.nota2, n.nota3].filter((v): v is number => v !== null)
    if (validas.length === 0) return null
    // Contamos avaliações pendentes como 0 para fins de composição da média final
    const n1 = n.nota1 ?? 0
    const n2 = n.nota2 ?? 0
    const n3 = n.nota3 ?? 0
    return parseFloat(((n1 + n2 + n3) / 3).toFixed(1))
  }

  const calcularMediaFinal = (alunoId: string, materiaId: string) => {
    const m1 = calcularMediaUnidade(alunoId, materiaId, 1)
    const m2 = calcularMediaUnidade(alunoId, materiaId, 2)
    const m3 = calcularMediaUnidade(alunoId, materiaId, 3)

    const medias = [m1, m2, m3].filter((m): m is number => m !== null)
    if (medias.length === 0) return null

    const soma = (m1 ?? 0) + (m2 ?? 0) + (m3 ?? 0)
    return parseFloat((soma / 3).toFixed(1))
  }

  const processarNotasParaImpressao = (alunoId: string) => {
    const formatadas: any[] = []
    materias.forEach(mat => {
      [1, 2, 3].forEach(unid => {
        const key = `${alunoId}_${mat.id}_${unid}`
        const n = notasState[key]
        if (n) {
          formatadas.push({
            materia_id: mat.id,
            unidade: unid,
            nota1: n.nota1,
            nota2: n.nota2,
            nota3: n.nota3
          })
        }
      })
    })
    return formatadas
  }

  if (!turma) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] w-full bg-[#121214] border-[#26262a] text-white p-6 rounded-2xl max-h-[92vh] overflow-y-auto">
          
          {/* Botão de fechar */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white rounded-full bg-[#1c1c1e] p-1.5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <DialogHeader className="pr-12">
            <DialogTitle className="text-2xl font-bold tracking-tight">{turma.nome}</DialogTitle>
            <DialogDescription className="text-zinc-400 text-sm mt-1">
              {turma.turno} • Ano letivo {turma.ano_letivo}
            </DialogDescription>
          </DialogHeader>

          {/* Abas Nativas do SIG */}
          <div className="mt-6">
            <div className="bg-[#18181b] border border-[#26262a] p-1 rounded-xl w-full grid grid-cols-4 h-11 text-zinc-400">
              <button
                onClick={() => setActiveTab('materias')}
                className={`rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'materias' ? 'bg-[#121214] text-white shadow' : 'hover:text-zinc-200'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Matérias
              </button>
              <button
                onClick={() => setActiveTab('alunos')}
                className={`rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'alunos' ? 'bg-[#121214] text-white shadow' : 'hover:text-zinc-200'
                }`}
              >
                <Users className="w-4 h-4" />
                Alunos
              </button>
              <button
                onClick={() => setActiveTab('frequencia')}
                className={`rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'frequencia' ? 'bg-[#121214] text-white shadow' : 'hover:text-zinc-200'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                Frequência
              </button>
              <button
                onClick={() => setActiveTab('notas')}
                className={`rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'notas' ? 'bg-[#121214] text-white shadow' : 'hover:text-zinc-200'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Notas
              </button>
            </div>

            {/* ABA: MATÉRIAS */}
            {activeTab === 'materias' && (
              <div className="space-y-3 mt-5">
                {loading ? (
                  <div className="text-center py-10 text-xs text-zinc-500 font-medium">Carregando matérias...</div>
                ) : materias.length === 0 ? (
                  <div className="text-center py-10 text-xs text-zinc-500 font-medium">Nenhuma matéria vinculada a esta turma.</div>
                ) : (
                  materias.map((mat) => (
                    <div
                      key={mat.id}
                      className="bg-[#18181b] border border-[#26262a] rounded-xl p-4 flex items-center justify-between h-13"
                    >
                      <span className="text-sm font-bold text-white">{mat.nome}</span>
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <UserIcon className="w-4 h-4 text-zinc-500" />
                        <span>{mat.funcionarios?.nome ?? 'Sem professor'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ABA: ALUNOS */}
            {activeTab === 'alunos' && (
              <div className="space-y-4 mt-5">
                {/* Campo de Busca */}
                <div className="relative">
                  <Input
                    type="search"
                    placeholder="Buscar aluno..."
                    value={searchAluno}
                    onChange={(e) => setSearchAluno(e.target.value)}
                    className="bg-[#18181b] border-[#26262a] text-white placeholder-zinc-500 h-10 text-sm rounded-xl pl-3 focus-visible:ring-[#3ea6ff]"
                  />
                </div>

                {/* Lista */}
                {loading ? (
                  <div className="text-center py-10 text-xs text-zinc-500 font-medium">Carregando alunos...</div>
                ) : filteredAlunos.length === 0 ? (
                  <div className="text-center py-10 text-xs text-zinc-500 font-medium">Nenhum aluno encontrado.</div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {filteredAlunos.map((aluno) => (
                      <div
                        key={aluno.id}
                        onClick={() => setSelectedAluno(aluno)}
                        className="bg-[#18181b] border border-[#26262a] hover:border-[#3ea6ff]/40 p-3 rounded-xl flex items-center gap-3.5 cursor-pointer transition-all duration-200"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#3ea6ff]/10 border border-[#3ea6ff]/20 text-[#3ea6ff] text-sm font-bold flex items-center justify-center overflow-hidden flex-shrink-0">
                          {aluno.foto_url ? (
                            <img src={aluno.foto_url} alt={aluno.nome} className="w-full h-full object-cover" />
                          ) : (
                            aluno.nome.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <span className="text-sm font-semibold text-zinc-200 truncate">{aluno.nome}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ABA: FREQUÊNCIA */}
            {activeTab === 'frequencia' && (
              <div className="space-y-4 mt-5">
                {/* Controles de Data */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-[#18181b] border border-[#26262a] rounded-xl overflow-hidden h-10">
                    <button
                      onClick={() => alterarData(-1)}
                      className="p-2.5 hover:bg-[#202024] text-zinc-400 hover:text-white transition-colors"
                    >
                      <ChevronLeft className="w-4.5 h-4.5" />
                    </button>
                    <input
                      type="date"
                      value={dataFreq}
                      onChange={(e) => setDataFreq(e.target.value)}
                      className="bg-transparent text-sm text-[#3ea6ff] font-bold text-center w-36 outline-none px-2 focus:ring-0"
                    />
                    <button
                      onClick={() => alterarData(1)}
                      className="p-2.5 hover:bg-[#202024] text-zinc-400 hover:text-white transition-colors"
                    >
                      <ChevronRight className="w-4.5 h-4.5" />
                    </button>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchFrequencias}
                    className="bg-[#18181b] text-zinc-300 border-zinc-800 hover:bg-zinc-850 hover:text-white rounded-xl px-3.5 h-10 gap-1.5 text-xs font-semibold"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Atualizar
                  </Button>
                </div>

                {/* Lista com Presença/Falta */}
                {loading || loadingFreq ? (
                  <div className="text-center py-10 text-xs text-zinc-500 font-medium">Carregando diário de presenças...</div>
                ) : alunos.length === 0 ? (
                  <div className="text-center py-10 text-xs text-zinc-500 font-medium">Sem alunos matriculados nesta turma.</div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {alunos.map((aluno) => {
                      const status = frequencias[aluno.id] // true = Presente, false = Falta, undefined = Pendente
                      return (
                        <div
                          key={aluno.id}
                          className="bg-[#18181b] border border-[#26262a] p-3 rounded-xl flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-full bg-zinc-800 text-zinc-400 text-xs font-bold flex items-center justify-center overflow-hidden flex-shrink-0">
                              {aluno.foto_url ? (
                                <img src={aluno.foto_url} alt={aluno.nome} className="w-full h-full object-cover" />
                              ) : (
                                aluno.nome.substring(0, 2).toUpperCase()
                              )}
                            </div>
                            <span className="text-sm font-semibold text-zinc-200 truncate pr-2">{aluno.nome}</span>
                          </div>

                          {/* Botões Presente / Falta */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleLancarFrequencia(aluno.id, true)}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                                status === true
                                  ? 'bg-green-500/10 text-green-400 border-green-500/30'
                                  : 'bg-transparent text-zinc-400 border-zinc-800 hover:bg-[#202024]'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Presente
                            </button>
                            <button
                              onClick={() => handleLancarFrequencia(aluno.id, false)}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                                status === false
                                  ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                  : 'bg-transparent text-zinc-400 border-zinc-800 hover:bg-[#202024]'
                              }`}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Falta
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ABA: NOTAS */}
            {activeTab === 'notas' && (
              <div className="space-y-4 mt-5">
                <div className="space-y-3 w-full">
                  {materias.map((mat) => {
                    const isOpen = materiaAberta === mat.id
                    const unidAtiva = unidadesAtivas[mat.id] || 1
                    const isSaving = savingNotas[mat.id] || false

                    return (
                      <div
                        key={mat.id}
                        className="border border-[#26262a] bg-[#18181b] rounded-xl overflow-hidden"
                      >
                        <button
                          onClick={() => setMateriaAberta(isOpen ? null : mat.id)}
                          className="w-full text-left px-4 py-3 text-sm font-bold text-white border-b border-[#26262a] bg-[#18181b] flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2">
                            <BookOpen className="w-4.5 h-4.5 text-zinc-400" />
                            {mat.nome}
                          </span>
                          <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {isOpen && (
                          <div className="p-4 bg-[#121214] space-y-4">
                            {/* Controles de Lançamento por Unidade e Botões de Ação */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#26262a] pb-3.5">
                              {/* Tabs de Unidade */}
                              <div className="flex gap-1.5 bg-[#18181b] border border-[#26262a] p-1 rounded-lg">
                                {[1, 2, 3].map(u => (
                                  <button
                                    key={u}
                                    onClick={() => setUnidadesAtivas(prev => ({ ...prev, [mat.id]: u }))}
                                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                                      unidAtiva === u
                                        ? 'bg-[#3ea6ff] text-black'
                                        : 'text-zinc-400 hover:text-white'
                                    }`}
                                  >
                                    {u}ª Unidade
                                  </button>
                                ))}
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={fetchNotas}
                                  className="bg-[#18181b] text-zinc-300 border-zinc-800 hover:bg-zinc-850 hover:text-white rounded-lg h-9 gap-1 text-xs font-semibold"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  Atualizar
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={isSaving}
                                  onClick={() => handleSalvarNotas(mat.id)}
                                  className="bg-[#3ea6ff] hover:bg-[#0090ff] text-background font-bold h-9 gap-1 text-xs"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  {isSaving ? 'Salvando...' : 'Salvar Notas'}
                                </Button>
                              </div>
                            </div>

                            {/* Tabela de Notas */}
                            <div className="overflow-x-auto border border-[#26262a] rounded-xl bg-[#141416]/50">
                              <table className="w-full text-left border-collapse min-w-[500px]">
                                <thead>
                                  <tr className="border-b border-[#26262a] text-[10.5px] text-zinc-400 font-semibold uppercase bg-[#18181b]/30">
                                    <th className="p-3">Aluno</th>
                                    <th className="p-3 w-16 text-center">Nota 1</th>
                                    <th className="p-3 w-16 text-center">Nota 2</th>
                                    <th className="p-3 w-16 text-center">Nota 3</th>
                                    <th className="p-3 w-20 text-center font-bold bg-[#1c1c1e]/40">Média Unid.</th>
                                    <th className="p-3 w-20 text-center font-bold bg-[#1c1c1e]/60">Média Final</th>
                                    <th className="p-3 w-24 text-right">Ação</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {alunos.map(aluno => {
                                    const n = obterNotas(aluno.id, mat.id, unidAtiva)
                                    const mediaUnid = calcularMediaUnidade(aluno.id, mat.id, unidAtiva)
                                    const mediaFinal = calcularMediaFinal(aluno.id, mat.id)

                                    return (
                                      <tr key={aluno.id} className="border-b border-[#26262a] last:border-0 hover:bg-zinc-800/10 text-xs text-zinc-200">
                                        <td className="p-3 font-semibold text-zinc-100">{aluno.nome}</td>
                                        
                                        {/* Nota 1 */}
                                        <td className="p-2 text-center">
                                          <input
                                            type="text"
                                            value={n.nota1 ?? ''}
                                            onChange={(e) => handleNotaChange(aluno.id, mat.id, unidAtiva, 'nota1', e.target.value)}
                                            placeholder="-"
                                            className="w-11 h-8 bg-[#18181b] border border-[#2a2a2a] text-center rounded focus:outline-none focus:border-[#3ea6ff] text-xs font-semibold text-white"
                                          />
                                        </td>

                                        {/* Nota 2 */}
                                        <td className="p-2 text-center">
                                          <input
                                            type="text"
                                            value={n.nota2 ?? ''}
                                            onChange={(e) => handleNotaChange(aluno.id, mat.id, unidAtiva, 'nota2', e.target.value)}
                                            placeholder="-"
                                            className="w-11 h-8 bg-[#18181b] border border-[#2a2a2a] text-center rounded focus:outline-none focus:border-[#3ea6ff] text-xs font-semibold text-white"
                                          />
                                        </td>

                                        {/* Nota 3 */}
                                        <td className="p-2 text-center">
                                          <input
                                            type="text"
                                            value={n.nota3 ?? ''}
                                            onChange={(e) => handleNotaChange(aluno.id, mat.id, unidAtiva, 'nota3', e.target.value)}
                                            placeholder="-"
                                            className="w-11 h-8 bg-[#18181b] border border-[#2a2a2a] text-center rounded focus:outline-none focus:border-[#3ea6ff] text-xs font-semibold text-white"
                                          />
                                        </td>

                                        {/* Média Unidade */}
                                        <td className="p-3 text-center bg-[#1c1c1e]/20 font-bold">
                                          {mediaUnid !== null ? (
                                            <span className={mediaUnid < 6 ? 'text-red-500' : 'text-green-500'}>
                                              {mediaUnid}
                                            </span>
                                          ) : '-'}
                                        </td>

                                        {/* Média Final */}
                                        <td className="p-3 text-center bg-[#1c1c1e]/40 font-bold text-sm">
                                          {mediaFinal !== null ? (
                                            <span className={mediaFinal < 6 ? 'text-red-500' : 'text-green-500'}>
                                              {mediaFinal}
                                            </span>
                                          ) : '-'}
                                        </td>

                                        {/* Boletim */}
                                        <td className="p-2 text-right">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setAlunoImprimir({ aluno, notes: processarNotasParaImpressao(aluno.id) })}
                                            className="h-8 bg-[#1c1c1e] text-zinc-300 border-zinc-800 hover:bg-zinc-850 hover:text-white rounded-lg text-[10.5px] px-2.5 gap-1 font-semibold"
                                          >
                                            <Printer className="w-3 h-3" />
                                            Boletim
                                          </Button>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhes do Aluno */}
      <ModalDetalhesAluno
        open={selectedAluno !== null}
        onOpenChange={(val) => {
          if (!val) setSelectedAluno(null)
        }}
        aluno={selectedAluno}
        turma={turma}
      />

      {/* Impressão de Boletim */}
      {alunoImprimir && (
        <PrintBoletimAluno
          aluno={alunoImprimir.aluno}
          turma={turma}
          escolaNome={escolaNome}
          materias={materias}
          notas={alunoImprimir.notes}
          onClose={() => setAlunoImprimir(null)}
        />
      )}
    </>
  )
}
