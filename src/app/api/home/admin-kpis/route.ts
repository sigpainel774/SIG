import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const escolaId = searchParams.get('escolaId')

  if (!escolaId) {
    return NextResponse.json({ error: 'escolaId é obrigatório' }, { status: 400 })
  }

  const supabase = await createClient()

  // Verificar se o usuário está autenticado
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  // Formatar a data local respeitando o fuso horário de Brasília (UTC-3)
  const hoje = new Intl.DateTimeFormat('fr-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  try {
    const { data: kpiData, error: rpcError } = await (supabase as any).rpc('obter_admin_dashboard_kpis', {
      p_escola_id: escolaId
    })

    if (rpcError) throw rpcError

    return NextResponse.json(kpiData ?? {
      totalAlunos: 0,
      totalTurmas: 0,
      ocorrenciasMes: 0,
      transferenciasPendentes: 0,
      turmasComFrequenciaHoje: 0,
      totalTurmasAtivas: 0,
      atividadesPendentesSecretaria: 0,
    })
  } catch (err) {
    console.error('[api/home/admin-kpis] Erro:', err)
    return NextResponse.json({ error: 'Erro interno ao buscar KPIs' }, { status: 500 })
  }
}
