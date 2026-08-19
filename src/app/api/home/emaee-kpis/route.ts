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

  try {
    // 1. Total de pacientes/alunos com matrícula ativa no EMAEE
    const { count: totalPacientes } = await supabase
      .from('emaee_matriculas')
      .select('id', { count: 'exact', head: true })
      .eq('escola_atendimento_id', escolaId)
      .is('deleted_at', null)
      .neq('status', 'FILA_ESPERA')
      .neq('status', 'DESLIGADO')

    // 2. Fila de Espera / Triagem
    const { count: filaEspera } = await supabase
      .from('emaee_matriculas')
      .select('id', { count: 'exact', head: true })
      .eq('escola_atendimento_id', escolaId)
      .is('deleted_at', null)
      .eq('status', 'FILA_ESPERA')

    // 3. Profissionais / Servidores vinculados à unidade EMAEE
    const { count: profissionaisAee } = await supabase
      .from('vinculos_funcionarios')
      .select('id', { count: 'exact', head: true })
      .eq('escola_id', escolaId)
      .eq('ativo', true)

    // 4. Solicitações de Relatórios de Escolas pendentes
    const { count: relatoriosPendentes } = await supabase
      .from('emaee_solicitacoes_relatorios')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pendente')

    return NextResponse.json({
      totalPacientes: totalPacientes ?? 0,
      filaEspera: filaEspera ?? 0,
      profissionaisAee: profissionaisAee ?? 0,
      relatoriosPendentes: relatoriosPendentes ?? 0,
    })
  } catch (err) {
    console.error('[api/home/emaee-kpis] Erro:', err)
    return NextResponse.json({ error: 'Erro interno ao buscar KPIs do EMAEE' }, { status: 500 })
  }
}
