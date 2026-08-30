'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  UserPlus,
  Users,
  Search,
  CheckCircle2,
  CheckSquare,
  Sparkles,
  Trash2,
  Save,
  GraduationCap,
  FileSpreadsheet,
  HelpCircle,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Simulado } from '@/types/simulado'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'

interface ModalAdicionarAlunoSimuladoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  simulado: Simulado | null
  onSuccess?: () => void
}

interface AlunoSIG {
  id: string
  nome: string
  numero_matricula?: string
  turma_id?: string
  turmas?: { nome: string } | null
}

export function ModalAdicionarAlunoSimulado({
  open,
  onOpenChange,
  simulado,
  onSuccess
}: ModalAdicionarAlunoSimuladoProps) {
  const [tipoInclusao, setTipoInclusao] = useState<'matriculado' | 'avulso'>('matriculado')

  // Estado para Aluno Matriculado
  const [alunosDisponiveis, setAlunosDisponiveis] = useState<AlunoSIG[]>([])
  const [loadingAlunos, setLoadingAlunos] = useState(false)
  const [buscaAluno, setBuscaAluno] = useState('')
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoSIG | null>(null)

  // Estado para Aluno Avulso
  const [nomeAvulso, setNomeAvulso] = useState('')
  const [matriculaAvulsa, setMatriculaAvulsa] = useState('')
  const [turmaAvulsa, setTurmaAvulsa] = useState('')

  // Modo de Lançamento de Respostas
  const [modoLancamento, setModoLancamento] = useState<'grade' | 'acertos_direto'>('grade')
  const [respostasAluno, setRespostasAluno] = useState<Record<string, string>>({})
  const [acertosDireto, setAcertosDireto] = useState<number>(0)
  const [saving, setSaving] = useState(false)

  const supabase = createClient()
  const letras = useMemo(() => {
    const qtd = simulado?.alternativas_por_questao || 5
    return qtd === 4 ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C', 'D', 'E']
  }, [simulado])

  // Carrega lista de alunos da escola / turmas do simulado
  useEffect(() => {
    if (!open || !simulado) return

    const carregarAlunos = async () => {
      setLoadingAlunos(true)
      try {
        let query = (supabase as any)
          .from('alunos')
          .select('id, nome, numero_matricula, turma_id, turmas(nome)')
          .is('deleted_at', null)
          .order('nome', { ascending: true })

        if (simulado.turmas_ids && simulado.turmas_ids.length > 0) {
          query = query.in('turma_id', simulado.turmas_ids)
        } else {
          query = query.eq('escola_id', simulado.escola_id)
        }

        const { data, error } = await query
        if (error) throw error
        setAlunosDisponiveis(data || [])
      } catch (err: any) {
        console.error('Erro ao carregar alunos:', err)
        toast.error('Erro ao carregar lista de alunos')
      } finally {
        setLoadingAlunos(false)
      }
    }

    carregarAlunos()
    setAlunoSelecionado(null)
    setNomeAvulso('')
    setMatriculaAvulsa('')
    setTurmaAvulsa('')
    setRespostasAluno({})
    setAcertosDireto(0)
    setBuscaAluno('')
  }, [open, simulado])

  // Alunos filtrados pela busca
  const alunosFiltrados = useMemo(() => {
    if (!buscaAluno.trim()) return alunosDisponiveis.slice(0, 30)
    const termo = buscaAluno.toLowerCase().trim()
    return alunosDisponiveis.filter((a) => {
      const matchNome = a.nome.toLowerCase().includes(termo)
      const matchMatricula = (a.numero_matricula || '').toLowerCase().includes(termo)
      const matchTurma = (a.turmas?.nome || '').toLowerCase().includes(termo)
      return matchNome || matchMatricula || matchTurma
    })
  }, [alunosDisponiveis, buscaAluno])

  // Alterna resposta da questão na grade
  const handleSelectAlternativa = (questao: number, letra: string) => {
    const qStr = questao.toString()
    setRespostasAluno((prev) => {
      const atual = prev[qStr]
      if (atual === letra) {
        const copy = { ...prev }
        delete copy[qStr]
        return copy
      }
      return { ...prev, [qStr]: letra }
    })
  }

  // Preenche gabarito com 100% de acertos para teste
  const handlePreencher100 = () => {
    if (!simulado) return
    setRespostasAluno({ ...simulado.gabarito_oficial })
  }

  // Limpa todas as alternativas marcadas
  const handleLimparRespostas = () => {
    setRespostasAluno({})
    setAcertosDireto(0)
  }

  // Cálculos estatísticos da folha do aluno
  const metricasCalculadas = useMemo(() => {
    if (!simulado) {
      return { totalAcertos: 0, totalErros: 0, totalEmBranco: 0, percentual: 0, nota: 0 }
    }

    const qtdTotal = simulado.qtd_questoes

    if (modoLancamento === 'acertos_direto') {
      const acertos = Math.min(qtdTotal, Math.max(0, acertosDireto))
      const erros = qtdTotal - acertos
      const percentual = Number(((acertos / qtdTotal) * 100).toFixed(1))
      const nota = Number(((acertos / qtdTotal) * 10).toFixed(1))
      return { totalAcertos: acertos, totalErros: erros, totalEmBranco: 0, percentual, nota }
    }

    let acertos = 0
    let erros = 0
    let emBranco = 0

    for (let q = 1; q <= qtdTotal; q++) {
      const qStr = q.toString()
      const respAluno = (respostasAluno[qStr] || '').toUpperCase()
      const respCorreta = (simulado.gabarito_oficial[qStr] || '').toUpperCase()

      if (!respAluno) {
        emBranco++
      } else if (respAluno === respCorreta) {
        acertos++
      } else {
        erros++
      }
    }

    const percentual = Number(((acertos / qtdTotal) * 100).toFixed(1))
    const nota = Number(((acertos / qtdTotal) * 10).toFixed(1))

    return { totalAcertos: acertos, totalErros: erros, totalEmBranco: emBranco, percentual, nota }
  }, [simulado, modoLancamento, respostasAluno, acertosDireto])

  // Salva a resposta do aluno no banco de dados
  const handleSalvarResposta = async () => {
    if (!simulado) return

    let nomeFinal = ''
    let alunoId: string | null = null
    let turmaId: string | null = null

    if (tipoInclusao === 'matriculado') {
      if (!alunoSelecionado) {
        toast.error('Selecione um aluno da lista.')
        return
      }
      nomeFinal = alunoSelecionado.nome
      alunoId = alunoSelecionado.id
      turmaId = alunoSelecionado.turma_id || null
    } else {
      if (!nomeAvulso.trim()) {
        toast.error('Digite o nome do estudante avulso.')
        return
      }
      nomeFinal = nomeAvulso.trim()
    }

    // Monta respostas finais
    let respostasSalvar = { ...respostasAluno }
    if (modoLancamento === 'acertos_direto') {
      respostasSalvar = {}
      let acertosContados = 0
      for (let q = 1; q <= simulado.qtd_questoes; q++) {
        const qStr = q.toString()
        const gab = simulado.gabarito_oficial[qStr] || 'A'
        if (acertosContados < metricasCalculadas.totalAcertos) {
          respostasSalvar[qStr] = gab
          acertosContados++
        } else {
          // Marca uma alternativa incorreta para representar o erro
          const altIncorreta = letras.find((l) => l !== gab) || 'A'
          respostasSalvar[qStr] = altIncorreta
        }
      }
    }

    setSaving(true)
    try {
      const payload = {
        simulado_id: simulado.id,
        aluno_id: alunoId,
        turma_id: turmaId,
        nome_identificado: nomeFinal,
        respostas: respostasSalvar,
        total_acertos: metricasCalculadas.totalAcertos,
        total_erros: metricasCalculadas.totalErros,
        total_em_branco: metricasCalculadas.totalEmBranco,
        total_anuladas: 0,
        nota_final: metricasCalculadas.nota,
        percentual_acerto: metricasCalculadas.percentual,
        canal_correcao: 'manual_painel',
        data_correcao: new Date().toISOString()
      }

      if (alunoId) {
        const { error } = await (supabase as any)
          .from('simulados_respostas')
          .upsert(payload, { onConflict: 'simulado_id, aluno_id' })

        if (error) throw error
      } else {
        const { error } = await (supabase as any)
          .from('simulados_respostas')
          .insert(payload)

        if (error) throw error
      }

      toast.success(`Nota de ${nomeFinal} registrada com sucesso! (Nota: ${metricasCalculadas.nota})`)
      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao registrar resposta:', err)
      toast.error('Erro ao salvar nota do aluno: ' + (err.message || 'Falha no banco'))
    } finally {
      setSaving(false)
    }
  }

  // Gera a grade de respostas interativa
  const renderGradeLancamento = () => {
    if (!simulado) return null

    const qtd = simulado.qtd_questoes
    const numBlocos = qtd <= 20 ? 1 : qtd <= 45 ? 3 : qtd <= 60 ? 3 : 4
    const questoesPorBloco = Math.ceil(qtd / numBlocos)
    const blocos = []

    for (let b = 0; b < numBlocos; b++) {
      const startQ = b * questoesPorBloco + 1
      const endQ = Math.min(qtd, (b + 1) * questoesPorBloco)
      const questoes: number[] = []

      for (let q = startQ; q <= endQ; q++) {
        questoes.push(q)
      }

      blocos.push(
        <div key={b} className="w-full border border-border rounded-xl overflow-hidden bg-card mb-2.5 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-center">
              <thead>
                <tr className="bg-muted/60 border-b border-border">
                  <th className="w-10 py-1.5 px-1 text-[11px] font-black text-foreground border-r border-border uppercase">
                    Nº
                  </th>
                  {questoes.map((q) => {
                    const qStr = q.toString()
                    const resp = respostasAluno[qStr]
                    const gab = simulado.gabarito_oficial[qStr]
                    const isCorreta = resp && resp === gab
                    const isErrada = resp && resp !== gab

                    return (
                      <th
                        key={q}
                        className={`py-1 px-1 font-mono font-black text-[11px] border-r border-border/60 last:border-r-0 ${
                          isCorreta
                            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                            : isErrada
                            ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {q < 10 ? `0${q}` : q}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {letras.map((letra) => (
                  <tr key={letra} className="border-b border-border/40 last:border-b-0 hover:bg-muted/20 transition-colors">
                    <td className="w-10 py-1 px-1 font-black text-xs text-foreground bg-muted/40 border-r border-border">
                      {letra}
                    </td>
                    {questoes.map((q) => {
                      const qStr = q.toString()
                      const isSelected = respostasAluno[qStr] === letra
                      const isGabarito = simulado.gabarito_oficial[qStr] === letra

                      return (
                        <td key={`${q}-${letra}`} className="py-1 px-0.5 border-r border-border/40 last:border-r-0">
                          <button
                            type="button"
                            onClick={() => handleSelectAlternativa(q, letra)}
                            className={`w-6 h-6 rounded-full font-bold text-[10px] transition-all flex items-center justify-center mx-auto ${
                              isSelected
                                ? isGabarito
                                  ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-black font-extrabold shadow-sm scale-105 ring-2 ring-emerald-400'
                                  : 'bg-rose-600 text-white dark:bg-rose-500 dark:text-white font-extrabold shadow-sm scale-105 ring-2 ring-rose-400'
                                : 'bg-background hover:bg-muted text-foreground border border-border/70 hover:scale-105'
                            }`}
                          >
                            {letra}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    return <div className="space-y-1">{blocos}</div>
  }

  if (!simulado) return null

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Adicionar Aluno / Lançar Nota • ${simulado.titulo}`}
      description="Inclua novos alunos que realizaram o simulado posteriormente e lance as respostas ou notas manualmente para atualizar o ranqueamento."
      maxWidth="sm:max-w-5xl"
    >
      <div className="space-y-5">
        {/* SELEÇÃO DAS 2 OPÇÕES DE INCLUSÃO */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <h4 className="font-extrabold text-sm text-foreground flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> Identificação do Estudante
            </h4>

            {/* As 2 Opções de Inclusão Ativas */}
            <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border">
              <Button
                type="button"
                size="sm"
                variant={tipoInclusao === 'matriculado' ? 'default' : 'ghost'}
                onClick={() => setTipoInclusao('matriculado')}
                className="text-xs font-bold gap-1.5 h-7"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                Opção 1: Aluno Matriculado (SIG)
              </Button>
              <Button
                type="button"
                size="sm"
                variant={tipoInclusao === 'avulso' ? 'default' : 'ghost'}
                onClick={() => setTipoInclusao('avulso')}
                className="text-xs font-bold gap-1.5 h-7"
              >
                <Users className="w-3.5 h-3.5" />
                Opção 2: Aluno Avulso / Digitar Nome
              </Button>
            </div>
          </div>

          {/* PAINEL DA OPÇÃO 1: ALUNO MATRICULADO */}
          {tipoInclusao === 'matriculado' ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={buscaAluno}
                  onChange={(e) => setBuscaAluno(e.target.value)}
                  placeholder="Pesquisar por nome do aluno, turma ou número de matrícula..."
                  className="pl-9 bg-background border-border text-xs"
                />
              </div>

              {alunoSelecionado ? (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-xs text-foreground block">
                        {alunoSelecionado.nome}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Matrícula: <strong>{alunoSelecionado.numero_matricula || '---'}</strong> • Turma:{' '}
                        <strong>{alunoSelecionado.turmas?.nome || 'Cursinho'}</strong>
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAlunoSelecionado(null)}
                    className="text-xs h-7"
                  >
                    Trocar Aluno
                  </Button>
                </div>
              ) : (
                <div className="max-h-44 overflow-y-auto border border-border rounded-xl divide-y divide-border bg-background">
                  {loadingAlunos ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      Carregando alunos cadastrados...
                    </div>
                  ) : alunosFiltrados.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      Nenhum aluno encontrado na busca.
                    </div>
                  ) : (
                    alunosFiltrados.map((aluno) => (
                      <div
                        key={aluno.id}
                        onClick={() => setAlunoSelecionado(aluno)}
                        className="p-2.5 px-3 hover:bg-muted/50 cursor-pointer transition-colors flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-foreground block">{aluno.nome}</span>
                          <span className="text-[10px] text-muted-foreground">
                            Matrícula: {aluno.numero_matricula || '---'} • Turma:{' '}
                            {aluno.turmas?.nome || 'Cursinho Regular'}
                          </span>
                        </div>
                        <Button type="button" size="sm" variant="ghost" className="h-6 text-[11px] font-bold text-emerald-600">
                          Selecionar
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            /* PAINEL DA OPÇÃO 2: ALUNO AVULSO */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-6 space-y-1">
                <Label className="text-xs font-bold">Nome Completo do Estudante *</Label>
                <Input
                  value={nomeAvulso}
                  onChange={(e) => setNomeAvulso(e.target.value)}
                  placeholder="Ex: Carlos Eduardo de Oliveira"
                  className="bg-background border-border text-xs"
                />
              </div>

              <div className="md:col-span-3 space-y-1">
                <Label className="text-xs font-bold">Turma / Categoria</Label>
                <Input
                  value={turmaAvulsa}
                  onChange={(e) => setTurmaAvulsa(e.target.value)}
                  placeholder="Ex: Convidado / Noturno"
                  className="bg-background border-border text-xs"
                />
              </div>

              <div className="md:col-span-3 space-y-1">
                <Label className="text-xs font-bold">Matrícula (Opcional)</Label>
                <Input
                  value={matriculaAvulsa}
                  onChange={(e) => setMatriculaAvulsa(e.target.value)}
                  placeholder="Ex: AV-2026"
                  className="bg-background border-border text-xs font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* PAINEL DE LANÇAMENTO DAS RESPOSTAS DO ALUNO */}
        <div className="bg-card border-2 border-border/90 rounded-2xl p-4 space-y-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <h4 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> Respostas do Estudante & Cálculo Automático
              </h4>
              <span className="text-xs text-muted-foreground">
                Marque as alternativas na grade ou informe o total de acertos para calcular a nota final.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLimparRespostas}
                className="text-xs text-rose-500 hover:text-rose-600 gap-1.5 h-8"
              >
                <Trash2 className="w-3.5 h-3.5" /> Limpar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePreencher100}
                className="text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 gap-1.5 h-8"
              >
                <Sparkles className="w-3.5 h-3.5" /> 100% Acertos
              </Button>
            </div>
          </div>

          {/* Cards de Métricas em Tempo Real */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 block">Acertos</span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                {metricasCalculadas.totalAcertos} / {simulado.qtd_questoes}
              </span>
            </div>

            <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-300 block">Erros</span>
              <span className="text-xl font-black text-rose-600 dark:text-rose-400">
                {metricasCalculadas.totalErros}
              </span>
            </div>

            <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 block">Aproveitamento</span>
              <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                {metricasCalculadas.percentual}%
              </span>
            </div>

            <div className="p-2.5 bg-amber-500/10 border border-amber-500/40 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300 block">Nota Final</span>
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {metricasCalculadas.nota.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Grade de Lançamento de Respostas */}
          <div className="max-h-[300px] overflow-y-auto pr-1">
            {renderGradeLancamento()}
          </div>
        </div>

        {/* Botões de Ação Final */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={saving || (tipoInclusao === 'matriculado' && !alunoSelecionado) || (tipoInclusao === 'avulso' && !nomeAvulso.trim())}
            onClick={handleSalvarResposta}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 px-5"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Gravando Nota...' : 'Salvar Aluno no Simulado'}
          </Button>
        </div>
      </div>
    </StandardDialog>
  )
}
