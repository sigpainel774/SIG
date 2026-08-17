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

export async function GET() {
  try {
    const admin = await getAuthenticatedSuperadmin()
    if (!admin) {
      return NextResponse.json({ error: 'Não autorizado. Acesso restrito a Superadmins.' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('system_config')
      .select('chave, valor, updated_at, updated_by')
      .in('chave', ['pwa_version', 'pwa_update_message', 'pwa_stagger_seconds'])

    if (error) throw error

    const config = new Map((data ?? []).map((item) => [item.chave, item]))
    const versionConfig = config.get('pwa_version')

    let updatedByName: string | null = null
    if (versionConfig?.updated_by) {
      const { data: updatedBy } = await supabaseAdmin
        .from('funcionarios')
        .select('nome')
        .eq('id', versionConfig.updated_by)
        .maybeSingle()

      updatedByName = updatedBy?.nome ?? null
    }

    const parsedStagger = Number.parseInt(config.get('pwa_stagger_seconds')?.valor ?? '60', 10)

    return NextResponse.json({
      version: versionConfig?.valor ?? 'v13',
      message: config.get('pwa_update_message')?.valor ?? '',
      stagger_seconds: Number.isFinite(parsedStagger) ? parsedStagger : 60,
      updated_at: versionConfig?.updated_at ?? null,
      updated_by_name: updatedByName,
    })
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Erro interno do servidor'
    console.error('[pwa-update-api:get]', error)
    return NextResponse.json({ error: errMessage }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAuthenticatedSuperadmin()
    if (!admin) {
      return NextResponse.json({ error: 'Não autorizado. Acesso restrito a Superadmins.' }, { status: 403 })
    }

    const body = await req.json()
    const { version, message, staggerSeconds } = body

    if (!version || typeof version !== 'string') {
      return NextResponse.json({ error: 'Versão inválida' }, { status: 400 })
    }

    const updateMsg = message && typeof message === 'string' && message.trim()
      ? message.trim()
      : 'Uma nova versão do SIG foi disponibilizada. O sistema será atualizado automaticamente em instantes.'

    const staggerVal = typeof staggerSeconds === 'number' && !isNaN(staggerSeconds)
      ? String(Math.max(0, Math.min(300, staggerSeconds)))
      : '60'

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

    // 3. Upsert pwa_stagger_seconds
    const { error: errStagger } = await (supabaseAdmin.from('system_config' as any) as any)
      .upsert(
        {
          chave: 'pwa_stagger_seconds',
          valor: staggerVal,
          descricao: 'Intervalo máximo em segundos para distribuição do recarregamento PWA (jitter)',
          updated_by: admin.id || null,
          updated_at: now,
        },
        { onConflict: 'chave' }
      )

    if (errStagger) throw errStagger

    // 4. Registrar Audit Log
    await supabaseAdmin.from('audit_logs').insert({
      user_id: admin.id || null,
      user_name: admin.nome || 'Superadmin',
      user_email: admin.email || 'admin@super.com',
      action: 'UPDATE',
      entity: 'system_config (PWA_UPDATE)',
      entity_id: 'pwa_version',
      old_data: null,
      new_data: { version: version.trim(), message: updateMsg, stagger_seconds: staggerVal, triggered_at: now },
    })

    return NextResponse.json({
      success: true,
      version: version.trim(),
      message: updateMsg,
      stagger_seconds: staggerVal,
      updated_at: now,
      updated_by_name: admin.nome,
    })

  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Erro interno do servidor'
    console.error('[pwa-update-api]', error)
    return NextResponse.json({ error: errMessage }, { status: 500 })
  }
}
