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

    // Suporte a operações em lote (ex: marcar o dia inteiro como Feriado ou Recesso)
    if (body.batch && Array.isArray(body.registros)) {
      const { escola_id, data_atendimento, status, observacoes } = body
      const registrosParaSalvar = body.registros.map((vinculo_id: string) => ({
        vinculo_id,
        escola_id: escola_id || null,
        data_atendimento,
        status: status || 'feriado',
        aluno_nao_compareceu: false,
        motivo_recusa_falta: null,
        observacoes: observacoes?.trim() || null,
        registrado_por: user.id || null,
        registrado_por_nome: user.email || 'Usuário',
        registrado_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

      const { data: batchSalvo, error: batchErr } = await (supabaseAdmin as any)
        .from('emaee_atendimentos_registros')
        .upsert(registrosParaSalvar, { onConflict: 'vinculo_id,data_atendimento' })
        .select()

      if (batchErr) {
        console.error('[api/emaee/atendimentos/registros] Erro batch:', batchErr)
        return NextResponse.json({ error: batchErr.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, registros: batchSalvo || [] })
    }

    const {
      vinculo_id,
      escola_id,
      data_atendimento,
      status,
      aluno_nao_compareceu,
      motivo_recusa_falta,
      observacoes,
      data_remarcada,
      horario_remarcado,
      motivo_remarcacao,
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

    const payload: any = {
      vinculo_id,
      escola_id: escola_id || null,
      data_atendimento,
      status,
      aluno_nao_compareceu: Boolean(aluno_nao_compareceu),
      motivo_recusa_falta: motivo_recusa_falta?.trim() || null,
      observacoes: observacoes?.trim() || null,
      data_remarcada: data_remarcada || null,
      horario_remarcado: horario_remarcado || null,
      motivo_remarcacao: motivo_remarcacao?.trim() || null,
      registrado_por: registrado_por || user.id || null,
      registrado_por_nome: registrado_por_nome || user.email || 'Usuário',
      registrado_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Upsert baseado na constraint unique (vinculo_id, data_atendimento)
    let { data: registroSalvo, error: upsertError } = await (supabaseAdmin as any)
      .from('emaee_atendimentos_registros')
      .upsert(payload, { onConflict: 'vinculo_id,data_atendimento' })
      .select()
      .single()

    // Fallback resiliente se colunas novas de remarcação ainda não existirem no schema do banco
    if (upsertError && (upsertError.code === '42703' || upsertError.message?.includes('remarcad'))) {
      console.warn('[api/emaee/atendimentos/registros] Fallback compatível sem colunas de remarcação:', upsertError)
      const fallbackPayload = {
        vinculo_id,
        escola_id: escola_id || null,
        data_atendimento,
        status,
        aluno_nao_compareceu: Boolean(aluno_nao_compareceu),
        motivo_recusa_falta: motivo_recusa_falta?.trim() || null,
        observacoes: observacoes?.trim() || (motivo_remarcacao ? `Remarcação: ${motivo_remarcacao}` : null),
        registrado_por: registrado_por || user.id || null,
        registrado_por_nome: registrado_por_nome || user.email || 'Usuário',
        registrado_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const retry = await (supabaseAdmin as any)
        .from('emaee_atendimentos_registros')
        .upsert(fallbackPayload, { onConflict: 'vinculo_id,data_atendimento' })
        .select()
        .single()
      registroSalvo = retry.data
      upsertError = retry.error
    }

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
