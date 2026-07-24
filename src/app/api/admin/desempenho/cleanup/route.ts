import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { logAudit } from '@/lib/audit/audit-agent'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se o usuário é superadmin
    const { data: func, error: funcError } = await supabaseAdmin
      .from('funcionarios')
      .select('id, nome, email, is_superadmin')
      .eq('auth_user_id', user.id)
      .single()

    if (funcError || !func || !func.is_superadmin) {
      return NextResponse.json({ error: 'Acesso negado. Apenas ROOT/Superadmin pode executar a limpeza.' }, { status: 403 })
    }

    // Data de corte: 30 dias atrás
    const limitDate = new Date()
    limitDate.setDate(limitDate.getDate() - 30)

    const { data: deletedRows, error: deleteError } = await supabaseAdmin
      .from('performance_metrics')
      .delete()
      .lt('created_at', limitDate.toISOString())
      .select('id')

    if (deleteError) {
      console.error('Erro ao expurgar métricas de desempenho:', deleteError)
      return NextResponse.json({ error: 'Erro ao expurgar registros do banco' }, { status: 500 })
    }

    const count = deletedRows?.length ?? 0

    // Registrar auditoria da ação destrutiva realizada pelo ROOT
    await logAudit({
      supabase: supabaseAdmin,
      action: 'PURGE',
      entity: 'performance_metrics',
      entityId: 'SYSTEM_CLEANUP',
      oldData: { limitDate: limitDate.toISOString(), deletedCount: count },
      performedBy: {
        id: func.id,
        name: func.nome ?? 'Superadmin',
        email: func.email ?? user.email ?? 'root@sig.local',
        cargo: 'SUPERADMIN'
      }
    })

    return NextResponse.json({
      success: true,
      message: `Expurgo concluído com sucesso. ${count} registros limpos.`,
      deletedCount: count
    })
  } catch (err: any) {
    console.error('Erro inesperado no cleanup de performance:', err)
    return NextResponse.json({ error: err.message || 'Erro interno no servidor' }, { status: 500 })
  }
}
