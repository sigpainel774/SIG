import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createClient } from '@/lib/supabaseServer'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { entity, id, originalPath } = await req.json()

    if (!entity || !id || !originalPath || !['alunos', 'funcionarios'].includes(entity)) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    // 1. Fazer o download do arquivo original enviado via Signed URL
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('fotos-originais')
      .download(originalPath)

    if (downloadError || !fileData) {
      console.error('[API fotos/process] Erro ao baixar original:', downloadError)
      return NextResponse.json({ error: 'Falha ao processar o arquivo enviado' }, { status: 500 })
    }

    const buffer = await fileData.arrayBuffer()

    // 2. Processar com Sharp simultaneamente (Avatar e Visualização)
    // .rotate() garante que fotos tiradas em celulares (com EXIF Orientation) sejam rotacionadas corretamente
    let avatarBuffer: Buffer
    let visualizacaoBuffer: Buffer
    let originalOtimizadoBuffer: Buffer

    try {
      const [avBuf, visBuf, origBuf] = await Promise.all([
        sharp(Buffer.from(buffer))
          .rotate()
          .resize(256, 256, { fit: 'cover', position: 'top' })
          .webp({ quality: 80, effort: 4 })
          .toBuffer(),
        sharp(Buffer.from(buffer))
          .rotate()
          .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 85, effort: 4 })
          .toBuffer(),
        sharp(Buffer.from(buffer))
          .rotate()
          .webp({ quality: 90 })
          .toBuffer()
      ])
      avatarBuffer = avBuf
      visualizacaoBuffer = visBuf
      originalOtimizadoBuffer = origBuf
    } catch (sharpError) {
      console.error('[API fotos/process] Erro no processamento Sharp (arquivo inválido ou corrompido):', sharpError)
      // Tenta remover o arquivo temporário enviado para não deixar lixo no storage
      await supabaseAdmin.storage.from('fotos-originais').remove([originalPath]).catch(() => {})
      return NextResponse.json({ error: 'Formato de imagem inválido ou corrompido' }, { status: 400 })
    }

    // 3. Montar os novos caminhos
    const timestamp = Date.now()
    const baseName = `${id}/foto_${timestamp}`
    const avatarPath = `${baseName}_avatar.webp`
    const visualizacaoPath = `${baseName}_vis.webp`
    const finalOriginalPath = `${baseName}_original.webp`

    // 4. Buscar caminhos antigos no banco para limpeza (ES-Storage-Bloat)
    const { data: oldRecord } = await supabaseAdmin
      .from(entity as 'alunos' | 'funcionarios')
      .select('foto_avatar_path, foto_visualizacao_path, foto_original_path')
      .eq('id', id)
      .maybeSingle()

    // 5. Encapsular buffers em Blobs nativos para evitar corrupção UTF-8 (EF BF BD)
    const avatarBlob = new Blob([new Uint8Array(avatarBuffer)], { type: 'image/webp' })
    const visualizacaoBlob = new Blob([new Uint8Array(visualizacaoBuffer)], { type: 'image/webp' })
    const originalOtimizadoBlob = new Blob([new Uint8Array(originalOtimizadoBuffer)], { type: 'image/webp' })

    // Upload simultâneo para os 3 buckets usando Promise.all e checagem de erros
    const [avatarRes, visualizacaoRes, originalRes] = await Promise.all([
      supabaseAdmin.storage
        .from('fotos-avatar')
        .upload(avatarPath, avatarBlob, { contentType: 'image/webp', upsert: true }),
      supabaseAdmin.storage
        .from('fotos-visualizacao')
        .upload(visualizacaoPath, visualizacaoBlob, { contentType: 'image/webp', upsert: true }),
      supabaseAdmin.storage
        .from('fotos-originais')
        .upload(finalOriginalPath, originalOtimizadoBlob, { contentType: 'image/webp', upsert: true })
    ])

    // Verificar se algum upload retornou erro
    const uploadErrors = [avatarRes.error, visualizacaoRes.error, originalRes.error].filter(Boolean)
    if (uploadErrors.length > 0) {
      console.error('[API fotos/process] Erro durante o upload de fotos ao Supabase Storage:', uploadErrors)
      
      // Rollback de segurança: remove arquivos da tentativa atual que possam ter sido gravados
      const cleanupAttempts = []
      if (!avatarRes.error) cleanupAttempts.push(supabaseAdmin.storage.from('fotos-avatar').remove([avatarPath]))
      if (!visualizacaoRes.error) cleanupAttempts.push(supabaseAdmin.storage.from('fotos-visualizacao').remove([visualizacaoPath]))
      if (!originalRes.error) cleanupAttempts.push(supabaseAdmin.storage.from('fotos-originais').remove([finalOriginalPath]))
      
      // Também remove a foto original temporária
      cleanupAttempts.push(supabaseAdmin.storage.from('fotos-originais').remove([originalPath]))
      
      await Promise.allSettled(cleanupAttempts)

      return NextResponse.json({ error: 'Erro ao fazer upload das versões otimizadas da foto' }, { status: 500 })
    }

    // 6. Atualizar o Banco de Dados com os novos caminhos ANTES de apagar os arquivos antigos
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nijjizpcodnjhvqwjuso.supabase.co'
    const publicVisUrl = `${supabaseUrl}/storage/v1/object/public/fotos-visualizacao/${visualizacaoPath}`

    const dbUpdate = {
      foto_url: publicVisUrl,
      foto_avatar_path: avatarPath,
      foto_visualizacao_path: visualizacaoPath,
      foto_original_path: finalOriginalPath,
      foto_updated_at: new Date().toISOString()
    }

    const { error: updateError } = await supabaseAdmin
      .from(entity as 'alunos' | 'funcionarios')
      .update(dbUpdate)
      .eq('id', id)

    if (updateError) {
      console.error('[API fotos/process] Erro ao atualizar BD:', updateError)
      
      // Rollback de segurança: remove arquivos recém-gravados no storage se a atualização do BD falhar
      await Promise.allSettled([
        supabaseAdmin.storage.from('fotos-avatar').remove([avatarPath]),
        supabaseAdmin.storage.from('fotos-visualizacao').remove([visualizacaoPath]),
        supabaseAdmin.storage.from('fotos-originais').remove([finalOriginalPath]),
        supabaseAdmin.storage.from('fotos-originais').remove([originalPath])
      ])
      
      return NextResponse.json({ error: 'Erro ao atualizar os registros de foto no banco de dados' }, { status: 500 })
    }

    // 7. Sucesso! Agora sim apaga a foto temporária e limpa as fotos antigas
    await Promise.allSettled([
      supabaseAdmin.storage.from('fotos-originais').remove([originalPath]),
      ...(oldRecord ? [
        oldRecord.foto_avatar_path && oldRecord.foto_avatar_path !== avatarPath ? supabaseAdmin.storage.from('fotos-avatar').remove([oldRecord.foto_avatar_path]) : Promise.resolve(),
        oldRecord.foto_visualizacao_path && oldRecord.foto_visualizacao_path !== visualizacaoPath ? supabaseAdmin.storage.from('fotos-visualizacao').remove([oldRecord.foto_visualizacao_path]) : Promise.resolve(),
        oldRecord.foto_original_path && oldRecord.foto_original_path !== finalOriginalPath ? supabaseAdmin.storage.from('fotos-originais').remove([oldRecord.foto_original_path]) : Promise.resolve()
      ] : [])
    ])


    return NextResponse.json({
      success: true,
      data: dbUpdate
    })

  } catch (error: any) {
    console.error('[API fotos/process] Erro crítico:', error)
    return NextResponse.json({ error: 'Erro interno durante processamento' }, { status: 500 })
  }
}
