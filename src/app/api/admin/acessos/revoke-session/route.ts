import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireSuperAdminApi } from '@/lib/authGuard'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdminApi(request)
    if (auth.response) {
      return auth.response
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
