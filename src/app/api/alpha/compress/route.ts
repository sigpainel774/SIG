import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // 1. Verificação estrita de Autenticação (ES-5)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado. Faça login para utilizar o módulo Alpha.' }, { status: 401 })
    }

    // 2. Parse do corpo da requisição JSON
    const body = await req.json().catch(() => ({}))
    const {
      imageBase64,
      filename = 'imagem',
      quality = 80,
      format = 'webp',
      maxWidth,
      maxHeight,
    } = body

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({ error: 'Nenhuma imagem enviada ou formato inválido.' }, { status: 400 })
    }

    // 3. Extrair dados brutos de Base64
    const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64
    const inputBuffer = Buffer.from(cleanBase64, 'base64')
    const originalSize = inputBuffer.byteLength

    // Proteção de tamanho inicial
    if (originalSize > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'O arquivo excede o limite máximo permitido de 25 MB.' }, { status: 400 })
    }

    // 4. Proteção contra "Imagem Bomba" (Decompression Bomb) e Validação de Metadados
    const metadata = await sharp(inputBuffer).metadata()
    const width = metadata.width || 0
    const height = metadata.height || 0
    const pixels = width * height

    if (pixels > 40_000_000) {
      return NextResponse.json(
        { error: 'A imagem excede a resolução máxima segura de 40 Megapixels permitida para processamento.' },
        { status: 400 }
      )
    }

    // 5. Configurar pipeline do Sharp
    let pipeline = sharp(inputBuffer).rotate() // Autocorreção EXIF

    if (maxWidth || maxHeight) {
      pipeline = pipeline.resize({
        width: maxWidth ? Number(maxWidth) : undefined,
        height: maxHeight ? Number(maxHeight) : undefined,
        fit: 'inside',
        withoutEnlargement: true,
      })
    }

    const q = Math.max(10, Math.min(100, Number(quality) || 80))
    let outputMime = 'image/webp'
    let outputExt = 'webp'

    switch (format.toLowerCase()) {
      case 'jpeg':
      case 'jpg':
        pipeline = pipeline.jpeg({ quality: q, mozjpeg: true })
        outputMime = 'image/jpeg'
        outputExt = 'jpg'
        break
      case 'png':
        pipeline = pipeline.png({ compressionLevel: Math.round(9 - (q / 100) * 9), effort: 7 })
        outputMime = 'image/png'
        outputExt = 'png'
        break
      case 'avif':
        pipeline = pipeline.avif({ quality: q, effort: 4 })
        outputMime = 'image/avif'
        outputExt = 'avif'
        break
      case 'webp':
      default:
        pipeline = pipeline.webp({ quality: q, effort: 4 })
        outputMime = 'image/webp'
        outputExt = 'webp'
        break
    }

    const processedBuffer = await pipeline.toBuffer()
    const compressedSize = processedBuffer.byteLength
    const savingsPercent = Math.max(
      0,
      Math.round(((originalSize - compressedSize) / originalSize) * 100)
    )

    const baseName = filename.replace(/\.[^/.]+$/, '')
    const outputFilename = `${baseName}.${outputExt}`
    const outputBase64 = `data:${outputMime};base64,${processedBuffer.toString('base64')}`

    return NextResponse.json({
      success: true,
      processedBase64: outputBase64,
      originalSize,
      compressedSize,
      savingsPercent,
      mimeType: outputMime,
      filename: outputFilename,
      width: metadata.width,
      height: metadata.height,
    })
  } catch (error: any) {
    console.error('[API /api/alpha/compress] Erro durante compressão:', error)
    return NextResponse.json(
      { error: error?.message || 'Falha ao processar e comprimir imagem.' },
      { status: 500 }
    )
  }
}
