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
      const { data, error } = await (supabaseAdmin.from as any)('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Erro ao buscar system_logs:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data: data || [] })
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
