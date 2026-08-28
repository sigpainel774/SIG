'use client'

import { useState, useEffect } from 'react'
import { Plus, Save, X, CheckSquare, Sparkles, Trash2, Calendar, FileText, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

  // Gera colunas de gabarito para fácil visualização
  const questoesPorColunaGabarito = Math.ceil(qtdQuestoes / (qtdQuestoes > 45 ? 4 : qtdQuestoes > 20 ? 3 : 2))
  const numColunasGabarito = Math.ceil(qtdQuestoes / questoesPorColunaGabarito)

  const renderColunasGabarito = () => {
    const cols = []
    for (let c = 0; c < numColunasGabarito; c++) {
      const startQ = c * questoesPorColunaGabarito + 1
      const endQ = Math.min(qtdQuestoes, (c + 1) * questoesPorColunaGabarito)
      const questoes = []

      for (let q = startQ; q <= endQ; q++) {
        const letraEscolhida = gabaritoOficial[q.toString()]

        questoes.push(
          <div key={q} className="flex items-center justify-between py-1 px-2 border-b border-[#26262a] text-xs">
            <span className="font-mono font-bold text-muted-foreground w-6">
              {q < 10 ? `0${q}` : q}
            </span>
            <div className="flex items-center gap-1.5">
              {letras.map((letra) => {
                const isSelected = letraEscolhida === letra
                return (
                  <button
                    key={letra}
                    type="button"
                    onClick={() => handleSelectAlternativa(q, letra)}
                    className={`w-6 h-6 rounded-full font-bold text-xs transition-all flex items-center justify-center ${
                      isSelected
                        ? 'bg-emerald-500 text-black shadow-md scale-110'
                        : 'bg-[#1a1a1e] hover:bg-[#26262a] text-foreground border border-[#333338]'
                    }`}
                  >
                    {letra}
                  </button>
                )
              })}
            </div>
          </div>
        )
      }

      cols.push(
        <div key={c} className="flex-1 bg-[#141416] border border-[#26262a] rounded-xl p-2 flex flex-col">
          <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-[#26262a] text-[11px] font-bold text-muted-foreground uppercase">
            <span>Questão</span>
            <div className="flex gap-2.5 pr-2">
              {letras.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </div>
          </div>
          {questoes}
        </div>
      )
    }

    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">{cols}</div>
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title={simuladoParaEditar ? 'Editar Simulado' : 'Novo Simulado'}
      description="Configure os parâmetros do simulado, turmas participantes e o gabarito oficial com a chave de respostas."
      maxWidth="sm:max-w-5xl"
    >
      <form onSubmit={handleSalvar} className="space-y-6">
        {/* Parâmetros Gerais */}
        <div className="bg-[#141416] border border-[#26262a] rounded-2xl p-4 space-y-4">
          <h4 className="font-extrabold text-sm text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" /> Identificação e Regras do Simulado
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6 space-y-1.5">
              <Label className="text-xs font-bold">Título do Simulado *</Label>
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: 1º Simulado Geral Pré-ENEM 2026"
                required
                className="bg-background border-[#26262a]"
              />
            </div>

            <div className="md:col-span-3 space-y-1.5">
              <Label className="text-xs font-bold">Data de Aplicação</Label>
              <Input
                type="date"
                value={dataAplicacao}
                onChange={(e) => setDataAplicacao(e.target.value)}
                className="bg-background border-[#26262a]"
              />
            </div>

            <div className="md:col-span-3 space-y-1.5">
              <Label className="text-xs font-bold">Ano Letivo</Label>
              <Input
                value={anoLetivo}
                onChange={(e) => setAnoLetivo(e.target.value)}
                placeholder="2026"
                className="bg-background border-[#26262a]"
              />
            </div>

            <div className="md:col-span-4 space-y-1.5">
              <Label className="text-xs font-bold">Quantidade de Questões</Label>
              <div className="flex items-center gap-2">
                {[20, 45, 60, 90].map((num) => (
                  <Button
                    key={num}
                    type="button"
                    size="sm"
                    variant={qtdQuestoes === num ? 'default' : 'outline'}
                    onClick={() => setQtdQuestoes(num)}
                    className="flex-1 text-xs font-bold"
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
                  className="w-16 bg-background border-[#26262a] text-center font-bold"
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
                    className="rounded border-[#26262a] text-emerald-500 focus:ring-0"
                  />
                  Permitir auto-correção via link público
                </label>
              </div>
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
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                            : 'bg-background border-[#26262a] text-muted-foreground hover:text-foreground'
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
        <div className="bg-[#141416] border border-[#26262a] rounded-2xl p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#26262a] pb-3">
            <div>
              <h4 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-400" /> Gabarito Oficial (Chave de Respostas)
              </h4>
              <span className="text-xs text-muted-foreground">
                Clique nas letras para definir a resposta correta de cada uma das {qtdQuestoes} questões.
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

          <div className="max-h-[350px] overflow-y-auto pr-1">
            {renderColunasGabarito()}
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
  )
}
