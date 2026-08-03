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

  const hoje = new Intl.DateTimeFormat('fr-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  try {
    // 1. Total de profissionais / servidores ativos na unidade de saúde
    const { count: totalProfissionais } = await supabase
      .from('vinculos_funcionarios')
      .select('id', { count: 'exact', head: true })
      .eq('escola_id', escolaId)
      .eq('ativo', true)

    // 2. Escalas / plantões de serviço programados para hoje
    const { count: escalasHoje } = await supabase
      .from('escalas_servico')
      .select('id', { count: 'exact', head: true })
      .eq('escola_id', escolaId)
      .eq('data', hoje)

    // 3. Atestados médicos registrados no mês
    const { count: atestadosMes } = await supabase
      .from('atestados')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', inicioMes)

    // 4. Documentos oficiais / solicitações ativas
    const { count: documentosMes } = await supabase
      .from('solicitacoes_rh')
      .select('id', { count: 'exact', head: true })

    return NextResponse.json({
      totalProfissionais: totalProfissionais ?? 0,
      escalasHoje: escalasHoje ?? 0,
      atestadosMes: atestadosMes ?? 0,
      documentosMes: documentosMes ?? 0,
    })
  } catch (err) {
    console.error('[api/home/saude-kpis] Erro:', err)
    return NextResponse.json({ error: 'Erro interno ao buscar KPIs de Saúde' }, { status: 500 })
  }
}
