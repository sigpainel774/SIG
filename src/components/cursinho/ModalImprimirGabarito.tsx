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
  Sparkles,
  BookOpen,
  Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
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

  // Caderno de Questões
  const [incluirQuestoes, setIncluirQuestoes] = useState<boolean>(false)
  const [textoQuestoes, setTextoQuestoes] = useState<string>('')
  const [isModalEditarQuestoesOpen, setIsModalEditarQuestoesOpen] = useState<boolean>(false)

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

  // Inicializa dados do simulado
  useEffect(() => {
    if (!open || !simulado) return

    setTextoQuestoes(simulado.caderno_questoes || '')
    setIncluirQuestoes(simulado.incluir_questoes_impressao ?? Boolean(simulado.caderno_questoes))

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

  // Gera QR Codes em tempo real para os Nomes Digitados / Avulsos
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

  // Adicionar nome individualmente
  const handleAdicionarNomeIndividual = () => {
    const nomeLimpo = nomeIndividual.trim()
    if (!nomeLimpo) return

    const novosNomes = nomesTexto ? `${nomesTexto}\n${nomeLimpo}` : nomeLimpo
    setNomesTexto(novosNomes)
    setNomeIndividual('')
    toast.success(`Aluno "${nomeLimpo}" adicionado à lista de impressão!`)
  }

  // Remover um nome específico
  const handleRemoverNome = (nomeParaRemover: string) => {
    const filtrados = listaNomesDigitados.filter((n) => n !== nomeParaRemover)
    setNomesTexto(filtrados.join('\n'))
  }

  // Buscar alunos da escola por nome
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
    if (!simulado) return

    // Monta lista de folhas a serem impressas
    let folhasParaImprimir: (AlunoFolha | undefined)[] = []

    if (modoImpressao === 'nominal') {
      if (alunosTurma.length > 0) {
        folhasParaImprimir = alunosTurma
      } else {
        // Se a turma estiver vazia, gera 1 folha padrão para preenchimento
        folhasParaImprimir = [undefined]
      }
    } else if (tipoAvulso === 'digitados') {
      if (alunosAvulsosComQr.length > 0 || qtdAvulsaBranca > 0) {
        folhasParaImprimir = [
          ...alunosAvulsosComQr,
          ...Array.from({ length: qtdAvulsaBranca }).map(() => undefined)
        ]
      } else {
        folhasParaImprimir = [undefined]
      }
    } else {
      folhasParaImprimir = Array.from({ length: Math.max(1, qtdSomenteBrancas) }).map(() => undefined)
    }

    const blocosGabaritoHtml = []
    const numBlocos = simulado.qtd_questoes <= 20 ? 1 : simulado.qtd_questoes <= 45 ? 3 : simulado.qtd_questoes <= 60 ? 3 : 4
    const questoesPorBloco = Math.ceil(simulado.qtd_questoes / numBlocos)

    for (let b = 0; b < numBlocos; b++) {
      const startQ = b * questoesPorBloco + 1
      const endQ = Math.min(simulado.qtd_questoes, (b + 1) * questoesPorBloco)
      const totalColunasBloco = endQ - startQ + 1

      // Cabeçalho dos números das questões na horizontal
      const thCols = []
      for (let q = startQ; q <= endQ; q++) {
        const numFormatado = q < 10 ? `0${q}` : `${q}`
        thCols.push(`
          <th style="padding:3px 1px; font-weight:800; font-family:monospace; font-size:10.5px; color:#000; border:1px solid #d1d5db; background:#f3f4f6; text-align:center;">
            ${numFormatado}
          </th>
        `)
      }

      // Linhas das letras A, B, C, D, E na vertical
      const rowsLetrasHtml = alternativasLetras.map((letra) => {
        const bubblesCols = []
        for (let q = startQ; q <= endQ; q++) {
          bubblesCols.push(`
            <td style="padding:2px 1px; text-align:center; border:1px solid #e5e7eb; background:#fff;">
              <div style="width:16px; height:16px; border-radius:50%; border:1.4px solid #000; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:9.5px; color:#000; background:#fff; margin:0 auto;">
                ${letra}
              </div>
            </td>
          `)
        }

        return `
          <tr>
            <td style="width:34px; padding:2px 4px; font-weight:900; font-size:10.5px; color:#000; border:1px solid #9ca3af; background:#e5e7eb; text-align:center;">
              ${letra}
            </td>
            ${bubblesCols.join('')}
          </tr>
        `
      }).join('')

      blocosGabaritoHtml.push(`
        <div style="width:100%; border:1.8px solid #000; border-radius:4px; overflow:hidden; background:#fff; margin-bottom:6px;">
          <table style="width:100%; border-collapse:collapse; text-align:center;">
            <thead>
              <tr>
                <th style="width:34px; padding:3px 4px; font-weight:900; font-size:10px; color:#000; border:1px solid #9ca3af; background:#e5e7eb; text-transform:uppercase;">
                  Nº
                </th>
                ${thCols.join('')}
              </tr>
            </thead>
            <tbody>
              ${rowsLetrasHtml}
            </tbody>
          </table>
        </div>
      `)
    }

    const gradeBolhasHtml = `
      <div style="display:flex; flex-direction:column; gap:4px; width:100%; margin:4px 0;">
        ${blocosGabaritoHtml.join('')}
      </div>
    `

    const dataFormatada = simulado.data_aplicacao
      ? new Date(simulado.data_aplicacao + 'T00:00:00').toLocaleDateString('pt-BR')
      : '__/__/____'

    const sheetsHtml = folhasParaImprimir
      .map((aluno, index) => {
        const qrSrc = aluno?.qrCodeUrl || qrGenericoUrl
        const nomeAluno = aluno?.nome || '____________________________________________________________________'
        const matriculaAluno = aluno?.numero_matricula || '__________'
        const turmaAluno = aluno?.turma_nome || 'Regular'
        const isUltimaFolha = index === folhasParaImprimir.length - 1 && (!incluirQuestoes || !textoQuestoes.trim())

        const cartaoOmrHtml = `
          <div class="sheet-page sheet-omr" style="${isUltimaFolha ? 'page-break-after: auto; break-after: auto;' : ''}">
            <!-- 4 Quadrados Pretos Fiduciais de Referência Ótica (Cantos do Gabarito) -->
            <div class="fiducial-box top-left"></div>
            <div class="fiducial-box top-right"></div>
            <div class="fiducial-box bottom-left"></div>
            <div class="fiducial-box bottom-right"></div>

            <!-- Linhas de Sincronização Periférica (Timing Bars) -->
            <div class="timing-bar-top"></div>
            <div class="timing-bar-bottom"></div>
            <div class="timing-bar-left"></div>
            <div class="timing-bar-right"></div>

            <!-- Cabeçalho Oficial Paisagem -->
            <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid #000; padding-bottom:6px; padding-top:2px;">
              <div style="display:flex; align-items:center; gap:12px;">
                <img src="/img/logo-prefeitura.png" alt="Prefeitura" style="height:42px; width:auto; object-fit:contain;" onerror="this.style.display='none';" />
                <div>
                  <p style="font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#4b5563; margin:0;">
                    Prefeitura Municipal • Secretaria de Educação
                  </p>
                  <h1 style="font-size:14px; font-weight:900; text-transform:uppercase; color:#000; margin:1px 0;">
                    ${escolaNome}
                  </h1>
                  <p style="font-size:11px; font-weight:800; color:#1f2937; margin:0;">
                    CARTÃO-RESPOSTA OFICIAL (MODO PAISAGEM) • ${simulado.titulo.toUpperCase()}
                  </p>
                </div>
              </div>

              <div style="display:flex; align-items:center; gap:12px;">
                <div style="text-align:right; font-size:9.5px; color:#374151; font-weight:700;">
                  <div>${simulado.qtd_questoes} QUESTÕES</div>
                  <div style="color:#6b7280; font-family:monospace;">ANO LETIVO ${simulado.ano_letivo || new Date().getFullYear()}</div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:center;">
                  ${qrSrc ? `<img src="${qrSrc}" alt="QR" style="width:52px; height:52px; border:1px solid #999;" />` : ''}
                  <span style="font-size:7.5px; font-family:monospace; color:#4b5563; text-transform:uppercase; margin-top:1px;">OMR-SIG</span>
                </div>
              </div>
            </div>

            <!-- Bloco de Identificação do Aluno Paisagem -->
            <div style="display:grid; grid-template-columns:6fr 2fr 2fr 2fr; gap:6px; margin:6px 0; padding:6px 8px; background:#f9fafb; border:1.5px solid #000; border-radius:4px; font-size:10.5px;">
              <div>
                <span style="font-size:8.5px; font-weight:700; color:#4b5563; display:block; text-transform:uppercase;">Nome do(a) Estudante:</span>
                <div style="font-weight:900; font-size:12px; color:#000; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  ${nomeAluno}
                </div>
              </div>
              <div>
                <span style="font-size:8.5px; font-weight:700; color:#4b5563; display:block; text-transform:uppercase;">Matrícula:</span>
                <div style="font-family:monospace; font-weight:800; color:#111;">${matriculaAluno}</div>
              </div>
              <div>
                <span style="font-size:8.5px; font-weight:700; color:#4b5563; display:block; text-transform:uppercase;">Turma:</span>
                <div style="font-weight:800; color:#111; text-transform:uppercase;">${turmaAluno}</div>
              </div>
              <div>
                <span style="font-size:8.5px; font-weight:700; color:#4b5563; display:block; text-transform:uppercase;">Data:</span>
                <div style="font-weight:800; color:#111;">${dataFormatada}</div>
              </div>
            </div>

            <!-- Instruções Compactas -->
            <div style="display:flex; align-items:center; justify-content:space-between; padding:3px 8px; background:#fffbeb; border:1px solid #fcd34d; border-radius:4px; font-size:9.5px; color:#78350f; margin-bottom:4px;">
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="font-weight:800; text-transform:uppercase;">Instruções:</span>
                <span>Preencha totalmente a bolha com caneta <strong>preta</strong> ou <strong>azul</strong>. Letras na vertical (A-E) e Questões na horizontal (01-XX).</span>
              </div>
              <div style="display:flex; align-items:center; gap:10px; font-weight:700;">
                <span style="display:flex; align-items:center; gap:3px;">
                  Correto: <span style="display:inline-block; width:11px; height:11px; border-radius:50%; background:#000;"></span>
                </span>
                <span style="display:flex; align-items:center; gap:3px;">
                  Incorreto: <span style="display:inline-block; width:11px; height:11px; border-radius:50%; border:1px solid #000; text-align:center; line-height:9px; font-size:8.5px;">×</span>
                </span>
              </div>
            </div>

            <!-- Grade OMR Paisagem -->
            <div style="padding:1px 0;">
              ${gradeBolhasHtml}
            </div>

            <!-- Rodapé Paisagem -->
            <div style="position:absolute; bottom:8px; left:16px; right:16px; padding-top:4px; border-top:1px solid #d1d5db; display:flex; align-items:center; justify-content:space-between; font-size:8.5px; color:#6b7280;">
              <div>Sistema Integrado de Gestão Escolar (SIG) • Cursinho Pré-Universitário • Padrão OMR Paisagem</div>
              <div style="display:flex; align-items:center; gap:14px;">
                <span>Assinatura do Aluno: _____________________________________________</span>
                <span style="font-family:monospace; font-weight:700;">SIMULADO #${simulado.id.slice(0, 8)}</span>
              </div>
            </div>
          </div>
        `

        let cadernoHtml = ''
        if (incluirQuestoes && textoQuestoes.trim()) {
          const isUltimaQuestoes = index === folhasParaImprimir.length - 1
          cadernoHtml = `
            <div class="sheet-page sheet-questoes" style="${isUltimaQuestoes ? 'page-break-after: auto; break-after: auto;' : ''}">
              <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid #000; padding-bottom:6px; margin-bottom:10px;">
                <div style="display:flex; align-items:center; gap:10px;">
                  <img src="/img/logo-prefeitura.png" alt="Prefeitura" style="height:36px; width:auto; object-fit:contain;" onerror="this.style.display='none';" />
                  <div>
                    <p style="font-size:8.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#4b5563; margin:0;">
                      Prefeitura Municipal • Secretaria de Educação
                    </p>
                    <h2 style="font-size:12px; font-weight:900; text-transform:uppercase; color:#000; margin:1px 0;">
                      ${escolaNome}
                    </h2>
                    <h3 style="font-size:10.5px; font-weight:800; color:#1f2937; text-transform:uppercase; margin:0;">
                      CADERNO DE QUESTÕES • ${simulado.titulo.toUpperCase()}
                    </h3>
                  </div>
                </div>

                <div style="text-align:right;">
                  <span style="font-size:10.5px; font-weight:800; color:#1f2937; text-transform:uppercase; display:block; max-width:240px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    ${aluno?.nome ? aluno.nome : 'CADERNO DO ESTUDANTE'}
                  </span>
                  <span style="font-size:8.5px; color:#6b7280; font-family:monospace;">
                    ${simulado.qtd_questoes} Questões • ${simulado.ano_letivo || new Date().getFullYear()}
                  </span>
                </div>
              </div>

              <!-- Enunciados das Questões em 2 colunas no modo paisagem para melhor aproveitamento -->
              <div style="columns:2; column-gap:24px; font-size:11px; line-height:1.5; color:#000; font-family:ui-sans-serif, system-ui, -apple-system, sans-serif; white-space:pre-wrap; word-break:break-word;">
                ${textoQuestoes}
              </div>

              <div style="margin-top:16px; padding-top:6px; border-top:1px solid #d1d5db; text-align:center; font-size:9.5px; color:#6b7280;">
                <span>Fim do caderno de questões • Preencha com atenção seu cartão-resposta no modo paisagem.</span>
              </div>
            </div>
          `
        }

        return cartaoOmrHtml + cadernoHtml
      })
      .join('\n')

    const htmlCompleto = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Simulado_${simulado.titulo.replace(/[^a-zA-Z0-9]/g, '_')}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 4mm 6mm 4mm 6mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            }
            .no-print-bar {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              height: 48px;
              background: #0f172a;
              color: #ffffff;
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 0 20px;
              z-index: 99999;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
              font-size: 13px;
              font-weight: bold;
            }
            .btn-imprimir {
              background: #059669;
              color: #ffffff;
              border: none;
              padding: 8px 18px;
              border-radius: 8px;
              font-weight: 800;
              font-size: 12px;
              cursor: pointer;
              transition: background 0.15s;
            }
            .btn-imprimir:hover {
              background: #047857;
            }
            .print-container-wrapper {
              padding-top: 60px;
              background: #e2e8f0;
              min-height: 100vh;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 20px;
              padding-bottom: 40px;
            }
            .sheet-page {
              width: 285mm;
              min-height: 194mm;
              max-height: 198mm;
              background: #ffffff;
              color: #000000;
              padding: 12px 18px;
              position: relative;
              box-sizing: border-box;
              box-shadow: 0 4px 12px rgba(0,0,0,0.12);
              page-break-after: always;
              break-after: page;
              margin: 0 auto;
            }
            .sheet-questoes {
              padding: 18px 22px;
              min-height: 194mm;
            }
            .fiducial-box {
              position: absolute;
              width: 16px;
              height: 16px;
              background-color: #000000;
            }
            .top-left { top: 8px; left: 8px; }
            .top-right { top: 8px; right: 8px; }
            .bottom-left { bottom: 8px; left: 8px; }
            .bottom-right { bottom: 8px; right: 8px; }
            .timing-bar-top {
              position: absolute;
              top: 8px;
              left: 50%;
              transform: translateX(-50%);
              width: 44px;
              height: 6px;
              background: #000000;
            }
            .timing-bar-bottom {
              position: absolute;
              bottom: 8px;
              left: 50%;
              transform: translateX(-50%);
              width: 44px;
              height: 6px;
              background: #000000;
            }
            .timing-bar-left {
              position: absolute;
              left: 8px;
              top: 50%;
              transform: translateY(-50%);
              width: 6px;
              height: 44px;
              background: #000000;
            }
            .timing-bar-right {
              position: absolute;
              right: 8px;
              top: 50%;
              transform: translateY(-50%);
              width: 6px;
              height: 44px;
              background: #000000;
            }
            @media print {
              .no-print-bar {
                display: none !important;
              }
              .print-container-wrapper {
                padding: 0 !important;
                background: transparent !important;
                display: block !important;
                gap: 0 !important;
                min-height: 0 !important;
              }
              .sheet-page {
                box-shadow: none !important;
                border: none !important;
                margin: 0 auto !important;
                width: 100% !important;
                min-height: 194mm !important;
              }
            }
          </style>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 400);
            };
          </script>
        </head>
        <body>
          <div class="no-print-bar">
            <span>Impressão de Cartão-Resposta e Caderno de Questões • Modo Paisagem (OMR) • SIG</span>
            <button class="btn-imprimir" onclick="window.print()">Imprimir / Salvar PDF</button>
          </div>
          <div class="print-container-wrapper">
            ${sheetsHtml}
          </div>
        </body>
      </html>
    `

    // Abre janela com o documento
    const win = window.open('', '_blank', 'width=1100,height=800')
    if (win) {
      win.document.open()
      win.document.write(htmlCompleto)
      win.document.close()
    } else {
      // Fallback para iframe visível caso o popup seja impedido
      const iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.left = '0'
      iframe.style.top = '0'
      iframe.style.width = '100vw'
      iframe.style.height = '100vh'
      iframe.style.opacity = '0'
      iframe.style.pointerEvents = 'none'
      iframe.style.border = '0'
      iframe.style.zIndex = '-9999'
      document.body.appendChild(iframe)

      const doc = iframe.contentWindow?.document
      if (doc) {
        doc.open()
        doc.write(htmlCompleto)
        doc.close()
        setTimeout(() => {
          iframe.contentWindow?.focus()
          iframe.contentWindow?.print()
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe)
            }
          }, 2000)
        }, 500)
      }
    }
  }

  if (!simulado) return null

  const { numBlocos, questoesPorBloco } = getBubbleGridCoordinates(
    simulado.qtd_questoes,
    simulado.alternativas_por_questao
  )

  const alternativasLetras = ['A', 'B', 'C', 'D', 'E'].slice(0, simulado.alternativas_por_questao)

  // Total de folhas no modo avulso
  const totalFolhasAvulsas =
    tipoAvulso === 'digitados'
      ? listaNomesDigitados.length + qtdAvulsaBranca
      : qtdSomenteBrancas

  // Renderiza a grade de bolhas no modo PAISAGEM (Números na horizontal, Letras na vertical)
  const renderGradeBolhas = () => {
    const blocos = []

    for (let b = 0; b < numBlocos; b++) {
      const startQ = b * questoesPorBloco + 1
      const endQ = Math.min(simulado.qtd_questoes, (b + 1) * questoesPorBloco)

      const questoesArray: number[] = []
      for (let q = startQ; q <= endQ; q++) {
        questoesArray.push(q)
      }

      blocos.push(
        <div key={b} className="w-full border-2 border-black rounded-lg overflow-hidden bg-white mb-2 shadow-none">
          <table className="w-full border-collapse text-center table-fixed">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-black">
                <th className="w-9 py-1 px-1 text-[10px] font-extrabold text-black border-r border-gray-400 uppercase">
                  Nº
                </th>
                {questoesArray.map((q) => (
                  <th
                    key={q}
                    className="py-1 px-0.5 font-mono font-extrabold text-[11px] text-gray-900 border-r border-gray-300 last:border-r-0"
                  >
                    {q < 10 ? `0${q}` : q}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alternativasLetras.map((letra) => (
                <tr key={letra} className="border-b border-gray-200 last:border-b-0">
                  <td className="w-9 py-1 px-1 font-black text-xs text-gray-900 bg-gray-200/80 border-r border-gray-400">
                    {letra}
                  </td>
                  {questoesArray.map((q) => (
                    <td key={`${q}-${letra}`} className="py-0.5 px-0.5 border-r border-gray-200 last:border-r-0">
                      <div className="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full border border-black flex items-center justify-center font-bold text-[9px] text-black bg-white mx-auto">
                        {letra}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-1.5 w-full my-1">
        {blocos}
      </div>
    )
  }

  // Componente de um pacote de folhas individual no MODO PAISAGEM
  const renderFolhaIndividual = (aluno?: AlunoFolha, index?: number) => {
    const qrSrc = aluno?.qrCodeUrl || qrGenericoUrl

    return (
      <div key={aluno ? aluno.id : `avulso-item-${index}`} className="folha-container w-full">
        {/* 1. Folha de Respostas OMR (MODO PAISAGEM) */}
        <div
          className="folha-omr relative bg-white text-black p-5 mx-auto mb-8 border-2 border-gray-400 shadow-md print:shadow-none print:border-none print:m-0 print:p-4 rounded-xl"
          style={{
            width: '280mm',
            minHeight: '192mm',
            maxWidth: '100%',
            boxSizing: 'border-box',
            pageBreakAfter: 'always'
          }}
        >
          {/* 4 Quadrados Pretos Fiduciais de Referência Ótica (Cantos do Gabarito) */}
          <div className="absolute top-2.5 left-2.5 w-4 h-4 bg-black" />
          <div className="absolute top-2.5 right-2.5 w-4 h-4 bg-black" />
          <div className="absolute bottom-2.5 left-2.5 w-4 h-4 bg-black" />
          <div className="absolute bottom-2.5 right-2.5 w-4 h-4 bg-black" />

          {/* Linhas de sincronização periférica (Timing Marks) */}
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-black" />
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-black" />
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-black" />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-black" />

          {/* Cabeçalho Institucional Oficial Paisagem */}
          <div className="flex items-center justify-between border-b-2 border-black pb-2 pt-1">
            <div className="flex items-center gap-3">
              <img
                src="/img/logo-prefeitura.png"
                alt="Prefeitura Municipal"
                className="h-10 w-auto object-contain"
                onError={(e) => {
                  ;(e.currentTarget as HTMLElement).style.display = 'none'
                }}
              />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-700">
                  Prefeitura Municipal • Secretaria de Educação
                </p>
                <h1 className="text-sm font-extrabold uppercase text-gray-900 tracking-tight">
                  {escolaNome}
                </h1>
                <p className="text-xs font-bold text-gray-800">
                  CARTÃO-RESPOSTA OFICIAL (MODO PAISAGEM) • {simulado.titulo.toUpperCase()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right text-[10px] font-bold text-gray-700">
                <div>{simulado.qtd_questoes} QUESTÕES</div>
                <div className="font-mono text-gray-500">ANO {simulado.ano_letivo || new Date().getFullYear()}</div>
              </div>
              <div className="flex flex-col items-center">
                {qrSrc && <img src={qrSrc} alt="QR Rastreio OMR" className="w-12 h-12 border border-gray-300" />}
                <span className="text-[7.5px] font-mono text-gray-600 uppercase mt-0.5">OMR-SIG</span>
              </div>
            </div>
          </div>

          {/* Bloco de Identificação do Aluno Paisagem */}
          <div className="grid grid-cols-12 gap-2 my-2 p-2 bg-gray-50 border-1.5 border-black rounded text-xs">
            <div className="col-span-6">
              <span className="text-[9px] font-bold text-gray-600 block uppercase">Nome do(a) Estudante:</span>
              <div className="font-extrabold text-xs text-gray-900 uppercase truncate">
                {aluno?.nome ? aluno.nome : '____________________________________________________________________'}
              </div>
            </div>
            <div className="col-span-2">
              <span className="text-[9px] font-bold text-gray-600 block uppercase">Matrícula:</span>
              <div className="font-mono font-bold text-gray-800">{aluno?.numero_matricula || '__________'}</div>
            </div>
            <div className="col-span-2">
              <span className="text-[9px] font-bold text-gray-600 block uppercase">Turma:</span>
              <div className="font-bold text-gray-800 uppercase truncate">{aluno?.turma_nome || 'Regular'}</div>
            </div>
            <div className="col-span-2">
              <span className="text-[9px] font-bold text-gray-600 block uppercase">Data:</span>
              <div className="font-bold text-gray-800">
                {simulado.data_aplicacao ? new Date(simulado.data_aplicacao + 'T00:00:00').toLocaleDateString('pt-BR') : '__/__/____'}
              </div>
            </div>
          </div>

          {/* Instruções de Preenchimento Compactas */}
          <div className="flex items-center justify-between px-2.5 py-1 bg-amber-50 border border-amber-300 rounded text-[9.5px] text-amber-900 mb-1.5">
            <div className="flex items-center gap-2">
              <span className="font-bold uppercase">Atenção:</span>
              <span>Preencha totalmente a bolha com caneta <strong>preta</strong> ou <strong>azul</strong>. Números na horizontal e letras na vertical.</span>
            </div>
            <div className="flex items-center gap-3 font-semibold">
              <span className="flex items-center gap-1">
                Correto: <span className="inline-block w-3 h-3 rounded-full bg-black"></span>
              </span>
              <span className="flex items-center gap-1">
                Incorreto: <span className="inline-block w-3 h-3 rounded-full border border-black text-center leading-2.5 text-[8px]">×</span>
              </span>
            </div>
          </div>

          {/* Grade de Respostas OMR (Paisagem) */}
          <div className="omr-grid-container py-0.5">{renderGradeBolhas()}</div>

          {/* Rodapé da Folha com Assinatura e Código de Validação */}
          <div className="mt-2 pt-1 border-t border-gray-300 flex items-center justify-between text-[8.5px] text-gray-500">
            <div>
              <span>Sistema Integrado de Gestão Escolar (SIG) • Cursinho Pré-Universitário • Padrão Paisagem</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Assinatura do Aluno: _____________________________________________</span>
              <span className="font-mono font-bold">SIMULADO #{simulado.id.slice(0, 8)}</span>
            </div>
          </div>
        </div>

        {/* 2. Páginas de Questões Anexadas */}
        {incluirQuestoes && textoQuestoes.trim() && (
          <div
            className="folha-questoes relative bg-white text-black p-6 mx-auto mb-8 border-2 border-gray-400 shadow-md print:shadow-none print:border-none print:m-0 print:p-6 rounded-xl"
            style={{
              width: '280mm',
              minHeight: '192mm',
              maxWidth: '100%',
              boxSizing: 'border-box',
              pageBreakAfter: 'always',
              pageBreakBefore: 'always'
            }}
          >
            <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-4">
              <div className="flex items-center gap-3">
                <img
                  src="/img/logo-prefeitura.png"
                  alt="Prefeitura Municipal"
                  className="h-9 w-auto object-contain"
                  onError={(e) => {
                    ;(e.currentTarget as HTMLElement).style.display = 'none'
                  }}
                />
                <div>
                  <p className="text-[9.5px] font-semibold uppercase tracking-wider text-gray-600">
                    Prefeitura Municipal • Secretaria de Educação
                  </p>
                  <h2 className="text-xs font-extrabold uppercase text-gray-900">
                    ${escolaNome}
                  </h2>
                  <h3 className="text-[11px] font-bold text-gray-800 uppercase">
                    CADERNO DE QUESTÕES • {simulado.titulo.toUpperCase()}
                  </h3>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-bold text-gray-800 uppercase block truncate max-w-[240px]">
                  {aluno?.nome ? aluno.nome : 'CADERNO DO ESTUDANTE'}
                </span>
                <span className="text-[9.5px] text-gray-500 font-mono">
                  {simulado.qtd_questoes} Questões • {simulado.ano_letivo}
                </span>
              </div>
            </div>

            {/* Enunciados e Alternativas em 2 colunas para melhor leitura no modo paisagem */}
            <div className="columns-2 gap-6 text-xs leading-relaxed text-gray-900 font-sans whitespace-pre-wrap">
              {textoQuestoes}
            </div>

            <div className="mt-4 pt-2 border-t border-gray-300 text-center text-[9px] text-gray-500">
              <span>Fim do caderno de questões • Preencha com atenção seu cartão-resposta no modo paisagem.</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <StandardDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Impressão de Folhas de Resposta (Modo Paisagem OMR)"
        description="Gere e imprima os cartões-resposta no formato paisagem (números na horizontal e letras na vertical) com marcadores fiduciais pretos nos cantos."
        maxWidth="sm:max-w-6xl"
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

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleImprimir}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold text-xs shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir
                </Button>
              </div>
            </div>

            {/* Controle de Anexar Caderno de Questões */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/30 border border-border rounded-xl">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-foreground">
                <input
                  type="checkbox"
                  checked={incluirQuestoes}
                  onChange={(e) => {
                    setIncluirQuestoes(e.target.checked)
                    if (e.target.checked && !textoQuestoes) {
                      setIsModalEditarQuestoesOpen(true)
                    }
                  }}
                  className="w-4 h-4 rounded border-border text-emerald-600 focus:ring-0"
                />
                <span>Imprimir Caderno de Questões nas próximas páginas da prova</span>
              </label>

              <div className="flex items-center gap-2">
                {textoQuestoes && (
                  <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 gap-1 border-blue-500/20">
                    <Check className="w-3 h-3" /> Questões Anexadas
                  </Badge>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalEditarQuestoesOpen(true)}
                  className="text-xs font-bold gap-1.5 h-7 border-border"
                >
                  <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                  {textoQuestoes ? 'Editar / Ver Questões' : 'Colar Questões da Prova'}
                </Button>
              </div>
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

          {/* Visualização das Folhas de Impressão (Framed com Quadrados Pretos de Referência) */}
          <div className="relative p-1 rounded-2xl border-2 border-border/80 bg-background/50 overflow-hidden shadow-inner">
            {/* 4 Quadrados Pretos de Referência ao redor do container do modal */}
            <div className="absolute top-2 left-2 w-3.5 h-3.5 bg-black dark:bg-white rounded-xs z-10 pointer-events-none" />
            <div className="absolute top-2 right-2 w-3.5 h-3.5 bg-black dark:bg-white rounded-xs z-10 pointer-events-none" />
            <div className="absolute bottom-2 left-2 w-3.5 h-3.5 bg-black dark:bg-white rounded-xs z-10 pointer-events-none" />
            <div className="absolute bottom-2 right-2 w-3.5 h-3.5 bg-black dark:bg-white rounded-xs z-10 pointer-events-none" />

            <div
              ref={printAreaRef}
              className="print-area max-h-[58vh] overflow-y-auto p-4 bg-muted/40 dark:bg-zinc-900 border border-border rounded-xl flex flex-col items-center print:p-0 print:m-0 print:bg-white print:overflow-visible"
            >
              {loadingTurma || loadingAvulsos ? (
                <div className="py-12 text-center text-muted-foreground text-xs animate-pulse">
                  Gerando cartões de resposta em modo paisagem e QR Codes...
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
          </div>

          {/* Estilos CSS Scoped para Impressão */}
          <style dangerouslySetInnerHTML={{
            __html: `
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
              .folha-questoes {
                page-break-after: always !important;
                page-break-before: always !important;
                break-after: page !important;
                break-before: page !important;
                margin: 0 !important;
                box-shadow: none !important;
                border: none !important;
              }
            }
          `}} />
        </div>
      </StandardDialog>

      {/* Modal para Editar/Colar as Questões na Impressão */}
      <StandardDialog
        open={isModalEditarQuestoesOpen}
        onOpenChange={setIsModalEditarQuestoesOpen}
        title="Caderno de Questões da Prova"
        description="Cole os enunciados, textos e alternativas das questões para serem impressos nas páginas seguintes junto com o cartão-resposta."
        maxWidth="sm:max-w-3xl"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground">
                Texto / Enunciados das Questões ({simulado.qtd_questoes} questões)
              </Label>
              {textoQuestoes && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setTextoQuestoes('')}
                  className="h-6 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 px-2"
                >
                  Limpar Texto
                </Button>
              )}
            </div>

            <Textarea
              rows={16}
              value={textoQuestoes}
              onChange={(e) => setTextoQuestoes(e.target.value)}
              placeholder="Cole aqui o texto completo da prova com as questões. Exemplo:&#10;&#10;QUESTÃO 01&#10;Considere a seguinte equação exponencial...&#10;A) 12&#10;B) 24&#10;C) 36&#10;D) 48&#10;E) 60&#10;&#10;QUESTÃO 02&#10;O processo de urbanização brasileiro no século XX..."
              className="text-xs font-mono bg-background border-border resize-y leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {textoQuestoes ? `${textoQuestoes.length} caracteres • Pronto para impressão` : 'Nenhum texto colado'}
            </span>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalEditarQuestoesOpen(false)}
              >
                Fechar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (textoQuestoes.trim()) {
                    setIncluirQuestoes(true)
                  }
                  setIsModalEditarQuestoesOpen(false)
                  toast.success('Caderno de questões atualizado para impressão!')
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Confirmar Questões
              </Button>
            </div>
          </div>
        </div>
      </StandardDialog>
    </>
  )
}

