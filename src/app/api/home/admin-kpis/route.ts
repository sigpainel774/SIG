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
    const [
      { count: totalAlunos },
      { count: totalTurmas },
      { count: ocorrenciasMes },
      { count: transferenciasPendentes },
      { count: atividadesPendentes },
      rpcTurmasHoje,
      { data: todasTurmas },
    ] = await Promise.all([
      // 1. Total de alunos ativos
      supabase
        .from('alunos')
        .select('id', { count: 'exact', head: true })
        .eq('escola_id', escolaId)
        .is('deleted_at', null),

      // 2. Total de turmas ativas
      supabase
        .from('turmas')
        .select('id', { count: 'exact', head: true })
        .eq('escola_id', escolaId)
        .is('deleted_at', null),

      // 3. Ocorrências do mês
      supabase
        .from('ocorrencias')
        .select('id', { count: 'exact', head: true })
        .eq('escola_id', escolaId)
        .gte('created_at', inicioMes),

      // 4. Transferências pendentes (escola como destino)
      supabase
        .from('transferencias_alunos')
        .select('id', { count: 'exact', head: true })
        .eq('escola_destino_id', escolaId)
        .eq('status', 'pendente'),

      // 5. Atividades pendentes de impressão na secretaria
      supabase
        .from('atividades_secretaria')
        .select('id', { count: 'exact', head: true })
        .eq('escola_id', escolaId)
        .in('status', ['recebida', 'em_impressao']),

      // 6. Turmas com frequência registrada hoje (RPC)
      (supabase as any).rpc('obter_turmas_com_frequencia_hoje', {
        p_escola_id: escolaId,
        p_data: hoje
      }),

      // 7. Todas as turmas ativas (denominador para % de frequência)
      supabase
        .from('turmas')
        .select('id')
        .eq('escola_id', escolaId)
        .is('deleted_at', null),
    ])

    if (rpcTurmasHoje.error) throw rpcTurmasHoje.error
    const turmasComFreq = rpcTurmasHoje.data ?? 0

    return NextResponse.json({
      totalAlunos: totalAlunos ?? 0,
      totalTurmas: totalTurmas ?? 0,
      ocorrenciasMes: ocorrenciasMes ?? 0,
      transferenciasPendentes: transferenciasPendentes ?? 0,
      turmasComFrequenciaHoje: turmasComFreq,
      totalTurmasAtivas: todasTurmas?.length ?? 0,
      atividadesPendentesSecretaria: atividadesPendentes ?? 0,
    })
  } catch (err) {
    console.error('[api/home/admin-kpis] Erro:', err)
    return NextResponse.json({ error: 'Erro interno ao buscar KPIs' }, { status: 500 })
  }
}
