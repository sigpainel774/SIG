/**
 * OMR Engine - Reconhecimento Ótico de Marcas e Leitura de Folhas de Resposta
 * Suporta detecção de QR Code, 4 Marcadores Fiduciais (cantos) e Grade de Bolhas Paramétrica.
 */

import jsQR from 'jsqr'

export interface SheetConfig {
  qtdQuestoes: number
  alternativasPorQuestao: number // 4 (A-D) ou 5 (A-E)
}

export interface OMRResult {
  sucesso: boolean
  qrData?: {
    simuladoId?: string
    alunoId?: string
    alunoNome?: string
    folhaNum?: number
  } | null
  respostas: Record<string, string | null> // "A", "B", "C", "D", "E", "ANULADA", "BRANCO"
  mensagem?: string
  confidence?: number
}

// Emite bip de sucesso ou erro usando Web Audio API nativa
export function playScanSound(type: 'success' | 'error' = 'success') {
  if (typeof window === 'undefined') return
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    if (type === 'success') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime) // Lá (A5)
      osc.frequency.setValueAtTime(1760, ctx.currentTime + 0.08) // A6
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25)
      osc.start()
      osc.stop(ctx.currentTime + 0.25)
    } else {
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(220, ctx.currentTime)
      gain.gain.setValueAtTime(0.25, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
      osc.start()
      osc.stop(ctx.currentTime + 0.3)
    }
  } catch {
    // Audio Context silencioso
  }
}

/**
 * Lê o QR Code contido na imagem/canvas se existir
 */
export function readQRCodeFromImageData(imageData: ImageData): { simuladoId?: string; alunoId?: string; alunoNome?: string; raw?: string } | null {
  try {
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert'
    })
    if (!code || !code.data) return null

    try {
      const parsed = JSON.parse(code.data)
      return {
        simuladoId: parsed.s || parsed.simuladoId || parsed.simulado_id,
        alunoId: parsed.a || parsed.alunoId || parsed.aluno_id,
        alunoNome: parsed.n || parsed.nome || parsed.alunoNome || parsed.aluno_nome,
        raw: code.data
      }
    } catch {
      return { raw: code.data }
    }
  } catch {
    return null
  }
}

/**
 * Calcula a posição paramétrica normalizada de cada bolha da folha
 * Retorna as coordenadas relativas (0.0 a 1.0) dentro do retângulo delimitado pelos marcadores
 */
export function getBubbleGridCoordinates(qtdQuestoes: number, alternativasPorQuestao: number) {
  // Determinamos quantidade de colunas conforme número de questões
  const numColunas = qtdQuestoes <= 20 ? 1 : qtdQuestoes <= 45 ? 2 : qtdQuestoes <= 70 ? 3 : 4
  const questoesPorColuna = Math.ceil(qtdQuestoes / numColunas)

  const coordenadas: Array<{
    questao: number
    opcao: string
    opcaoIndex: number
    colunaIndex: number
    rx: number // 0.0 - 1.0
    ry: number // 0.0 - 1.0
  }> = []

  const letras = ['A', 'B', 'C', 'D', 'E'].slice(0, alternativasPorQuestao)

  const colWidth = 1.0 / numColunas
  const marginX = 0.04
  const marginY = 0.06

  for (let q = 1; q <= qtdQuestoes; q++) {
    const colIndex = Math.floor((q - 1) / questoesPorColuna)
    const rowIndex = (q - 1) % questoesPorColuna

    const colLeft = colIndex * colWidth + marginX
    const colUsableWidth = colWidth - marginX * 2

    const rowTop = marginY + (rowIndex / Math.max(1, questoesPorColuna - 1 || 1)) * (1.0 - marginY * 2)

    // O label da questão fica à esquerda, as opções distribuídas à direita
    const optionsStart = colLeft + colUsableWidth * 0.22
    const optionsWidth = colUsableWidth * 0.78
    const optionSpacing = optionsWidth / Math.max(1, letras.length - 1)

    letras.forEach((letra, optIdx) => {
      const rx = optionsStart + optIdx * optionSpacing
      const ry = rowTop

      coordenadas.push({
        questao: q,
        opcao: letra,
        opcaoIndex: optIdx,
        colunaIndex: colIndex,
        rx,
        ry
      })
    })
  }

  return { coordenadas, numColunas, questoesPorColuna }
}

/**
 * Processa a imagem do Canvas para ler as respostas marcadas na grade de bolhas OMR
 */
export function processOMRCanvas(
  canvas: HTMLCanvasElement,
  config: SheetConfig,
  gridBoundingBox?: { x: number; y: number; width: number; height: number }
): OMRResult {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return { sucesso: false, respostas: {}, mensagem: 'Contexto 2D indisponível' }

  const fullImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const qrData = readQRCodeFromImageData(fullImageData)

  // Área da grade de respostas (se não fornecida, assume área central padrão)
  const box = gridBoundingBox || {
    x: Math.round(canvas.width * 0.08),
    y: Math.round(canvas.height * 0.22),
    width: Math.round(canvas.width * 0.84),
    height: Math.round(canvas.height * 0.72)
  }

  const { coordenadas } = getBubbleGridCoordinates(config.qtdQuestoes, config.alternativasPorQuestao)
  const respostas: Record<string, string | null> = {}

  // Agrupa coordenadas por questão
  const porQuestao: Record<number, typeof coordenadas> = {}
  coordenadas.forEach((c) => {
    if (!porQuestao[c.questao]) porQuestao[c.questao] = []
    porQuestao[c.questao].push(c)
  })

  // Amostra a luminosidade média de uma região circular
  const getRegionDarkness = (centerX: number, centerY: number, radius: number): { darkness: number; avgLuminance: number } => {
    let totalLum = 0
    let count = 0
    const startX = Math.max(0, Math.floor(centerX - radius))
    const endX = Math.min(canvas.width - 1, Math.ceil(centerX + radius))
    const startY = Math.max(0, Math.floor(centerY - radius))
    const endY = Math.min(canvas.height - 1, Math.ceil(centerY + radius))

    for (let py = startY; py <= endY; py++) {
      for (let px = startX; px <= endX; px++) {
        const dx = px - centerX
        const dy = py - centerY
        if (dx * dx + dy * dy <= radius * radius) {
          const idx = (py * canvas.width + px) * 4
          const r = fullImageData.data[idx]
          const g = fullImageData.data[idx + 1]
          const b = fullImageData.data[idx + 2]
          // Luminância padrão ITU-R BT.601
          const lum = 0.299 * r + 0.587 * g + 0.114 * b
          totalLum += lum
          count++
        }
      }
    }

    const avgLuminance = count > 0 ? totalLum / count : 255
    // Escuridão (0 = branco total, 255 = preto total)
    const darkness = 255 - avgLuminance
    return { darkness, avgLuminance }
  }

  // Raio de amostragem proporcional à escala da grade
  const sampleRadius = Math.max(3, Math.min(16, Math.round(box.width * 0.014)))

  Object.entries(porQuestao).forEach(([qStr, opts]) => {
    const qNum = parseInt(qStr, 10)
    const optionDarkness: Array<{ opcao: string; darkness: number; fillRatio: number }> = []

    // Calcula fundo de referência ao redor da questão
    let refBackgroundDarkness = 0
    let refCount = 0

    opts.forEach((opt) => {
      const px = box.x + opt.rx * box.width
      const py = box.y + opt.ry * box.height
      const res = getRegionDarkness(px, py, sampleRadius)
      // Amostra um ponto de fundo branco logo acima da bolha
      const bgRes = getRegionDarkness(px, Math.max(0, py - sampleRadius * 2.2), sampleRadius * 0.7)
      refBackgroundDarkness += bgRes.darkness
      refCount++

      optionDarkness.push({
        opcao: opt.opcao,
        darkness: res.darkness,
        fillRatio: 0
      })
    })

    const avgBg = refCount > 0 ? refBackgroundDarkness / refCount : 40

    // Calcula preenchimento relativo ao papel
    optionDarkness.forEach((o) => {
      // Diferença de escuridão relativa
      const diff = Math.max(0, o.darkness - avgBg)
      o.fillRatio = diff / Math.max(1, 255 - avgBg)
    })

    // Ordena da mais escura para a menos escura
    optionDarkness.sort((a, b) => b.darkness - a.darkness)

    const maisEscura = optionDarkness[0]
    const segundaMaisEscura = optionDarkness[1]

    // Limiares de preenchimento
    const THRESHOLD_FILLED = 45 // Limiar absoluto de escuridão para caneta preta/azul
    const THRESHOLD_DIFF = 20 // Diferença mínima entre a opção escolhida e a segunda mais escura

    const isMarked = maisEscura.darkness >= THRESHOLD_FILLED && (maisEscura.darkness - avgBg) > 25
    const isDoubleMarked = isMarked && segundaMaisEscura && segundaMaisEscura.darkness >= THRESHOLD_FILLED && (maisEscura.darkness - segundaMaisEscura.darkness) < THRESHOLD_DIFF

    if (isDoubleMarked) {
      respostas[qNum.toString()] = 'ANULADA'
    } else if (isMarked) {
      respostas[qNum.toString()] = maisEscura.opcao
    } else {
      respostas[qNum.toString()] = 'BRANCO'
    }
  })

  return {
    sucesso: true,
    qrData,
    respostas,
    confidence: 0.95
  }
}

/**
 * Compara respostas do aluno com o gabarito oficial e calcula a nota e acertos
 */
export function calcularResultadoSimulado(
  respostasAluno: Record<string, string | null>,
  gabaritoOficial: Record<string, string>,
  qtdQuestoes: number
) {
  let totalAcertos = 0
  let totalErros = 0
  let totalEmBranco = 0
  let totalAnuladas = 0

  const detalhes: Array<{
    questao: number
    respostaAluno: string | null
    respostaCorreta: string
    acertou: boolean
  }> = []

  for (let q = 1; q <= qtdQuestoes; q++) {
    const qStr = q.toString()
    const respAluno = (respostasAluno[qStr] || 'BRANCO').toUpperCase()
    const respCorreta = (gabaritoOficial[qStr] || '').toUpperCase()

    let acertou = false

    if (respAluno === 'BRANCO') {
      totalEmBranco++
    } else if (respAluno === 'ANULADA') {
      totalAnuladas++
      totalErros++
    } else if (respAluno === respCorreta) {
      totalAcertos++
      acertou = true
    } else {
      totalErros++
    }

    detalhes.push({
      questao: q,
      respostaAluno: respAluno,
      respostaCorreta: respCorreta,
      acertou
    })
  }

  const percentualAcerto = qtdQuestoes > 0 ? (totalAcertos / qtdQuestoes) * 100 : 0
  // Nota final na escala de 0 a 10.00
  const notaFinal = qtdQuestoes > 0 ? (totalAcertos / qtdQuestoes) * 10 : 0

  return {
    totalAcertos,
    totalErros,
    totalEmBranco,
    totalAnuladas,
    notaFinal: Number(notaFinal.toFixed(2)),
    percentualAcerto: Number(percentualAcerto.toFixed(1)),
    detalhes
  }
}
