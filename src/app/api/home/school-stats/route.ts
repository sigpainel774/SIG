import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const funcionarioId = searchParams.get('funcionarioId')
  const escolaIdsParam = searchParams.get('escolaIds')

  if (!funcionarioId || !escolaIdsParam || !UUID_REGEX.test(funcionarioId)) {
    return NextResponse.json(
      { error: 'funcionarioId e escolaIds válidos são obrigatórios' },
      { status: 400 }
    )
  }

  let escolaIds: string[]
  try {
    escolaIds = JSON.parse(escolaIdsParam)
    if (!Array.isArray(escolaIds) || escolaIds.length === 0) {
      return NextResponse.json({ error: 'escolaIds deve ser um array não vazio' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'escolaIds inválido (espera JSON array)' }, { status: 400 })
  }

  // Filtrar apenas UUIDs válidos
  const escolaIdsValidos = escolaIds.filter((id) => UUID_REGEX.test(id))
  if (escolaIdsValidos.length === 0) {
    return NextResponse.json({ error: 'Nenhum escolaId válido fornecido' }, { status: 400 })
  }

  const supabase = await createClient()

  // Verificar autenticação
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const hoje = new Date().toISOString().split('T')[0]

  try {
    // Processar todas as escolas em lote paralelo (M-1)
    const statsEntries = await Promise.all(
      escolaIdsValidos.map(async (escolaId) => {
        // Agrupar consultas por escola em Promise.all paralelo
        const [{ data: vtData }, { data: aulasHojeData }, { data: freqData }] = await Promise.all([
          supabase
            .from('vinculos_turmas')
            .select('turma_id')
            .eq('funcionario_id', funcionarioId)
            .eq('escola_id', escolaId),

          supabase
            .from('agenda_aulas')
            .select('id, materia_id')
            .eq('professor_id', funcionarioId)
            .eq('escola_id', escolaId)
            .eq('data', hoje)
            .neq('status', 'cancelado'),

          supabase
            .from('frequencias')
            .select('agenda_aula_id, materia_id')
            .eq('escola_id', escolaId)
            .eq('data', hoje)
        ])

        const turmasCount = vtData?.length ?? 0
        const aulasHojeCount = aulasHojeData?.length ?? 0

        let chamadasPendentes = 0
        if (aulasHojeCount > 0) {
          const frequenciasLancadas = new Set(
            (freqData ?? []).map(
              (f: { agenda_aula_id: string | null; materia_id: string | null }) =>
                f.agenda_aula_id ?? f.materia_id
            )
          )

          chamadasPendentes = (aulasHojeData ?? []).filter(
            (aula: { id: string; materia_id: string }) =>
              !frequenciasLancadas.has(aula.id) && !frequenciasLancadas.has(aula.materia_id)
          ).length
        }

        return [
          escolaId,
          { turmas: turmasCount, aulasHoje: aulasHojeCount, chamadasPendentes },
        ] as const
      })
    )

    const stats = Object.fromEntries(statsEntries)
    return NextResponse.json({ stats })
  } catch (err) {
    console.error('[api/home/school-stats] Erro:', err)
    return NextResponse.json({ error: 'Erro interno ao buscar estatísticas das escolas' }, { status: 500 })
  }
}
