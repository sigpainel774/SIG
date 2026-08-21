import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import { getHojeBrasilia } from '@/lib/dateUtils'

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

  const hoje = getHojeBrasilia()

  try {
    const { data: stats, error: rpcError } = await (supabase as any).rpc('obter_multi_escolas_stats', {
      p_funcionario_id: funcionarioId,
      p_escola_ids: escolaIdsValidos,
    })

    if (rpcError) {
      if (rpcError.message?.includes('Acesso negado') || rpcError.code === 'P0001') {
        return NextResponse.json({ error: rpcError.message || 'Acesso negado para as estatísticas solicitadas' }, { status: 403 })
      }
      throw rpcError
    }

    return NextResponse.json({ stats: stats ?? {} })
  } catch (err) {
    console.error('[api/home/school-stats] Erro:', err)
    return NextResponse.json({ error: 'Erro interno ao buscar estatísticas das escolas' }, { status: 500 })
  }
}
