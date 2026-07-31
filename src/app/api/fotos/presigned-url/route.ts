import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    // 1. Validar autenticação
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

    // 2. Extrair parâmetros (entity = alunos ou funcionarios) e nome do arquivo
    const { searchParams } = new URL(req.url)
    const entity = searchParams.get('entity')
    const fileName = searchParams.get('fileName')

    if (!entity || !fileName || !['alunos', 'funcionarios'].includes(entity)) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    // 3. Sanitizar extensão
    const parts = fileName.split('.')
    const ext = parts.length > 1 ? parts.pop()?.toLowerCase() : 'jpg'
    const safeExt = ext?.replace(/[^a-z0-9]/g, '') || 'jpg'

    // 4. Gerar caminho único
    // Usamos 'temp' para indicar que ainda não foi processado pelo sharp
    const path = `temp/${user.id}/${Date.now()}_original.${safeExt}`

    // 5. Criar Signed Upload URL no bucket fotos-originais
    const { data, error } = await supabaseAdmin.storage
      .from('fotos-originais')
      .createSignedUploadUrl(path)

    if (error) {
      throw error
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
