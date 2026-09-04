import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    let user = null

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data } = await supabaseAdmin.auth.getUser(token)
      user = data?.user
    }

    if (!user) {
      try {
        const supabase = await createClient()
        const { data } = await supabase.auth.getUser()
        user = data?.user
      } catch (authErr) {
        // Silencioso se cookies não estiverem disponíveis
      }
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'logs'
    const limit = parseInt(searchParams.get('limit') || '100', 10)

    if (type === 'chamados') {
      const { data, error } = await (supabaseAdmin.from as any)('bug_reports')
        .select('id, tipo, titulo, descricao, autor_nome, autor_email, escola, resposta_root, status, created_at')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Erro ao buscar bug_reports:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data: data || [] })
    } else {
      const { data: logsData, error } = await (supabaseAdmin.from as any)('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Erro ao buscar system_logs:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const logs = logsData || []

      // Coletar user_ids que precisam de resolução de usuário
      const userIdsToResolve = Array.from(
        new Set(
          logs
            .map((l: any) => l.user_id)
            .filter((uid: any) => uid && typeof uid === 'string')
        )
      )

      if (userIdsToResolve.length > 0) {
        // Buscar em funcionarios por id ou auth_user_id
        const { data: funcs } = await (supabaseAdmin.from as any)('funcionarios')
          .select('id, auth_user_id, nome, email, cargo')
          .or(`id.in.(${userIdsToResolve.join(',')}),auth_user_id.in.(${userIdsToResolve.join(',')})`)

        const funcMap = new Map<string, any>()
        if (funcs) {
          for (const f of funcs) {
            if (f.id) funcMap.set(f.id, f)
            if (f.auth_user_id) funcMap.set(f.auth_user_id, f)
          }
        }

        for (const log of logs) {
          if (!log.metadata || typeof log.metadata !== 'object') {
            log.metadata = {}
          }
          const currentNome = log.metadata.usuario?.nome
          if (!currentNome || currentNome === 'Usuário Anônimo / Não Autenticado' || currentNome === 'Não autenticado' || currentNome === 'Usuário Não Identificado') {
            if (log.user_id && funcMap.has(log.user_id)) {
              const matchedFunc = funcMap.get(log.user_id)
              log.metadata.usuario = {
                id: matchedFunc.id,
                auth_user_id: matchedFunc.auth_user_id,
                nome: matchedFunc.nome,
                email: matchedFunc.email,
                cargo: matchedFunc.cargo,
                escola: log.metadata.usuario?.escola || null
              }
            }
          }
        }
      }

      return NextResponse.json({ data: logs })
    }
  } catch (err: any) {
    console.error('Exceção ao listar reports/logs:', err)
    return NextResponse.json({ error: err?.message || 'Erro interno.' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    let user = null

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data } = await supabaseAdmin.auth.getUser(token)
      user = data?.user
    }

    if (!user) {
      try {
        const supabase = await createClient()
        const { data } = await supabase.auth.getUser()
        user = data?.user
      } catch (authErr) {
        // Silencioso se cookies não estiverem disponíveis
      }
    }

    const body = await req.json()
    const { type, id, resolved, status, resposta_root } = body

    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 })
    }

    if (type === 'log') {
      const { error } = await (supabaseAdmin.from as any)('system_logs')
        .update({ resolved: Boolean(resolved) })
        .eq('id', id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    } else if (type === 'chamado') {
      const updateData: any = {
        updated_at: new Date().toISOString()
      }
      if (status) updateData.status = status
      if (resposta_root !== undefined) updateData.resposta_root = resposta_root

      const { error } = await (supabaseAdmin.from as any)('bug_reports')
        .update(updateData)
        .eq('id', id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 })
    }
  } catch (err: any) {
    console.error('Exceção ao atualizar report/log:', err)
    return NextResponse.json({ error: err?.message || 'Erro interno.' }, { status: 500 })
  }
}
