'use client'

import { useState, useEffect, useMemo } from 'react'
import { Save, CheckSquare, Sparkles, Trash2, FileText, BookOpen, Edit3, Check, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Simulado } from '@/types/simulado'
import { createClient } from '@/lib/supabaseClient'
import { calcularResultadoSimulado } from '@/lib/omr/omrEngine'
import { toast } from 'sonner'
import { EditorCadernoQuestoes } from './EditorCadernoQuestoes'

interface ModalNovoSimuladoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  escolaId: string
  simuladoParaEditar?: Simulado | null
  onSuccess?: () => void
}

export function ModalNovoSimulado({
  open,
  onOpenChange,
  escolaId,
  simuladoParaEditar,
  onSuccess
}: ModalNovoSimuladoProps) {
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear().toString())
  const [dataAplicacao, setDataAplicacao] = useState(new Date().toISOString().split('T')[0])
  const [qtdQuestoes, setQtdQuestoes] = useState<number>(45)
  const [alternativasPorQuestao, setAlternativasPorQuestao] = useState<number>(5)
  const [turmasIds, setTurmasIds] = useState<string[]>([])
  const [autoCorrecaoAtiva, setAutoCorrecaoAtiva] = useState(true)
  const [gabaritoOficial, setGabaritoOficial] = useState<Record<string, string>>({})
  const [turmasDisponiveis, setTurmasDisponiveis] = useState<any[]>([])
  const [loadingTurmas, setLoadingTurmas] = useState(false)
  const [saving, setSaving] = useState(false)

  // Configuração de Língua Estrangeira (Inglês / Espanhol)
  const [possuiLinguaEstrangeira, setPossuiLinguaEstrangeira] = useState(false)
  const [linguaInicio, setLinguaInicio] = useState(1)
  const [linguaFim, setLinguaFim] = useState(5)
  const [gabaritoIngles, setGabaritoIngles] = useState<Record<string, string>>({})
  const [gabaritoEspanhol, setGabaritoEspanhol] = useState<Record<string, string>>({})
  const [linguaTabAtiva, setLinguaTabAtiva] = useState<'ingles' | 'espanhol'>('ingles')

  // Caderno de Questões
  const [cadernoQuestoes, setCadernoQuestoes] = useState<string>('')
  const [incluirQuestoesImpressao, setIncluirQuestoesImpressao] = useState<boolean>(false)
  const [isModalQuestoesOpen, setIsModalQuestoesOpen] = useState<boolean>(false)

  const supabase = createClient()

  // Carrega turmas da escola
  useEffect(() => {
    if (!open || !escolaId) return

    const carregarTurmas = async () => {
      setLoadingTurmas(true)
      const { data } = await (supabase as any)
        .from('turmas')
        .select('id, nome, turno, ano_letivo')
        .eq('escola_id', escolaId)
        .is('deleted_at', null)
        .order('nome', { ascending: true })

      if (data) setTurmasDisponiveis(data)
      setLoadingTurmas(false)
    }

    carregarTurmas()
  }, [open, escolaId])

  // Preenche dados ao editar ou ao abrir novo
  useEffect(() => {
    if (!open) return

    if (simuladoParaEditar) {
      setTitulo(simuladoParaEditar.titulo || '')
      setDescricao(simuladoParaEditar.descricao || '')
      setAnoLetivo(simuladoParaEditar.ano_letivo || new Date().getFullYear().toString())
      setDataAplicacao(simuladoParaEditar.data_aplicacao || new Date().toISOString().split('T')[0])
      setQtdQuestoes(simuladoParaEditar.qtd_questoes || 45)
      setAlternativasPorQuestao(simuladoParaEditar.alternativas_por_questao || 5)
      setTurmasIds(simuladoParaEditar.turmas_ids || [])
      setAutoCorrecaoAtiva(simuladoParaEditar.auto_correcao_ativa ?? true)
      setGabaritoOficial(simuladoParaEditar.gabarito_oficial || {})
      setPossuiLinguaEstrangeira(simuladoParaEditar.possui_lingua_estrangeira || false)
      setLinguaInicio(simuladoParaEditar.lingua_estrangeira_inicio || 1)
      setLinguaFim(simuladoParaEditar.lingua_estrangeira_fim || 5)
      setGabaritoIngles(simuladoParaEditar.gabarito_ingles || {})
      setGabaritoEspanhol(simuladoParaEditar.gabarito_espanhol || {})
      setCadernoQuestoes(simuladoParaEditar.caderno_questoes || '')
      setIncluirQuestoesImpressao(simuladoParaEditar.incluir_questoes_impressao ?? Boolean(simuladoParaEditar.caderno_questoes))
    } else {
      setTitulo('')
      setDescricao('')
      setAnoLetivo(new Date().getFullYear().toString())
      setDataAplicacao(new Date().toISOString().split('T')[0])
      setQtdQuestoes(45)
      setAlternativasPorQuestao(5)
      setTurmasIds([])
      setAutoCorrecaoAtiva(true)
      setGabaritoOficial({})
      setPossuiLinguaEstrangeira(false)
      setLinguaInicio(1)
      setLinguaFim(5)
      setGabaritoIngles({})
      setGabaritoEspanhol({})
      setCadernoQuestoes('')
      setIncluirQuestoesImpressao(false)
    }
  }, [open, simuladoParaEditar])

  // Alternativas disponíveis (A-D ou A-E)
  const letras = ['A', 'B', 'C', 'D', 'E'].slice(0, alternativasPorQuestao)

  const handleSelectAlternativa = (questao: number, letra: string) => {
    setGabaritoOficial((prev) => ({
      ...prev,
      [questao.toString()]: letra
    }))
  }

  const handleSelectAlternativaIngles = (questao: number, letra: string) => {
    setGabaritoIngles((prev) => ({
      ...prev,
      [questao.toString()]: letra
    }))
  }

  const handleSelectAlternativaEspanhol = (questao: number, letra: string) => {
    setGabaritoEspanhol((prev) => ({
      ...prev,
      [questao.toString()]: letra
    }))
  }

  const handleToggleTurma = (tId: string) => {
    setTurmasIds((prev) =>
      prev.includes(tId) ? prev.filter((id) => id !== tId) : [...prev, tId]
    )
  }

  const handlePreencherAleatorio = () => {
    const novoGabarito: Record<string, string> = {}
    for (const q of questoesGerais) {
      const randomLetra = letras[Math.floor(Math.random() * letras.length)]
      novoGabarito[q.toString()] = randomLetra
    }
    setGabaritoOficial(novoGabarito)

    if (possuiLinguaEstrangeira) {
      const gIngles: Record<string, string> = {}
      const gEspanhol: Record<string, string> = {}
      for (let q = Math.max(1, linguaInicio); q <= Math.min(qtdQuestoes, linguaFim); q++) {
        gIngles[q.toString()] = letras[Math.floor(Math.random() * letras.length)]
        gEspanhol[q.toString()] = letras[Math.floor(Math.random() * letras.length)]
      }
      setGabaritoIngles(gIngles)
      setGabaritoEspanhol(gEspanhol)
    }

    toast.success('Gabarito preenchido aleatoriamente!')
  }

  const handleLimparGabarito = () => {
    setGabaritoOficial({})
    setGabaritoIngles({})
    setGabaritoEspanhol({})
    toast.info('Gabarito limpo')
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim()) {
      toast.error('Informe o título do simulado')
      return
    }
    if (!escolaId) {
      toast.error('Escola não identificada')
      return
    }

    // Verifica se todas as questões gerais têm resposta definida no gabarito
    const questoesFaltando: number[] = []
    for (const q of questoesGerais) {
      if (!gabaritoOficial[q.toString()]) {
        questoesFaltando.push(q)
      }
    }

    if (possuiLinguaEstrangeira) {
      for (let q = Math.max(1, linguaInicio); q <= Math.min(qtdQuestoes, linguaFim); q++) {
        const qStr = q.toString()
        if (!gabaritoIngles[qStr] || !gabaritoEspanhol[qStr]) {
          questoesFaltando.push(q)
        }
      }
    }

    if (questoesFaltando.length > 0) {
      toast.warning(`Atenção: Existem ${questoesFaltando.length} questões sem resposta no gabarito oficial.`)
    }

    setSaving(true)
    try {
      const gabaritoFinal = { ...gabaritoOficial }
      if (possuiLinguaEstrangeira) {
        for (let q = Math.max(1, linguaInicio); q <= Math.min(qtdQuestoes, linguaFim); q++) {
          const qStr = q.toString()
          if (!gabaritoFinal[qStr]) {
            gabaritoFinal[qStr] = gabaritoIngles[qStr] || gabaritoEspanhol[qStr] || 'A'
          }
        }
      }

      const payload = {
        escola_id: escolaId,
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        ano_letivo: anoLetivo,
        data_aplicacao: dataAplicacao,
        qtd_questoes: qtdQuestoes,
        alternativas_por_questao: alternativasPorQuestao,
        turmas_ids: turmasIds,
        auto_correcao_ativa: autoCorrecaoAtiva,
        gabarito_oficial: gabaritoFinal,
        possui_lingua_estrangeira: possuiLinguaEstrangeira,
        lingua_estrangeira_inicio: possuiLinguaEstrangeira ? linguaInicio : 1,
        lingua_estrangeira_fim: possuiLinguaEstrangeira ? linguaFim : 5,
        gabarito_ingles: possuiLinguaEstrangeira ? gabaritoIngles : {},
        gabarito_espanhol: possuiLinguaEstrangeira ? gabaritoEspanhol : {},
        caderno_questoes: cadernoQuestoes.trim() || null,
        incluir_questoes_impressao: incluirQuestoesImpressao,
        status: simuladoParaEditar?.status || 'ativo',
        updated_at: new Date().toISOString()
      }

      if (simuladoParaEditar) {
        const { error } = await (supabase as any)
          .from('simulados')
          .update(payload)
          .eq('id', simuladoParaEditar.id)

        if (error) throw error

        // Recalcular notas de todas as respostas existentes caso o gabarito tenha sido alterado
        const { data: respostasExistentes } = await (supabase as any)
          .from('simulados_respostas')
          .select('id, respostas, lingua_estrangeira')
          .eq('simulado_id', simuladoParaEditar.id)

        if (respostasExistentes && respostasExistentes.length > 0) {
          let atualizadas = 0
          for (const resp of respostasExistentes) {
            const resultado = calcularResultadoSimulado(
              resp.respostas || {},
              gabaritoOficial,
              qtdQuestoes,
              {
                possuiLinguaEstrangeira,
                linguaEscolhida: resp.lingua_estrangeira,
                linguaInicio,
                linguaFim,
                gabaritoIngles,
                gabaritoEspanhol
              }
            )

            await (supabase as any)
              .from('simulados_respostas')
              .update({
                total_acertos: resultado.totalAcertos,
                total_erros: resultado.totalErros,
                total_em_branco: resultado.totalEmBranco,
                total_anuladas: resultado.totalAnuladas,
                nota_final: resultado.notaFinal,
                percentual_acerto: resultado.percentualAcerto,
                updated_at: new Date().toISOString()
              })
              .eq('id', resp.id)

            atualizadas++
          }

          toast.success(
            `Simulado atualizado! ${atualizadas} prova${atualizadas > 1 ? 's foram recalculadas' : ' foi recalculada'} automaticamente.`
          )
        } else {
          toast.success('Simulado atualizado com sucesso!')
        }
      } else {
        const { error } = await (supabase as any)
          .from('simulados')
          .insert(payload)

        if (error) throw error
        toast.success('Simulado criado com sucesso!')
      }

      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      console.error('Erro ao salvar simulado:', err)
      toast.error('Erro ao salvar simulado: ' + (err.message || 'Falha no banco'))
    } finally {
      setSaving(false)
    }
  }

  // Lista de questões que pertencem ao gabarito geral (exclui a faixa de língua estrangeira se ativa)
  const questoesGerais = useMemo<number[]>(() => {
    const todas: number[] = Array.from({ length: qtdQuestoes }, (_, i) => i + 1)
    if (!possuiLinguaEstrangeira) return todas
    return todas.filter((q: number) => q < linguaInicio || q > linguaFim)
  }, [qtdQuestoes, possuiLinguaEstrangeira, linguaInicio, linguaFim])

  // Gera blocos de gabarito no MODO PAISAGEM (Letras na vertical, Números na horizontal)
  const numBlocosGabarito = questoesGerais.length <= 20 ? 1 : questoesGerais.length <= 45 ? 3 : questoesGerais.length <= 60 ? 3 : 4
  const questoesPorBlocoGabarito = Math.ceil(questoesGerais.length / (numBlocosGabarito || 1))

  const renderGabaritoPaisagem = () => {
    if (questoesGerais.length === 0) {
      return (
        <div className="p-6 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-border">
          Todas as questões deste simulado estão alocadas na faixa de Língua Estrangeira (Inglês / Espanhol).
        </div>
      )
    }

    const blocos = []

    for (let b = 0; b < numBlocosGabarito; b++) {
      const startIndex = b * questoesPorBlocoGabarito
      const endIndex = Math.min(questoesGerais.length, (b + 1) * questoesPorBlocoGabarito)
      const questoes: number[] = questoesGerais.slice(startIndex, endIndex)

      if (questoes.length === 0) continue

      blocos.push(
        <div key={b} className="w-full border-2 border-border/80 dark:border-zinc-700 rounded-xl overflow-hidden bg-card mb-3 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-center">
              <thead>
                <tr className="bg-muted/60 border-b-2 border-border">
                  <th className="w-12 py-2 px-2 text-xs font-black text-foreground border-r border-border uppercase">
                    Nº
                  </th>
                  {questoes.map((q: number) => {
                    const temResposta = Boolean(gabaritoOficial[q.toString()])
                    return (
                      <th
                        key={q}
                        className={`py-1.5 px-1 font-mono font-black text-xs border-r border-border/60 last:border-r-0 ${
                          temResposta ? 'text-foreground' : 'text-amber-500 dark:text-amber-400'
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
                    <td className="w-12 py-1.5 px-2 font-black text-xs text-foreground bg-muted/40 border-r border-border">
                      {letra}
                    </td>
                    {questoes.map((q: number) => {
                      const isSelected = gabaritoOficial[q.toString()] === letra
                      return (
                        <td key={`${q}-${letra}`} className="py-1 px-1 border-r border-border/40 last:border-r-0">
                          <button
                            type="button"
                            onClick={() => handleSelectAlternativa(q, letra)}
                            className={`w-7 h-7 rounded-full font-extrabold text-xs transition-all flex items-center justify-center mx-auto ${
                              isSelected
                                ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-black shadow-md scale-110 ring-2 ring-emerald-400'
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

    return <div className="space-y-2">{blocos}</div>
  }

  const renderGabaritoLinguaEstrangeira = (idioma: 'ingles' | 'espanhol') => {
    const gabaritoAtual = idioma === 'ingles' ? gabaritoIngles : gabaritoEspanhol
    const handleSelect = idioma === 'ingles' ? handleSelectAlternativaIngles : handleSelectAlternativaEspanhol

    const questoes: number[] = []
    for (let q = Math.max(1, linguaInicio); q <= Math.min(qtdQuestoes, linguaFim); q++) {
      questoes.push(q)
    }

    if (questoes.length === 0) {
      return (
        <div className="text-xs text-muted-foreground p-3 text-center">
          Defina um intervalo de questões válido para a língua estrangeira.
        </div>
      )
    }

    return (
      <div className="w-full border border-border rounded-xl overflow-hidden bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-center">
            <thead>
              <tr className="bg-muted/60 border-b border-border">
                <th className="w-12 py-1.5 px-2 text-xs font-black text-foreground border-r border-border uppercase">
                  Nº
                </th>
                {questoes.map((q) => {
                  const temResposta = Boolean(gabaritoAtual[q.toString()])
                  return (
                    <th
                      key={q}
                      className={`py-1.5 px-2 font-mono font-black text-xs border-r border-border/60 last:border-r-0 ${
                        temResposta ? 'text-foreground' : 'text-amber-500 dark:text-amber-400'
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
                  <td className="w-12 py-1 px-2 font-black text-xs text-foreground bg-muted/40 border-r border-border">
                    {letra}
                  </td>
                  {questoes.map((q) => {
                    const isSelected = gabaritoAtual[q.toString()] === letra
                    return (
                      <td key={`${q}-${letra}`} className="py-1 px-1 border-r border-border/40 last:border-r-0">
                        <button
                          type="button"
                          onClick={() => handleSelect(q, letra)}
                          className={`w-7 h-7 rounded-full font-extrabold text-xs transition-all flex items-center justify-center mx-auto ${
                            isSelected
                              ? idioma === 'ingles'
                                ? 'bg-blue-600 text-white font-extrabold shadow-md scale-110 ring-2 ring-blue-400'
                                : 'bg-amber-600 text-white font-extrabold shadow-md scale-110 ring-2 ring-amber-400'
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

  return (
    <>
      <StandardDialog
        open={open}
        onOpenChange={onOpenChange}
        title={simuladoParaEditar ? 'Editar Simulado' : 'Novo Simulado'}
        description="Configure os parâmetros do simulado, turmas participantes e a chave de respostas no gabarito oficial."
        maxWidth="sm:max-w-6xl"
      >
        <form onSubmit={handleSalvar} className="space-y-6">
          {/* Parâmetros Gerais */}
          <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
            <h4 className="font-extrabold text-sm text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> Identificação e Regras do Simulado
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6 space-y-1.5">
                <Label className="text-xs font-bold">Título do Simulado *</Label>
                <Input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: 1º Simulado Geral Pré-ENEM 2026"
                  required
                  className="bg-background border-border"
                />
              </div>

              <div className="md:col-span-3 space-y-1.5">
                <Label className="text-xs font-bold">Data de Aplicação</Label>
                <Input
                  type="date"
                  value={dataAplicacao}
                  onChange={(e) => setDataAplicacao(e.target.value)}
                  className="bg-background border-border"
                />
              </div>

              <div className="md:col-span-3 space-y-1.5">
                <Label className="text-xs font-bold">Ano Letivo</Label>
                <Input
                  value={anoLetivo}
                  onChange={(e) => setAnoLetivo(e.target.value)}
                  placeholder="2026"
                  className="bg-background border-border"
                />
              </div>

              <div className="md:col-span-4 space-y-1.5">
                <Label className="text-xs font-bold">Quantidade de Questões</Label>
                <div className="flex items-center gap-1.5">
                  {[10, 20, 45, 60, 90].map((num) => (
                    <Button
                      key={num}
                      type="button"
                      size="sm"
                      variant={qtdQuestoes === num ? 'default' : 'outline'}
                      onClick={() => setQtdQuestoes(num)}
                      className="flex-1 text-xs font-bold px-1"
                    >
                      {num}
                    </Button>
                  ))}
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={qtdQuestoes}
                    onChange={(e) => setQtdQuestoes(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                    className="w-14 bg-background border-border text-center font-bold px-1"
                  />
                </div>
              </div>

              <div className="md:col-span-4 space-y-1.5">
                <Label className="text-xs font-bold">Alternativas por Questão</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={alternativasPorQuestao === 4 ? 'default' : 'outline'}
                    onClick={() => setAlternativasPorQuestao(4)}
                    className="flex-1 text-xs font-bold"
                  >
                    4 Opções (A-D)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={alternativasPorQuestao === 5 ? 'default' : 'outline'}
                    onClick={() => setAlternativasPorQuestao(5)}
                    className="flex-1 text-xs font-bold"
                  >
                    5 Opções (A-E)
                  </Button>
                </div>
              </div>

              <div className="md:col-span-4 space-y-1.5">
                <Label className="text-xs font-bold">Auto-Correção pelo Celular do Aluno</Label>
                <div className="flex items-center gap-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={autoCorrecaoAtiva}
                      onChange={(e) => setAutoCorrecaoAtiva(e.target.checked)}
                      className="rounded border-border text-emerald-500 focus:ring-0"
                    />
                    Permitir auto-correção via link público
                  </label>
                </div>
              </div>

              {/* Opção: Caderno de Questões nas próximas páginas */}
              <div className="md:col-span-12 p-3.5 bg-muted/40 dark:bg-zinc-900/60 border border-border rounded-xl space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-foreground">
                    <input
                      type="checkbox"
                      checked={incluirQuestoesImpressao}
                      onChange={(e) => {
                        setIncluirQuestoesImpressao(e.target.checked)
                        if (e.target.checked && !cadernoQuestoes) {
                          setIsModalQuestoesOpen(true)
                        }
                      }}
                      className="w-4 h-4 rounded border-border text-emerald-600 focus:ring-0"
                    />
                    <span>Adicionar questões às próximas páginas (Caderno de Questões da Prova)</span>
                  </label>

                  <div className="flex items-center gap-2">
                    {cadernoQuestoes && (
                      <Badge variant="secondary" className="text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1 border-emerald-500/20">
                        <Check className="w-3 h-3" /> Questões Adicionadas
                      </Badge>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsModalQuestoesOpen(true)}
                      className="text-xs font-bold gap-1.5 border-border"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                      {cadernoQuestoes ? 'Editar / Ver Questões' : 'Colar Questões da Prova'}
                    </Button>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground pl-6">
                  Permite imprimir as folhas de perguntas logo após a folha de respostas OMR, formando a prova completa para o estudante.
                </p>
              </div>

              {/* Opção: Língua Estrangeira (Inglês / Espanhol) */}
              <div className="md:col-span-12 p-4 bg-muted/40 dark:bg-zinc-900/60 border border-border rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Globe className="w-5 h-5 text-blue-500 shrink-0" />
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-foreground">
                        <input
                          type="checkbox"
                          checked={possuiLinguaEstrangeira}
                          onChange={(e) => setPossuiLinguaEstrangeira(e.target.checked)}
                          className="w-4 h-4 rounded border-border text-blue-600 focus:ring-0"
                        />
                        <span>Opção de Língua Estrangeira na Prova (Inglês ou Espanhol)</span>
                      </label>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Permite que os alunos optem por Inglês ou Espanhol (ex: questões de 1 a 5). O sistema corrigirá a prova usando o gabarito do idioma escolhido por cada um.
                      </p>
                    </div>
                  </div>

                  {possuiLinguaEstrangeira && (
                    <div className="flex items-center gap-2 text-xs bg-background/80 p-2 rounded-lg border border-border">
                      <span className="font-bold text-foreground">Faixa das Questões:</span>
                      <span className="text-muted-foreground">Questão</span>
                      <Input
                        type="number"
                        min={1}
                        max={qtdQuestoes}
                        value={linguaInicio}
                        onChange={(e) => setLinguaInicio(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-14 h-8 text-center font-bold bg-background text-xs"
                      />
                      <span className="text-muted-foreground">até</span>
                      <Input
                        type="number"
                        min={linguaInicio}
                        max={qtdQuestoes}
                        value={linguaFim}
                        onChange={(e) =>
                          setLinguaFim(Math.max(linguaInicio, Math.min(qtdQuestoes, parseInt(e.target.value) || 1)))
                        }
                        className="w-14 h-8 text-center font-bold bg-background text-xs"
                      />
                    </div>
                  )}
                </div>

                {possuiLinguaEstrangeira && (
                  <div className="pt-2 border-t border-border/60 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={linguaTabAtiva === 'ingles' ? 'default' : 'outline'}
                          onClick={() => setLinguaTabAtiva('ingles')}
                          className={`text-xs font-bold gap-1.5 ${
                            linguaTabAtiva === 'ingles'
                              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                              : 'border-border'
                          }`}
                        >
                          🇬🇧 Gabarito de Inglês (Questões {linguaInicio < 10 ? `0${linguaInicio}` : linguaInicio} a {linguaFim < 10 ? `0${linguaFim}` : linguaFim})
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={linguaTabAtiva === 'espanhol' ? 'default' : 'outline'}
                          onClick={() => setLinguaTabAtiva('espanhol')}
                          className={`text-xs font-bold gap-1.5 ${
                            linguaTabAtiva === 'espanhol'
                              ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                              : 'border-border'
                          }`}
                        >
                          🇪🇸 Gabarito de Espanhol (Questões {linguaInicio < 10 ? `0${linguaInicio}` : linguaInicio} a {linguaFim < 10 ? `0${linguaFim}` : linguaFim})
                        </Button>
                      </div>

                      <span className="text-[11px] text-muted-foreground font-medium">
                        {linguaTabAtiva === 'ingles'
                          ? 'Clique abaixo para definir as respostas corretas de Inglês'
                          : 'Clique abaixo para definir as respostas corretas de Espanhol'}
                      </span>
                    </div>

                    <div className="pt-1">
                      {renderGabaritoLinguaEstrangeira(linguaTabAtiva)}
                    </div>
                  </div>
                )}
              </div>

              <div className="md:col-span-12 space-y-1.5">
                <Label className="text-xs font-bold">Turmas Participantes do Cursinho</Label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {turmasDisponiveis.length === 0 ? (
                    <span className="text-xs text-muted-foreground">Nenhuma turma cadastrada na escola.</span>
                  ) : (
                    turmasDisponiveis.map((t) => {
                      const isSelected = turmasIds.includes(t.id)
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleToggleTurma(t.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                            isSelected
                              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-600 dark:text-emerald-300'
                              : 'bg-background border-border text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {t.nome} {t.turno ? `(${t.turno})` : ''}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Chave de Gabarito Oficial */}
          <div className="relative bg-card border-2 border-border/90 rounded-2xl p-5 space-y-4 shadow-sm overflow-hidden">
            {/* 4 Quadrados Pretos de Referência Ótica (Cantos do Gabarito) */}
            <div className="absolute top-2 left-2 w-3.5 h-3.5 bg-black dark:bg-white rounded-xs pointer-events-none" />
            <div className="absolute top-2 right-2 w-3.5 h-3.5 bg-black dark:bg-white rounded-xs pointer-events-none" />
            <div className="absolute bottom-2 left-2 w-3.5 h-3.5 bg-black dark:bg-white rounded-xs pointer-events-none" />
            <div className="absolute bottom-2 right-2 w-3.5 h-3.5 bg-black dark:bg-white rounded-xs pointer-events-none" />

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 px-2">
              <div>
                <h4 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  {possuiLinguaEstrangeira && questoesGerais.length > 0 ? (
                    <span>
                      Gabarito Geral • Questões Comuns ({questoesGerais[0] < 10 ? `0${questoesGerais[0]}` : questoesGerais[0]} a {questoesGerais[questoesGerais.length - 1] < 10 ? `0${questoesGerais[questoesGerais.length - 1]}` : questoesGerais[questoesGerais.length - 1]})
                    </span>
                  ) : (
                    <span>Gabarito Oficial (01 a {qtdQuestoes < 10 ? `0${qtdQuestoes}` : qtdQuestoes})</span>
                  )}
                </h4>
                <span className="text-xs text-muted-foreground">
                  {possuiLinguaEstrangeira && questoesGerais.length > 0 ? (
                    <>
                      As questões {linguaInicio < 10 ? `0${linguaInicio}` : linguaInicio} a {linguaFim < 10 ? `0${linguaFim}` : linguaFim} são de Língua Estrangeira (definidas nos blocos de Inglês e Espanhol acima). Abaixo, marque o gabarito das questões de {questoesGerais[0] < 10 ? `0${questoesGerais[0]}` : questoesGerais[0]} a {questoesGerais[questoesGerais.length - 1] < 10 ? `0${questoesGerais[questoesGerais.length - 1]}` : questoesGerais[questoesGerais.length - 1]}.
                    </>
                  ) : (
                    <>
                      Letras na vertical (A-E) e questões na horizontal (01-{qtdQuestoes < 10 ? `0${qtdQuestoes}` : qtdQuestoes}). Clique para marcar a chave de respostas oficial.
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleLimparGabarito}
                  className="text-xs text-rose-400 hover:text-rose-300 gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Limpar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePreencherAleatorio}
                  className="text-xs text-amber-400 hover:text-amber-300 gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Teste Rápido
                </Button>
              </div>
            </div>

            <div className="max-h-[380px] overflow-y-auto pr-1">
              {renderGabaritoPaisagem()}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2">
              <Save className="w-4 h-4" /> {simuladoParaEditar ? 'Salvar Alterações' : 'Criar Simulado'}
            </Button>
          </div>
        </form>
      </StandardDialog>

      {/* Modal para Colar / Digitar as Questões da Prova */}
      <StandardDialog
        open={isModalQuestoesOpen}
        onOpenChange={setIsModalQuestoesOpen}
        title="Caderno de Questões da Prova"
        description="Digite, cole ou formate os enunciados e alternativas das questões para serem impressos junto com o cartão-resposta."
        maxWidth="sm:max-w-4xl"
      >
        <div className="space-y-4">
          <EditorCadernoQuestoes
            value={cadernoQuestoes}
            onChange={setCadernoQuestoes}
            qtdQuestoes={qtdQuestoes}
          />

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalQuestoesOpen(false)}
            >
              Fechar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (cadernoQuestoes.trim()) {
                  setIncluirQuestoesImpressao(true)
                }
                setIsModalQuestoesOpen(false)
                toast.success('Caderno de questões configurado com sucesso!')
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Salvar Questões
            </Button>
          </div>
        </div>
      </StandardDialog>
    </>
  )
}

