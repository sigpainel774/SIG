'use client'

import * as pdfjsLib from 'pdfjs-dist'

// Evitar quebra no server-side rendering
if (typeof window !== 'undefined') {
  // Utilizar o unpkg para evitar problemas pesados de webpack/Next.js bundle com o worker
  // Esta é a abordagem mais segura para evitar travamentos de build em Vercel
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
}

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Converte um arquivo PDF em um Array de Blobs (Imagens PNG/JPG) usando Canvas.
 */
export async function convertPdfToImages(
  pdfFile: File,
  format: 'image/png' | 'image/jpeg' = 'image/png',
  scale: number = 2.0, // Multiplicador de resolução (2.0 = HQ)
  onProgress?: (percent: number) => void
): Promise<{ url: string; blob: Blob; pageNumber: number }[]> {
  
  const arrayBuffer = await pdfFile.arrayBuffer()
  const pdfDoc = await pdfjsLib.getDocument(arrayBuffer as any).promise
  
  const totalPages = pdfDoc.numPages
  const results: { url: string; blob: Blob; pageNumber: number }[] = []

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum)
    
    // Calcula o viewport com a escala solicitada
    const viewport = page.getViewport({ scale })
    
    // Prepara o canvas
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Não foi possível obter contexto do Canvas 2D')
      
    canvas.width = viewport.width
    canvas.height = viewport.height
    
    // Renderiza a página do PDF no Canvas
    const renderContext: any = {
      canvasContext: ctx,
      viewport: viewport,
    }
    await page.render(renderContext).promise
    
    // Converte canvas para Blob
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), format, 0.92)
    })

    if (blob) {
      const url = URL.createObjectURL(blob)
      results.push({ url, blob, pageNumber: pageNum })
    }
    
    if (onProgress) {
      onProgress(Math.round((pageNum / totalPages) * 100))
    }
    
    // Yield to main (UI respira)
    await yieldToMain()
  }

  return results
}
