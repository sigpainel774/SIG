import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    // 1. Validar autenticação usando o helper oficial do servidor
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // 2. Extrair parâmetros (entity, id, fileName, requestId)
    const { searchParams } = new URL(req.url)
    const entity = searchParams.get('entity')
    const fileName = searchParams.get('fileName')
    const id = searchParams.get('id')
    const requestId = searchParams.get('requestId') || Date.now().toString()

    if (!entity || !fileName || !id || !['alunos', 'funcionarios'].includes(entity)) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    // 3. Validação ABAC / RLS (Fundamental para segurança)
    // Usamos o client logado do usuário. Se a query retornar o registro, ele tem acesso.
    const { data: recordAuthCheck, error: rlsError } = await supabase
      .from(entity as 'alunos' | 'funcionarios')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (rlsError || !recordAuthCheck) {
      console.warn(`[API fotos/presigned-url] Acesso negado via RLS para entity ${entity} id ${id} por uid ${user.id}`)
      return NextResponse.json({ error: 'Você não tem permissão para editar a foto deste registro.' }, { status: 403 })
    }

    // 4. Sanitizar extensão
    const parts = fileName.split('.')
    const ext = parts.length > 1 ? parts.pop()?.toLowerCase() : 'webp'
    const safeExt = ext?.replace(/[^a-z0-9]/g, '') || 'webp'

    // 5. Gerar caminho único temporário
    // Formato: temp/<uid>/<entity>/<id>/<requestId>.<ext>
    const path = `temp/${user.id}/${entity}/${id}/${requestId}.${safeExt}`

    // 6. Criar Signed Upload URL no bucket fotos-originais
    const { data, error } = await supabaseAdmin.storage
      .from('fotos-originais')
      .createSignedUploadUrl(path)

    if (error) {
      console.error('[API fotos/presigned-url] Erro createSignedUploadUrl:', error)
      return NextResponse.json({ error: 'Erro ao gerar URL assinada para upload' }, { status: 500 })
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      path: data.path,
      token: data.token
    })

  } catch (error: any) {
    console.error('[API fotos/presigned-url] Erro:', error)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}
