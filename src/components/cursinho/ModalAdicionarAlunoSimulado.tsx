'use client'

import React, { useState, useEffect, useMemo } from 'react'
import QRCode from 'qrcode'
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
  AlertCircle,
  QrCode,
  Share2,
  Copy,
  ExternalLink,
  Globe,
  ShieldCheck,
  Check
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
  cpf?: string | null
  data_nascimento?: string | null
  nome_mae?: string | null
  dados_matricula?: any
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

  // Dados para validação de acesso ao QR Code
  const [cpfAluno, setCpfAluno] = useState('')
  const [dataNascimentoAluno, setDataNascimentoAluno] = useState('')
  const [nomeMaeAluno, setNomeMaeAluno] = useState('')

  // Estado para Aluno Avulso
  const [nomeAvulso, setNomeAvulso] = useState('')
  const [matriculaAvulsa, setMatriculaAvulsa] = useState('')
  const [turmaAvulsa, setTurmaAvulsa] = useState('')

  // Opção de Língua Estrangeira escolhida pelo aluno (quando o simulado tem a opção)
  const [linguaEscolhida, setLinguaEscolhida] = useState<'ingles' | 'espanhol'>('ingles')

  // Estado para o Modal de QR Code após salvar
  const [modalQrAberto, setModalQrAberto] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [linkResultadoUrl, setLinkResultadoUrl] = useState('')
  const [alunoSalvoInfo, setAlunoSalvoInfo] = useState<{ nome: string; nota: number; acertos: number } | null>(null)
  const [copiado, setCopiado] = useState(false)

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

  // Identifica se o simulado possui configuração de Língua Estrangeira
  const temLinguaEstrangeira = useMemo(() => {
    if (!simulado) return false
    return Boolean(
      simulado.possui_lingua_estrangeira ||
      (simulado.gabarito_ingles && Object.keys(simulado.gabarito_ingles).length > 0) ||
      (simulado.gabarito_espanhol && Object.keys(simulado.gabarito_espanhol).length > 0)
    )
  }, [simulado])

  // Carrega lista de alunos da escola / turmas do simulado
  useEffect(() => {
    if (!open || !simulado) return

    const carregarAlunos = async () => {
      setLoadingAlunos(true)
      try {
        let query = (supabase as any)
          .from('alunos')
          .select('id, nome, numero_matricula, cpf, data_nascimento, nome_mae, dados_matricula, turma_id, turmas(nome)')
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
    setCpfAluno('')
    setDataNascimentoAluno('')
    setNomeMaeAluno('')
    setLinguaEscolhida('ingles')
    setRespostasAluno({})
    setAcertosDireto(0)
    setBuscaAluno('')
    setModalQrAberto(false)
    setQrCodeUrl('')
    setLinkResultadoUrl('')
    setAlunoSalvoInfo(null)
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

  // Cálculos estatísticos da folha do aluno considerando Língua Estrangeira
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

    const linguaInicio = simulado.lingua_estrangeira_inicio || 1
    const linguaFim = simulado.lingua_estrangeira_fim || 5

    for (let q = 1; q <= qtdTotal; q++) {
      const qStr = q.toString()
      const respAluno = (respostasAluno[qStr] || '').toUpperCase()

      const isLingua = Boolean(temLinguaEstrangeira) && q >= linguaInicio && q <= linguaFim

      let respCorreta = (simulado.gabarito_oficial[qStr] || '').toUpperCase()
      if (isLingua) {
        respCorreta = (
          linguaEscolhida === 'espanhol'
            ? (simulado.gabarito_espanhol?.[qStr] || respCorreta)
            : (simulado.gabarito_ingles?.[qStr] || respCorreta)
        ).toUpperCase()
      }

      const isAnulada = respCorreta === 'ANULADA' || respCorreta === '*'

      if (isAnulada) {
        acertos++
      } else if (!respAluno) {
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
  }, [simulado, modoLancamento, respostasAluno, acertosDireto, linguaEscolhida, temLinguaEstrangeira])

  // Salva a resposta do aluno no banco de dados e gera QR Code
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
        const isLingua = Boolean(temLinguaEstrangeira) && q >= (simulado.lingua_estrangeira_inicio || 1) && q <= (simulado.lingua_estrangeira_fim || 5)
        let gab = simulado.gabarito_oficial[qStr] || 'A'
        if (isLingua) {
          gab = (linguaEscolhida === 'espanhol' ? simulado.gabarito_espanhol?.[qStr] : simulado.gabarito_ingles?.[qStr]) || gab
        }

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
        cpf_aluno: cpfAluno.trim() || null,
        data_nascimento_aluno: dataNascimentoAluno.trim() || null,
        nome_mae_aluno: nomeMaeAluno.trim() || null,
        lingua_estrangeira: temLinguaEstrangeira ? linguaEscolhida : null,
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

      let respostaIdSalva = ''

      if (alunoId) {
        const { data, error } = await (supabase as any)
          .from('simulados_respostas')
          .upsert(payload, { onConflict: 'simulado_id, aluno_id' })
          .select('id')
          .single()

        if (error) throw error
        respostaIdSalva = data?.id
      } else {
        const { data, error } = await (supabase as any)
          .from('simulados_respostas')
          .insert(payload)
          .select('id')
          .single()

        if (error) throw error
        respostaIdSalva = data?.id
      }

      toast.success(`Nota de ${nomeFinal} registrada com sucesso! (Nota: ${metricasCalculadas.nota})`)
      onSuccess?.()

      // Gera QR Code de compartilhamento do resultado para o aluno
      if (typeof window !== 'undefined' && respostaIdSalva) {
        const urlResultado = `${window.location.origin}/simulado-resultado/${respostaIdSalva}`
        setLinkResultadoUrl(urlResultado)
        try {
          const qrDataUrl = await QRCode.toDataURL(urlResultado, {
            width: 280,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#ffffff'
            }
          })
          setQrCodeUrl(qrDataUrl)
          setAlunoSalvoInfo({
            nome: nomeFinal,
            nota: metricasCalculadas.nota,
            acertos: metricasCalculadas.totalAcertos
          })
          setModalQrAberto(true)
        } catch (qrErr) {
          console.error('Erro ao gerar QR Code:', qrErr)
          onOpenChange(false)
        }
      } else {
        onOpenChange(false)
      }
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

                    const isLingua = Boolean(temLinguaEstrangeira) && q >= (simulado.lingua_estrangeira_inicio || 1) && q <= (simulado.lingua_estrangeira_fim || 5)
                    let gab = simulado.gabarito_oficial[qStr]
                    if (isLingua) {
                      gab = (linguaEscolhida === 'espanhol' ? simulado.gabarito_espanhol?.[qStr] : simulado.gabarito_ingles?.[qStr]) || gab
                    }

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
                            : isLingua
                            ? linguaEscolhida === 'ingles'
                              ? 'text-blue-700 dark:text-blue-300 bg-blue-500/15 border-b-2 border-b-blue-500'
                              : 'text-amber-700 dark:text-amber-300 bg-amber-500/15 border-b-2 border-b-amber-500'
                            : 'text-muted-foreground'
                        }`}
                        title={isLingua ? `Questão ${q} de Língua Estrangeira (${linguaEscolhida === 'ingles' ? 'Inglês' : 'Espanhol'} - Gabarito: ${gab || '?'})` : undefined}
                      >
                        <div>{q < 10 ? `0${q}` : q}</div>
                        {isLingua && (
                          <span className={`text-[8px] font-black uppercase tracking-tighter block ${linguaEscolhida === 'ingles' ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {linguaEscolhida === 'ingles' ? 'ING' : 'ESP'}
                          </span>
                        )}
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

                      const isLingua = Boolean(temLinguaEstrangeira) && q >= (simulado.lingua_estrangeira_inicio || 1) && q <= (simulado.lingua_estrangeira_fim || 5)
                      let gab = simulado.gabarito_oficial[qStr]
                      if (isLingua) {
                        gab = (linguaEscolhida === 'espanhol' ? simulado.gabarito_espanhol?.[qStr] : simulado.gabarito_ingles?.[qStr]) || gab
                      }

                      const isGabarito = gab === letra

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
    <>
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
                        onClick={() => {
                          setAlunoSelecionado(aluno)
                          setCpfAluno(aluno.cpf || '')
                          const dm = (aluno.dados_matricula as Record<string, any>) || {}
                          const dataNasc = aluno.data_nascimento || dm.dataNascimento || dm.data_nascimento || ''
                          const mae = aluno.nome_mae || dm.nomeMaeAluno || dm.maeAluno || dm.nomeMae || dm.mae || ''
                          setDataNascimentoAluno(dataNasc)
                          setNomeMaeAluno(mae)
                        }}
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

          {/* DADOS DE ACESSO DO ALUNO (DATA DE NASCIMENTO E NOME DA MÃE PARA O QR CODE) */}
          <div className="p-3.5 bg-muted/40 dark:bg-zinc-900/60 border border-border rounded-xl space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-foreground">
                Dados de Acesso do Estudante ao Espelho via QR Code
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Para visualizar a própria prova no QR Code, o aluno precisará confirmar sua data de nascimento e o nome completo da mãe registrado na ficha do Cursinho.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-foreground">Data de Nascimento</Label>
                <Input
                  type="date"
                  value={dataNascimentoAluno}
                  onChange={(e) => setDataNascimentoAluno(e.target.value)}
                  className="bg-background border-border text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-foreground">Nome Completo da Mãe</Label>
                <Input
                  value={nomeMaeAluno}
                  onChange={(e) => setNomeMaeAluno(e.target.value)}
                  placeholder="Nome da mãe conforme ficha"
                  autoCapitalize="words"
                  autoCorrect="off"
                  spellCheck="false"
                  className="bg-background border-border text-xs h-8"
                />
              </div>
            </div>
          </div>

          {/* SELEÇÃO DE LÍNGUA ESTRANGEIRA (QUANDO O SIMULADO POSSUI A OPÇÃO) */}
          {temLinguaEstrangeira && (
            <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-bold text-foreground">
                    Língua Estrangeira Escolhida (Questões {simulado.lingua_estrangeira_inicio || 1} a {simulado.lingua_estrangeira_fim || 5}) *
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={linguaEscolhida === 'ingles' ? 'default' : 'outline'}
                    onClick={() => setLinguaEscolhida('ingles')}
                    className={`text-xs font-bold gap-1.5 h-7 ${
                      linguaEscolhida === 'ingles' ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm' : 'border-border'
                    }`}
                  >
                    🇬🇧 Inglês
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={linguaEscolhida === 'espanhol' ? 'default' : 'outline'}
                    onClick={() => setLinguaEscolhida('espanhol')}
                    className={`text-xs font-bold gap-1.5 h-7 ${
                      linguaEscolhida === 'espanhol' ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm' : 'border-border'
                    }`}
                  >
                    🇪🇸 Espanhol
                  </Button>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                As questões {simulado.lingua_estrangeira_inicio || 1} a {simulado.lingua_estrangeira_fim || 5} serão corrigidas com o gabarito oficial de <strong>{linguaEscolhida === 'ingles' ? 'Inglês' : 'Espanhol'}</strong>.
              </p>
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

          {/* BANNER PROMINENTE DE SELEÇÃO DE LÍNGUA ESTRANGEIRA (NAS 5 PRIMEIRAS QUESTÕES) */}
          {temLinguaEstrangeira && (
            <div className="p-3 bg-blue-500/10 dark:bg-blue-950/40 border-2 border-blue-500/30 rounded-xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-500 shrink-0" />
                <div>
                  <span className="text-xs font-black text-foreground block">
                    Língua Estrangeira Escolhida pelo Estudante (Questões {simulado.lingua_estrangeira_inicio || 1} a {simulado.lingua_estrangeira_fim || 5})
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Selecione qual prova de língua o aluno realizou para aplicar o gabarito correto:
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={linguaEscolhida === 'ingles' ? 'default' : 'outline'}
                  onClick={() => setLinguaEscolhida('ingles')}
                  className={`text-xs font-bold gap-1.5 h-8 px-3.5 cursor-pointer ${
                    linguaEscolhida === 'ingles'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md ring-2 ring-blue-400 scale-105'
                      : 'border-border'
                  }`}
                >
                  🇬🇧 Inglês (Q0{simulado.lingua_estrangeira_inicio || 1}-Q0{simulado.lingua_estrangeira_fim || 5})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={linguaEscolhida === 'espanhol' ? 'default' : 'outline'}
                  onClick={() => setLinguaEscolhida('espanhol')}
                  className={`text-xs font-bold gap-1.5 h-8 px-3.5 cursor-pointer ${
                    linguaEscolhida === 'espanhol'
                      ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-md ring-2 ring-amber-400 scale-105'
                      : 'border-border'
                  }`}
                >
                  🇪🇸 Espanhol (Q0{simulado.lingua_estrangeira_inicio || 1}-Q0{simulado.lingua_estrangeira_fim || 5})
                </Button>
              </div>
            </div>
          )}

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

    {/* Modal Popup com QR Code do Estudante */}
    <StandardDialog
      open={modalQrAberto}
      onOpenChange={(aberto) => {
        setModalQrAberto(aberto)
        if (!aberto) {
          onOpenChange(false)
        }
      }}
      title="QR Code do Espelho de Prova do Aluno"
      description="Compartilhe este QR Code ou link com o estudante para que ele acesse seu resultado detalhado no celular."
      maxWidth="sm:max-w-md"
    >
      <div className="flex flex-col items-center text-center space-y-4 py-2">
        {alunoSalvoInfo && (
          <div className="p-3 bg-muted/50 rounded-xl border border-border w-full space-y-1">
            <span className="text-xs text-muted-foreground block">Aluno</span>
            <h4 className="font-black text-sm text-foreground">{alunoSalvoInfo.nome}</h4>
            <div className="flex items-center justify-center gap-3 pt-1 text-xs font-bold">
              <span className="text-emerald-600 dark:text-emerald-400">
                {alunoSalvoInfo.acertos} Acertos
              </span>
              <span>•</span>
              <span className="text-foreground">Nota: {alunoSalvoInfo.nota.toFixed(1)}</span>
            </div>
          </div>
        )}

        {/* Imagem do QR Code */}
        {qrCodeUrl ? (
          <div className="p-3 bg-white rounded-2xl shadow-md border-2 border-emerald-500/40">
            <img
              src={qrCodeUrl}
              alt="QR Code do Resultado"
              className="w-56 h-56 object-contain mx-auto"
            />
          </div>
        ) : (
          <div className="w-56 h-56 bg-muted/40 rounded-2xl flex items-center justify-center">
            <QrCode className="w-12 h-12 text-muted-foreground animate-pulse" />
          </div>
        )}

        <div className="space-y-1 px-4">
          <p className="text-xs text-muted-foreground">
            Aponte a câmera do smartphone para ler o QR Code ou copie o link para envio via WhatsApp.
          </p>
          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
            🔒 O aluno precisará digitar sua data de nascimento e o nome completo da mãe para visualizar o espelho.
          </p>
        </div>

        <div className="w-full space-y-2 pt-2 border-t border-border">
          <Button
            type="button"
            onClick={() => {
              if (linkResultadoUrl) {
                navigator.clipboard.writeText(linkResultadoUrl)
                setCopiado(true)
                toast.success('Link do espelho copiado para a área de transferência!')
                setTimeout(() => setCopiado(false), 2500)
              }
            }}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-xs h-9 shadow-sm"
          >
            {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copiado ? 'Link Copiado!' : 'Copiar Link do Resultado'}
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (linkResultadoUrl) {
                  window.open(linkResultadoUrl, '_blank')
                }
              }}
              className="text-xs font-bold gap-1.5 border-border h-8"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-500" /> Abrir Espelho
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setModalQrAberto(false)
                onOpenChange(false)
              }}
              className="text-xs font-bold h-8"
            >
              Concluir
            </Button>
          </div>
        </div>
      </div>
    </StandardDialog>
  </>
  )
}
