import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const anoParam = searchParams.get('ano')
    const escolaIdParam = searchParams.get('escolaId')

    const ano = anoParam ? parseInt(anoParam, 10) : null
    const escolaId = escolaIdParam && escolaIdParam !== 'all' && escolaIdParam.trim() !== '' ? escolaIdParam : null

    const supabase = await createClient()

    // 1. Validar autenticação da sessão do usuário
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado. Sessão inválida ou expirada.' }, { status: 401 })
    }

    // 2. Invocar a RPC de agregação estrutural com validação de segurança no banco
    const { data, error } = await (supabase as any).rpc('obter_relatorio_emaee_agregado', {
      p_ano: ano,
      p_escola_id: escolaId,
    })

    if (error) {
      console.error('[api/relatorios/emaee-estrategico] Erro ao invocar RPC:', error)
      return NextResponse.json(
        { error: error.message || 'Erro ao processar relatório estratégico do EMAEE.' },
        { status: error.code === '42501' ? 403 : 500 }
      )
    }

    // 3. Retornar resposta com cabeçalhos de cache privado e tempo de revalidação
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'private, s-maxage=300, stale-while-revalidate=60',
        'X-Report-Type': 'EMAEE-Strategic-Aggregated-LGPD',
      },
    })
  } catch (err: any) {
    console.error('[api/relatorios/emaee-estrategico] Erro interno:', err)
    return NextResponse.json({ error: 'Erro interno no servidor ao consolidar dados.' }, { status: 500 })
  }
}
