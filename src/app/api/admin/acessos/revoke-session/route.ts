import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabaseServer = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Contexto Server Component
            }
          },
        },
      }
    )

    const { data: { user } } = await supabaseServer.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data: func } = await supabaseAdmin
      .from('funcionarios')
      .select('id, is_superadmin')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!func?.is_superadmin) {
      return NextResponse.json({ error: 'Acesso negado: Apenas Superadmins podem revogar sessões.' }, { status: 403 })
    }

    const { sessionId } = await request.json()
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId é obrigatório' }, { status: 400 })
    }

    const { error: rpcError } = await (supabaseAdmin as any).rpc('revoke_any_user_session_admin', {
      target_session_id: sessionId,
    })

    if (rpcError) {
      console.warn('RPC revoke_any_user_session_admin retornou aviso:', rpcError.message)
      const { error: deleteError } = await (supabaseAdmin as any)
        .from('sessions')
        .delete()
        .eq('id', sessionId)

      if (deleteError) {
        throw deleteError
      }
    }

    return NextResponse.json({ success: true, message: 'Sessão revogada com sucesso!' })
  } catch (error: any) {
    console.error('Erro ao revogar sessão:', error)
    return NextResponse.json({ error: error?.message || 'Falha ao revogar sessão' }, { status: 500 })
  }
}
