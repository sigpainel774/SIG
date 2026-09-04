import { PDFDocument, rgb, degrees, StandardFonts, RGB } from 'pdf-lib'
import JSZip from 'jszip'

export type StampMode = 'text' | 'image' | 'pagination'

export type StampPosition =
  | 'center-diagonal'
  | 'center'
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'custom'

export type PageTarget = 'all' | 'first' | 'except-first' | 'range'

export interface StampOptions {
  mode: StampMode

  // Opções de Texto / Marca d'Água
  text: string
  fontSize: number
  colorHex: string
  opacity: number
  rotation: number
  position: StampPosition
  fontFamily: 'HelveticaBold' | 'Helvetica' | 'TimesRomanBold' | 'CourierBold'
  hasBorder: boolean
  borderPadding: number
  customX?: number
  customY?: number

  // Opções de Imagem (Selo / Rubrica / Brasão)
  imageFile?: File | null
  imageScale: number

  // Opções de Paginação
  paginationFormat: string // Ex: "Página {num} de {total}"
  paginationStart: number

  // Seleção de Páginas
  pageTarget: PageTarget
  customPageRange: string // Ex: "1-5, 8"
}

export const DEFAULT_STAMP_OPTIONS: StampOptions = {
  mode: 'text',
  text: 'CONFIDENCIAL',
  fontSize: 48,
  colorHex: '#dc2626',
  opacity: 0.35,
  rotation: 45,
  position: 'center-diagonal',
  fontFamily: 'HelveticaBold',
  hasBorder: true,
  borderPadding: 12,
  customX: 0,
  customY: 0,
  imageFile: null,
  imageScale: 0.4,
  paginationFormat: 'Página {num} de {total}',
  paginationStart: 1,
  pageTarget: 'all',
  customPageRange: '',
}

export const STAMP_PRESETS = [
  { label: 'CONFIDENCIAL', text: 'CONFIDENCIAL', color: '#dc2626', rotation: 45, opacity: 0.35, border: true },
  { label: 'APROVADO', text: 'APROVADO', color: '#16a34a', rotation: 0, opacity: 0.8, border: true },
  { label: 'HOMOLOGADO', text: 'HOMOLOGADO', color: '#2563eb', rotation: 0, opacity: 0.8, border: true },
  { label: 'CÓPIA NÃO CONTROLADA', text: 'CÓPIA NÃO CONTROLADA', color: '#ea580c', rotation: 45, opacity: 0.3, border: false },
  { label: 'SIG ALPHA - USO INTERNO', text: 'SIG ALPHA - USO INTERNO', color: '#4f46e5', rotation: 45, opacity: 0.25, border: false },
  { label: 'RASCUNHO / DRAFT', text: 'RASCUNHO / DRAFT', color: '#71717a', rotation: 45, opacity: 0.3, border: true },
  { label: 'CANCELADO', text: 'CANCELADO', color: '#b91c1c', rotation: -30, opacity: 0.7, border: true },
  { label: 'ORIGINAL', text: 'ORIGINAL AUTENTICADO', color: '#0284c7', rotation: 0, opacity: 0.85, border: true },
]

function hexToRgb(hex: string): RGB {
  let cleanHex = hex.replace('#', '')
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('')
  }
  const num = parseInt(cleanHex, 16) || 0
  const r = ((num >> 16) & 255) / 255
  const g = ((num >> 8) & 255) / 255
  const b = (num & 255) / 255
  return rgb(r, g, b)
}

function parsePageRange(rangeStr: string, totalPages: number): Set<number> {
  const result = new Set<number>()
  const parts = rangeStr.split(',').map((p) => p.trim()).filter(Boolean)

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map((s) => parseInt(s.trim(), 10))
      if (!isNaN(startStr) && !isNaN(endStr)) {
        const start = Math.max(1, Math.min(startStr, endStr))
        const end = Math.min(totalPages, Math.max(startStr, endStr))
        for (let i = start; i <= end; i++) {
          result.add(i)
        }
      }
    } else {
      const pageNum = parseInt(part, 10)
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        result.add(pageNum)
      }
    }
  }

  return result
}

function shouldApplyToPage(pageIndex: number, totalPages: number, options: StampOptions): boolean {
  const pageNum = pageIndex + 1

  switch (options.pageTarget) {
    case 'all':
      return true
    case 'first':
      return pageNum === 1
    case 'except-first':
      return pageNum > 1
    case 'range': {
      if (!options.customPageRange.trim()) return true
      const targetPages = parsePageRange(options.customPageRange, totalPages)
      return targetPages.has(pageNum)
    }
    default:
      return true
  }
}

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Aplica o carimbo, marca d'água ou paginação em um arquivo PDF.
 */
export async function applyStampToPdf(
  file: File,
  options: StampOptions,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer()
  const pdfDoc = await PDFDocument.load(arrayBuffer)

  // Carrega a fonte selecionada
  let font
  switch (options.fontFamily) {
    case 'Helvetica':
      font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      break
    case 'TimesRomanBold':
      font = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
      break
    case 'CourierBold':
      font = await pdfDoc.embedFont(StandardFonts.CourierBold)
      break
    case 'HelveticaBold':
    default:
      font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      break
  }

  // Prepara imagem se estiver no modo imagem
  let embeddedImage: any = null
  if (options.mode === 'image' && options.imageFile) {
    const imgBuffer = await options.imageFile.arrayBuffer()
    if (options.imageFile.type === 'image/png') {
      embeddedImage = await pdfDoc.embedPng(imgBuffer)
    } else if (options.imageFile.type === 'image/jpeg' || options.imageFile.type === 'image/jpg') {
      embeddedImage = await pdfDoc.embedJpg(imgBuffer)
    }
  }

  const pages = pdfDoc.getPages()
  const totalPages = pages.length
  const textColor = hexToRgb(options.colorHex)
  const now = new Date()
  const dataFormatada = now.toLocaleDateString('pt-BR')
  const horaFormatada = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  for (let i = 0; i < totalPages; i++) {
    const page = pages[i]
    const pageNum = i + options.paginationStart
    const { width, height } = page.getSize()

    if (!shouldApplyToPage(i, totalPages, options)) {
      continue
    }

    if (options.mode === 'pagination') {
      // ── MODO PAGINAÇÃO ──
      const pagText = options.paginationFormat
        .replace(/{num}/g, String(pageNum))
        .replace(/{total}/g, String(totalPages))
        .replace(/{data}/g, dataFormatada)
        .replace(/{hora}/g, horaFormatada)
        .replace(/{arquivo}/g, file.name)

      const fontSize = options.fontSize || 10
      const textWidth = font.widthOfTextAtSize(pagText, fontSize)
      const textHeight = font.heightAtSize(fontSize)
      const margin = 28

      let x = (width - textWidth) / 2
      let y = margin

      if (options.position === 'bottom-right') {
        x = width - textWidth - margin
        y = margin
      } else if (options.position === 'bottom-left') {
        x = margin
        y = margin
      } else if (options.position === 'top-center') {
        x = (width - textWidth) / 2
        y = height - margin - textHeight
      } else if (options.position === 'top-right') {
        x = width - textWidth - margin
        y = height - margin - textHeight
      }

      page.drawText(pagText, {
        x,
        y,
        size: fontSize,
        font,
        color: textColor,
        opacity: options.opacity,
      })
    } else if (options.mode === 'image' && embeddedImage) {
      // ── MODO CARIMBO POR IMAGEM ──
      const imgDims = embeddedImage.scale(options.imageScale)
      const margin = 30

      let x = (width - imgDims.width) / 2
      let y = (height - imgDims.height) / 2

      switch (options.position) {
        case 'top-left':
          x = margin
          y = height - imgDims.height - margin
          break
        case 'top-right':
          x = width - imgDims.width - margin
          y = height - imgDims.height - margin
          break
        case 'bottom-left':
          x = margin
          y = margin
          break
        case 'bottom-right':
          x = width - imgDims.width - margin
          y = margin
          break
        case 'custom':
          x = (options.customX ?? 0)
          y = (options.customY ?? 0)
          break
        case 'center':
        case 'center-diagonal':
        default:
          x = (width - imgDims.width) / 2
          y = (height - imgDims.height) / 2
          break
      }

      page.drawImage(embeddedImage, {
        x,
        y,
        width: imgDims.width,
        height: imgDims.height,
        opacity: options.opacity,
        rotate: degrees(options.rotation || 0),
      })
    } else {
      // ── MODO TEXTO / MARCA D'ÁGUA ──
      const renderedText = options.text
        .replace(/{data}/g, dataFormatada)
        .replace(/{hora}/g, horaFormatada)
        .replace(/{num}/g, String(pageNum))
        .replace(/{total}/g, String(totalPages))
        .replace(/{arquivo}/g, file.name)

      const fontSize = options.fontSize || 36
      const textWidth = font.widthOfTextAtSize(renderedText, fontSize)
      const textHeight = font.heightAtSize(fontSize)
      const padding = options.borderPadding || 10
      const margin = 36

      let x = (width - textWidth) / 2
      let y = (height - textHeight) / 2
      let rotation = options.rotation

      switch (options.position) {
        case 'center-diagonal':
          x = (width - textWidth) / 2
          y = (height - textHeight) / 2
          rotation = options.rotation || 45
          break
        case 'center':
          x = (width - textWidth) / 2
          y = (height - textHeight) / 2
          rotation = options.rotation || 0
          break
        case 'top-left':
          x = margin
          y = height - textHeight - margin
          break
        case 'top-center':
          x = (width - textWidth) / 2
          y = height - textHeight - margin
          break
        case 'top-right':
          x = width - textWidth - margin
          y = height - textHeight - margin
          break
        case 'bottom-left':
          x = margin
          y = margin
          break
        case 'bottom-center':
          x = (width - textWidth) / 2
          y = margin
          break
        case 'bottom-right':
          x = width - textWidth - margin
          y = margin
          break
        case 'custom':
          x = options.customX ?? (width - textWidth) / 2
          y = options.customY ?? (height - textHeight) / 2
          break
      }

      // Desenhar caixa de borda (efeito carimbo físico) se habilitado e sem rotação complexa
      if (options.hasBorder) {
        const boxWidth = textWidth + padding * 2
        const boxHeight = textHeight + padding * 1.5
        const boxX = x - padding
        const boxY = y - padding * 0.75

        page.drawRectangle({
          x: boxX,
          y: boxY,
          width: boxWidth,
          height: boxHeight,
          borderColor: textColor,
          borderWidth: 2,
          opacity: options.opacity,
          rotate: degrees(rotation),
        })
      }

      page.drawText(renderedText, {
        x,
        y,
        size: fontSize,
        font,
        color: textColor,
        opacity: options.opacity,
        rotate: degrees(rotation),
      })
    }

    if (onProgress) {
      onProgress(Math.round(((i + 1) / totalPages) * 100))
    }
    await yieldToMain()
  }

  const pdfBytes = await pdfDoc.save()
  return new Blob([pdfBytes as any], { type: 'application/pdf' })
}

/**
 * Aplica carimbo em múltiplos PDFs e gera um arquivo ZIP compacto.
 */
export async function applyStampToMultiplePdfs(
  files: File[],
  options: StampOptions,
  onProgress?: (pct: number) => void
): Promise<{ files: { name: string; blob: Blob; url: string }[]; zipBlob?: Blob }> {
  const processedFiles: { name: string; blob: Blob; url: string }[] = []
  const zip = new JSZip()
  const total = files.length

  for (let i = 0; i < total; i++) {
    const file = files[i]
    const stampedBlob = await applyStampToPdf(file, options)
    const baseName = file.name.replace(/\.pdf$/i, '')
    const stampedName = `${baseName}_carimbado.pdf`

    const url = URL.createObjectURL(stampedBlob)
    processedFiles.push({ name: stampedName, blob: stampedBlob, url })

    zip.file(stampedName, stampedBlob)

    if (onProgress) {
      onProgress(Math.round(((i + 1) / total) * 100))
    }
    await yieldToMain()
  }

  let zipBlob: Blob | undefined
  if (files.length > 1) {
    zipBlob = await zip.generateAsync({ type: 'blob' })
  }

  return { files: processedFiles, zipBlob }
}
