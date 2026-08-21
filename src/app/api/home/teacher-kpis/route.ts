import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import { getHojeBrasilia } from '@/lib/dateUtils'

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const escolaId = searchParams.get('escolaId')
  const funcionarioId = searchParams.get('funcionarioId')

  if (!escolaId || !funcionarioId || !UUID_REGEX.test(escolaId) || !UUID_REGEX.test(funcionarioId)) {
    return NextResponse.json({ error: 'escolaId e funcionarioId válidos (UUID) são obrigatórios' }, { status: 400 })
  }

  const supabase = await createClient()

  // Verificar autenticação
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const hoje = getHojeBrasilia()

  try {
    // Busca paralela dos vínculos, agenda e atividades de secretaria do professor
    const [vtRes, aulasHojeRes, ativRes] = await Promise.all([
      supabase
        .from('vinculos_turmas')
        .select('turma_id')
        .eq('funcionario_id', funcionarioId)
        .eq('escola_id', escolaId),

      supabase
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
        .order('horario_inicio'),

      supabase
        .from('atividades_secretaria')
        .select('id', { count: 'exact', head: true })
        .eq('professor_id', funcionarioId)
        .eq('escola_id', escolaId)
        .in('status', ['recebida', 'em_impressao'])
    ])

    if (vtRes.error) throw vtRes.error
    if (aulasHojeRes.error) throw aulasHojeRes.error

    const tIds = (vtRes.data ?? []).map((vt: { turma_id: string }) => vt.turma_id)

    let totalAlunos = 0
    let freqData: { agenda_aula_id: string | null; materia_id: string | null }[] = []

    if (tIds.length > 0) {
      const [aluRes, freqRes] = await Promise.all([
        supabase
          .from('alunos')
          .select('id', { count: 'exact', head: true })
          .in('turma_id', tIds)
          .is('deleted_at', null),

        supabase
          .from('frequencias')
          .select('agenda_aula_id, materia_id')
          .eq('escola_id', escolaId)
          .eq('data', hoje)
          .in('turma_id', tIds)
      ])

      if (!aluRes.error) totalAlunos = aluRes.count ?? 0
      if (!freqRes.error && freqRes.data) freqData = freqRes.data
    }

    // Processar chamadas pendentes
    const aulasAtivas = (aulasHojeRes.data ?? []).filter((a: { status: string }) => a.status !== 'cancelado')
    let chamadasPendentes = 0

    if (aulasAtivas.length > 0 && freqData.length > 0) {
      const frequenciasLancadas = new Set(
        freqData.map((f) => f.agenda_aula_id ?? f.materia_id)
      )

      chamadasPendentes = aulasAtivas.filter(
        (aula: { id: string; materia_id: string }) =>
          !frequenciasLancadas.has(aula.id) && !frequenciasLancadas.has(aula.materia_id)
      ).length
    } else if (aulasAtivas.length > 0) {
      chamadasPendentes = aulasAtivas.length
    }

    return NextResponse.json({
      kpi: {
        totalTurmas: tIds.length,
        totalAlunos,
        chamadasPendentes,
        atividadesImpressao: ativRes.count ?? 0,
      },
      aulasHoje: aulasHojeRes.data ?? [],
    })
  } catch (err) {
    console.error('[api/home/teacher-kpis] Erro:', err)
    return NextResponse.json({ error: 'Erro interno ao buscar dados do docente' }, { status: 500 })
  }
}
