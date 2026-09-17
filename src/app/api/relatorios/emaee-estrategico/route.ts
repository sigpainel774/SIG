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

    // 3. Recalcular e Desagregar a Epidemiologia com Normalização Inteligente de CIDs & Detalhes de Investigação
    if (data) {
      try {
        let matQuery = supabaseAdmin
          .from('emaee_matriculas')
          .select(`
            id,
            aluno_id,
            status,
            data_matricula,
            cid_codigo,
            outros_transtornos,
            principal_queixa,
            transtorno_tea,
            transtorno_outros,
            def_intelectual,
            def_baixa_visao,
            def_cegueira,
            def_auditiva,
            def_surdez,
            def_surdocegueira,
            def_fisica,
            def_multipla,
            condicoes_saude,
            escola_origem_nome,
            escola_regular_id,
            escolas:escola_regular_id(id, nome),
            alunos:aluno_id(id, nome, data_nascimento, zona_residencial, dados_matricula),
            emaee_especialidades_vinculadas(id, especialidade, especialidade_outros, ativo, profissional_id)
          `)
          .is('deleted_at', null)
          .in('status', ['ATIVO', 'EM_INVESTIGACAO'])

        if (escolaId) {
          matQuery = matQuery.eq('escola_atendimento_id', escolaId)
        }

        if (ano) {
          matQuery = matQuery
            .gte('data_matricula', `${ano}-01-01`)
            .lte('data_matricula', `${ano}-12-31`)
        }

        const { data: matriculas, error: matError } = await matQuery

        if (!matError && matriculas) {
          const counts = {
            total_base: matriculas.length,
            tea: 0,
            tdah: 0,
            def_intelectual: 0,
            epilepsia: 0,
            transtorno_linguagem: 0,
            sindrome_down: 0,
            paralisia_cerebral: 0,
            dislexia: 0,
            disgrafia: 0,
            discalculia: 0,
            tod: 0,
            transtorno_conduta: 0,
            tpac: 0,
            ansiedade: 0,
            superdotacao: 0,
            def_visual: 0,
            def_auditiva: 0,
            def_fisica: 0,
            def_multipla: 0,
            em_investigacao: 0,
            outros: 0,
          }

          const casosInvestigacao: Array<{
            id: string
            aluno_id: string
            aluno_nome: string
            escola_nome: string
            status: string
            data_matricula: string
            suspeita_clinica: string
            especialidades: string[]
          }> = []

          matriculas.forEach((m: any) => {
            const cs = m.condicoes_saude || {}
            const rawCid = (m.cid_codigo || '').toUpperCase()
            const cleanCid = rawCid.replace(/\s+/g, '').replace(/[\.:]/g, '')
            const outros = (m.outros_transtornos || '').toUpperCase()
            const status = m.status || 'ATIVO'

            let hasExplicitCondition = false

            // TEA: boolean, json, cid F84 / 6A02, ou texto
            if (
              m.transtorno_tea ||
              cs.transtorno_tea?.selecionado ||
              cleanCid.includes('F84') ||
              cleanCid.includes('6A02') ||
              outros.includes('TEA') ||
              outros.includes('AUTIS')
            ) {
              counts.tea++
              hasExplicitCondition = true
            }

            // TDAH: json, cid F90 / 6A05, ou texto
            if (
              cs.tdah?.selecionado ||
              cleanCid.includes('F90') ||
              cleanCid.includes('6A05') ||
              outros.includes('TDAH') ||
              outros.includes('HIPERATIV')
            ) {
              counts.tdah++
              hasExplicitCondition = true
            }

            // Deficiência Intelectual: boolean, json, cid F70-F79 / 6A00 / 72, ou texto
            if (
              m.def_intelectual ||
              cs.deficiencia_intelectual?.selecionado ||
              cleanCid.includes('F70') ||
              cleanCid.includes('F71') ||
              cleanCid.includes('F72') ||
              cleanCid.includes('F73') ||
              cleanCid.includes('F79') ||
              cleanCid.includes('CID72') ||
              cleanCid.includes('6A00') ||
              outros.includes('RETARDO') ||
              outros.includes('INTELECTUAL')
            ) {
              counts.def_intelectual++
              hasExplicitCondition = true
            }

            // Epilepsia / Distúrbios Convulsivos: json, cid G40, ou texto
            if (
              cs.epilepsia?.selecionado ||
              cleanCid.includes('G40') ||
              outros.includes('EPILEP') ||
              outros.includes('CONVULS')
            ) {
              counts.epilepsia++
              hasExplicitCondition = true
            }

            // Transtorno da Fala e Linguagem: json, cid F80, ou texto
            if (
              cs.transtorno_linguagem?.selecionado ||
              cleanCid.includes('F80') ||
              outros.includes('LINGUAGEM') ||
              outros.includes('FALA') ||
              outros.includes('TDL')
            ) {
              counts.transtorno_linguagem++
              hasExplicitCondition = true
            }

            // Síndrome de Down: json, cid Q90, ou texto
            if (
              cs.sindrome_down?.selecionado ||
              cleanCid.includes('Q90') ||
              outros.includes('DOWN') ||
              outros.includes('T21')
            ) {
              counts.sindrome_down++
              hasExplicitCondition = true
            }

            // Paralisia Cerebral: json, cid G80 / 80.1, ou texto
            if (
              cs.paralisia_cerebral?.selecionado ||
              cleanCid.includes('G80') ||
              cleanCid.includes('CID80') ||
              outros.includes('PARALISIA')
            ) {
              counts.paralisia_cerebral++
              hasExplicitCondition = true
            }

            // Dislexia: json ou cid F81.0
            if (cs.dislexia?.selecionado || cleanCid.includes('F810') || outros.includes('DISLEXIA')) {
              counts.dislexia++
              hasExplicitCondition = true
            }

            // Disgrafia / Disortografia: json ou cid F81.1
            if (
              cs.disgrafia_disortografia?.selecionado ||
              cleanCid.includes('F811') ||
              outros.includes('DISGRAFIA') ||
              outros.includes('DISORTOGRAFIA')
            ) {
              counts.disgrafia++
              hasExplicitCondition = true
            }

            // Discalculia: json ou cid F81.2
            if (cs.discalculia?.selecionado || cleanCid.includes('F812') || outros.includes('DISCALCULIA')) {
              counts.discalculia++
              hasExplicitCondition = true
            }

            // TOD: json ou cid F91.3
            if (cs.tod?.selecionado || cleanCid.includes('F913') || outros.includes('TOD') || outros.includes('OPOSITOR')) {
              counts.tod++
              hasExplicitCondition = true
            }

            // Transtorno de Conduta: json ou cid F91 (exceto se for apenas TOD já contabilizado)
            if (
              cs.transtorno_conduta?.selecionado ||
              (cleanCid.includes('F91') && !cleanCid.includes('F913')) ||
              outros.includes('CONDUTA')
            ) {
              counts.transtorno_conduta++
              hasExplicitCondition = true
            }

            // TPAC: json ou cid H93.25
            if (
              cs.tpac?.selecionado ||
              cleanCid.includes('H9325') ||
              cleanCid.includes('H932') ||
              outros.includes('TPAC') ||
              outros.includes('AUDITIVO CENTRAL')
            ) {
              counts.tpac++
              hasExplicitCondition = true
            }

            // Ansiedade: json ou cid F41
            if (cs.ansiedade?.selecionado || cleanCid.includes('F41') || outros.includes('ANSIEDADE')) {
              counts.ansiedade++
              hasExplicitCondition = true
            }

            // Altas Habilidades / Superdotação: json ou cid Z55
            if (
              cs.superdotacao?.selecionado ||
              cleanCid.includes('Z55') ||
              outros.includes('SUPERDOTA') ||
              outros.includes('ALTAS HABILIDADES')
            ) {
              counts.superdotacao++
              hasExplicitCondition = true
            }

            // Deficiência Visual
            if (m.def_baixa_visao || m.def_cegueira) {
              counts.def_visual++
              hasExplicitCondition = true
            }

            // Deficiência Auditiva
            if (m.def_auditiva || m.def_surdez || m.def_surdocegueira) {
              counts.def_auditiva++
              hasExplicitCondition = true
            }

            // Deficiência Física
            if (m.def_fisica) {
              counts.def_fisica++
              hasExplicitCondition = true
            }

            // Deficiência Múltipla
            if (m.def_multipla) {
              counts.def_multipla++
              hasExplicitCondition = true
            }

            // Em Investigação (Apenas confirmação clínica expressa ou status formal):
            const isInvestigacao =
              Boolean(cs.em_investigacao?.selecionado) ||
              status === 'EM_INVESTIGACAO'

            if (isInvestigacao) {
              counts.em_investigacao++

              const vinculosAtivos = (m.emaee_especialidades_vinculadas || [])
                .filter((v: any) => v.ativo !== false)
                .map((v: any) =>
                  v.especialidade === 'Outros' && v.especialidade_outros
                    ? v.especialidade_outros
                    : v.especialidade
                )

              const suspeita =
                (cs.em_investigacao?.cid && cs.em_investigacao.cid.trim()) ||
                (m.outros_transtornos && m.outros_transtornos.trim()) ||
                (m.principal_queixa && m.principal_queixa.trim()) ||
                'Aguardando avaliação médica especializada'

              casosInvestigacao.push({
                id: m.id,
                aluno_id: m.aluno_id,
                aluno_nome: m.alunos?.nome || 'Aluno não identificado',
                escola_nome: m.escolas?.nome || m.escola_origem_nome || 'Rede Municipal',
                status: m.status || 'EM_INVESTIGACAO',
                data_matricula: m.data_matricula,
                suspeita_clinica: suspeita,
                especialidades: Array.from(new Set(vinculosAtivos)),
              })
            } else if (!hasExplicitCondition) {
              counts.outros++
            }
          })

          data.epidemiologia = counts
          data.casos_investigacao = casosInvestigacao
        }
      } catch (errEpi) {
        console.warn('[api/relatorios/emaee-estrategico] Falha não impeditiva ao normalizar epidemiologia:', errEpi)
      }
    }

    // 4. Garantir a acurácia demográfica de "Zona de Residência dos Pacientes"
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
          .in('status', ['ATIVO', 'EM_INVESTIGACAO'])

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

    // 4. Apurar demanda granular por Especialidade (Atendimentos Ativos vs. Fila de Espera)
    if (data) {
      try {
        let espQuery = supabaseAdmin
          .from('emaee_especialidades_vinculadas')
          .select(`
            id,
            especialidade,
            especialidade_outros,
            status,
            ativo,
            profissional_id,
            emaee_matriculas!inner (
              id,
              escola_atendimento_id,
              data_matricula,
              status,
              deleted_at
            )
          `)
          .eq('ativo', true)
          .is('emaee_matriculas.deleted_at', null)

        if (escolaId) {
          espQuery = espQuery.eq('emaee_matriculas.escola_atendimento_id', escolaId)
        }

        if (ano) {
          espQuery = espQuery
            .gte('emaee_matriculas.data_matricula', `${ano}-01-01`)
            .lte('emaee_matriculas.data_matricula', `${ano}-12-31`)
        }

        const { data: espVinculos, error: espVinculosErr } = await espQuery

        if (!espVinculosErr && espVinculos) {
          const espMap: Record<
            string,
            {
              total_atendimentos: number
              total_profissionais: Set<string>
              pacientes_atendidos: Set<string>
              total_fila: number
            }
          > = {}

          // Inicializar com o que já veio da RPC para manter histórico de sessões
          if (Array.isArray(data.especialidades)) {
            data.especialidades.forEach((item: any) => {
              espMap[item.especialidade] = {
                total_atendimentos: item.total_atendimentos || 0,
                total_profissionais: new Set(),
                pacientes_atendidos: new Set(),
                total_fila: 0,
              }
            })
          }

          espVinculos.forEach((item: any) => {
            const espNome =
              (item.especialidade === 'Outros' && item.especialidade_outros
                ? item.especialidade_outros
                : item.especialidade) || 'Outros'

            if (!espMap[espNome]) {
              espMap[espNome] = {
                total_atendimentos: 0,
                total_profissionais: new Set(),
                pacientes_atendidos: new Set(),
                total_fila: 0,
              }
            }

            if (item.status === 'FILA_ESPERA') {
              espMap[espNome].total_fila++
            } else {
              if (item.profissional_id) {
                espMap[espNome].total_profissionais.add(item.profissional_id)
              }
              if (item.emaee_matriculas?.id) {
                espMap[espNome].pacientes_atendidos.add(item.emaee_matriculas.id)
              }
            }
          })

          const rpcEspecialidades = Array.isArray(data.especialidades) ? data.especialidades : []
          data.especialidades = Object.entries(espMap)
            .map(([especialidade, info]) => {
              const rpcItem = rpcEspecialidades.find((x: any) => x.especialidade === especialidade)
              return {
                especialidade,
                total_atendimentos:
                  rpcItem?.total_atendimentos ?? (info.total_atendimentos || info.pacientes_atendidos.size),
                total_profissionais: rpcItem?.total_profissionais ?? info.total_profissionais.size,
                pacientes_atendidos: rpcItem?.pacientes_atendidos ?? info.pacientes_atendidos.size,
                total_fila: info.total_fila,
              }
            })
            .sort(
              (a, b) =>
                b.total_atendimentos + b.total_fila - (a.total_atendimentos + a.total_fila),
            )
        }
      } catch (errEsp) {
        console.warn('[api/relatorios/emaee-estrategico] Falha não impeditiva ao apurar especialidades:', errEsp)
      }
    }

    // 5. Retornar resposta com cabeçalhos de cache privado e tempo de revalidação
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
