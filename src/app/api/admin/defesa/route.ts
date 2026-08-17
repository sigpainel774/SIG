import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Valida se o usuário solicitante é superadmin autenticado.
 */
async function checkSuperadmin(cookieStore: any) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }: any) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { authorized: false, user: null }

  const { data: func } = await supabaseAdmin
    .from('funcionarios')
    .select('id, nome, is_superadmin')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!func || !func.is_superadmin) {
    return { authorized: false, user }
  }

  return { authorized: true, user, funcionario: func }
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const { authorized } = await checkSuperadmin(cookieStore)

    if (!authorized) {
      return NextResponse.json({ error: 'Acesso restrito ao Superadmin' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') ?? '1', 10)
    const limit = parseInt(searchParams.get('limit') ?? '20', 10)
    const tipo = searchParams.get('tipo')
    const severidade = searchParams.get('severidade')
    const search = searchParams.get('search')
    const offset = (page - 1) * limit

    const now = new Date()
    const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const past7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // 1. Contagens para Métricas do Dashboard SOC
    const [
      { count: total24h },
      { count: total7d },
      { count: totalCriticos },
      { count: totalIpsBloqueados },
      { data: settings },
    ] = await Promise.all([
      (supabaseAdmin as any)
        .from('security_threat_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', past24h),
      (supabaseAdmin as any)
        .from('security_threat_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', past7d),
      (supabaseAdmin as any)
        .from('security_threat_logs')
        .select('*', { count: 'exact', head: true })
        .eq('severidade', 'CRITICA'),
      (supabaseAdmin as any)
        .from('security_ip_rules')
        .select('*', { count: 'exact', head: true })
        .eq('ativo', true)
        .eq('tipo_regra', 'BLOCK'),
      (supabaseAdmin as any).from('security_settings').select('*').limit(1).maybeSingle(),
    ])

    // 2. Distribuição por Categoria de Ameaça (últimos 7 dias)
    const { data: recentThreats } = await (supabaseAdmin as any)
      .from('security_threat_logs')
      .select('tipo_ataque, severidade, ip_origem')
      .gte('created_at', past7d)
      .limit(1000)

    const threatDistribution: Record<string, number> = {}
    const ipCounts: Record<string, number> = {}

    if (recentThreats) {
      for (const t of recentThreats) {
        threatDistribution[t.tipo_ataque] = (threatDistribution[t.tipo_ataque] ?? 0) + 1
        ipCounts[t.ip_origem] = (ipCounts[t.ip_origem] ?? 0) + 1
      }
    }

    const topAttackingIps = Object.entries(ipCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([ip, count]) => ({ ip, count }))

    // 3. Consulta Paginada de Logs com Filtros
    let query = (supabaseAdmin as any)
      .from('security_threat_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (tipo && tipo !== 'ALL') {
      query = query.eq('tipo_ataque', tipo)
    }
    if (severidade && severidade !== 'ALL') {
      query = query.eq('severidade', severidade)
    }
    if (search && search.trim() !== '') {
      query = query.or(`ip_origem.ilike.%${search.trim()}%,rota_alvo.ilike.%${search.trim()}%,email_tentativa.ilike.%${search.trim()}%`)
    }

    const { data: logs, count: totalLogs, error: logsError } = await query

    if (logsError) {
      throw logsError
    }

    // 4. Lista de Regras de IP ativas
    const { data: ipRules } = await (supabaseAdmin as any)
      .from('security_ip_rules')
      .select('*')
      .order('created_at', { ascending: false })

    return NextResponse.json({
      metrics: {
        total24h: total24h ?? 0,
        total7d: total7d ?? 0,
        totalCriticos: totalCriticos ?? 0,
        totalIpsBloqueados: totalIpsBloqueados ?? 0,
        threatDistribution,
        topAttackingIps,
      },
      settings: settings ?? {
        modo_operacao: 'ATIVO',
        limite_tentativas_login: 5,
        janela_tempo_minutos: 15,
        duracao_ban_minutos: 60,
      },
      logs: logs ?? [],
      totalLogs: totalLogs ?? 0,
      page,
      limit,
      totalPages: Math.ceil((totalLogs ?? 0) / limit),
      ipRules: ipRules ?? [],
    })
  } catch (err: any) {
    console.error('Erro na API /admin/defesa:', err)
    return NextResponse.json({ error: err.message ?? 'Erro ao carregar dados de segurança' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies()
    const { authorized } = await checkSuperadmin(cookieStore)

    if (!authorized) {
      return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })
    }

    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'ID e status são obrigatórios' }, { status: 400 })
    }

    const { error } = await (supabaseAdmin as any)
      .from('security_threat_logs')
      .update({ status })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Erro ao atualizar status do log:', err)
    return NextResponse.json({ error: err.message ?? 'Erro interno' }, { status: 500 })
  }
}
