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
      targetFormat = 'webp',
      quality = 85,
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
    const q = Math.max(10, Math.min(100, Number(quality) || 85))

    let outputMime = 'image/webp'
    let outputExt = 'webp'

    switch (targetFormat.toLowerCase()) {
      case 'jpeg':
      case 'jpg':
        pipeline = pipeline.jpeg({ quality: q, mozjpeg: true })
        outputMime = 'image/jpeg'
        outputExt = 'jpg'
        break
      case 'png':
        pipeline = pipeline.png({ compressionLevel: 8 })
        outputMime = 'image/png'
        outputExt = 'png'
        break
      case 'avif':
        pipeline = pipeline.avif({ quality: q, effort: 4 })
        outputMime = 'image/avif'
        outputExt = 'avif'
        break
      case 'gif':
        pipeline = pipeline.gif()
        outputMime = 'image/gif'
        outputExt = 'gif'
        break
      case 'tiff':
      case 'tif':
        pipeline = pipeline.tiff({ quality: q })
        outputMime = 'image/tiff'
        outputExt = 'tiff'
        break
      case 'webp':
      default:
        pipeline = pipeline.webp({ quality: q, effort: 4 })
        outputMime = 'image/webp'
        outputExt = 'webp'
        break
    }

    const processedBuffer = await pipeline.toBuffer()
    const convertedSize = processedBuffer.byteLength

    const baseName = filename.replace(/\.[^/.]+$/, '')
    const outputFilename = `${baseName}.${outputExt}`
    const outputBase64 = `data:${outputMime};base64,${processedBuffer.toString('base64')}`

    return NextResponse.json({
      success: true,
      processedBase64: outputBase64,
      originalSize,
      convertedSize,
      targetFormat: outputExt,
      mimeType: outputMime,
      filename: outputFilename,
      width: metadata.width,
      height: metadata.height,
    })
  } catch (error: any) {
    console.error('[API /api/alpha/convert] Erro durante conversão:', error)
    return NextResponse.json(
      { error: error?.message || 'Falha ao converter imagem para o formato desejado.' },
      { status: 500 }
    )
  }
}
