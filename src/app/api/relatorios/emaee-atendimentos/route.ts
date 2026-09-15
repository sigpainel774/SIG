import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

// Status classificados por categoria (conforme migrations do EMAEE)
const STATUS_REALIZADOS = ['realizado']
const STATUS_NEGATIVOS = ['nao_realizado', 'justificado']
const STATUS_NEUTROS = ['feriado', 'recesso', 'remarcado']

const MESES_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function calcularDiasEspera(dataRef: string | null, created_at: string | null): number {
  const refStr = dataRef ?? created_at ?? new Date().toISOString()
  const diff = Date.now() - new Date(refStr).getTime()
  return Math.max(0, Math.floor(diff / 86400000))
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const anoParam = searchParams.get('ano')
    const escolaIdParam = searchParams.get('escolaId')

    const ano = anoParam ? parseInt(anoParam, 10) : new Date().getFullYear()
    const escolaId =
      escolaIdParam && escolaIdParam !== 'all' && escolaIdParam.trim() !== ''
        ? escolaIdParam
        : null

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Nao autorizado. Sessao invalida ou expirada.' }, { status: 401 })
    }

    let registrosQuery = (supabaseAdmin as any)
      .from('emaee_atendimentos_registros')
      .select(`
        id,
        status,
        data_atendimento,
        vinculo_id,
        emaee_especialidades_vinculadas!inner (
          id,
          especialidade,
          especialidade_outros,
          emaee_matriculas!inner (
            id,
            escola_atendimento_id,
            deleted_at
          )
        )
      `)
      .gte('data_atendimento', `${ano}-01-01`)
      .lte('data_atendimento', `${ano}-12-31`)
      .is('emaee_especialidades_vinculadas.emaee_matriculas.deleted_at', null)

    if (escolaId) {
      registrosQuery = registrosQuery.eq(
        'emaee_especialidades_vinculadas.emaee_matriculas.escola_atendimento_id',
        escolaId,
      )
    }

    const { data: registrosRaw, error: regError } = await registrosQuery

    if (regError) {
      console.error('[api/relatorios/emaee-atendimentos] Erro ao buscar registros:', regError)
      return NextResponse.json(
        { error: regError.message || 'Erro ao consultar registros de atendimentos.' },
        { status: 500 },
      )
    }

    const registros: any[] = registrosRaw || []

    let realizados = 0
    let negativos = 0
    let neutros = 0
    let pendentes = 0

    const porMesMap: Record<number, { realizados: number; negativos: number; neutros: number; pendentes: number }> = {}
    const porEspMap: Record<string, { realizados: number; negativos: number; neutros: number; pendentes: number }> = {}

    for (const reg of registros) {
      const status: string = reg.status || 'pendente'
      const dataAtend: string = reg.data_atendimento || ''
      const mesNum = dataAtend ? new Date(dataAtend + 'T00:00:00').getMonth() + 1 : 0

      const ev = reg.emaee_especialidades_vinculadas
      const espNome =
        ev?.especialidade === 'Outros' && ev?.especialidade_outros
          ? ev.especialidade_outros
          : ev?.especialidade || 'Outros'

      if (mesNum > 0 && !porMesMap[mesNum]) {
        porMesMap[mesNum] = { realizados: 0, negativos: 0, neutros: 0, pendentes: 0 }
      }
      if (!porEspMap[espNome]) {
        porEspMap[espNome] = { realizados: 0, negativos: 0, neutros: 0, pendentes: 0 }
      }

      if (STATUS_REALIZADOS.includes(status)) {
        realizados++
        if (mesNum > 0) porMesMap[mesNum].realizados++
        porEspMap[espNome].realizados++
      } else if (STATUS_NEGATIVOS.includes(status)) {
        negativos++
        if (mesNum > 0) porMesMap[mesNum].negativos++
        porEspMap[espNome].negativos++
      } else if (STATUS_NEUTROS.includes(status)) {
        neutros++
        if (mesNum > 0) porMesMap[mesNum].neutros++
        porEspMap[espNome].neutros++
      } else {
        pendentes++
        if (mesNum > 0) porMesMap[mesNum].pendentes++
        porEspMap[espNome].pendentes++
      }
    }

    const totalComputavel = realizados + negativos
    const taxaRealizacao = totalComputavel > 0 ? Math.round((realizados / totalComputavel) * 1000) / 10 : 0

    const porMes = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1
      const vals = porMesMap[m] || { realizados: 0, negativos: 0, neutros: 0, pendentes: 0 }
      const tot = vals.realizados + vals.negativos
      return {
        mes: MESES_PT[i],
        mes_num: m,
        realizados: vals.realizados,
        negativos: vals.negativos,
        neutros: vals.neutros,
        pendentes: vals.pendentes,
        taxa_realizacao: tot > 0 ? Math.round((vals.realizados / tot) * 1000) / 10 : null,
      }
    }).filter((m) => m.realizados + m.negativos + m.neutros + m.pendentes > 0)

    const porEspecialidade = Object.entries(porEspMap)
      .map(([especialidade, vals]) => {
        const tot = vals.realizados + vals.negativos
        return {
          especialidade,
          realizados: vals.realizados,
          negativos: vals.negativos,
          neutros: vals.neutros,
          pendentes: vals.pendentes,
          taxa_realizacao: tot > 0 ? Math.round((vals.realizados / tot) * 1000) / 10 : null,
        }
      })
      .sort((a, b) => b.realizados + b.negativos - (a.realizados + a.negativos))

    let filaQuery = (supabaseAdmin as any)
      .from('emaee_especialidades_vinculadas')
      .select(`
        id,
        especialidade,
        especialidade_outros,
        status,
        prioridade,
        data_solicitacao,
        created_at,
        ativo,
        emaee_matriculas!inner (
          id,
          escola_atendimento_id,
          deleted_at
        )
      `)
      .eq('ativo', true)
      .eq('status', 'FILA_ESPERA')
      .is('emaee_matriculas.deleted_at', null)

    if (escolaId) {
      filaQuery = filaQuery.eq('emaee_matriculas.escola_atendimento_id', escolaId)
    }

    const { data: filaRaw, error: filaError } = await filaQuery

    if (filaError) {
      console.warn('[api/relatorios/emaee-atendimentos] Falha nao-impeditiva ao buscar fila:', filaError)
    }

    const filaItems: any[] = filaRaw || []

    const filaEspMap: Record<
      string,
      { total: number; judicial: number; prioritario: number; normal: number; diasEspera: number[] }
    > = {}

    for (const item of filaItems) {
      const espNome =
        item.especialidade === 'Outros' && item.especialidade_outros
          ? item.especialidade_outros
          : item.especialidade || 'Outros'

      if (!filaEspMap[espNome]) {
        filaEspMap[espNome] = { total: 0, judicial: 0, prioritario: 0, normal: 0, diasEspera: [] }
      }

      filaEspMap[espNome].total++

      const prioridade = item.prioridade || 'NORMAL'
      if (prioridade === 'JUDICIAL') filaEspMap[espNome].judicial++
      else if (prioridade === 'PRIORITARIO') filaEspMap[espNome].prioritario++
      else filaEspMap[espNome].normal++

      const dias = calcularDiasEspera(item.data_solicitacao, item.created_at)
      filaEspMap[espNome].diasEspera.push(dias)
    }

    const filaEspera = Object.entries(filaEspMap)
      .map(([especialidade, vals]) => {
        const media =
          vals.diasEspera.length > 0
            ? Math.round(vals.diasEspera.reduce((s, d) => s + d, 0) / vals.diasEspera.length)
            : 0
        const maximo = vals.diasEspera.length > 0 ? Math.max(...vals.diasEspera) : 0
        return {
          especialidade,
          total_na_fila: vals.total,
          prioridade_judicial: vals.judicial,
          prioridade_prioritario: vals.prioritario,
          prioridade_normal: vals.normal,
          tempo_medio_espera_dias: media,
          aluno_mais_tempo_dias: maximo,
        }
      })
      .sort((a, b) => b.total_na_fila - a.total_na_fila)

    return NextResponse.json(
      {
        meta: {
          ano,
          escopo: escolaId ? 'Unidade Especifica' : 'Todas as Unidades EMAEE',
          gerado_em: new Date().toISOString(),
        },
        resumo: {
          total_registros: registros.length,
          realizados,
          negativos,
          neutros,
          pendentes,
          taxa_realizacao: taxaRealizacao,
        },
        por_mes: porMes,
        por_especialidade: porEspecialidade,
        fila_espera: filaEspera,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, s-maxage=180, stale-while-revalidate=60',
          'X-Report-Type': 'EMAEE-Atendimentos-Quality-LGPD',
        },
      },
    )
  } catch (err: any) {
    console.error('[api/relatorios/emaee-atendimentos] Erro interno:', err)
    return NextResponse.json({ error: 'Erro interno ao consolidar dados de atendimentos.' }, { status: 500 })
  }
}
