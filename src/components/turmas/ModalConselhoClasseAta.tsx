'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  FileBadge,
  Printer,
  Save,
  CheckCircle2,
  AlertTriangle,
  Users,
  Award,
  Loader2,
  Calendar,
  Lock,
  ChevronDown,
  Sparkles,
  Info,
  Building2
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  PrintAtaResultadosFinais,
  DadosAtaResultadosFinais,
  AlunoAtaResultados,
  MembroConselho
} from '@/components/print/print-ata-resultados-finais'

interface ModalConselhoClasseAtaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  turma: any
}

export function ModalConselhoClasseAta({
  open,
  onOpenChange,
  turma
}: ModalConselhoClasseAtaProps) {
  const supabase = createClient() as any
  const { funcionario, isAdminGlobalOrRoot } = useAuthStore()
  const { selectedEscola } = useSchoolStore()

  // Verificação de Exclusão (EMAEE e Cursinho)
  const isEmaeeOuCursinho = useMemo(() => {
    const nomeTurma = (turma?.nome || '').toLowerCase()
    const nomeEscola = (turma?.escola_nome || selectedEscola?.nome || '').toLowerCase()
    const tipoEscola = (turma?.escola_tipo || selectedEscola?.tipo || '').toLowerCase()
    return (
      tipoEscola === 'emaee' ||
      nomeEscola.includes('emaee') ||
      nomeEscola.includes('cursinho') ||
      nomeEscola.includes('pré universitário') ||
      nomeTurma.includes('emaee') ||
      nomeTurma.includes('cursinho')
    )
  }, [turma, selectedEscola])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isPrintMode, setIsPrintMode] = useState(false)

  // Dados Gerais do Conselho
  const [ataId, setAtaId] = useState<string | null>(null)
  const [anoLetivo, setAnoLetivo] = useState(turma?.ano_letivo || new Date().getFullYear().toString())
  const [periodo, setPeriodo] = useState('FINAL')
  const [dataReuniao, setDataReuniao] = useState(new Date().toISOString().split('T')[0])
  const [horarioInicio, setHorarioInicio] = useState('08:00')
  const [horarioTermino, setHorarioTermino] = useState('11:30')
  const [parecerGeral, setParecerGeral] = useState('')
  const [statusAta, setStatusAta] = useState<'EM_ANDAMENTO' | 'FINALIZADA' | 'HOMOLOGADA'>('EM_ANDAMENTO')

  // Alunos e Notas Consolidadas
  const [alunos, setAlunos] = useState<any[]>([])
  const [materias, setMaterias] = useState<any[]>([])
  const [deliberacoes, setDeliberacoes] = useState<Record<string, {
    situacao_final: string
    parecer_individual?: string
    media_geral?: number
    frequencia?: number
    faltas?: number
    notas_materias?: Record<string, number>
  }>>({})

  // Membros Presentes
  const [membros, setMembros] = useState<MembroConselho[]>([])

  const printRef = useRef<HTMLDivElement>(null)

  // Carregar dados consolidados da turma (Alunos, Notas, Frequências, Ata Existente)
  const carregarDadosConselho = useCallback(async () => {
    if (!turma?.id) return
    setLoading(true)

    try {
      // 1. Carregar Alunos da Turma
      const { data: alunosData } = await supabase
        .from('alunos')
        .select('id, nome, matricula, data_nascimento')
        .eq('turma_id', turma.id)
        .is('deleted_at', null)
        .order('nome', { ascending: true })

      // 2. Carregar Matérias da Turma
      const { data: materiasData } = await supabase
        .from('materias')
        .select('id, nome')
        .eq('turma_id', turma.id)
        .order('nome', { ascending: true })

      // 3. Carregar Notas
      const { data: notasData } = await supabase
        .from('notas')
        .select('*')
        .eq('turma_id', turma.id)

      // 4. Carregar Frequências
      const { data: freqData } = await supabase
        .from('frequencias')
        .select('*')
        .eq('turma_id', turma.id)

      // 5. Carregar Professores Vinculados à Turma
      const { data: profsData } = await supabase
        .from('vinculos_turmas')
        .select('funcionario_id, tipo, funcionarios(id, nome, cargo)')
        .eq('turma_id', turma.id)

      // 6. Carregar Ata Existente
      const { data: ataExistente } = await supabase
        .from('conselho_classe_atas')
        .select('*')
        .eq('turma_id', turma.id)
        .eq('ano_letivo', anoLetivo)
        .eq('periodo', periodo)
        .maybeSingle()

      setAlunos(alunosData || [])
      setMaterias(materiasData || [])

      // Monta lista de membros (professores + coordenador/diretor)
      const listaMembros: MembroConselho[] = []
      const profMap = new Map<string, string>()

      ;(profsData || []).forEach((p: any) => {
        if (p.funcionarios?.nome && !profMap.has(p.funcionarios.nome)) {
          profMap.set(p.funcionarios.nome, p.funcionarios.cargo || 'Professor(a)')
          listaMembros.push({
            nome: p.funcionarios.nome,
            cargo: p.funcionarios.cargo || 'Professor(a)',
            assinou: true
          })
        }
      })

      if (listaMembros.length === 0 && funcionario?.nome) {
        listaMembros.push({
          nome: funcionario.nome,
          cargo: funcionario.cargo || 'Docente / Coordenador',
          assinou: true
        })
      }
      setMembros(listaMembros)

      // Calcula médias e frequências por aluno
      const deliberacoesIniciais: Record<string, any> = {}

      ;(alunosData || []).forEach((aluno: any) => {
        const alunoNotas = (notasData || []).filter((n: any) => n.aluno_id === aluno.id)
        const alunoFreq = (freqData || []).filter((f: any) => f.aluno_id === aluno.id)

        // Frequência %
        const totalAulas = alunoFreq.length
        const totalPresencas = alunoFreq.filter((f: any) => f.presenca === true).length
        const totalFaltas = totalAulas - totalPresencas
        const percFreq = totalAulas > 0 ? Math.round((totalPresencas / totalAulas) * 100) : 100

        // Notas por Matéria
        const notasPorMat: Record<string, number> = {}
        let somaMedias = 0
        let matsComNota = 0

        ;(materiasData || []).forEach((mat: any) => {
          const notasMat = alunoNotas.filter((n: any) => n.materia_id === mat.id)
          if (notasMat.length > 0) {
            let somaUnidades = 0
            notasMat.forEach((nm: any) => {
              const n1 = Number(nm.nota1) || 0
              const n2 = Number(nm.nota2) || 0
              const n3 = Number(nm.nota3) || 0
              const mediaUnidade = (n1 + n2 + n3) / (n3 > 0 ? 3 : n2 > 0 ? 2 : 1)
              somaUnidades += mediaUnidade
            })
            const mediaMat = Number((somaUnidades / notasMat.length).toFixed(1))
            notasPorMat[mat.nome] = mediaMat
            somaMedias += mediaMat
            matsComNota++
          }
        })

        const mediaGeral = matsComNota > 0 ? Number((somaMedias / matsComNota).toFixed(1)) : 0

        // Situação Preliminar Padrão
        let sitPadrao = 'APROVADO_DIRETO'
        if (percFreq < 75) {
          sitPadrao = 'REPROVADO_FALTA'
        } else if (mediaGeral < 5.0 && matsComNota > 0) {
          sitPadrao = 'REPROVADO_NOTA'
        }

        deliberacoesIniciais[aluno.id] = {
          situacao_final: sitPadrao,
          parecer_individual: '',
          media_geral: mediaGeral,
          frequencia: percFreq,
          faltas: totalFaltas,
          notas_materias: notasPorMat
        }
      })

      // Se houver ata salva, restaura as deliberações e campos gravados
      if (ataExistente) {
        setAtaId(ataExistente.id)
        setDataReuniao(ataExistente.data_reuniao || dataReuniao)
        setHorarioInicio(ataExistente.horario_inicio || '08:00')
        setHorarioTermino(ataExistente.horario_termino || '11:30')
        setParecerGeral(ataExistente.parecer_geral || '')
        setStatusAta(ataExistente.status || 'EM_ANDAMENTO')

        if (Array.isArray(ataExistente.deliberacoes_colegiadas)) {
          const mapaSalvo: Record<string, any> = { ...deliberacoesIniciais }
          ataExistente.deliberacoes_colegiadas.forEach((d: any) => {
            if (d.aluno_id) {
              mapaSalvo[d.aluno_id] = {
                ...mapaSalvo[d.aluno_id],
                situacao_final: d.situacao_final || mapaSalvo[d.aluno_id]?.situacao_final,
                parecer_individual: d.parecer_individual || ''
              }
            }
          })
          setDeliberacoes(mapaSalvo)
        } else {
          setDeliberacoes(deliberacoesIniciais)
        }

        if (Array.isArray(ataExistente.membros_presentes) && ataExistente.membros_presentes.length > 0) {
          setMembros(ataExistente.membros_presentes)
        }
      } else {
        setAtaId(null)
        setDeliberacoes(deliberacoesIniciais)
      }
    } catch (err) {
      console.error('Erro ao carregar dados do Conselho de Classe:', err)
      toast.error('Erro ao carregar notas e conselho de classe.')
    } finally {
      setLoading(false)
    }
  }, [turma?.id, anoLetivo, periodo, funcionario?.nome, funcionario?.cargo, dataReuniao, supabase])

  useEffect(() => {
    if (open && !isEmaeeOuCursinho) {
      carregarDadosConselho()
    }
  }, [open, carregarDadosConselho, isEmaeeOuCursinho])

  // Salvar Deliberações do Conselho de Classe
  const handleSalvarConselho = async () => {
    setSaving(true)

    try {
      const payloadDeliberacoes = Object.entries(deliberacoes).map(([alunoId, delib]) => {
        const alunoObj = alunos.find((a) => a.id === alunoId)
        return {
          aluno_id: alunoId,
          aluno_nome: alunoObj?.nome || '',
          matricula: alunoObj?.matricula || '',
          media_final: delib.media_geral,
          frequencia_percentual: delib.frequencia,
          total_faltas: delib.faltas,
          situacao_final: delib.situacao_final,
          parecer_individual: delib.parecer_individual || '',
          notas_materias: delib.notas_materias || {}
        }
      })

      const payload: any = {
        escola_id: turma.escola_id,
        turma_id: turma.id,
        ano_letivo: anoLetivo,
        periodo: periodo,
        data_reuniao: dataReuniao,
        horario_inicio: horarioInicio,
        horario_termino: horarioTermino,
        parecer_geral: parecerGeral.trim(),
        deliberacoes_colegiadas: payloadDeliberacoes,
        membros_presentes: membros,
        status: statusAta,
        fechado_por: funcionario?.id || null,
        fechado_em: statusAta === 'FINALIZADA' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }

      let res
      if (ataId) {
        res = await supabase.from('conselho_classe_atas').update(payload).eq('id', ataId)
      } else {
        res = await supabase.from('conselho_classe_atas').insert([payload]).select('id').single()
        if (res.data?.id) setAtaId(res.data.id)
      }

      if (res.error) throw res.error

      toast.success('Deliberações do Conselho de Classe gravadas com sucesso!')
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao salvar conselho: ' + (err.message || 'Falha ao salvar'))
    } finally {
      setSaving(false)
    }
  }

  // Prepara dados para a Impressão Oficial da Ata
  const dadosParaImpressao: DadosAtaResultadosFinais = useMemo(() => {
    const nomesMaterias = materias.map((m) => m.nome)

    const alunosAta: AlunoAtaResultados[] = alunos.map((aluno, idx) => {
      const delib = deliberacoes[aluno.id] || {}
      return {
        aluno_id: aluno.id,
        numero_chamada: idx + 1,
        nome: aluno.nome,
        matricula: aluno.matricula,
        notas_materias: delib.notas_materias || {},
        media_geral: delib.media_geral || 0,
        total_faltas: delib.faltas || 0,
        percentual_frequencia: delib.frequencia || 100,
        situacao_final: delib.situacao_final || 'APROVADO_DIRETO',
        parecer_individual: delib.parecer_individual
      }
    })

    const esc = selectedEscola as any
    return {
      escolaNome: selectedEscola?.nome || turma?.escola_nome || 'Escola Municipal de Sapeaçu',
      escolaInep: esc?.codigo_inep || '',
      escolaEndereco: esc?.endereco || 'Sapeaçu - Bahia',
      turmaNome: turma?.nome || '',
      turmaTurno: turma?.turno || 'Matutino',
      anoLetivo: anoLetivo,
      periodo: periodo,
      dataReuniao: dataReuniao,
      horarioInicio: horarioInicio,
      horarioTermino: horarioTermino,
      materias: nomesMaterias,
      alunos: alunosAta,
      parecerGeral: parecerGeral,
      membros: membros,
      diretorNome: esc?.diretor_nome || 'Direção Escolar',
      secretarioNome: esc?.secretario_nome || 'Secretaria Escolar',
      coordenadorNome: esc?.coordenador_nome || 'Coordenação Pedagógica'
    }
  }, [
    selectedEscola,
    turma,
    anoLetivo,
    periodo,
    dataReuniao,
    horarioInicio,
    horarioTermino,
    materias,
    alunos,
    deliberacoes,
    parecerGeral,
    membros
  ])

  // Disparar Impressão Oficial
  const handleImprimirAta = () => {
    setIsPrintMode(true)
    setTimeout(() => {
      window.print()
      setIsPrintMode(false)
    }, 400)
  }

  // Bloqueio amigável de escopo
  if (isEmaeeOuCursinho) {
    return (
      <StandardDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Conselho de Classe"
        description="Módulo Educacional Regular"
      >
        <div className="p-8 text-center bg-card/40 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-3">
          <div className="p-3 bg-muted rounded-full text-muted-foreground">
            <Building2 className="w-8 h-8" />
          </div>
          <h4 className="font-bold text-base text-foreground">Conselho de Classe e Ata Final Indisponíveis</h4>
          <p className="text-sm text-muted-foreground max-w-md">
            O Conselho de Classe Deliberativo e a emissão da Ata de Resultados Finais aplicam-se às unidades e turmas da Educação Básica regular. Unidades do tipo EMAEE e turmas de Cursinho Pré-Universitário não realizam fechamento de conselho por notas regimentais.
          </p>
          <Button onClick={() => onOpenChange(false)} variant="outline" className="mt-2 text-xs rounded-xl">
            Fechar
          </Button>
        </div>
      </StandardDialog>
    )
  }

  return (
    <>
      <StandardDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Conselho de Classe & Ata de Resultados Finais"
        description={`${turma?.nome} • Ano Letivo ${anoLetivo} • ${turma?.turno}`}
        maxWidth="sm:max-w-[950px]"
      >
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span>Consolidando histórico acadêmico, notas e frequências da turma...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. Parâmetros da Reunião de Conselho */}
            <div className="bg-card/70 border border-border p-4 rounded-2xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-2">
                <div className="flex items-center gap-2">
                  <FileBadge className="w-5 h-5 text-amber-500" />
                  <h3 className="font-bold text-sm text-foreground">Reunião Colegiada do Conselho de Classe</h3>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    className={cn(
                      'text-xs font-bold',
                      statusAta === 'FINALIZADA'
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                        : 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                    )}
                  >
                    {statusAta === 'FINALIZADA' ? '✓ Ata Finalizada' : '• Em Deliberação'}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-muted-foreground mb-1 block">Período / Etapa</label>
                  <select
                    value={periodo}
                    onChange={(e) => setPeriodo(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl h-9 px-3 text-foreground focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="FINAL">Encerramento Final (Ano Letivo)</option>
                    <option value="1_UNIDADE">1ª Unidade / Trimestre</option>
                    <option value="2_UNIDADE">2ª Unidade / Trimestre</option>
                    <option value="3_UNIDADE">3ª Unidade / Trimestre</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-muted-foreground mb-1 block">Data da Reunião</label>
                  <Input
                    type="date"
                    value={dataReuniao}
                    onChange={(e) => setDataReuniao(e.target.value)}
                    className="bg-background border-border h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-muted-foreground mb-1 block">Horário Início</label>
                  <Input
                    type="time"
                    value={horarioInicio}
                    onChange={(e) => setHorarioInicio(e.target.value)}
                    className="bg-background border-border h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-muted-foreground mb-1 block">Horário Término</label>
                  <Input
                    type="time"
                    value={horarioTermino}
                    onChange={(e) => setHorarioTermino(e.target.value)}
                    className="bg-background border-border h-9 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 2. Tabela de Alunos e Deliberação Colegiada */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-3 bg-muted/60 border-b border-border flex items-center justify-between text-xs font-bold text-foreground">
                <span>Relação Nominal dos Estudantes & Situação Deliberada</span>
                <span className="text-muted-foreground text-[11px]">Total: {alunos.length} alunos</span>
              </div>

              <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/30 sticky top-0 z-10 text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="p-2.5 w-10 text-center">Nº</th>
                      <th className="p-2.5">Nome do Aluno</th>
                      <th className="p-2.5 w-20 text-center">Média Anual</th>
                      <th className="p-2.5 w-20 text-center">Freq. %</th>
                      <th className="p-2.5 w-44">Deliberação do Conselho</th>
                      <th className="p-2.5">Parecer / Justificativa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {alunos.map((aluno, idx) => {
                      const delib = deliberacoes[aluno.id] || {
                        situacao_final: 'APROVADO_DIRETO',
                        parecer_individual: '',
                        media_geral: 0,
                        frequencia: 100
                      }

                      const isAprovadoConselho = delib.situacao_final === 'APROVADO_CONSELHO'

                      return (
                        <tr key={aluno.id} className="hover:bg-muted/20">
                          <td className="p-2.5 text-center font-bold text-muted-foreground">{idx + 1}</td>
                          <td className="p-2.5 font-medium text-foreground">
                            <div>{aluno.nome}</div>
                            {aluno.matricula && (
                              <div className="text-[10px] text-muted-foreground font-mono">Mat: {aluno.matricula}</div>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            <span
                              className={cn(
                                'font-bold px-2 py-0.5 rounded-md text-xs',
                                (delib.media_geral || 0) >= 5.0
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              )}
                            >
                              {(delib.media_geral || 0).toFixed(1)}
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            <span
                              className={cn(
                                'text-xs font-semibold',
                                (delib.frequencia || 100) >= 75
                                  ? 'text-foreground'
                                  : 'text-rose-600 font-bold'
                              )}
                            >
                              {delib.frequencia ?? 100}%
                            </span>
                          </td>
                          <td className="p-2.5">
                            <select
                              value={delib.situacao_final}
                              onChange={(e) => {
                                setDeliberacoes({
                                  ...deliberacoes,
                                  [aluno.id]: {
                                    ...delib,
                                    situacao_final: e.target.value
                                  }
                                })
                              }}
                              className="w-full bg-background border border-border rounded-lg text-xs h-8 px-2 text-foreground font-medium outline-none focus:ring-1 focus:ring-primary"
                            >
                              <option value="APROVADO_DIRETO">Aprovado Direto</option>
                              <option value="APROVADO_CONSELHO">★ Aprovado p/ Conselho</option>
                              <option value="PROGRESSAO_PARCIAL">Progressão Parcial</option>
                              <option value="REPROVADO_NOTA">Conservado (Nota)</option>
                              <option value="REPROVADO_FALTA">Conservado (Falta)</option>
                              <option value="TRANSFERIDO">Transferido</option>
                            </select>
                          </td>
                          <td className="p-2.5">
                            <Input
                              value={delib.parecer_individual || ''}
                              onChange={(e) => {
                                setDeliberacoes({
                                  ...deliberacoes,
                                  [aluno.id]: {
                                    ...delib,
                                    parecer_individual: e.target.value
                                  }
                                })
                              }}
                              placeholder={
                                isAprovadoConselho
                                  ? 'Parecer obrigatório para aprovação por conselho...'
                                  : 'Observações individuais (opcional)...'
                              }
                              className={cn(
                                'h-8 text-xs bg-background border-border',
                                isAprovadoConselho && !delib.parecer_individual && 'border-amber-500/50 bg-amber-500/5'
                              )}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Parecer Conclusivo Geral da Turma */}
            <div className="bg-card border border-border p-4 rounded-2xl space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
                <FileBadge className="w-4 h-4 text-primary" /> Parecer Conclusivo & Deliberações do Colegiado
              </label>
              <Textarea
                value={parecerGeral}
                onChange={(e) => setParecerGeral(e.target.value)}
                placeholder="Descreva o parecer descritivo geral do conselho de classe sobre o desempenho pedagógico, adaptações curriculares, projetos desenvolvidos e deliberações finais..."
                rows={3}
                className="bg-background border-border text-xs resize-none"
              />
            </div>

            {/* 4. Membros e Professores Presentes */}
            <div className="bg-card/60 border border-border p-4 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
                <Users className="w-4 h-4 text-muted-foreground" /> Membros Presentes na Sessão de Conselho
              </span>
              <div className="flex flex-wrap gap-2 pt-1">
                {membros.map((m, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs py-1 px-2.5 bg-background border-border">
                    <span className="font-bold text-foreground">{m.nome}</span>
                    <span className="text-muted-foreground ml-1">({m.cargo || 'Docente'})</span>
                  </Badge>
                ))}
              </div>
            </div>

            {/* 5. Ações e Botões */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatusAta(statusAta === 'FINALIZADA' ? 'EM_ANDAMENTO' : 'FINALIZADA')
                  }}
                  className={cn(
                    'text-xs rounded-xl cursor-pointer',
                    statusAta === 'FINALIZADA'
                      ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
                      : 'text-muted-foreground'
                  )}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  {statusAta === 'FINALIZADA' ? 'Status: Ata Homologada' : 'Marcar como Finalizada'}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSalvarConselho}
                  disabled={saving}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2 rounded-xl text-xs shadow-md cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Gravando...' : 'Salvar Deliberações'}
                </Button>

                <Button
                  onClick={handleImprimirAta}
                  size="sm"
                  variant="outline"
                  className="border-border hover:bg-muted text-foreground font-bold gap-2 rounded-xl text-xs shadow-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-sky-500" />
                  Visualizar / Imprimir Ata Final (PDF)
                </Button>
              </div>
            </div>
          </div>
        )}
      </StandardDialog>

      {/* Componente Invisível para Impressão Nativa da Ata */}
      <div className="hidden print:block">
        <PrintAtaResultadosFinais ref={printRef} dados={dadosParaImpressao} />
      </div>
    </>
  )
}
