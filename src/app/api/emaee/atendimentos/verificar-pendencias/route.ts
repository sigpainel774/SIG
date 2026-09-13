import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

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
    const { escolaId, dataReferencia } = body

    if (!escolaId) {
      return NextResponse.json({ error: 'escolaId é obrigatório' }, { status: 400 })
    }

    // 1. Tentar executar a RPC no banco
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
      'verificar_e_notificar_atendimentos_emaee_pendentes',
      {
        p_escola_id: escolaId,
        p_data_referencia: dataReferencia || null,
      },
    )

    if (!rpcError && rpcData) {
      return NextResponse.json({ success: true, result: rpcData })
    }

    // 2. Fallback programático via Node se a RPC ainda não tiver sido compilada no banco
    console.warn(
      '[api/emaee/verificar-pendencias] RPC não disponível ou falhou, executando fallback JS:',
      rpcError?.message,
    )

    // Data de referência (ontem ou fornecida)
    const dataRefObj = dataReferencia ? new Date(dataReferencia) : new Date(Date.now() - 86400000)
    const dataRefIso = dataRefObj.toISOString().split('T')[0]
    const diaSemanaJs = dataRefObj.getDay() // 0=Dom, 1=Seg...
    const diaAee = diaSemanaJs === 0 ? 7 : diaSemanaJs

    if (diaAee > 5) {
      return NextResponse.json({
        success: true,
        data_referencia: dataRefIso,
        pendentes: 0,
        notificados: 0,
        mensagem: 'Fim de semana sem pendências automáticas.',
      })
    }

    // Buscar atendimentos agendados
    const { data: vinculosAgendados } = await supabaseAdmin
      .from('emaee_especialidades_vinculadas')
      .select('id, emaee_matriculas!inner(escola_atendimento_id, deleted_at)')
      .eq('ativo', true)
      .eq('dia_semana', diaAee)
      .eq('emaee_matriculas.escola_atendimento_id', escolaId)
      .is('emaee_matriculas.deleted_at', null)

    const totalAgendados = vinculosAgendados?.length || 0
    if (totalAgendados === 0) {
      return NextResponse.json({
        success: true,
        data_referencia: dataRefIso,
        total_agendados: 0,
        pendentes: 0,
        notificados: 0,
      })
    }

    // Buscar registros já preenchidos
    const vinculoIds = (vinculosAgendados || []).map((v) => v.id)
    const { data: registrosPreenchidos } = await (supabaseAdmin as any)
      .from('emaee_atendimentos_registros')
      .select('vinculo_id')
      .in('vinculo_id', vinculoIds)
      .eq('data_atendimento', dataRefIso)
      .in('status', ['realizado', 'nao_realizado'])

    const preenchidosCount = registrosPreenchidos?.length || 0
    const pendentesCount = totalAgendados - preenchidosCount

    if (pendentesCount <= 0) {
      return NextResponse.json({
        success: true,
        data_referencia: dataRefIso,
        total_agendados: totalAgendados,
        preenchidos: preenchidosCount,
        pendentes: 0,
        notificados: 0,
      })
    }

    // Buscar destinatários: Secretárias e Direção
    const { data: escolaData } = await supabaseAdmin
      .from('escolas')
      .select('diretor_id')
      .eq('id', escolaId)
      .single()

    const { data: secretariasData } = await supabaseAdmin
      .from('funcionarios')
      .select('id, auth_user_id, nome, cargo, vinculos_funcionarios!inner(escola_id, ativo)')
      .eq('vinculos_funcionarios.escola_id', escolaId)
      .eq('vinculos_funcionarios.ativo', true)
      .is('deleted_at', null)
      .not('auth_user_id', 'is', null)

    const userIdsParaNotificar = new Set<string>()

    if (escolaData?.diretor_id) {
      const { data: diretorFunc } = await supabaseAdmin
        .from('funcionarios')
        .select('auth_user_id')
        .eq('id', escolaData.diretor_id)
        .single()
      if (diretorFunc?.auth_user_id) {
        userIdsParaNotificar.add(diretorFunc.auth_user_id)
      }
    }

    if (secretariasData) {
      secretariasData.forEach((f: any) => {
        const c = (f.cargo || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
        if (c.includes('secretar') || c.includes('diretor') || c.includes('coordenad') || c.includes('gestor')) {
          if (f.auth_user_id) {
            userIdsParaNotificar.add(f.auth_user_id)
          }
        }
      })
    }

    const dataFormatadaPt = dataRefIso.split('-').reverse().join('/')
    const title = 'Atendimentos EMAEE Pendentes de Preenchimento'
    const message = `Existem ${pendentesCount} atendimento(s) do dia ${dataFormatadaPt} pendente(s) de registro de presença.`
    const link = `/emaee/calendario-atendimentos?data=${dataRefIso}`

    let notificados = 0
    for (const authUid of userIdsParaNotificar) {
      // Checar se já notificou hoje
      const { data: jaNotificado } = await supabaseAdmin
        .from('notifications')
        .select('id')
        .eq('user_id', authUid)
        .eq('type', 'emaee_pendencia_atendimento')
        .eq('link', link)
        .gte('created_at', new Date().toISOString().split('T')[0])
        .maybeSingle()

      if (!jaNotificado) {
        await supabaseAdmin.from('notifications').insert({
          tenant_id: escolaId,
          user_id: authUid,
          title,
          message,
          type: 'emaee_pendencia_atendimento',
          link,
          read: false,
        })
        notificados++
      }
    }

    return NextResponse.json({
      success: true,
      data_referencia: dataRefIso,
      total_agendados: totalAgendados,
      preenchidos: preenchidosCount,
      pendentes: pendentesCount,
      notificados,
      mensagem: `${pendentesCount} pendência(s) detectada(s), ${notificados} notificação(ões) enviada(s).`,
    })
  } catch (err: any) {
    console.error('[api/emaee/verificar-pendencias] Erro:', err)
    return NextResponse.json(
      { error: err?.message || 'Erro ao verificar pendências' },
      { status: 500 },
    )
  }
}
