import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { logAudit } from '@/lib/audit/audit-agent'
import { revalidateTag } from 'next/cache'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function getAuthenticatedSuperadmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: funcionario } = await supabaseAdmin
    .from('funcionarios')
    .select('id, nome, email, is_superadmin')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!funcionario?.is_superadmin) return null
  return funcionario
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAuthenticatedSuperadmin()
    if (!admin) {
      return NextResponse.json({ error: 'Acesso negado: Apenas Superadmins podem redefinir senhas.' }, { status: 403 })
    }

    const body = await req.json()
    const { authUserId, funcionarioId, novaSenha } = body ?? {}

    if (!authUserId || typeof authUserId !== 'string' || !UUID_REGEX.test(authUserId)) {
      return NextResponse.json({ error: 'O identificador da conta (authUserId) é inválido ou nulo.' }, { status: 400 })
    }

    if (!novaSenha || typeof novaSenha !== 'string' || novaSenha.length < 6) {
      return NextResponse.json({ error: 'A nova senha deve possuir no mínimo 6 caracteres.' }, { status: 400 })
    }

    // 1. Atualizar a senha no auth.users via Supabase Admin SDK
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      authUserId,
      { password: novaSenha }
    )

    if (authError) {
      console.error('[reset-password] Erro no Supabase Auth Admin:', authError.message)
      return NextResponse.json({ error: `Falha ao redefinir a senha no provedor de autenticação: ${authError.message}` }, { status: 500 })
    }

    // 2. Marcar primeiro_acesso = true para forçar troca de senha no próximo login
    const targetFuncId = funcionarioId || authUserId
    await supabaseAdmin
      .from('funcionarios')
      .update({ primeiro_acesso: true })
      .eq('auth_user_id', authUserId)

    // 3. Invalidar cache do perfil do usuário alvo
    try {
      revalidateTag(`perfil-${authUserId}`, {})
    } catch (cacheErr) {
      console.warn('[reset-password] Aviso ao revalidar tag de cache:', cacheErr)
    }

    // 4. Registrar auditoria (NUNCA incluir a senha nos metadados)
    await logAudit({
      supabase: supabaseAdmin,
      action: 'UPDATE',
      entity: 'auth.users (reset_senha)',
      entityId: targetFuncId,
      newData: { password_reset: true, primeiro_acesso: true },
      performedBy: {
        id: admin.id,
        name: admin.nome,
        email: admin.email,
        cargo: 'SUPERADMIN',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Senha redefinida com sucesso. O usuário precisará alterar a senha no próximo acesso.'
    })
  } catch (err: any) {
    console.error('[reset-password] Erro inesperado:', err?.message || err)
    return NextResponse.json({ error: 'Erro interno ao processar redefinição de senha.' }, { status: 500 })
  }
}
