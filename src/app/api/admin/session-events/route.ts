import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createClient } from '@/lib/supabaseServer'

function sanitizeUuid(id: any): string | null {
  if (!id || typeof id !== 'string') return null
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id.trim()) ? id.trim() : null
}

export async function POST(request: NextRequest) {
  try {
    let bodyData: any = null
    try {
      const text = await request.text()
      if (text) {
        bodyData = JSON.parse(text)
      }
    } catch {
      // Ignorar exceções de parseamento de payload mal formatado
    }

    if (!bodyData) {
      return NextResponse.json({ success: true, count: 0 })
    }

    const eventsArray: any[] = Array.isArray(bodyData)
      ? bodyData
      : Array.isArray(bodyData.events)
      ? bodyData.events
      : [bodyData]

    if (eventsArray.length === 0) {
      return NextResponse.json({ success: true, count: 0 })
    }

    // Mapear eventos com saneamento
    const batchToInsert = eventsArray
      .filter((evt) => evt && typeof evt.session_id === 'string' && evt.session_id.trim().length > 0)
      .slice(0, 100) // Limite por requisição para evitar sobrecarga
      .map((evt) => ({
        session_id: evt.session_id.trim(),
        funcionario_id: sanitizeUuid(evt.funcionario_id),
        escola_id: sanitizeUuid(evt.escola_id),
        event_type: typeof evt.event_type === 'string' ? evt.event_type : 'heartbeat',
        event_data: typeof evt.event_data === 'object' && evt.event_data !== null ? evt.event_data : {},
        created_at: evt.event_data?.timestamp ? new Date(evt.event_data.timestamp).toISOString() : new Date().toISOString(),
      }))

    if (batchToInsert.length === 0) {
      return NextResponse.json({ success: true, count: 0 })
    }

    const { error } = await (supabaseAdmin as any).from('session_events').insert(batchToInsert)

    if (error) {
      console.warn('[API session-events] Aviso ao persistir eventos de sessão:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, count: batchToInsert.length })
  } catch (err: any) {
    console.error('[API session-events] Exceção inesperada:', err)
    return NextResponse.json({ error: err?.message || 'Erro interno' }, { status: 500 })
  }
}

// GET: Buscar histórico de eventos de uma sessão específica ou sumário de sessões
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const funcionarioId = searchParams.get('funcionario_id')
    const mode = searchParams.get('mode')

    // 0. Modo Sessões Ativas Ao Vivo
    if (mode === 'active') {
      // Tenta via RPC primeiro
      try {
        const { data: rpcData, error: rpcErr } = await (supabaseAdmin as any).rpc('get_all_active_sessions_admin')
        if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
          return NextResponse.json({ active_sessions: rpcData })
        }
      } catch {
        // Ignorar e ir para query direta nos eventos de telemetria
      }

      // Query direta em eventos recentes (últimos 15 minutos)
      const recentThreshold = new Date(Date.now() - 15 * 60 * 1000).toISOString()
      const { data: recentEvents, error: evErr } = await (supabaseAdmin as any)
        .from('session_events')
        .select('session_id, funcionario_id, escola_id, event_type, event_data, created_at, funcionarios(id, nome, email, cargo, foto_url, auth_user_id), escolas(nome)')
        .gte('created_at', recentThreshold)
        .order('created_at', { ascending: false })
        .limit(500)

      if (!evErr && recentEvents && recentEvents.length > 0) {
        const activeMap = new Map<string, any>()
        recentEvents.forEach((e: any) => {
          const key = e.funcionario_id || e.session_id
          if (!activeMap.has(key)) {
            activeMap.set(key, {
              session_id: e.session_id,
              user_id: e.funcionarios?.auth_user_id || e.session_id,
              funcionario_id: e.funcionario_id,
              funcionario_nome: e.funcionarios?.nome || 'Usuário Online',
              funcionario_email: e.funcionarios?.email || '-',
              funcionario_cargo: e.funcionarios?.cargo || 'Servidor',
              escola_nome: e.escolas?.nome || 'Rede Municipal',
              foto_url: e.funcionarios?.foto_url || null,
              created_at: e.created_at,
              refreshed_at: e.created_at,
              current_pathname: e.event_data?.pathname || '/home',
              total_active_seconds_today: e.event_data?.active_time_seconds || 60,
              ip: null,
              user_agent: null,
            })
          }
        })
        return NextResponse.json({ active_sessions: Array.from(activeMap.values()) })
      }

      // Fallback em user_navigation_trail
      const { data: trailData } = await (supabaseAdmin as any)
        .from('user_navigation_trail')
        .select('session_id, user_id, funcionario_id, pathname, opened_at, duration_seconds, ip_address, user_agent, funcionarios(id, nome, email, cargo, foto_url)')
        .gte('opened_at', recentThreshold)
        .order('opened_at', { ascending: false })
        .limit(100)

      if (trailData && trailData.length > 0) {
        const activeMap = new Map<string, any>()
        trailData.forEach((t: any) => {
          const key = t.funcionario_id || t.user_id || t.session_id
          if (!activeMap.has(key)) {
            activeMap.set(key, {
              session_id: t.session_id || t.user_id,
              user_id: t.user_id,
              funcionario_id: t.funcionario_id,
              funcionario_nome: t.funcionarios?.nome || 'Usuário Online',
              funcionario_email: t.funcionarios?.email || '-',
              funcionario_cargo: t.funcionarios?.cargo || 'Servidor',
              escola_nome: 'Rede Municipal',
              foto_url: t.funcionarios?.foto_url || null,
              created_at: t.opened_at,
              refreshed_at: t.opened_at,
              current_pathname: t.pathname || '/home',
              total_active_seconds_today: t.duration_seconds || 30,
              ip: t.ip_address,
              user_agent: t.user_agent,
            })
          }
        })
        return NextResponse.json({ active_sessions: Array.from(activeMap.values()) })
      }

      return NextResponse.json({ active_sessions: [] })
    }

    // 1. Se informou session_id, retorna os eventos cronológicos daquela sessão para o Replay
    if (sessionId) {
      const { data, error } = await (supabaseAdmin as any).rpc('get_session_replay_events', {
        p_session_id: sessionId,
        p_limit: 1500,
      })

      if (error) {
        // Fallback para query direta caso a RPC não tenha sido aplicada no banco
        const { data: directEvents, error: directErr } = await (supabaseAdmin as any)
          .from('session_events')
          .select('id, session_id, funcionario_id, escola_id, event_type, event_data, created_at, funcionarios(nome), escolas(nome)')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true })
          .limit(1500)

        if (directErr) {
          console.error('[API session-events] Erro ao buscar eventos diretos:', directErr.message)
          return NextResponse.json({ error: directErr.message }, { status: 500 })
        }

        const formatted = (directEvents || []).map((e: any) => ({
          id: e.id,
          session_id: e.session_id,
          funcionario_id: e.funcionario_id,
          funcionario_nome: e.funcionarios?.nome || 'Usuário',
          escola_id: e.escola_id,
          escola_nome: e.escolas?.nome || 'Rede Municipal',
          event_type: e.event_type,
          event_data: e.event_data,
          created_at: e.created_at,
        }))

        return NextResponse.json({ events: formatted })
      }

      return NextResponse.json({ events: data || [] })
    }

    // 2. Caso contrário, retorna o sumário de sessões gravadas
    const { data: summaryData, error: summaryErr } = await (supabaseAdmin as any).rpc('get_recorded_sessions_summary', {
      p_start_date: startDate ? new Date(startDate).toISOString() : null,
      p_end_date: endDate ? new Date(endDate).toISOString() : null,
      p_funcionario_id: sanitizeUuid(funcionarioId),
      p_limit: 150,
    })

    if (summaryErr) {
      // Fallback query direta para sumário
      const { data: recentEvents } = await (supabaseAdmin as any)
        .from('session_events')
        .select('session_id, funcionario_id, event_type, event_data, created_at, funcionarios(nome, email, cargo), escolas(nome)')
        .order('created_at', { ascending: false })
        .limit(1000)

      // Agrupar manualmente no fallback
      const sessionMap = new Map<string, any>()
      ;(recentEvents || []).forEach((e: any) => {
        const sid = e.session_id
        if (!sessionMap.has(sid)) {
          sessionMap.set(sid, {
            session_id: sid,
            funcionario_id: e.funcionario_id,
            funcionario_nome: e.funcionarios?.nome || 'Usuário',
            funcionario_email: e.funcionarios?.email || '-',
            funcionario_cargo: e.funcionarios?.cargo || 'Servidor',
            escola_nome: e.escolas?.nome || 'Rede Municipal',
            total_events: 0,
            total_clicks: 0,
            total_errors: 0,
            first_event_at: e.created_at,
            last_event_at: e.created_at,
            duration_seconds: 0,
            last_pathname: e.event_data?.pathname || '/',
            avg_rtt: e.event_data?.rtt || 45,
          })
        }
        const item = sessionMap.get(sid)
        item.total_events += 1
        if (e.event_type === 'click') item.total_clicks += 1
        if (e.event_type === 'error') item.total_errors += 1
        if (new Date(e.created_at) < new Date(item.first_event_at)) item.first_event_at = e.created_at
        if (new Date(e.created_at) > new Date(item.last_event_at)) {
          item.last_event_at = e.created_at
          if (e.event_data?.pathname) item.last_pathname = e.event_data.pathname
        }
      })

      const summaryList = Array.from(sessionMap.values()).map((s) => ({
        ...s,
        duration_seconds: Math.max(0, Math.round((new Date(s.last_event_at).getTime() - new Date(s.first_event_at).getTime()) / 1000)),
      }))

      return NextResponse.json({ sessions: summaryList })
    }

    return NextResponse.json({ sessions: summaryData || [] })
  } catch (err: any) {
    console.error('[API session-events GET] Exceção:', err)
    return NextResponse.json({ error: err?.message || 'Erro interno' }, { status: 500 })
  }
}
