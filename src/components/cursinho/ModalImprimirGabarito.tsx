'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import QRCode from 'qrcode'
import {
  Printer,
  Users,
  FileText,
  CheckCircle2,
  Plus,
  Trash2,
  UserPlus,
  X,
  Search,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Simulado } from '@/types/simulado'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { getBubbleGridCoordinates } from '@/lib/omr/omrEngine'

interface ModalImprimirGabaritoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  simulado: Simulado | null
  escolaNome?: string
}

interface AlunoFolha {
  id: string
  nome: string
  numero_matricula?: string
  turma_nome?: string
  qrCodeUrl?: string
}

export function ModalImprimirGabarito({
  open,
  onOpenChange,
  simulado,
  escolaNome = 'Cursinho Pré-Universitário'
}: ModalImprimirGabaritoProps) {
  const [modoImpressao, setModoImpressao] = useState<'nominal' | 'avulso'>('nominal')
  const [tipoAvulso, setTipoAvulso] = useState<'digitados' | 'brancas'>('digitados')
  
  // Alunos das turmas cadastradas
  const [alunosTurma, setAlunosTurma] = useState<AlunoFolha[]>([])
  
  // Nomes avulsos digitados
  const [nomesTexto, setNomesTexto] = useState<string>('')
  const [nomeIndividual, setNomeIndividual] = useState<string>('')
  const [alunosAvulsosComQr, setAlunosAvulsosComQr] = useState<AlunoFolha[]>([])
  const [qtdAvulsaBranca, setQtdAvulsaBranca] = useState<number>(0) // Cópias extras em branco no modo digitado
  const [qtdSomenteBrancas, setQtdSomenteBrancas] = useState<number>(30) // Cópias no modo somente branco
  
  // Busca de alunos da escola para inclusão rápida
  const [buscaAlunoEscola, setBuscaAlunoEscola] = useState<string>('')
  const [alunosEscolaSugestoes, setAlunosEscolaSugestoes] = useState<any[]>([])
  const [mostrarBuscaEscola, setMostrarBuscaEscola] = useState<boolean>(false)

  const [loadingTurma, setLoadingTurma] = useState(false)
  const [loadingAvulsos, setLoadingAvulsos] = useState(false)
  const [qrGenericoUrl, setQrGenericoUrl] = useState<string>('')
  
  const printAreaRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Extrai lista de nomes únicos não vazios do textarea
  const listaNomesDigitados = useMemo(() => {
    return nomesTexto
      .split('\n')
      .map((n) => n.trim())
      .filter((n) => n.length > 0)
  }, [nomesTexto])

  // 1. Carrega QR Genérico e Alunos da Turma
  useEffect(() => {
    if (!open || !simulado) return

    const carregarAlunosEQr = async () => {
      setLoadingTurma(true)
      try {
        // Gera QR Code genérico do simulado
        const qrGen = await QRCode.toDataURL(
          JSON.stringify({ s: simulado.id }),
          { margin: 1, width: 120 }
        )
        setQrGenericoUrl(qrGen)

        if (simulado.turmas_ids && simulado.turmas_ids.length > 0) {
          // Busca alunos das turmas associadas ao simulado
          const { data: turmasAlunos, error } = await (supabase as any)
            .from('alunos')
            .select('id, nome, numero_matricula, turma_id, turmas(nome)')
            .in('turma_id', simulado.turmas_ids)
            .is('deleted_at', null)
            .order('nome', { ascending: true })

          if (error) throw error

          if (turmasAlunos && turmasAlunos.length > 0) {
            const alunosComQr: AlunoFolha[] = await Promise.all(
              turmasAlunos.map(async (al: any) => {
                const qrUrl = await QRCode.toDataURL(
                  JSON.stringify({ s: simulado.id, a: al.id }),
                  { margin: 1, width: 120 }
                )
                return {
                  id: al.id,
                  nome: al.nome,
                  numero_matricula: al.numero_matricula || '---',
                  turma_nome: al.turmas?.nome || '',
                  qrCodeUrl: qrUrl
                }
              })
            )
            setAlunosTurma(alunosComQr)
          } else {
            setAlunosTurma([])
          }
        } else {
          // Se não há turmas restritas, busca alunos da escola
          const { data: todosAlunos } = await (supabase as any)
            .from('alunos')
            .select('id, nome, numero_matricula, turmas(nome)')
            .eq('escola_id', simulado.escola_id)
            .is('deleted_at', null)
            .order('nome', { ascending: true })
            .limit(100)

          if (todosAlunos && todosAlunos.length > 0) {
            const alunosComQr: AlunoFolha[] = await Promise.all(
              todosAlunos.map(async (al: any) => {
                const qrUrl = await QRCode.toDataURL(
                  JSON.stringify({ s: simulado.id, a: al.id }),
                  { margin: 1, width: 120 }
                )
                return {
                  id: al.id,
                  nome: al.nome,
                  numero_matricula: al.numero_matricula || '---',
                  turma_nome: al.turmas?.nome || '',
                  qrCodeUrl: qrUrl
                }
              })
            )
            setAlunosTurma(alunosComQr)
          } else {
            setAlunosTurma([])
          }
        }
      } catch (err: any) {
        console.error('Erro ao carregar alunos para folha:', err)
        toast.error('Erro ao gerar QR Codes e carregar alunos da turma')
      } finally {
        setLoadingTurma(false)
      }
    }

    carregarAlunosEQr()
  }, [open, simulado])

  // 2. Gera QR Codes em tempo real para os Nomes Digitados / Avulsos
  useEffect(() => {
    if (!open || !simulado) return

    let isMounted = true
    const gerarQrNomesDigitados = async () => {
      if (listaNomesDigitados.length === 0) {
        setAlunosAvulsosComQr([])
        return
      }

      setLoadingAvulsos(true)
      try {
        const gerados: AlunoFolha[] = await Promise.all(
          listaNomesDigitados.map(async (nome, idx) => {
            const qrUrl = await QRCode.toDataURL(
              JSON.stringify({ s: simulado.id, n: nome }),
              { margin: 1, width: 120 }
            )
            return {
              id: `avulso-nome-${idx}-${nome}`,
              nome,
              numero_matricula: 'AVULSO',
              turma_nome: 'Avulso / Convidado',
              qrCodeUrl: qrUrl
            }
          })
        )
        if (isMounted) {
          setAlunosAvulsosComQr(gerados)
        }
      } catch (err) {
        console.error('Erro ao gerar QR Code para nomes avulsos:', err)
      } finally {
        if (isMounted) setLoadingAvulsos(false)
      }
    }

    const timer = setTimeout(gerarQrNomesDigitados, 200)
    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [listaNomesDigitados, simulado, open])

  // 3. Adicionar nome individualmente
  const handleAdicionarNomeIndividual = () => {
    const nomeLimpo = nomeIndividual.trim()
    if (!nomeLimpo) return

    const novosNomes = nomesTexto ? `${nomesTexto}\n${nomeLimpo}` : nomeLimpo
    setNomesTexto(novosNomes)
    setNomeIndividual('')
    toast.success(`Aluno "${nomeLimpo}" adicionado à lista de impressão!`)
  }

  // 4. Remover um nome específico
  const handleRemoverNome = (nomeParaRemover: string) => {
    const filtrados = listaNomesDigitados.filter((n) => n !== nomeParaRemover)
    setNomesTexto(filtrados.join('\n'))
  }

  // 5. Buscar alunos da escola por nome
  const handleBuscarAlunoEscola = async (termo: string) => {
    setBuscaAlunoEscola(termo)
    if (!simulado || termo.trim().length < 2) {
      setAlunosEscolaSugestoes([])
      return
    }

    try {
      const { data } = await (supabase as any)
        .from('alunos')
        .select('id, nome, numero_matricula, turmas(nome)')
        .eq('escola_id', simulado.escola_id)
        .ilike('nome', `%${termo}%`)
        .is('deleted_at', null)
        .limit(6)

      setAlunosEscolaSugestoes(data || [])
    } catch {
      setAlunosEscolaSugestoes([])
    }
  }

  const handleSelecionarAlunoEscola = (al: any) => {
    const novosNomes = nomesTexto ? `${nomesTexto}\n${al.nome}` : al.nome
    setNomesTexto(novosNomes)
    setBuscaAlunoEscola('')
    setAlunosEscolaSugestoes([])
    setMostrarBuscaEscola(false)
    toast.success(`Aluno "${al.nome}" inserido na lista!`)
  }

  const handleImprimir = () => {
    window.print()
  }

  if (!simulado) return null

  const { numColunas, questoesPorColuna } = getBubbleGridCoordinates(
    simulado.qtd_questoes,
    simulado.alternativas_por_questao
  )

  const alternativasLetras = ['A', 'B', 'C', 'D', 'E'].slice(0, simulado.alternativas_por_questao)

  // Total de folhas no modo avulso
  const totalFolhasAvulsas =
    tipoAvulso === 'digitados'
      ? listaNomesDigitados.length + qtdAvulsaBranca
      : qtdSomenteBrancas

  // Renderiza a grade de bolhas de uma folha
  const renderGradeBolhas = () => {
    const colunas = []
    for (let c = 0; c < numColunas; c++) {
      const startQ = c * questoesPorColuna + 1
      const endQ = Math.min(simulado.qtd_questoes, (c + 1) * questoesPorColuna)
      const questoesColuna = []

      for (let q = startQ; q <= endQ; q++) {
        questoesColuna.push(
          <div key={q} className="flex items-center justify-between py-[3px] border-b border-gray-200 text-xs">
            <span className="font-bold text-gray-800 w-7 text-right pr-1">{q < 10 ? `0${q}` : q}</span>
            <div className="flex items-center gap-2 px-1">
              {alternativasLetras.map((letra) => (
                <div
                  key={letra}
                  className="w-5 h-5 rounded-full border border-black flex items-center justify-center font-bold text-[10px] text-gray-900 bg-white"
                >
                  {letra}
                </div>
              ))}
            </div>
          </div>
        )
      }

      colunas.push(
        <div key={c} className="flex-1 border border-black rounded p-2 bg-white flex flex-col gap-0.5">
          <div className="flex items-center justify-between pb-1 border-b-2 border-black font-bold text-[11px] text-gray-800 uppercase">
            <span>Questão</span>
            <div className="flex gap-3 pr-2">
              {alternativasLetras.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </div>
          </div>
          {questoesColuna}
        </div>
      )
    }

    return <div className="flex gap-4 w-full my-2">{colunas}</div>
  }

  // Componente de uma folha individual OMR
  const renderFolhaIndividual = (aluno?: AlunoFolha, index?: number) => {
    const qrSrc = aluno?.qrCodeUrl || qrGenericoUrl

    return (
      <div
        key={aluno ? aluno.id : `avulso-branco-${index}`}
        className="folha-omr relative bg-white text-black p-6 mx-auto mb-8 border border-gray-300 shadow-sm print:shadow-none print:border-none print:m-0 print:p-6"
        style={{
          width: '210mm',
          minHeight: '290mm',
          boxSizing: 'border-box',
          pageBreakAfter: 'always'
        }}
      >
        {/* 4 Pontos Fiduciais Pretos (Fiducial Corner Anchors) de 16mm x 16mm */}
        <div className="absolute top-4 left-4 w-4 h-4 bg-black" />
        <div className="absolute top-4 right-4 w-4 h-4 bg-black" />
        <div className="absolute bottom-4 left-4 w-4 h-4 bg-black" />
        <div className="absolute bottom-4 right-4 w-4 h-4 bg-black" />

        {/* Linhas de sincronização periférica (Timing Marks) */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-8 h-2 bg-black" />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-8 h-2 bg-black" />

        {/* Cabeçalho Institucional Oficial */}
        <div className="flex items-center justify-between border-b-2 border-black pb-3 pt-2">
          <div className="flex items-center gap-3">
            <img
              src="/img/logo-prefeitura.png"
              alt="Prefeitura Municipal"
              className="h-14 w-auto object-contain"
              onError={(e) => {
                ;(e.currentTarget as HTMLElement).style.display = 'none'
              }}
            />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-700">
                Prefeitura Municipal • Secretaria de Educação
              </p>
              <h1 className="text-base font-extrabold uppercase text-gray-900 tracking-tight">
                {escolaNome}
              </h1>
              <p className="text-xs font-bold text-gray-800">
                CARTÃO-RESPOSTA OFICIAL • {simulado.titulo.toUpperCase()}
              </p>
            </div>
          </div>

          {/* QR Code de Rastreio Rápido */}
          <div className="flex flex-col items-center">
            {qrSrc && <img src={qrSrc} alt="QR Rastreio OMR" className="w-16 h-16 border border-gray-300" />}
            <span className="text-[8px] font-mono text-gray-600 uppercase mt-0.5">OMR-SIG ID</span>
          </div>
        </div>

        {/* Bloco de Identificação do Aluno */}
        <div className="grid grid-cols-12 gap-2 my-3 p-2.5 bg-gray-50 border border-black rounded text-xs">
          <div className="col-span-8">
            <span className="text-[10px] font-bold text-gray-600 block uppercase">Nome do(a) Estudante:</span>
            <div className="font-extrabold text-sm text-gray-900 uppercase truncate">
              {aluno?.nome ? aluno.nome : '____________________________________________________'}
            </div>
          </div>
          <div className="col-span-2">
            <span className="text-[10px] font-bold text-gray-600 block uppercase">Matrícula:</span>
            <div className="font-mono font-bold text-gray-800">{aluno?.numero_matricula || '__________'}</div>
          </div>
          <div className="col-span-2">
            <span className="text-[10px] font-bold text-gray-600 block uppercase">Data:</span>
            <div className="font-bold text-gray-800">
              {simulado.data_aplicacao ? new Date(simulado.data_aplicacao + 'T00:00:00').toLocaleDateString('pt-BR') : '__/__/____'}
            </div>
          </div>
        </div>

        {/* Instruções de Preenchimento */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-amber-50 border border-amber-300 rounded text-[10px] text-amber-900 mb-2">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase">Atenção:</span>
            <span>Preencha totalmente a bolha com caneta <strong>preta</strong> ou <strong>azul</strong>.</span>
          </div>
          <div className="flex items-center gap-3 font-semibold">
            <span className="flex items-center gap-1">
              Correto: <span className="inline-block w-3.5 h-3.5 rounded-full bg-black"></span>
            </span>
            <span className="flex items-center gap-1">
              Incorreto: <span className="inline-block w-3.5 h-3.5 rounded-full border border-black text-center leading-3">×</span>
            </span>
          </div>
        </div>

        {/* Grade de Respostas OMR */}
        <div className="omr-grid-container py-1">{renderGradeBolhas()}</div>

        {/* Rodapé da Folha com Assinatura e Código de Validação */}
        <div className="mt-4 pt-2 border-t border-gray-300 flex items-center justify-between text-[9px] text-gray-500">
          <div>
            <span>Sistema Integrado de Gestão Escolar (SIG) • Cursinho Pré-Universitário</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Assinatura do Aluno: ___________________________________</span>
            <span className="font-mono">SIMULADO #{simulado.id.slice(0, 8)}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Impressão de Folhas de Resposta (OMR)"
      description="Gere e imprima os cartões-resposta padronizados com marcadores óticos para correção automática por câmera."
      maxWidth="sm:max-w-5xl"
    >
      <div className="space-y-4">
        {/* Painel de Controle de Impressão (Não sai na impressão) */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-4 print:hidden">
          {/* Seletor de Modo Principal */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={modoImpressao === 'nominal' ? 'default' : 'outline'}
                onClick={() => setModoImpressao('nominal')}
                className="gap-2 text-xs font-bold"
              >
                <Users className="w-4 h-4" />
                Nominal ({alunosTurma.length} Alunos da Turma)
              </Button>
              <Button
                type="button"
                variant={modoImpressao === 'avulso' ? 'default' : 'outline'}
                onClick={() => setModoImpressao('avulso')}
                className="gap-2 text-xs font-bold"
              >
                <FileText className="w-4 h-4" />
                Folhas Avulsas & Nomes Personalizados
              </Button>
            </div>

            <Button
              onClick={handleImprimir}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold text-xs ml-auto shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Imprimir{' '}
              {modoImpressao === 'nominal'
                ? `${alunosTurma.length} Folhas`
                : `${totalFolhasAvulsas} Folhas`}
            </Button>
          </div>

          {/* Sub-painel para Folhas Avulsas com Nomes Digitados */}
          {modoImpressao === 'avulso' && (
            <div className="bg-muted/40 dark:bg-zinc-900/60 border border-border rounded-xl p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={tipoAvulso === 'digitados' ? 'secondary' : 'ghost'}
                    onClick={() => setTipoAvulso('digitados')}
                    className="text-xs font-bold gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Digitar / Colar Nomes dos Alunos
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={tipoAvulso === 'brancas' ? 'secondary' : 'ghost'}
                    onClick={() => setTipoAvulso('brancas')}
                    className="text-xs font-bold gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    Somente Folhas em Branco
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setMostrarBuscaEscola(!mostrarBuscaEscola)}
                    className="text-xs font-semibold gap-1.5 border-dashed border-border"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-blue-500" />
                    {mostrarBuscaEscola ? 'Fechar Busca da Escola' : 'Importar Aluno da Escola'}
                  </Button>
                </div>
              </div>

              {/* Caixa de Busca de Alunos da Escola */}
              {mostrarBuscaEscola && (
                <div className="p-3 bg-background border border-border rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar aluno cadastrado na escola por nome..."
                      value={buscaAlunoEscola}
                      onChange={(e) => handleBuscarAlunoEscola(e.target.value)}
                      className="h-8 text-xs bg-muted/30"
                    />
                  </div>

                  {alunosEscolaSugestoes.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 max-h-36 overflow-y-auto">
                      {alunosEscolaSugestoes.map((al) => (
                        <button
                          key={al.id}
                          type="button"
                          onClick={() => handleSelecionarAlunoEscola(al)}
                          className="flex items-center justify-between text-left p-2 rounded-lg bg-card hover:bg-emerald-500/10 hover:border-emerald-500/30 border border-border text-xs transition-colors"
                        >
                          <div>
                            <span className="font-bold text-foreground block">{al.nome}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {al.turmas?.nome || 'Sem turma'} • Mat: {al.numero_matricula || '---'}
                            </span>
                          </div>
                          <Plus className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Aba: Digitar Nomes dos Alunos */}
              {tipoAvulso === 'digitados' ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <span>Nomes dos Estudantes</span>
                        <span className="text-[10px] font-normal text-muted-foreground">
                          (Digite ou cole uma lista com um nome por linha)
                        </span>
                      </label>
                      {listaNomesDigitados.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setNomesTexto('')}
                          className="h-6 text-[11px] text-red-500 hover:text-red-600 hover:bg-red-500/10 px-2"
                        >
                          Limpar Lista
                        </Button>
                      )}
                    </div>

                    <Textarea
                      rows={4}
                      value={nomesTexto}
                      onChange={(e) => setNomesTexto(e.target.value)}
                      placeholder="Exemplo:&#10;Ana Carolina Silva&#10;Bruno Henrique Santos&#10;Carlos Eduardo Lima&#10;Daniela Moreira"
                      className="text-xs font-mono bg-background border-border resize-y"
                    />
                  </div>

                  {/* Adição Rápida de Nome Individual */}
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Ou digite o nome de um aluno para adicionar..."
                      value={nomeIndividual}
                      onChange={(e) => setNomeIndividual(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAdicionarNomeIndividual()
                        }
                      }}
                      className="h-8 text-xs bg-background border-border"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAdicionarNomeIndividual}
                      className="h-8 text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar
                    </Button>
                  </div>

                  {/* Badges dos Nomes Reconhecidos */}
                  {listaNomesDigitados.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-semibold text-muted-foreground block">
                        {listaNomesDigitados.length} folha(s) nominal(is) personalizada(s) gerada(s):
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-background border border-border rounded-xl">
                        {listaNomesDigitados.map((nome, idx) => (
                          <Badge
                            key={`${nome}-${idx}`}
                            variant="secondary"
                            className="text-xs gap-1.5 py-1 px-2.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                          >
                            <span>{idx + 1}. {nome}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoverNome(nome)}
                              className="hover:text-red-500 transition-colors"
                              title="Remover"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Opção de Folhas Extras em Branco */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/70 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-medium">
                        Adicionar folhas extras em branco de reserva:
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={qtdAvulsaBranca}
                        onChange={(e) => setQtdAvulsaBranca(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-16 bg-background border border-border rounded-lg px-2 py-1 text-xs font-bold text-center"
                      />
                    </div>

                    <span className="font-bold text-foreground">
                      Total a Imprimir:{' '}
                      <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                        {totalFolhasAvulsas} Folhas
                      </span>{' '}
                      ({listaNomesDigitados.length} com nome + {qtdAvulsaBranca} em branco)
                    </span>
                  </div>
                </div>
              ) : (
                /* Aba: Somente Folhas em Branco */
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-foreground block">
                      Folhas em Branco Padronizadas
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Gera folhas de resposta com marcadores óticos e espaço para o aluno escrever o nome à mão.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-medium">Quantidade:</span>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={qtdSomenteBrancas}
                      onChange={(e) => setQtdSomenteBrancas(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 bg-background border border-border rounded-lg px-2 py-1.5 text-sm font-bold text-center"
                    />
                    <span className="text-xs font-bold text-foreground">Cópias</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dica Informativa */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-600 dark:text-blue-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              As folhas contêm os 4 pontos pretos fiduciais nos cantos e o QR Code individual para reconhecimento ótico ultra-rápido via câmera.
            </span>
          </div>
        </div>

        {/* Visualização das Folhas de Impressão */}
        <div
          ref={printAreaRef}
          className="print-area max-h-[55vh] overflow-y-auto p-4 bg-muted/40 dark:bg-zinc-900 border border-border rounded-xl flex flex-col items-center print:p-0 print:m-0 print:bg-white print:overflow-visible"
        >
          {loadingTurma || loadingAvulsos ? (
            <div className="py-12 text-center text-muted-foreground text-xs animate-pulse">
              Gerando cartões de resposta e QR Codes...
            </div>
          ) : modoImpressao === 'nominal' ? (
            alunosTurma.length > 0 ? (
              alunosTurma.map((aluno) => renderFolhaIndividual(aluno))
            ) : (
              <div className="py-12 text-center text-muted-foreground text-xs space-y-2">
                <p>Nenhum aluno encontrado nas turmas selecionadas.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setModoImpressao('avulso')}
                  className="text-xs font-bold"
                >
                  Alternar para Folhas Avulsas / Digitar Nomes
                </Button>
              </div>
            )
          ) : tipoAvulso === 'digitados' ? (
            listaNomesDigitados.length === 0 && qtdAvulsaBranca === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs space-y-2 max-w-sm">
                <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <p className="font-semibold text-foreground">Nenhum nome digitado ainda</p>
                <p>
                  Digite ou cole os nomes dos estudantes na caixa de texto acima para visualizar as folhas nominais aqui.
                </p>
              </div>
            ) : (
              <>
                {alunosAvulsosComQr.map((aluno) => renderFolhaIndividual(aluno))}
                {Array.from({ length: qtdAvulsaBranca }).map((_, idx) =>
                  renderFolhaIndividual(undefined, idx)
                )}
              </>
            )
          ) : (
            Array.from({ length: qtdSomenteBrancas }).map((_, idx) =>
              renderFolhaIndividual(undefined, idx)
            )
          )}
        </div>

        {/* Estilos CSS Scoped para Impressão */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-area,
            .print-area * {
              visibility: visible;
            }
            .print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: transparent !important;
            }
            .folha-omr {
              page-break-after: always !important;
              break-after: page !important;
              margin: 0 !important;
              box-shadow: none !important;
              border: none !important;
            }
          }
        `}</style>
      </div>
    </StandardDialog>
  )
}

