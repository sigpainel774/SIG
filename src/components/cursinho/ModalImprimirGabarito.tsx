'use client'

import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { Printer, Users, FileText, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  const [qtdAvulsa, setQtdAvulsa] = useState<number>(30)
  const [alunos, setAlunos] = useState<AlunoFolha[]>([])
  const [loading, setLoading] = useState(false)
  const [qrGenericoUrl, setQrGenericoUrl] = useState<string>('')
  const printAreaRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!open || !simulado) return

    const carregarAlunosEQr = async () => {
      setLoading(true)
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
            // Gera QR Code nominal para cada aluno
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
            setAlunos(alunosComQr)
          } else {
            setAlunos([])
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
            setAlunos(alunosComQr)
          } else {
            setAlunos([])
          }
        }
      } catch (err: any) {
        console.error('Erro ao carregar alunos para folha:', err)
        toast.error('Erro ao gerar QR Codes e carregar alunos')
      } finally {
        setLoading(false)
      }
    }

    carregarAlunosEQr()
  }, [open, simulado])

  const handleImprimir = () => {
    window.print()
  }

  if (!simulado) return null

  const { numColunas, questoesPorColuna } = getBubbleGridCoordinates(
    simulado.qtd_questoes,
    simulado.alternativas_por_questao
  )

  const alternativasLetras = ['A', 'B', 'C', 'D', 'E'].slice(0, simulado.alternativas_por_questao)

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
        key={aluno ? aluno.id : `avulso-${index}`}
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
              {aluno ? aluno.nome : '____________________________________________________'}
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
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant={modoImpressao === 'nominal' ? 'default' : 'outline'}
                onClick={() => setModoImpressao('nominal')}
                className="gap-2"
              >
                <Users className="w-4 h-4" />
                Nominal ({alunos.length} Alunos da Turma)
              </Button>
              <Button
                type="button"
                variant={modoImpressao === 'avulso' ? 'default' : 'outline'}
                onClick={() => setModoImpressao('avulso')}
                className="gap-2"
              >
                <FileText className="w-4 h-4" />
                Folhas em Branco (Avulsas)
              </Button>
            </div>

            {modoImpressao === 'avulso' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Quantidade de cópias:</span>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={qtdAvulsa}
                  onChange={(e) => setQtdAvulsa(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 bg-background border border-border rounded-lg px-2 py-1 text-sm font-bold text-center"
                />
              </div>
            )}

            <Button onClick={handleImprimir} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold ml-auto">
              <Printer className="w-4 h-4" />
              Imprimir {modoImpressao === 'nominal' ? `${alunos.length} Folhas` : `${qtdAvulsa} Folhas`}
            </Button>
          </div>

          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-600 dark:text-blue-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              As folhas contêm os 4 pontos pretos fiduciais nos cantos e o QR Code oficial para reconhecimento ótico ultra-rápido via câmera.
            </span>
          </div>
        </div>

        {/* Visualização das Folhas de Impressão */}
        <div
          ref={printAreaRef}
          className="print-area max-h-[60vh] overflow-y-auto p-4 bg-muted/40 dark:bg-zinc-900 border border-border rounded-xl flex flex-col items-center print:p-0 print:m-0 print:bg-white print:overflow-visible"
        >
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Gerando cartões de resposta e QR Codes...</div>
          ) : modoImpressao === 'nominal' ? (
            alunos.length > 0 ? (
              alunos.map((aluno) => renderFolhaIndividual(aluno))
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                Nenhum aluno encontrado nas turmas selecionadas. Alterne para "Folhas em Branco".
              </div>
            )
          ) : (
            Array.from({ length: qtdAvulsa }).map((_, idx) => renderFolhaIndividual(undefined, idx))
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
