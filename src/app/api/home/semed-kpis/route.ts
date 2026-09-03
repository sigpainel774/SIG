import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import { getInicioMesBrasilia } from '@/lib/dateUtils'

export interface SemedKPIData {
  totalAlunos: number
  totalEscolas: number
  totalTurmas: number
  totalProfessores: number
  transferenciasPendentes: number
  ocorrenciasMes: number
  calendarioPublicado: boolean
  anoLetivo: number
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const secretariaId = searchParams.get('secretariaId')

  if (!secretariaId) {
    return NextResponse.json({ error: 'secretariaId é obrigatório' }, { status: 400 })
  }

  const supabase = await createClient()

  // Verificar se o usuário está autenticado
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const inicioMes = getInicioMesBrasilia()
  const currentYear = new Date().getFullYear()

  try {
    // 1. Obter lista de IDs das escolas ativas da secretaria
    const { data: escolasData, error: escolasError } = await supabase
      .from('escolas')
      .select('id')
      .eq('secretaria_id', secretariaId)
      .eq('ativo', true)
      .eq('is_teste', false)
      .is('deleted_at', null)

    if (escolasError) {
      console.error('[api/home/semed-kpis] Erro ao buscar escolas:', escolasError)
      throw escolasError
    }

    const escolaIds = (escolasData ?? []).map((e: any) => e.id)
    const totalEscolas = escolaIds.length

    if (escolaIds.length === 0) {
      return NextResponse.json({
        totalAlunos: 0,
        totalEscolas: 0,
        totalTurmas: 0,
        totalProfessores: 0,
        transferenciasPendentes: 0,
        ocorrenciasMes: 0,
        calendarioPublicado: false,
        anoLetivo: currentYear,
      })
    }

    // 2. Consultas em paralelo com dados 100% reais do banco
    const [
      alunosRes,
      turmasRes,
      professoresRes,
      transfAlunosRes,
      transfFuncRes,
      ocorrenciasRes,
      calendarioRes,
    ] = await Promise.all([
      // Total de alunos da rede
      supabase
        .from('alunos')
        .select('id', { count: 'exact', head: true })
        .in('escola_id', escolaIds)
        .is('deleted_at', null),

      // Total de turmas ativas da rede
      supabase
        .from('turmas')
        .select('id', { count: 'exact', head: true })
        .in('escola_id', escolaIds)
        .is('deleted_at', null),

      // Total de professores com vínculo ativo nas escolas da rede
      supabase
        .from('vinculos_funcionarios')
        .select('funcionario_id')
        .in('escola_id', escolaIds)
        .eq('ativo', true)
        .ilike('cargo', '%profess%')
        .limit(10000),

      // Transferências de alunos pendentes na rede
      supabase
        .from('transferencias_alunos')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pendente')
        .or(`escola_origem_id.in.(${escolaIds.join(',')}),escola_destino_id.in.(${escolaIds.join(',')})`),

      // Transferências de funcionários pendentes na rede
      supabase
        .from('transferencias_funcionarios')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pendente')
        .or(`escola_origem_id.in.(${escolaIds.join(',')}),escola_destino_id.in.(${escolaIds.join(',')})`),

      // Ocorrências da rede registradas no mês corrente
      supabase
        .from('ocorrencias')
        .select('id', { count: 'exact', head: true })
        .in('escola_id', escolaIds)
        .gte('created_at', inicioMes),

      // Status do calendário acadêmico da secretaria para o ano corrente
      supabase
        .from('calendarios_academicos')
        .select('publicado, ano_letivo')
        .eq('secretaria_id', secretariaId)
        .eq('ano_letivo', currentYear)
        .eq('ativo', true)
        .maybeSingle(),
    ])

    // Professores únicos ativos
    const profIdsSet = new Set((professoresRes.data ?? []).map((p: any) => p.funcionario_id))
    const totalProfessores = profIdsSet.size

    const totalAlunos = alunosRes.count ?? 0
    const totalTurmas = turmasRes.count ?? 0
    const transferenciasPendentes = (transfAlunosRes.count ?? 0) + (transfFuncRes.count ?? 0)
    const ocorrenciasMes = ocorrenciasRes.count ?? 0
    const calendarioPublicado = Boolean(calendarioRes.data?.publicado)

    const kpiData: SemedKPIData = {
      totalAlunos,
      totalEscolas,
      totalTurmas,
      totalProfessores,
      transferenciasPendentes,
      ocorrenciasMes,
      calendarioPublicado,
      anoLetivo: currentYear,
    }

    return NextResponse.json(kpiData)
  } catch (err) {
    console.error('[api/home/semed-kpis] Erro ao consolidar KPIs da SEMED:', err)
    return NextResponse.json({ error: 'Erro interno ao buscar KPIs da SEMED' }, { status: 500 })
  }
}
