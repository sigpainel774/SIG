import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

/**
 * Endpoint de Otimização e Sanitização Server-Side para Anexos do EMAEE
 * 
 * - Recebe uma imagem em Buffer / FormData
 * - Aplica .rotate() para correção automática da orientação EXIF do celular
 * - Converte para WebP com qualidade 82 (otimizada para leitura médica)
 * - Expurga metadados EXIF/GPS para conformidade LGPD
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    // Se for PDF ou outro tipo não imagem, ignora processamento Sharp e avisa
    if (!file.type || !file.type.startsWith('image/')) {
      return NextResponse.json({
        success: true,
        message: 'Arquivo mantido no formato original (não é imagem)',
        processed: false
      })
    }

    const buffer = await file.arrayBuffer()

    // Otimização e sanitização Sharp
    const processedBuffer = await sharp(Buffer.from(buffer))
      .rotate() // Autocorreção EXIF
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer()

    const originalSize = file.size
    const compressedSize = processedBuffer.byteLength
    const savingsPercent = Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100))

    return NextResponse.json({
      success: true,
      processed: true,
      originalSize,
      compressedSize,
      savingsPercent,
      mimeType: 'image/webp',
      fileName: file.name.replace(/\.[^/.]+$/, '.webp')
    })

  } catch (error: any) {
    console.error('[API /api/emaee/anexos/process] Erro ao otimizar anexo:', error)
    return NextResponse.json({ error: error.message || 'Erro ao processar anexo' }, { status: 500 })
  }
}
