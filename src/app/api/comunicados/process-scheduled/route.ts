import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sendPushToUser } from '@/lib/push/sendPushToUser'

export const runtime = 'nodejs'

/**
 * Endpoint para processamento e publicação de comunicados agendados.
 * Pode ser chamado por um cronjob (ex: Vercel Cron) ou via Lazy Sync no carregamento do Mural.
 */
export async function POST(req: Request) {
  try {
    // 1. Busca comunicados agendados cujo horário já chegou
    const nowIso = new Date().toISOString()
    const { data: agendados, error: searchErr } = await (supabaseAdmin.from('comunicados') as any)
      .select('id, title, body, escola_ids, turma_ids, target, scheduled_for')
      .eq('status', 'agendado')
      .lte('scheduled_for', nowIso)

    if (searchErr) {
      console.error('[process-scheduled] Erro ao buscar comunicados agendados:', searchErr)
      return NextResponse.json({ error: 'Erro ao buscar agendados' }, { status: 500 })
    }

    if (!agendados || (agendados as any[]).length === 0) {
      return NextResponse.json({ ok: true, processados: 0, message: 'Nenhum comunicado pendente de disparo' })
    }

    const processadosIds: string[] = []

    for (const comunicado of (agendados as any[])) {
      // 2. Lock atômico: altera status para 'processando' para evitar corrida entre múltiplas threads/cron
      const { data: lockResult, error: lockErr } = await (supabaseAdmin.from('comunicados') as any)
        .update({ status: 'processando', disparado_em: new Date().toISOString() })
        .eq('id', comunicado.id)
        .eq('status', 'agendado')
        .select('id')
        .maybeSingle()

      if (lockErr || !lockResult) {
        // Outra instância já assumiu o processamento deste comunicado
        continue
      }

      // 3. Promove para 'publicado'
      await (supabaseAdmin.from('comunicados') as any)
        .update({ status: 'publicado' })
        .eq('id', comunicado.id)

      processadosIds.push(comunicado.id)

      // 4. Dispara o Web Push com telemetria
      const isBroadcast = !comunicado.escola_ids || comunicado.escola_ids.length === 0
      sendPushToUser({
        isBroadcast,
        escolaIds: comunicado.escola_ids ?? null,
        turmaIds: comunicado.turma_ids ?? null,
        title: `📢 Mural: ${comunicado.title}`,
        message: comunicado.body,
        link: `/mural?comunicado_id=${comunicado.id}`,
        tag: 'comunicado-mural',
        comunicadoId: comunicado.id,
      }).catch((err) => {
        console.warn(`[process-scheduled] Falha silenciosa no envio push do comunicado ${comunicado.id}:`, err)
      })
    }

    return NextResponse.json({
      ok: true,
      processados: processadosIds.length,
      comunicadoIds: processadosIds,
    })
  } catch (err: any) {
    console.error('Exceção em POST /api/comunicados/process-scheduled:', err)
    return NextResponse.json({ error: 'Erro interno ao processar agendados' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  return POST(req)
}
