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

  const apenasPendentes = searchParams.get('apenasPendentes') === 'true'

  try {
    let registros: any[] = []

    const selectCampos = `
      *,
      vinculo:emaee_especialidades_vinculadas (
        id,
        especialidade,
        especialidade_outros,
        dia_semana,
        horario_inicio,
        horario_fim,
        frequencia,
        data_inicio,
        data_fim,
        ativo,
        funcionarios:profissional_id (
          id,
          nome,
          cargo,
          foto_url,
          foto_avatar_path,
          foto_visualizacao_path,
          foto_updated_at
        ),
        emaee_matriculas:emaee_matricula_id (
          id,
          numero_matricula_emaee,
          escola_atendimento_id,
          alunos:aluno_id (
            id,
            nome,
            cpf,
            data_nascimento,
            nome_mae,
            telefone,
            endereco
          )
        )
      )
    `

    if (apenasPendentes) {
      const { data: resPendentes } = await (supabase as any)
        .from('emaee_atendimentos_registros')
        .select(selectCampos)
        .eq('escola_id', escolaId)
        .eq('status', 'pendente')
        .order('data_atendimento', { ascending: false })

      registros = resPendentes || []
    } else if (data) {
      const [resAtendimento, resRemarcado] = await Promise.all([
        (supabase as any)
          .from('emaee_atendimentos_registros')
          .select(selectCampos)
          .eq('escola_id', escolaId)
          .eq('data_atendimento', data),
        (supabase as any)
          .from('emaee_atendimentos_registros')
          .select(selectCampos)
          .eq('escola_id', escolaId)
          .eq('status', 'remarcado')
          .eq('data_remarcada', data),
      ])

      const map = new Map<string, any>()
      ;(resAtendimento.data || []).forEach((r: any) => map.set(r.id, r))
      ;(resRemarcado.data || []).forEach((r: any) => map.set(r.id, r))
      registros = Array.from(map.values())
    } else if (dataInicio && dataFim) {
      const [resAtendimentos, resRemarcados] = await Promise.all([
        (supabase as any)
          .from('emaee_atendimentos_registros')
          .select(selectCampos)
          .eq('escola_id', escolaId)
          .gte('data_atendimento', dataInicio)
          .lte('data_atendimento', dataFim),
        (supabase as any)
          .from('emaee_atendimentos_registros')
          .select(selectCampos)
          .eq('escola_id', escolaId)
          .eq('status', 'remarcado')
          .gte('data_remarcada', dataInicio)
          .lte('data_remarcada', dataFim),
      ])

      const map = new Map<string, any>()
      ;(resAtendimentos.data || []).forEach((r: any) => map.set(r.id, r))
      ;(resRemarcados.data || []).forEach((r: any) => map.set(r.id, r))
      registros = Array.from(map.values())
    } else {
      const { data: resGeral } = await (supabase as any)
        .from('emaee_atendimentos_registros')
        .select(selectCampos)
        .eq('escola_id', escolaId)
      registros = resGeral || []
    }

    return NextResponse.json({ registros })
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

    // Resolução segura de funcionário e escola para garantir integridade referencial
    let funcionarioId: string | null = null
    let funcionarioNome: string = user.email || 'Usuário'

    if (user) {
      const { data: func } = await supabaseAdmin
        .from('funcionarios')
        .select('id, nome')
        .or(`auth_user_id.eq.${user.id},email.ilike.${user.email}`)
        .limit(1)
        .maybeSingle()

      if (func) {
        funcionarioId = func.id
        funcionarioNome = func.nome || funcionarioNome
      }
    }

    // Suporte a operações em lote (ex: marcar o dia inteiro como Feriado ou Recesso)
    if (body.batch && Array.isArray(body.registros)) {
      const { escola_id, data_atendimento, status, observacoes } = body

      let validEscolaId: string | null = null
      if (escola_id) {
        const { data: esc } = await supabaseAdmin
          .from('escolas')
          .select('id')
          .eq('id', escola_id)
          .maybeSingle()
        if (esc) validEscolaId = esc.id
      }

      const registrosParaSalvar = body.registros.map((vinculo_id: string) => ({
        vinculo_id,
        escola_id: validEscolaId,
        data_atendimento,
        status: status || 'feriado',
        aluno_nao_compareceu: false,
        motivo_recusa_falta: null,
        observacoes: observacoes?.trim() || null,
        registrado_por: funcionarioId,
        registrado_por_nome: funcionarioNome,
        registrado_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

      let { data: batchSalvo, error: batchErr } = await (supabaseAdmin as any)
        .from('emaee_atendimentos_registros')
        .upsert(registrosParaSalvar, { onConflict: 'vinculo_id,data_atendimento' })
        .select()

      // Fallback em caso de violação de Foreign Key
      if (batchErr && batchErr.code === '23503') {
        console.warn('[api/emaee/atendimentos/registros] FK violation no batch, retentando com chaves nulas:', batchErr)
        const batchSafe = registrosParaSalvar.map((r: any) => ({
          ...r,
          registrado_por: null,
          escola_id: null,
        }))
        const retryBatch = await (supabaseAdmin as any)
          .from('emaee_atendimentos_registros')
          .upsert(batchSafe, { onConflict: 'vinculo_id,data_atendimento' })
          .select()
        batchSalvo = retryBatch.data
        batchErr = retryBatch.error
      }

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

    // Validação estrita: se remarcado, a nova data é obrigatória
    if (status === 'remarcado') {
      if (!data_remarcada) {
        return NextResponse.json(
          { error: 'Para atendimentos remarcados, informe a nova data prevista.' },
          { status: 400 },
        )
      }
    }

    // Se veio registrado_por customizado no payload, checa se existe em funcionarios
    if (registrado_por) {
      const { data: funcCustom } = await supabaseAdmin
        .from('funcionarios')
        .select('id, nome')
        .eq('id', registrado_por)
        .maybeSingle()
      if (funcCustom) {
        funcionarioId = funcCustom.id
        funcionarioNome = funcCustom.nome || funcionarioNome
      }
    }

    if (registrado_por_nome) {
      funcionarioNome = registrado_por_nome
    }

    // Resolução segura de escola_id
    let validEscolaId: string | null = null
    if (escola_id) {
      const { data: esc } = await supabaseAdmin
        .from('escolas')
        .select('id')
        .eq('id', escola_id)
        .maybeSingle()
      if (esc) validEscolaId = esc.id
    }

    if (!validEscolaId && vinculo_id) {
      const { data: vinculo } = await supabaseAdmin
        .from('emaee_especialidades_vinculadas')
        .select('emaee_matriculas(escola_atendimento_id)')
        .eq('id', vinculo_id)
        .maybeSingle()
      const escIdFromVinculo = (vinculo as any)?.emaee_matriculas?.escola_atendimento_id
      if (escIdFromVinculo) {
        validEscolaId = escIdFromVinculo
      }
    }

    const payload: any = {
      vinculo_id,
      escola_id: validEscolaId,
      data_atendimento,
      status,
      aluno_nao_compareceu: Boolean(aluno_nao_compareceu),
      motivo_recusa_falta: motivo_recusa_falta?.trim() || null,
      observacoes: observacoes?.trim() || null,
      data_remarcada: data_remarcada || null,
      horario_remarcado: horario_remarcado || null,
      motivo_remarcacao: motivo_remarcacao?.trim() || null,
      registrado_por: funcionarioId,
      registrado_por_nome: funcionarioNome,
      registrado_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Upsert baseado na constraint unique (vinculo_id, data_atendimento)
    let { data: registroSalvo, error: upsertError } = await (supabaseAdmin as any)
      .from('emaee_atendimentos_registros')
      .upsert(payload, { onConflict: 'vinculo_id,data_atendimento' })
      .select()
      .single()

    // Fallback 1: Violação de Foreign Key (código 23503)
    if (upsertError && upsertError.code === '23503') {
      console.warn('[api/emaee/atendimentos/registros] Foreign key violation capturada, retentando com chaves seguras nulas:', upsertError)
      const safePayload = {
        ...payload,
        registrado_por: null,
        escola_id: null,
      }
      const retryFk = await (supabaseAdmin as any)
        .from('emaee_atendimentos_registros')
        .upsert(safePayload, { onConflict: 'vinculo_id,data_atendimento' })
        .select()
        .single()
      registroSalvo = retryFk.data
      upsertError = retryFk.error
    }

    // Fallback 2: Colunas novas de remarcação ainda não existentes no schema
    if (upsertError && (upsertError.code === '42703' || upsertError.message?.includes('remarcad'))) {
      console.warn('[api/emaee/atendimentos/registros] Fallback compatível sem colunas de remarcação:', upsertError)
      const fallbackPayload = {
        vinculo_id,
        escola_id: validEscolaId,
        data_atendimento,
        status,
        aluno_nao_compareceu: Boolean(aluno_nao_compareceu),
        motivo_recusa_falta: motivo_recusa_falta?.trim() || null,
        observacoes: observacoes?.trim() || (motivo_remarcacao ? `Remarcação: ${motivo_remarcacao}` : null),
        registrado_por: funcionarioId,
        registrado_por_nome: funcionarioNome,
        registrado_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      let retry = await (supabaseAdmin as any)
        .from('emaee_atendimentos_registros')
        .upsert(fallbackPayload, { onConflict: 'vinculo_id,data_atendimento' })
        .select()
        .single()

      if (retry.error && retry.error.code === '23503') {
        const safeFallbackPayload = {
          ...fallbackPayload,
          registrado_por: null,
          escola_id: null,
        }
        retry = await (supabaseAdmin as any)
          .from('emaee_atendimentos_registros')
          .upsert(safeFallbackPayload, { onConflict: 'vinculo_id,data_atendimento' })
          .select()
          .single()
      }

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
