'use client'

import { useState, useEffect, useMemo } from 'react'
import { Award, Trophy, Search, Printer, Users, Eye, Trash2, BarChart3, UserPlus, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Simulado, SimuladoResposta } from '@/types/simulado'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { ModalAdicionarAlunoSimulado } from './ModalAdicionarAlunoSimulado'
import { ModalScannerCamera } from './ModalScannerCamera'

interface ModalRankingSimuladoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  simulado: Simulado | null
  escolaNome?: string
}

export function ModalRankingSimulado({
  open,
  onOpenChange,
  simulado,
  escolaNome = 'Cursinho Pré-Universitário'
}: ModalRankingSimuladoProps) {
  const [respostas, setRespostas] = useState<SimuladoResposta[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [turmaFilter, setTurmaFilter] = useState('all')
  const [selectedAlunoResposta, setSelectedAlunoResposta] = useState<SimuladoResposta | null>(null)
  const [tabAtiva, setTabAtiva] = useState<'ranking' | 'raio-x'>('ranking')
  const [isModalAdicionarAlunoOpen, setIsModalAdicionarAlunoOpen] = useState(false)
  const [isModalScannerOpen, setIsModalScannerOpen] = useState(false)

  const supabase = createClient()

  const carregarRespostas = async () => {
    if (!simulado) return
    setLoading(true)
    try {
      const { data, error } = await (supabase as any)
        .from('simulados_respostas')
        .select('*, aluno:alunos(id, nome, numero_matricula, foto), turma:turmas(id, nome)')
        .eq('simulado_id', simulado.id)
        .order('nota_final', { ascending: false })
        .order('total_acertos', { ascending: false })

      if (error) throw error
      setRespostas(data || [])
    } catch (err: any) {
      console.error('Erro ao carregar ranking:', err)
      toast.error('Erro ao carregar resultados do simulado')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && simulado) {
      carregarRespostas()
      setSelectedAlunoResposta(null)
    }
  }, [open, simulado])

  const handleDeleteResposta = async (id: string, nome: string) => {
    if (!confirm(`Deseja realmente remover a correção de "${nome}"?`)) return

    try {
      const { error } = await (supabase as any)
        .from('simulados_respostas')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Correção removida com sucesso!')
      carregarRespostas()
      if (selectedAlunoResposta?.id === id) setSelectedAlunoResposta(null)
    } catch (err: any) {
      toast.error('Erro ao excluir correção')
    }
  }

  // Filtragem e ordenação
  const filteredRespostas = useMemo(() => {
    return respostas.filter((r) => {
      const nomeAluno = r.aluno?.nome || r.nome_identificado || ''
      const matchesSearch = nomeAluno.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesTurma = turmaFilter === 'all' || r.turma_id === turmaFilter
      return matchesSearch && matchesTurma
    })
  }, [respostas, searchTerm, turmaFilter])

  // Estatísticas gerais
  const stats = useMemo(() => {
    if (respostas.length === 0) return { mediaGeral: 0, maiorNota: 0, menorNota: 0, totalAlunos: 0 }
    const notas = respostas.map((r) => Number(r.nota_final) || 0)
    const soma = notas.reduce((acc, curr) => acc + curr, 0)
    const mediaGeral = soma / notas.length
    const maiorNota = Math.max(...notas)
    const menorNota = Math.min(...notas)
    return {
      mediaGeral: Number(mediaGeral.toFixed(2)),
      maiorNota: Number(maiorNota.toFixed(2)),
      menorNota: Number(menorNota.toFixed(2)),
      totalAlunos: respostas.length
    }
  }, [respostas])

  // Análise Pedagógica: Raio-X por Questão (Taxa de Acertos)
  const raioXQuestoes = useMemo(() => {
    if (!simulado || respostas.length === 0) return []
    const resultado = []

    for (let q = 1; q <= simulado.qtd_questoes; q++) {
      const qStr = q.toString()
      const gabaritoCorreto = (simulado.gabarito_oficial[qStr] || '').toUpperCase()
      let totalAcertosQ = 0
      let totalErrosQ = 0
      let totalBrancosQ = 0

      respostas.forEach((resp) => {
        const altAluno = (resp.respostas?.[qStr] || 'BRANCO').toUpperCase()
        if (altAluno === 'BRANCO') {
          totalBrancosQ++
        } else if (altAluno === gabaritoCorreto) {
          totalAcertosQ++
        } else {
          totalErrosQ++
        }
      })

      const taxaAcerto = respostas.length > 0 ? (totalAcertosQ / respostas.length) * 100 : 0

      resultado.push({
        questao: q,
        gabarito: gabaritoCorreto,
        totalAcertos: totalAcertosQ,
        totalErros: totalErrosQ,
        totalBrancos: totalBrancosQ,
        taxaAcerto: Number(taxaAcerto.toFixed(1))
      })
    }

    return resultado
  }, [simulado, respostas])

  const top3 = filteredRespostas.slice(0, 3)

  if (!simulado) return null

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Ranqueamento e Desempenho • ${simulado.titulo}`}
      description="Classificação geral, médias, taxa de acerto por questão e detalhamento individual dos alunos."
      maxWidth="sm:max-w-5xl"
    >
      <div className="space-y-6">
        {/* Barra Superior com Métricas e Abas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 bg-card border border-border rounded-2xl flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block">Alunos Avaliados</span>
              <span className="text-xl font-extrabold text-foreground">{stats.totalAlunos}</span>
            </div>
          </div>

          <div className="p-3.5 bg-card border border-border rounded-2xl flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block">Média Geral</span>
              <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats.mediaGeral.toFixed(1)}</span>
            </div>
          </div>

          <div className="p-3.5 bg-card border border-border rounded-2xl flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block">Maior Nota</span>
              <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400">{stats.maiorNota.toFixed(1)}</span>
            </div>
          </div>

          <div className="p-3.5 bg-card border border-border rounded-2xl flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-600 dark:text-purple-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block">Menor Nota</span>
              <span className="text-xl font-extrabold text-foreground">{stats.menorNota.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Pódio dos Top 3 (Apenas se houver pelo menos 2 alunos) */}
        {top3.length >= 2 && tabAtiva === 'ranking' && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <h4 className="text-xs font-bold text-muted-foreground uppercase mb-3 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" /> Pódio de Excelência do Simulado
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* 2º Lugar */}
              {top3[1] && (
                <div className="p-3 bg-muted/40 border border-border rounded-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-500/20 text-slate-700 dark:text-slate-300 font-extrabold flex items-center justify-center text-lg border border-slate-500/40 shrink-0">
                    2º
                  </div>
                  <div className="truncate flex-1">
                    <span className="font-extrabold text-sm text-foreground block truncate">
                      {top3[1].aluno?.nome || top3[1].nome_identificado}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {top3[1].total_acertos} acertos ({top3[1].percentual_acerto}%)
                    </span>
                  </div>
                  <span className="text-lg font-black text-slate-700 dark:text-slate-300">
                    {Number(top3[1].nota_final).toFixed(1)}
                  </span>
                </div>
              )}

              {/* 1º Lugar (Destaque Central) */}
              {top3[0] && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/40 rounded-xl flex items-center gap-3 shadow-md">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold flex items-center justify-center text-lg border border-amber-500/50 shrink-0">
                    1º
                  </div>
                  <div className="truncate flex-1">
                    <span className="font-extrabold text-sm text-amber-700 dark:text-amber-300 block truncate">
                      {top3[0].aluno?.nome || top3[0].nome_identificado}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {top3[0].total_acertos} acertos ({top3[0].percentual_acerto}%)
                    </span>
                  </div>
                  <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                    {Number(top3[0].nota_final).toFixed(1)}
                  </span>
                </div>
              )}

              {/* 3º Lugar */}
              {top3[2] && (
                <div className="p-3 bg-muted/40 border border-border rounded-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-800/20 text-amber-700 dark:text-amber-600 font-extrabold flex items-center justify-center text-lg border border-amber-800/30 shrink-0">
                    3º
                  </div>
                  <div className="truncate flex-1">
                    <span className="font-extrabold text-sm text-foreground block truncate">
                      {top3[2].aluno?.nome || top3[2].nome_identificado}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {top3[2].total_acertos} acertos ({top3[2].percentual_acerto}%)
                    </span>
                  </div>
                  <span className="text-lg font-black text-amber-700 dark:text-amber-600">
                    {Number(top3[2].nota_final).toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Abas e Barra de Filtros */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant={tabAtiva === 'ranking' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTabAtiva('ranking')}
              className="gap-2"
            >
              <Trophy className="w-4 h-4" /> Tabela de Classificação
            </Button>
            <Button
              variant={tabAtiva === 'raio-x' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTabAtiva('raio-x')}
              className="gap-2"
            >
              <BarChart3 className="w-4 h-4" /> Raio-X das Questões
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {tabAtiva === 'ranking' && (
              <div className="relative w-48 sm:w-56">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar aluno..."
                  className="pl-9 h-9 bg-background border-border text-xs"
                />
              </div>
            )}

            <Button
              size="sm"
              onClick={() => setIsModalAdicionarAlunoOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 text-xs shadow-xs"
            >
              <UserPlus className="w-4 h-4" /> + Adicionar Aluno
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsModalScannerOpen(true)}
              className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-bold gap-1.5 text-xs"
              title="Corrigir mais provas por câmera"
            >
              <Camera className="w-4 h-4" /> Ler Câmera
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-2 text-xs font-bold"
            >
              <Printer className="w-4 h-4" /> Imprimir
            </Button>
          </div>
        </div>

        {/* Conteúdo da Aba Ranking */}
        {tabAtiva === 'ranking' && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/60 border-b border-border sticky top-0 z-10">
                  <tr className="text-muted-foreground font-bold uppercase text-[10px]">
                    <th className="py-3 px-4 w-12 text-center">Pos.</th>
                    <th className="py-3 px-4">Estudante</th>
                    <th className="py-3 px-4">Turma</th>
                    <th className="py-3 px-4 text-center">Acertos</th>
                    <th className="py-3 px-4 text-center">Erros</th>
                    <th className="py-3 px-4 text-center">Branco</th>
                    <th className="py-3 px-4 text-center">Aprov.</th>
                    <th className="py-3 px-4 text-right">Nota Final</th>
                    <th className="py-3 px-4 text-center w-24">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-muted-foreground">
                        Carregando ranking...
                      </td>
                    </tr>
                  ) : filteredRespostas.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-muted-foreground">
                        Nenhum resultado registrado para este simulado.
                      </td>
                    </tr>
                  ) : (
                    filteredRespostas.map((r, index) => {
                      const pos = index + 1
                      return (
                        <tr key={r.id} className="hover:bg-hoverCustom/40 transition-colors">
                          <td className="py-3 px-4 text-center font-bold">
                            {pos === 1 ? (
                              <span className="text-amber-500 dark:text-amber-400 font-extrabold">🥇 1º</span>
                            ) : pos === 2 ? (
                              <span className="text-slate-500 dark:text-slate-300 font-extrabold">🥈 2º</span>
                            ) : pos === 3 ? (
                              <span className="text-amber-700 dark:text-amber-600 font-extrabold">🥉 3º</span>
                            ) : (
                              <span className="text-muted-foreground">{pos}º</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-extrabold text-foreground">
                              {r.aluno?.nome || r.nome_identificado}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              Matrícula: {r.aluno?.numero_matricula || '---'} • Canal: {r.canal_correcao}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {r.turma?.nome || '---'}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                            {r.total_acertos}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-rose-600 dark:text-rose-400">
                            {r.total_erros}
                          </td>
                          <td className="py-3 px-4 text-center text-amber-600 dark:text-amber-400">
                            {r.total_em_branco}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-blue-600 dark:text-blue-400">
                            {r.percentual_acerto}%
                          </td>
                          <td className="py-3 px-4 text-right font-black text-sm text-emerald-600 dark:text-emerald-400">
                            {Number(r.nota_final).toFixed(1)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedAlunoResposta(r)}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                title="Ver espelho da folha"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteResposta(r.id, r.aluno?.nome || r.nome_identificado)}
                                className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-500/10"
                                title="Excluir nota"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Conteúdo da Aba Raio-X das Questões */}
        {tabAtiva === 'raio-x' && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
            <div>
              <h4 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> Diagnóstico Pedagógico por Questão
              </h4>
              <p className="text-xs text-muted-foreground">
                Acompanhe o índice de acerto de cada questão para identificar os tópicos que exigem reforço em sala.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-1">
              {raioXQuestoes.map((q) => {
                const isDificil = q.taxaAcerto < 40
                const isFacil = q.taxaAcerto >= 75

                return (
                  <div
                    key={q.questao}
                    className={`p-3 rounded-xl border flex flex-col justify-between space-y-2 ${
                      isDificil
                        ? 'bg-rose-500/5 border-rose-500/30'
                        : isFacil
                        ? 'bg-emerald-500/5 border-emerald-500/30'
                        : 'bg-muted/30 border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="font-mono text-foreground">
                        Questão {q.questao < 10 ? `0${q.questao}` : q.questao}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted border border-border">
                        Gabarito: <strong>{q.gabarito}</strong>
                      </span>
                    </div>

                    {/* Barra de Progresso de Acertos */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Taxa de Acerto:</span>
                        <span
                          className={`font-black ${
                            isDificil ? 'text-rose-500 dark:text-rose-400' : isFacil ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {q.taxaAcerto}%
                        </span>
                      </div>
                      <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isDificil ? 'bg-rose-500' : isFacil ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${q.taxaAcerto}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">{q.totalAcertos} acertaram</span>
                      <span className="text-rose-600 dark:text-rose-400 font-bold">{q.totalErros} erraram</span>
                      <span>{q.totalBrancos} em branco</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Modal de Espelho de Respostas do Aluno Selecionado */}
        {selectedAlunoResposta && (
          <div className="bg-card border border-emerald-500/40 rounded-2xl p-4 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h4 className="font-extrabold text-foreground text-sm">
                  Espelho da Folha: {selectedAlunoResposta.aluno?.nome || selectedAlunoResposta.nome_identificado}
                </h4>
                <span className="text-xs text-muted-foreground">
                  Nota: <strong>{Number(selectedAlunoResposta.nota_final).toFixed(1)}</strong> • {selectedAlunoResposta.total_acertos} Acertos • {selectedAlunoResposta.total_erros} Erros
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAlunoResposta(null)}
                className="h-8 w-8 p-0"
              >
                ✕
              </Button>
            </div>

            <div className="max-h-48 overflow-y-auto grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 font-mono text-xs">
              {Array.from({ length: simulado.qtd_questoes }).map((_, idx) => {
                const q = idx + 1
                const qStr = q.toString()
                const respAluno = (selectedAlunoResposta.respostas?.[qStr] || 'BRANCO').toUpperCase()
                const respCorreta = (simulado.gabarito_oficial[qStr] || '').toUpperCase()
                const acertou = respAluno === respCorreta

                return (
                  <div
                    key={q}
                    className={`p-2 rounded-xl border text-center ${
                      acertou
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                        : respAluno === 'BRANCO'
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300'
                        : 'bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    <span className="text-[10px] text-muted-foreground block">Q{q < 10 ? `0${q}` : q}</span>
                    <span className="font-extrabold text-sm">{respAluno}</span>
                    {!acertou && <span className="text-[9px] text-muted-foreground block">({respCorreta})</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal para Adicionar Aluno e Lançar Nota (Manual / Grade) */}
      <ModalAdicionarAlunoSimulado
        open={isModalAdicionarAlunoOpen}
        onOpenChange={setIsModalAdicionarAlunoOpen}
        simulado={simulado}
        onSuccess={() => {
          carregarRespostas()
        }}
      />

      {/* Modal para Corrigir com Câmera diretamente do Ranking */}
      <ModalScannerCamera
        open={isModalScannerOpen}
        onOpenChange={setIsModalScannerOpen}
        simulado={simulado}
        onCorrecaoSalva={() => {
          carregarRespostas()
        }}
      />
    </StandardDialog>
  )
}
