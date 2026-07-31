import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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
    .single()

  if (!funcionario?.is_superadmin) return null
  return funcionario
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAuthenticatedSuperadmin()
    if (!admin) {
      return NextResponse.json({ error: 'Não autorizado. Acesso restrito a Superadmins.' }, { status: 403 })
    }

    const body = await req.json()
    const { version, message } = body

    if (!version || typeof version !== 'string') {
      return NextResponse.json({ error: 'Versão inválida' }, { status: 400 })
    }

    const updateMsg = message && typeof message === 'string' && message.trim()
      ? message.trim()
      : 'Uma nova versão do SIG foi disponibilizada. O sistema será atualizado automaticamente em instantes.'

    const now = new Date().toISOString()

    // 1. Upsert pwa_version
    const { error: errVersion } = await (supabaseAdmin.from('system_config' as any) as any)
      .upsert(
        {
          chave: 'pwa_version',
          valor: version.trim(),
          descricao: 'Versão atual do PWA — alterar força atualização em todos os dispositivos',
          updated_by: admin.id || null,
          updated_at: now,
        },
        { onConflict: 'chave' }
      )

    if (errVersion) throw errVersion

    // 2. Upsert pwa_update_message
    const { error: errMsg } = await (supabaseAdmin.from('system_config' as any) as any)
      .upsert(
        {
          chave: 'pwa_update_message',
          valor: updateMsg,
          descricao: 'Mensagem exibida no modal de atualização obrigatória',
          updated_by: admin.id || null,
          updated_at: now,
        },
        { onConflict: 'chave' }
      )

    if (errMsg) throw errMsg

    // 3. Registrar Audit Log
    await supabaseAdmin.from('audit_logs').insert({
      user_id: admin.id || null,
      user_name: admin.nome || 'Superadmin',
      user_email: admin.email || 'admin@super.com',
      action: 'UPDATE',
      entity: 'system_config (PWA_UPDATE)',
      entity_id: 'pwa_version',
      old_data: null,
      new_data: { version: version.trim(), message: updateMsg, triggered_at: now },
    })

    return NextResponse.json({
      success: true,
      version: version.trim(),
      message: updateMsg,
      updated_at: now,
      updated_by_name: admin.nome,
    })

  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Erro interno do servidor'
    console.error('[pwa-update-api]', error)
    return NextResponse.json({ error: errMessage }, { status: 500 })
  }
}
