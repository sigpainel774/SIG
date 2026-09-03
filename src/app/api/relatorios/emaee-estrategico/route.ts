import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

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

    // 3. Garantir a acurácia demográfica de "Zona de Residência dos Pacientes"
    // Como a unidade do EMAEE situa-se na zona urbana, a RPC original contava localizacao_atendimento.
    // Aqui garantimos que a aba de Demografia reflita a zona residencial real dos alunos atendidos.
    if (data && data.logistica) {
      try {
        let demografiaQuery = supabaseAdmin
          .from('emaee_matriculas')
          .select(`
            data_matricula,
            status,
            alunos!inner (
              zona_residencial,
              dados_matricula
            )
          `)
          .is('deleted_at', null)
          .in('status', ['ATIVO', 'FILA_ESPERA', 'EM_INVESTIGACAO'])

        if (escolaId) {
          demografiaQuery = demografiaQuery.eq('escola_atendimento_id', escolaId)
        }

        if (ano) {
          demografiaQuery = demografiaQuery
            .gte('data_matricula', `${ano}-01-01`)
            .lte('data_matricula', `${ano}-12-31`)
        }

        const { data: demografiaData, error: demografiaError } = await demografiaQuery

        if (!demografiaError && demografiaData && demografiaData.length > 0) {
          let zonaRuralCount = 0
          let zonaUrbanaCount = 0

          demografiaData.forEach((m: any) => {
            const al = m.alunos
            const dm = al?.dados_matricula || {}
            const z = (al?.zona_residencial || dm?.zona_residencial || dm?.zona || dm?.zonaResidencial || 'Urbana').trim().toLowerCase()
            if (z === 'rural') {
              zonaRuralCount++
            } else {
              zonaUrbanaCount++
            }
          })

          data.logistica.zona_rural = zonaRuralCount
          data.logistica.zona_urbana = zonaUrbanaCount
        }
      } catch (errDemografia) {
        console.warn('[api/relatorios/emaee-estrategico] Falha não impeditiva ao apurar zona de residência:', errDemografia)
      }
    }

    // 4. Retornar resposta com cabeçalhos de cache privado e tempo de revalidação
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
