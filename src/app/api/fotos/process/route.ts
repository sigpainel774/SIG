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

    let entity: string | null = null
    let id: string | null = null
    let originalPath: string | null = null
    let requestId: string | null = null
    let buffer: ArrayBuffer | null = null

    // Forçamos o uso de JSON. Não aceitamos mais multipart/form-data para evitar limite de 4.5MB da Vercel
    const body = await req.json().catch(() => ({}))
    entity = body.entity
    id = body.id
    originalPath = body.originalPath
    requestId = body.requestId

    if (!entity || !id || !originalPath || !['alunos', 'funcionarios'].includes(entity)) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    // Validação ABAC / RLS (Fundamental para segurança antes de usar supabaseAdmin)
    const { data: recordAuthCheck, error: rlsError } = await supabase
      .from(entity as 'alunos' | 'funcionarios')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (rlsError || !recordAuthCheck) {
      console.warn(`[API fotos/process] Acesso negado via RLS para entity ${entity} id ${id} por uid ${user.id}`)
      return NextResponse.json({ error: 'Você não tem permissão para editar a foto deste registro.' }, { status: 403 })
    }

    // Validar se o caminho bate EXATAMENTE com o contrato (Prevenção de cruzamento de fotos e diretórios falsos)
    // Contrato: temp/<uid>/<entity>/<id>/<requestId>.<ext>
    const pathParts = originalPath.split('/')
    if (pathParts.length < 5 || pathParts[1] !== user.id || pathParts[2] !== entity || pathParts[3] !== id) {
      console.warn(`[API fotos/process] Caminho original fraudulento ou inválido: ${originalPath}`)
      return NextResponse.json({ error: 'Caminho de arquivo inválido ou não autorizado.' }, { status: 400 })
    }

    // Baixar o arquivo temporário do bucket
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('fotos-originais')
      .download(originalPath)

    if (downloadError || !fileData) {
      console.error('[API fotos/process] Erro ao baixar original:', downloadError)
      return NextResponse.json({ error: 'Falha ao processar o arquivo enviado' }, { status: 500 })
    }

    buffer = await fileData.arrayBuffer()

    // Proteção contra "Imagem Bomba" (Decompression Bomb) e Validação MIME Real (ES-F8)
    try {
      const metadata = await sharp(Buffer.from(buffer)).metadata()
      
      const width = metadata.width || 0
      const height = metadata.height || 0
      const pixels = width * height
      
      // Limite de segurança de 40 Megapixels
      if (pixels > 40_000_000) {
        throw new Error('A imagem excede o limite máximo de 40 Megapixels permitidos para processamento.')
      }
      
      const format = metadata.format
      if (!['jpeg', 'png', 'webp', 'jpg'].includes(format || '')) {
        throw new Error(`Formato de imagem real não suportado: ${format}`)
      }
    } catch (metaErr: any) {
      console.error('[API fotos/process] Erro de validação de metadados (Imagem maliciosa ou corrompida):', metaErr)
      return NextResponse.json({ error: 'Imagem inválida, corrompida ou excede limites de segurança. ' + (metaErr.message || '') }, { status: 400 })
    }

    // 2. Processar com Sharp simultaneamente (Avatar e Visualização)
    // .rotate() garante que fotos tiradas em celulares (com EXIF Orientation) sejam rotacionadas corretamente
    let avatarBuffer: Buffer
    let visualizacaoBuffer: Buffer
    let originalOtimizadoBuffer: Buffer

    try {
      const [avBuf, visBuf, origBuf] = await Promise.all([
        sharp(Buffer.from(buffer!))
          .rotate()
          .resize(240, 320, { fit: 'cover', position: 'top' })
          .webp({ quality: 78, effort: 4 })
          .toBuffer(),
        sharp(Buffer.from(buffer!))
          .rotate()
          .resize(900, 1200, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 84, effort: 4 })
          .toBuffer(),
        sharp(Buffer.from(buffer!))
          .rotate()
          .resize(1600, 2133, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 88, effort: 4 })
          .toBuffer()
      ])
      avatarBuffer = avBuf
      visualizacaoBuffer = visBuf
      originalOtimizadoBuffer = origBuf
    } catch (sharpError) {
      console.error('[API fotos/process] Erro no processamento Sharp (arquivo inválido ou corrompido):', sharpError)
      // Tenta remover o arquivo temporário enviado se ele existiu
      if (originalPath) {
        await supabaseAdmin.storage.from('fotos-originais').remove([originalPath]).catch(() => {})
      }
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
        .upload(avatarPath, avatarBlob, { contentType: 'image/webp', upsert: false }),
      supabaseAdmin.storage
        .from('fotos-visualizacao')
        .upload(visualizacaoPath, visualizacaoBlob, { contentType: 'image/webp', upsert: false }),
      supabaseAdmin.storage
        .from('fotos-originais')
        .upload(finalOriginalPath, originalOtimizadoBlob, { contentType: 'image/webp', upsert: false })
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
      
      // Também remove a foto original temporária se ela existiu
      if (originalPath) {
        cleanupAttempts.push(supabaseAdmin.storage.from('fotos-originais').remove([originalPath]))
      }
      
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
        ...(originalPath ? [supabaseAdmin.storage.from('fotos-originais').remove([originalPath])] : [])
      ])
      
      return NextResponse.json({ error: 'Erro ao atualizar os registros de foto no banco de dados' }, { status: 500 })
    }

    // 7. Sucesso! Agora sim apaga a foto temporária e limpa as fotos antigas
    await Promise.allSettled([
      ...(originalPath ? [supabaseAdmin.storage.from('fotos-originais').remove([originalPath])] : []),
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
