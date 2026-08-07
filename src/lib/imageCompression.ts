/**
 * Utilitário de Compressão Client-Side para Anexos e Laudos do EMAEE / SIG
 * 
 * - Otimiza imagens (JPG, PNG, WEBP) reduzindo o tamanho em até 95%.
 * - Mantém resolução máxima de 1920px e qualidade 82% WebP (perfeita leitura de laudos).
 * - Realiza bypass seguro para PDFs e arquivos não suportados.
 * - Previne vazamentos de memória (Memory Leaks) liberando ObjectURLs.
 * - Fornece fallback transparente para o arquivo original em caso de erro no Canvas.
 */

export interface CompressionResult {
  file: File
  originalSize: number
  compressedSize: number
  savingsPercent: number
  wasCompressed: boolean
}

export interface CompressionOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  mimeType?: string
}

export async function compressImageBeforeUpload(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const originalSize = file.size

  // 1. Bypass seguro para arquivos que não são imagens (PDFs, DOCX, ZIP, etc.)
  if (!file.type || !file.type.startsWith('image/')) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      savingsPercent: 0,
      wasCompressed: false
    }
  }

  // Opções padrão otimizadas para leitura médica e pedagógica
  const maxWidth = options.maxWidth ?? 1920
  const maxHeight = options.maxHeight ?? 1920
  const quality = options.quality ?? 0.82
  const mimeType = options.mimeType ?? 'image/webp'

  let objectUrl: string | null = null

  try {
    objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.crossOrigin = 'anonymous'

    // Promise para carregamento da imagem
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = (err) => reject(err)
      img.src = objectUrl!
    })

    // Calcular novas dimensões mantendo o aspect ratio
    let width = img.naturalWidth || img.width
    let height = img.naturalHeight || img.height

    if (width > maxWidth || height > maxHeight) {
      if (width / height > maxWidth / maxHeight) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      } else {
        width = Math.round((width * maxHeight) / height)
        height = maxHeight
      }
    }

    // Criar Canvas 2D
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Não foi possível obter o contexto 2D do Canvas')
    }

    // Renderizar imagem no Canvas com alta qualidade de interpolação
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, width, height)

    // Converter para Blob (WebP por padrão)
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), mimeType, quality)
    })

    if (!blob) {
      throw new Error('Erro ao gerar Blob da imagem no Canvas')
    }

    // Se por algum motivo o Blob gerado for maior que o original (ex: imagem muito pequena), usa a original
    if (blob.size >= originalSize) {
      return {
        file,
        originalSize,
        compressedSize: originalSize,
        savingsPercent: 0,
        wasCompressed: false
      }
    }

    // Montar o novo arquivo File com extensão .webp
    const baseName = file.name.replace(/\.[^/.]+$/, '')
    const compressedFileName = `${baseName}.webp`
    const compressedFile = new File([blob], compressedFileName, {
      type: mimeType,
      lastModified: Date.now()
    })

    const compressedSize = compressedFile.size
    const savingsPercent = Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100))

    return {
      file: compressedFile,
      originalSize,
      compressedSize,
      savingsPercent,
      wasCompressed: true
    }

  } catch (error) {
    // Fallback transparente: se o Canvas falhar por qualquer motivo (RAM, browser antigo), usa a imagem original
    console.warn('[imageCompression] Erro ao comprimir imagem no client-side, usando arquivo original:', error)
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      savingsPercent: 0,
      wasCompressed: false
    }
  } finally {
    // Mitigação de Memory Leak: revogar a URL do objeto
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
    }
  }
}

/**
 * Utility helper para formatação amigável de bytes (ex: 8.4 MB, 320 KB)
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (!bytes || bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}
