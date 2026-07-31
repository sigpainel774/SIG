import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          }
        }
      }
    )

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
    const [avatarBuffer, visualizacaoBuffer] = await Promise.all([
      sharp(Buffer.from(buffer))
        .resize(256, 256, { fit: 'cover', position: 'top' })
        .webp({ quality: 80, effort: 4 })
        .toBuffer(),
      sharp(Buffer.from(buffer))
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85, effort: 4 })
        .toBuffer()
    ])

    // 3. Montar os novos caminhos
    const timestamp = Date.now()
    const baseName = `${id}/foto_${timestamp}`
    const avatarPath = `${baseName}_avatar.webp`
    const visualizacaoPath = `${baseName}_vis.webp`
    
    // O originalPath já está num folder 'temp/userid/', vamos movê-lo para o path final ou deixá-lo lá.
    // É melhor manter organizado. O upload final da original pode ser copiado.
    const finalOriginalPath = `${baseName}_original.webp`
    
    // Processar o original também para WebP, economiza muito espaço do bucket privado
    const originalOtimizadoBuffer = await sharp(Buffer.from(buffer))
        .webp({ quality: 90 })
        .toBuffer()

    // 4. Buscar caminhos antigos no banco para limpeza (ES-Storage-Bloat)
    const { data: oldRecord } = await supabaseAdmin
      .from(entity as 'alunos' | 'funcionarios')
      .select('foto_avatar_path, foto_visualizacao_path, foto_original_path')
      .eq('id', id)
      .maybeSingle()

    // 5. Upload simultâneo para os 3 buckets usando Promise.all
    await Promise.all([
      supabaseAdmin.storage
        .from('fotos-avatar')
        .upload(avatarPath, avatarBuffer, { contentType: 'image/webp', upsert: true }),
      supabaseAdmin.storage
        .from('fotos-visualizacao')
        .upload(visualizacaoPath, visualizacaoBuffer, { contentType: 'image/webp', upsert: true }),
      supabaseAdmin.storage
        .from('fotos-originais')
        .upload(finalOriginalPath, originalOtimizadoBuffer, { contentType: 'image/webp', upsert: true })
    ])

    // 6. Deletar a foto temporária enviada via Signed URL (limpeza)
    await supabaseAdmin.storage.from('fotos-originais').remove([originalPath])

    // 7. Deletar as fotos antigas (limpeza do lixo ES-Storage-Bloat)
    if (oldRecord) {
      const pathsToDeleteAvatar = oldRecord.foto_avatar_path ? [oldRecord.foto_avatar_path] : []
      const pathsToDeleteVis = oldRecord.foto_visualizacao_path ? [oldRecord.foto_visualizacao_path] : []
      const pathsToDeleteOrig = oldRecord.foto_original_path ? [oldRecord.foto_original_path] : []
      
      const deletes = []
      if (pathsToDeleteAvatar.length > 0) deletes.push(supabaseAdmin.storage.from('fotos-avatar').remove(pathsToDeleteAvatar))
      if (pathsToDeleteVis.length > 0) deletes.push(supabaseAdmin.storage.from('fotos-visualizacao').remove(pathsToDeleteVis))
      if (pathsToDeleteOrig.length > 0) deletes.push(supabaseAdmin.storage.from('fotos-originais').remove(pathsToDeleteOrig))
      
      await Promise.allSettled(deletes)
    }

    // 8. Atualizar o Banco de Dados com os novos caminhos
    const dbUpdate = {
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
      throw updateError
    }

    return NextResponse.json({
      success: true,
      data: dbUpdate
    })

  } catch (error: any) {
    console.error('[API fotos/process] Erro crítico:', error)
    return NextResponse.json({ error: 'Erro interno durante processamento' }, { status: 500 })
  }
}
