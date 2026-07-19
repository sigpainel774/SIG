import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const escolaId = searchParams.get('escolaId')
  const funcionarioId = searchParams.get('funcionarioId')

  if (!escolaId || !funcionarioId) {
    return NextResponse.json({ error: 'escolaId e funcionarioId são obrigatórios' }, { status: 400 })
  }

  const supabase = await createClient()

  // Verificar autenticação
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const hoje = new Date().toISOString().split('T')[0]

  try {
    // 1. Turmas vinculadas ao docente nesta escola
    const { data: vtData, error: vtError } = await supabase
      .from('vinculos_turmas')
      .select('turma_id')
      .eq('funcionario_id', funcionarioId)
      .eq('escola_id', escolaId)

    if (vtError) throw vtError
    const tIds = (vtData ?? []).map((vt: { turma_id: string }) => vt.turma_id)

    // 2. Total de alunos nessas turmas
    let totalAlunos = 0
    if (tIds.length > 0) {
      const { count, error: aluError } = await supabase
        .from('alunos')
        .select('id', { count: 'exact', head: true })
        .in('turma_id', tIds)
        .is('deleted_at', null)

      if (aluError) throw aluError
      totalAlunos = count ?? 0
    }

    // 3. Agenda de aulas hoje
    const { data: aulasHojeData, error: ahError } = await supabase
      .from('agenda_aulas')
      .select(`
        id,
        horario_inicio,
        horario_fim,
        status,
        materia_id,
        turma_id,
        turmas:turma_id (nome),
        materias:materia_id (nome)
      `)
      .eq('professor_id', funcionarioId)
      .eq('escola_id', escolaId)
      .eq('data', hoje)
      .order('horario_inicio')

    if (ahError) throw ahError

    // 4. Calcular chamadas pendentes
    const aulasAtivas = (aulasHojeData ?? []).filter((a: { status: string }) => a.status !== 'cancelado')
    let chamadasPendentes = 0

    if (aulasAtivas.length > 0) {
      const { data: freqData } = await supabase
        .from('frequencias')
        .select('agenda_aula_id, materia_id')
        .eq('escola_id', escolaId)
        .eq('data', hoje)

      const frequenciasLancadas = new Set(
        (freqData ?? []).map((f: { agenda_aula_id: string | null; materia_id: string | null }) =>
          f.agenda_aula_id ?? f.materia_id
        )
      )

      chamadasPendentes = aulasAtivas.filter(
        (aula: { id: string; materia_id: string }) =>
          !frequenciasLancadas.has(aula.id) && !frequenciasLancadas.has(aula.materia_id)
      ).length
    }

    // 5. Atividades pendentes de impressão do docente
    const { count: atividadesCount, error: atError } = await supabase
      .from('atividades_secretaria')
      .select('id', { count: 'exact', head: true })
      .eq('professor_id', funcionarioId)
      .eq('escola_id', escolaId)
      .in('status', ['recebida', 'em_impressao'])

    if (atError) throw atError

    return NextResponse.json({
      kpi: {
        totalTurmas: tIds.length,
        totalAlunos,
        chamadasPendentes,
        atividadesImpressao: atividadesCount ?? 0,
      },
      aulasHoje: aulasHojeData ?? [],
    })
  } catch (err) {
    console.error('[api/home/teacher-kpis] Erro:', err)
    return NextResponse.json({ error: 'Erro interno ao buscar dados do docente' }, { status: 500 })
  }
}
