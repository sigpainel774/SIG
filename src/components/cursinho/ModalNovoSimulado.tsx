'use client'

import { useState, useEffect } from 'react'
import { Save, CheckSquare, Sparkles, Trash2, FileText, BookOpen, Edit3, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Simulado } from '@/types/simulado'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'

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

  const handleToggleTurma = (tId: string) => {
    setTurmasIds((prev) =>
      prev.includes(tId) ? prev.filter((id) => id !== tId) : [...prev, tId]
    )
  }

  const handlePreencherAleatorio = () => {
    const novoGabarito: Record<string, string> = {}
    for (let q = 1; q <= qtdQuestoes; q++) {
      const randomLetra = letras[Math.floor(Math.random() * letras.length)]
      novoGabarito[q.toString()] = randomLetra
    }
    setGabaritoOficial(novoGabarito)
    toast.success('Gabarito preenchido aleatoriamente!')
  }

  const handleLimparGabarito = () => {
    setGabaritoOficial({})
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

    // Verifica se todas as questões têm resposta definida no gabarito
    const questoesFaltando: number[] = []
    for (let q = 1; q <= qtdQuestoes; q++) {
      if (!gabaritoOficial[q.toString()]) {
        questoesFaltando.push(q)
      }
    }

    if (questoesFaltando.length > 0) {
      toast.warning(`Atenção: Existem ${questoesFaltando.length} questões sem resposta no gabarito oficial.`)
    }

    setSaving(true)
    try {
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
        gabarito_oficial: gabaritoOficial,
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
        toast.success('Simulado atualizado com sucesso!')
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

  // Gera blocos de gabarito no MODO PAISAGEM (Letras na vertical, Números na horizontal)
  const numBlocosGabarito = qtdQuestoes <= 20 ? 1 : qtdQuestoes <= 45 ? 3 : qtdQuestoes <= 60 ? 3 : 4
  const questoesPorBlocoGabarito = Math.ceil(qtdQuestoes / numBlocosGabarito)

  const renderGabaritoPaisagem = () => {
    const blocos = []

    for (let b = 0; b < numBlocosGabarito; b++) {
      const startQ = b * questoesPorBlocoGabarito + 1
      const endQ = Math.min(qtdQuestoes, (b + 1) * questoesPorBlocoGabarito)
      const questoes: number[] = []

      for (let q = startQ; q <= endQ; q++) {
        questoes.push(q)
      }

      blocos.push(
        <div key={b} className="w-full border-2 border-border/80 dark:border-zinc-700 rounded-xl overflow-hidden bg-card mb-3 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-center">
              <thead>
                <tr className="bg-muted/60 border-b-2 border-border">
                  <th className="w-12 py-2 px-2 text-xs font-black text-foreground border-r border-border uppercase">
                    Nº
                  </th>
                  {questoes.map((q) => {
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
                    {questoes.map((q) => {
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

  return (
    <>
      <StandardDialog
        open={open}
        onOpenChange={onOpenChange}
        title={simuladoParaEditar ? 'Editar Simulado • Modo Paisagem' : 'Novo Simulado • Modo Paisagem'}
        description="Configure os parâmetros do simulado, turmas participantes e a chave de respostas no gabarito em modo paisagem (números na horizontal e letras na vertical)."
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

          {/* Chave de Gabarito Oficial (Modo Paisagem com Marcadores Fiduciais) */}
          <div className="relative bg-card border-2 border-border/90 rounded-2xl p-5 space-y-4 shadow-sm overflow-hidden">
            {/* 4 Quadrados Pretos de Referência Ótica (Cantos do Gabarito) */}
            <div className="absolute top-2 left-2 w-3.5 h-3.5 bg-black dark:bg-white rounded-xs pointer-events-none" />
            <div className="absolute top-2 right-2 w-3.5 h-3.5 bg-black dark:bg-white rounded-xs pointer-events-none" />
            <div className="absolute bottom-2 left-2 w-3.5 h-3.5 bg-black dark:bg-white rounded-xs pointer-events-none" />
            <div className="absolute bottom-2 right-2 w-3.5 h-3.5 bg-black dark:bg-white rounded-xs pointer-events-none" />

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 px-2">
              <div>
                <h4 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> Gabarito Oficial • Modo Paisagem (Horizontal)
                </h4>
                <span className="text-xs text-muted-foreground">
                  Letras na vertical (A-E) e questões na horizontal (01-{qtdQuestoes < 10 ? `0${qtdQuestoes}` : qtdQuestoes}). Clique para marcar a chave de respostas oficial.
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
        description="Cole os enunciados, textos e alternativas das questões para serem impressos nas próximas páginas junto com a folha de respostas."
        maxWidth="sm:max-w-3xl"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground">
                Texto / Enunciados das Questões ({qtdQuestoes} questões previstas)
              </Label>
              {cadernoQuestoes && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCadernoQuestoes('')}
                  className="h-6 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 px-2"
                >
                  Limpar Texto
                </Button>
              )}
            </div>

            <Textarea
              rows={16}
              value={cadernoQuestoes}
              onChange={(e) => setCadernoQuestoes(e.target.value)}
              placeholder="Cole aqui o texto completo da prova com as questões. Exemplo:&#10;&#10;QUESTÃO 01&#10;Considere a seguinte equação exponencial...&#10;A) 12&#10;B) 24&#10;C) 36&#10;D) 48&#10;E) 60&#10;&#10;QUESTÃO 02&#10;O processo de urbanização brasileiro no século XX..."
              className="text-xs font-mono bg-background border-border resize-y leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {cadernoQuestoes ? `${cadernoQuestoes.length} caracteres • Pronto para impressão` : 'Nenhum texto colado'}
            </span>

            <div className="flex items-center gap-2">
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
        </div>
      </StandardDialog>
    </>
  )
}

