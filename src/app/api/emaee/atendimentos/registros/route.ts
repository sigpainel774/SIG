import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const escolaId = searchParams.get('escolaId')
  const dataInicio = searchParams.get('dataInicio')
  const dataFim = searchParams.get('dataFim')
  const data = searchParams.get('data')

  if (!escolaId) {
    return NextResponse.json({ error: 'escolaId é obrigatório' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    let query = (supabase as any)
      .from('emaee_atendimentos_registros')
      .select('*')
      .eq('escola_id', escolaId)

    if (data) {
      query = query.eq('data_atendimento', data)
    } else if (dataInicio && dataFim) {
      query = query.gte('data_atendimento', dataInicio).lte('data_atendimento', dataFim)
    }

    const { data: registros, error } = await query

    if (error) {
      // Caso a tabela ainda esteja sendo criada/sincronizada, retornar vazio sem quebrar
      console.warn('[api/emaee/atendimentos/registros] Aviso na busca:', error)
      return NextResponse.json({ registros: [] })
    }

    return NextResponse.json({ registros: registros || [] })
  } catch (err) {
    console.error('[api/emaee/atendimentos/registros] Erro:', err)
    return NextResponse.json({ error: 'Erro ao buscar registros de atendimentos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const {
      vinculo_id,
      escola_id,
      data_atendimento,
      status,
      aluno_nao_compareceu,
      motivo_recusa_falta,
      observacoes,
      registrado_por,
      registrado_por_nome,
    } = body

    if (!vinculo_id || !data_atendimento || !status) {
      return NextResponse.json(
        { error: 'vinculo_id, data_atendimento e status são obrigatórios' },
        { status: 400 },
      )
    }

    // Validação estrita: se não realizado, o motivo é obrigatório
    if (status === 'nao_realizado') {
      const temMotivo =
        Boolean(aluno_nao_compareceu) ||
        (typeof motivo_recusa_falta === 'string' && motivo_recusa_falta.trim().length > 0)
      if (!temMotivo) {
        return NextResponse.json(
          {
            error:
              'Para atendimentos não realizados, é obrigatório indicar que o aluno não compareceu ou fornecer outras razões.',
          },
          { status: 400 },
        )
      }
    }

    const payload = {
      vinculo_id,
      escola_id: escola_id || null,
      data_atendimento,
      status,
      aluno_nao_compareceu: Boolean(aluno_nao_compareceu),
      motivo_recusa_falta: motivo_recusa_falta?.trim() || null,
      observacoes: observacoes?.trim() || null,
      registrado_por: registrado_por || null,
      registrado_por_nome: registrado_por_nome || user.email || 'Usuário',
      registrado_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Upsert baseado na constraint unique (vinculo_id, data_atendimento)
    const { data: registroSalvo, error: upsertError } = await (supabaseAdmin as any)
      .from('emaee_atendimentos_registros')
      .upsert(payload, { onConflict: 'vinculo_id,data_atendimento' })
      .select()
      .single()

    if (upsertError) {
      console.error('[api/emaee/atendimentos/registros] Erro no upsert:', upsertError)
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, registro: registroSalvo })
  } catch (err: any) {
    console.error('[api/emaee/atendimentos/registros] Erro no processamento:', err)
    return NextResponse.json(
      { error: err?.message || 'Erro interno ao salvar registro' },
      { status: 500 },
    )
  }
}
