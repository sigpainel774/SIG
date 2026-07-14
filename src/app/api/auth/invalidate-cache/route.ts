import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabaseServer'
import { NextResponse } from 'next/server'

/**
 * POST /api/auth/invalidate-cache
 *
 * Invalida o cache de perfil de um funcionário específico via revalidateTag.
 * Deve ser chamado sempre que acessos, vínculos ou dados do funcionário forem modificados.
 *
 * Body JSON:
 *   { targetUserId?: string }  — UUID do auth.users. Se omitido, invalida o próprio usuário logado.
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  let targetUserId: string = user.id

  try {
    const body = await req.json()
    if (body?.targetUserId && typeof body.targetUserId === 'string') {
      targetUserId = body.targetUserId
    }
  } catch {
    // Body vazio ou inválido — invalida apenas o próprio usuário
  }

  revalidateTag(`perfil-${targetUserId}`, {})

  return NextResponse.json({ ok: true, invalidated: targetUserId })
}
