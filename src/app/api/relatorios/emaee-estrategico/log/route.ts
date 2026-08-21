import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { acao = 'impressao', relatorio = 'emaee_estrategico', escopo = 'Rede Municipal de Sapeaçu' } = body

    const supabase = await createClient()

    // 1. Validar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // 2. Registrar log via RPC de segurança
    const { data, error } = await (supabase as any).rpc('registrar_log_acao_relatorio', {
      p_relatorio: relatorio,
      p_acao: acao,
      p_escopo: escopo,
    })

    if (error) {
      console.warn('[api/relatorios/emaee-estrategico/log] Falha ao registrar log:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, logged: data })
  } catch (err: any) {
    console.error('[api/relatorios/emaee-estrategico/log] Erro:', err)
    return NextResponse.json({ success: false, error: 'Erro interno ao registrar auditoria' }, { status: 500 })
  }
}
