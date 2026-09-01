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

    // Tentativa 1: Inserção direta completa
    let { error } = await (supabaseAdmin as any).from('session_events').insert(batchToInsert)

    // Se falhar por chave estrangeira (FK) inválida, tenta salvar sem as FKs para não perder os eventos
    if (error) {
      console.warn('[API session-events] Tentando inserção de recuperação sem FKs:', error.message)
      const safeBatch = batchToInsert.map((e) => ({
        session_id: e.session_id,
        funcionario_id: null,
        escola_id: null,
        event_type: e.event_type,
        event_data: {
          ...e.event_data,
          original_funcionario_id: e.funcionario_id,
          original_escola_id: e.escola_id,
        },
        created_at: e.created_at,
      }))

      const recoveryResult = await (supabaseAdmin as any).from('session_events').insert(safeBatch)
      if (recoveryResult.error) {
        console.error('[API session-events] Falha na recuperação de inserção:', recoveryResult.error.message)
        return NextResponse.json({ error: recoveryResult.error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, count: batchToInsert.length })
  } catch (err: any) {
    console.error('[API session-events] Exceção inesperada:', err)
    return NextResponse.json({ error: err?.message || 'Erro interno' }, { status: 500 })
  }
}

// GET: Buscar histórico de eventos de uma sessão específica ou sumário de sessões gravadas
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
      const recentThreshold = new Date(Date.now() - 15 * 60 * 1000).toISOString()
      
      const { data: recentEvents } = await (supabaseAdmin as any)
        .from('session_events')
        .select('session_id, funcionario_id, escola_id, event_type, event_data, created_at')
        .gte('created_at', recentThreshold)
        .order('created_at', { ascending: false })
        .limit(600)

      if (recentEvents && recentEvents.length > 0) {
        // Coletar IDs de funcionários para buscar nomes
        const funcIds = Array.from(new Set(recentEvents.map((e: any) => e.funcionario_id).filter(Boolean)))
        const escolaIds = Array.from(new Set(recentEvents.map((e: any) => e.escola_id).filter(Boolean)))

        let funcMap = new Map<string, any>()
        if (funcIds.length > 0) {
          const { data: funcs } = await (supabaseAdmin as any)
            .from('funcionarios')
            .select('id, nome, email, cargo, foto_url, auth_user_id')
            .in('id', funcIds)
          ;(funcs || []).forEach((f: any) => funcMap.set(f.id, f))
        }

        let escolaMap = new Map<string, string>()
        if (escolaIds.length > 0) {
          const { data: esc } = await (supabaseAdmin as any)
            .from('escolas')
            .select('id, nome')
            .in('id', escolaIds)
          ;(esc || []).forEach((e: any) => escolaMap.set(e.id, e.nome))
        }

        const activeMap = new Map<string, any>()
        recentEvents.forEach((e: any) => {
          const sid = e.session_id
          const func = funcMap.get(e.funcionario_id)
          const key = e.funcionario_id || sid

          if (!activeMap.has(key)) {
            activeMap.set(key, {
              session_id: sid,
              user_id: func?.auth_user_id || sid,
              funcionario_id: e.funcionario_id,
              funcionario_nome: func?.nome || e.event_data?.funcionario_nome || 'Servidor Online',
              funcionario_email: func?.email || '-',
              funcionario_cargo: func?.cargo || 'Servidor',
              escola_nome: escolaMap.get(e.escola_id) || 'Rede Municipal',
              foto_url: func?.foto_url || null,
              created_at: e.created_at,
              refreshed_at: e.created_at,
              current_pathname: e.event_data?.pathname || '/home',
              total_active_seconds_today: e.event_data?.active_time_seconds || 60,
              ip: null,
              user_agent: null,
              last_interaction_at: e.event_data?.timestamp || new Date(e.created_at).getTime(),
              last_action_desc: e.event_type === 'click' ? `Clicou em ${e.event_data?.target_text || 'item'}` : 'Navegando no SIG',
              is_actively_using: true,
              is_tab_focused: true,
            })
          }
        })
        return NextResponse.json({ active_sessions: Array.from(activeMap.values()) })
      }

      return NextResponse.json({ active_sessions: [] })
    }

    // 1. Se informou session_id, retorna os eventos cronológicos para o Replay
    if (sessionId) {
      let query = (supabaseAdmin as any)
        .from('session_events')
        .select('id, session_id, funcionario_id, escola_id, event_type, event_data, created_at')
        .order('created_at', { ascending: true })
        .limit(2000)

      if (sessionId.includes('_')) {
        const [userId] = sessionId.split('_')
        query = query.or(`session_id.eq.${sessionId},session_id.eq.${userId}`)
      } else {
        query = query.eq('session_id', sessionId)
      }

      const { data: directEvents, error: directErr } = await query

      if (directErr) {
        console.error('[API session-events] Erro ao buscar eventos de replay:', directErr.message)
        return NextResponse.json({ error: directErr.message }, { status: 500 })
      }

      // Buscar nomes dos funcionários e escolas envolvidos
      const funcIds = Array.from(new Set((directEvents || []).map((e: any) => e.funcionario_id).filter(Boolean)))
      const escolaIds = Array.from(new Set((directEvents || []).map((e: any) => e.escola_id).filter(Boolean)))

      let funcMap = new Map<string, any>()
      if (funcIds.length > 0) {
        const { data: funcs } = await (supabaseAdmin as any)
          .from('funcionarios')
          .select('id, nome, email, cargo, foto_url')
          .in('id', funcIds)
        ;(funcs || []).forEach((f: any) => funcMap.set(f.id, f))
      }

      let escolaMap = new Map<string, string>()
      if (escolaIds.length > 0) {
        const { data: esc } = await (supabaseAdmin as any)
          .from('escolas')
          .select('id, nome')
          .in('id', escolaIds)
        ;(esc || []).forEach((e: any) => escolaMap.set(e.id, e.nome))
      }

      const formatted = (directEvents || []).map((e: any) => {
        const func = funcMap.get(e.funcionario_id)
        return {
          id: e.id,
          session_id: e.session_id,
          funcionario_id: e.funcionario_id,
          funcionario_nome: func?.nome || e.event_data?.funcionario_nome || 'Usuário',
          escola_id: e.escola_id,
          escola_nome: escolaMap.get(e.escola_id) || 'Rede Municipal',
          event_type: e.event_type,
          event_data: e.event_data,
          created_at: e.created_at,
        }
      })

      return NextResponse.json({ events: formatted })
    }

    // 2. Sumário de Sessões Gravadas para a listagem histórica
    let query = (supabaseAdmin as any)
      .from('session_events')
      .select('session_id, funcionario_id, escola_id, event_type, event_data, created_at')
      .order('created_at', { ascending: false })
      .limit(3000)

    if (startDate) {
      query = query.gte('created_at', new Date(startDate).toISOString())
    }
    if (endDate) {
      // Ajustar fim do dia
      const endDt = new Date(endDate)
      endDt.setHours(23, 59, 59, 999)
      query = query.lte('created_at', endDt.toISOString())
    }
    if (funcionarioId) {
      query = query.eq('funcionario_id', funcionarioId)
    }

    const { data: allEvents, error: evErr } = await query

    if (evErr) {
      console.error('[API session-events] Erro ao buscar sessões para histórico:', evErr.message)
      return NextResponse.json({ error: evErr.message }, { status: 500 })
    }

    // Buscar nomes dos funcionários e escolas
    const funcIds = Array.from(new Set((allEvents || []).map((e: any) => e.funcionario_id).filter(Boolean)))
    const escolaIds = Array.from(new Set((allEvents || []).map((e: any) => e.escola_id).filter(Boolean)))

    let funcMap = new Map<string, any>()
    if (funcIds.length > 0) {
      const { data: funcs } = await (supabaseAdmin as any)
        .from('funcionarios')
        .select('id, nome, email, cargo, foto_url')
        .in('id', funcIds)
      ;(funcs || []).forEach((f: any) => funcMap.set(f.id, f))
    }

    let escolaMap = new Map<string, string>()
    if (escolaIds.length > 0) {
      const { data: esc } = await (supabaseAdmin as any)
        .from('escolas')
        .select('id, nome')
        .in('id', escolaIds)
      ;(esc || []).forEach((e: any) => escolaMap.set(e.id, e.nome))
    }

    // Agrupar eventos por session_id
    const sessionMap = new Map<string, any>()
    ;(allEvents || []).forEach((e: any) => {
      const sid = e.session_id
      if (!sessionMap.has(sid)) {
        const func = funcMap.get(e.funcionario_id)
        sessionMap.set(sid, {
          session_id: sid,
          funcionario_id: e.funcionario_id,
          funcionario_nome: func?.nome || e.event_data?.funcionario_nome || 'Usuário',
          funcionario_email: func?.email || '-',
          funcionario_cargo: func?.cargo || 'Servidor',
          escola_nome: escolaMap.get(e.escola_id) || 'Rede Municipal',
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
  } catch (err: any) {
    console.error('[API session-events GET] Exceção:', err)
    return NextResponse.json({ error: err?.message || 'Erro interno' }, { status: 500 })
  }
}
