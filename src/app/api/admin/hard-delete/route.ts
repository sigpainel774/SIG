import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

type HardDeleteAction = 'funcionarios_sem_acesso' | 'turmas_arquivadas' | 'logs_90_dias'

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
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const body = await req.json()
    const action: HardDeleteAction = body.action

    let deletedCount = 0
    let description = ''

    if (action === 'funcionarios_sem_acesso') {
      description = 'Hard Delete: Funcionários sem acesso ativo'

      const { data: comAcesso } = await supabaseAdmin
        .from('acessos_usuarios')
        .select('funcionario_id')
        .eq('ativo', true)

      const idsComAcesso = (comAcesso ?? []).map(a => a.funcionario_id).filter(Boolean)

      let query = supabaseAdmin
        .from('funcionarios')
        .select('id')
        .is('deleted_at', null)

      if (idsComAcesso.length > 0) {
        query = query.not('id', 'in', `(${idsComAcesso.map(id => `'${id}'`).join(',')})`)
      }

      const { data: targets } = await query
      deletedCount = targets?.length ?? 0

      if (deletedCount > 0 && targets) {
        const targetIds = targets.map(t => t.id)
        await supabaseAdmin
          .from('funcionarios')
          .delete()
          .in('id', targetIds)
      }

    } else if (action === 'turmas_arquivadas') {
      description = 'Hard Delete: Turmas arquivadas (deleted_at preenchido)'

      const { data: turmasArquivadas } = await supabaseAdmin
        .from('turmas')
        .select('id')
        .not('deleted_at', 'is', null)

      const turmaIds = (turmasArquivadas ?? []).map(t => t.id)
      deletedCount = turmaIds.length

      if (turmaIds.length > 0) {
        await supabaseAdmin
          .from('turmas')
          .delete()
          .in('id', turmaIds)
      }

    } else if (action === 'logs_90_dias') {
      description = 'Hard Delete: Logs de acesso com mais de 90 dias'

      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 90)
      const cutoffISO = cutoff.toISOString()

      const { count } = await supabaseAdmin
        .from('access_logs')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', cutoffISO)

      deletedCount = count ?? 0

      if (deletedCount > 0) {
        await supabaseAdmin
          .from('access_logs')
          .delete()
          .lt('created_at', cutoffISO)
      }

    } else {
      return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
    }

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      user_id: admin.id ?? null,
      user_name: admin.nome ?? 'Superadmin',
      user_email: admin.email ?? '',
      action: 'PURGE',
      entity: action,
      entity_id: null,
      old_data: { deleted_count: deletedCount, description },
      new_data: null,
    })

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `${deletedCount} registro(s) excluído(s) com sucesso.`,
    })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[hard-delete]', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
