import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { logAudit } from '@/lib/audit/audit-agent'
import { revalidateTag } from 'next/cache'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
      return NextResponse.json(
        { error: 'Acesso negado: Apenas Superadmins podem alterar e-mails de acesso de usuários.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { authUserId, funcionarioId, novoEmail } = body ?? {}

    if (!funcionarioId || typeof funcionarioId !== 'string' || !UUID_REGEX.test(funcionarioId)) {
      return NextResponse.json(
        { error: 'O identificador do funcionário (funcionarioId) é inválido ou nulo.' },
        { status: 400 }
      )
    }

    if (!novoEmail || typeof novoEmail !== 'string') {
      return NextResponse.json({ error: 'O novo e-mail é obrigatório.' }, { status: 400 })
    }

    const cleanEmail = novoEmail.trim().toLowerCase()

    if (!EMAIL_REGEX.test(cleanEmail)) {
      return NextResponse.json({ error: 'O formato do novo e-mail é inválido.' }, { status: 400 })
    }

    // 1. Obter dados atuais do funcionário
    const { data: funcionarioAtual, error: funcError } = await supabaseAdmin
      .from('funcionarios')
      .select('id, nome, email, auth_user_id')
      .eq('id', funcionarioId)
      .maybeSingle()

    if (funcError || !funcionarioAtual) {
      return NextResponse.json({ error: 'Funcionário não encontrado no sistema.' }, { status: 404 })
    }

    const emailAnterior = funcionarioAtual.email

    if (emailAnterior?.toLowerCase() === cleanEmail) {
      return NextResponse.json(
        { error: 'O novo e-mail informado é idêntico ao e-mail já cadastrado.' },
        { status: 400 }
      )
    }

    // 2. Verificar se o e-mail já pertence a outro funcionário
    const { data: existingFunc } = await supabaseAdmin
      .from('funcionarios')
      .select('id')
      .eq('email', cleanEmail)
      .neq('id', funcionarioId)
      .maybeSingle()

    if (existingFunc) {
      return NextResponse.json(
        { error: 'Este e-mail já está em uso por outro funcionário cadastrado no sistema.' },
        { status: 409 }
      )
    }

    // 3. Atualizar ou reconciliar conta de autenticação (auth.users)
    const effectiveAuthUserId = authUserId || funcionarioAtual.auth_user_id

    if (effectiveAuthUserId && UUID_REGEX.test(effectiveAuthUserId)) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        effectiveAuthUserId,
        {
          email: cleanEmail,
          email_confirm: true, // Garante que o e-mail não fique em estado pendente de confirmação
        }
      )

      if (authError) {
        console.error('[update-email] Erro no Supabase Auth Admin:', authError.message)
        if (authError.message?.toLowerCase().includes('already') || authError.message?.toLowerCase().includes('duplicate')) {
          return NextResponse.json(
            { error: 'Este e-mail já está cadastrado no provedor de autenticação.' },
            { status: 409 }
          )
        }
        return NextResponse.json(
          { error: `Falha ao atualizar e-mail no provedor de autenticação: ${authError.message}` },
          { status: 500 }
        )
      }
    }

    // 4. Atualizar registro na tabela public.funcionarios
    const { error: updateDbError } = await supabaseAdmin
      .from('funcionarios')
      .update({
        email: cleanEmail,
        ...(effectiveAuthUserId ? { auth_user_id: effectiveAuthUserId } : {}),
      })
      .eq('id', funcionarioId)

    if (updateDbError) {
      console.error('[update-email] Erro ao atualizar public.funcionarios:', updateDbError.message)
      return NextResponse.json(
        { error: `Falha ao atualizar o cadastro do funcionário: ${updateDbError.message}` },
        { status: 500 }
      )
    }

    // 5. Invalidar cache de perfil
    if (effectiveAuthUserId) {
      try {
        revalidateTag(`perfil-${effectiveAuthUserId}`, {})
      } catch (cacheErr) {
        console.warn('[update-email] Aviso ao revalidar tag de cache:', cacheErr)
      }
    }

    // 6. Registrar log de auditoria
    await logAudit({
      supabase: supabaseAdmin,
      action: 'UPDATE',
      entity: 'auth.users (alteracao_email)',
      entityId: funcionarioId,
      oldData: { email: emailAnterior },
      newData: { email: cleanEmail, auth_user_id: effectiveAuthUserId ?? null },
      performedBy: {
        id: admin.id,
        name: admin.nome,
        email: admin.email,
        cargo: 'SUPERADMIN',
      },
    })

    return NextResponse.json({
      success: true,
      novoEmail: cleanEmail,
      message: `E-mail de acesso de ${funcionarioAtual.nome} alterado para "${cleanEmail}" com sucesso!`,
    })
  } catch (err: any) {
    console.error('[update-email] Erro inesperado:', err?.message || err)
    return NextResponse.json({ error: 'Erro interno ao processar alteração de e-mail.' }, { status: 500 })
  }
}
