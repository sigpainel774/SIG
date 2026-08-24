import { PDFDocument, rgb, degrees } from 'pdf-lib'

// Adiciona "yield" para a Main Thread para evitar congelamento
const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Converte um Array de arquivos (File) de imagem (JPG, PNG) num Blob PDF único.
 */
export async function createPdfFromImages(
  imageFiles: File[],
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create()

  let processed = 0
  for (const file of imageFiles) {
    const arrayBuffer = await file.arrayBuffer()
    let image
    
    // Suporte restrito a JPG e PNG pelo pdf-lib (Webp precisa ser convertido pra canvas no componente antes)
    if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
      image = await pdfDoc.embedJpg(arrayBuffer)
    } else if (file.type === 'image/png') {
      image = await pdfDoc.embedPng(arrayBuffer)
    } else {
      throw new Error(`Formato de imagem não suportado para geração nativa de PDF: ${file.type}. Apenas JPG e PNG são permitidos nativamente.`)
    }

    const { width, height } = image.scale(1)
    
    // Adiciona página do tamanho exato da imagem
    const page = pdfDoc.addPage([width, height])
    page.drawImage(image, {
      x: 0,
      y: 0,
      width,
      height,
    })

    processed++
    if (onProgress) {
      onProgress(Math.round((processed / imageFiles.length) * 100))
    }
    
    // Yield to main para não travar a tela
    await yieldToMain()
  }

  const pdfBytes = await pdfDoc.save()
  return new Blob([pdfBytes], { type: 'application/pdf' })
}

/**
 * Mescla múltiplos PDFs em um único PDF.
 */
export async function mergePdfs(
  pdfFiles: File[],
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const mergedPdf = await PDFDocument.create()

  let processed = 0
  for (const file of pdfFiles) {
    const arrayBuffer = await file.arrayBuffer()
    const pdfToMerge = await PDFDocument.load(arrayBuffer)
    
    const copiedPages = await mergedPdf.copyPages(pdfToMerge, pdfToMerge.getPageIndices())
    
    for (const page of copiedPages) {
      mergedPdf.addPage(page)
    }

    processed++
    if (onProgress) {
      onProgress(Math.round((processed / pdfFiles.length) * 100))
    }
    await yieldToMain()
  }

  const pdfBytes = await mergedPdf.save()
  return new Blob([pdfBytes], { type: 'application/pdf' })
}
