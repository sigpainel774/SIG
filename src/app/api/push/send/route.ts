import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const privateKey = process.env.VAPID_PRIVATE_KEY
    const email = process.env.VAPID_EMAIL || 'mailto:suporte@sapeacu.ba.gov.br'

    if (!publicKey || !privateKey) {
      console.warn('VAPID keys não configuradas. Envio de Push ignorado em dev/staging.')
      return NextResponse.json({ ok: false, reason: 'VAPID_KEYS_MISSING' }, { status: 200 })
    }

    webpush.setVapidDetails(email, publicKey, privateKey)

    const body = await req.json()
    const {
      destinatarioId,
      destinatarioUserId,
      title,
      message,
      link,
      tag,
      isBroadcast,
      escolaId,
      escolaIds,
      comunicadoId,
    } = body || {}

    if (!title || !message) {
      return NextResponse.json({ error: 'Título e mensagem são obrigatórios' }, { status: 400 })
    }

    let targetUserIds: string[] = []

    if (isBroadcast) {
      // Broadcast para todos os usuários inscritos (ou filtrado por escola/unidades)
      const targetEscolaIds: string[] = []
      if (Array.isArray(escolaIds) && escolaIds.length > 0) {
        targetEscolaIds.push(...escolaIds)
      } else if (escolaId) {
        targetEscolaIds.push(escolaId)
      }

      if (targetEscolaIds.length > 0) {
        // Busca auth_user_id dos funcionários vinculados às escolas selecionadas
        const { data: vinculos } = await supabaseAdmin
          .from('vinculos_funcionarios')
          .select('funcionario:funcionarios!funcionario_id(auth_user_id)')
          .in('escola_id', targetEscolaIds)
          .eq('ativo', true)

        targetUserIds = Array.from(
          new Set(
            (vinculos ?? [])
              .map((v: any) => v.funcionario?.auth_user_id)
              .filter(Boolean)
          )
        )
      } else {
        // Broadcast geral — busca todas as inscrições distintas
        const { data: subs } = await (supabaseAdmin as any)
          .from('push_subscriptions')
          .select('user_id')

        targetUserIds = Array.from(new Set((subs as any[] ?? []).map((s) => s.user_id)))
      }
    } else {
      // Envio direto para 1 usuário
      let resolvedUserId = destinatarioUserId

      if (!resolvedUserId && destinatarioId) {
        const { data: funcData } = await supabaseAdmin
          .from('funcionarios')
          .select('auth_user_id')
          .eq('id', destinatarioId)
          .maybeSingle()

        resolvedUserId = funcData?.auth_user_id || null
      }

      if (resolvedUserId) {
        targetUserIds = [resolvedUserId]
      }
    }

    if (targetUserIds.length === 0) {
      if (comunicadoId) {
        await (supabaseAdmin.from('comunicados') as any)
          .update({
            total_disparos: 0,
            total_entregues: 0,
            disparado_em: new Date().toISOString(),
          })
          .eq('id', comunicadoId)
      }
      return NextResponse.json({ ok: true, sent: 0, message: 'Nenhum usuário destinatário encontrado para push' })
    }

    // Buscar todas as inscrições dos usuários alvo
    const { data: subscriptions, error: subsErr } = await (supabaseAdmin as any)
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth_key')
      .in('user_id', targetUserIds)

    if (subsErr || !subscriptions || subscriptions.length === 0) {
      if (comunicadoId) {
        await (supabaseAdmin.from('comunicados') as any)
          .update({
            total_disparos: targetUserIds.length,
            total_entregues: 0,
            disparado_em: new Date().toISOString(),
          })
          .eq('id', comunicadoId)
      }
      return NextResponse.json({ ok: true, sent: 0, message: 'Nenhuma inscrição push encontrada' })
    }

    const payload = JSON.stringify({
      title,
      body: message,
      link: link || '/home',
      tag: tag || 'sig-push',
      comunicado_id: comunicadoId || null,
    })

    // Micro-loteamento (chunking) de 50 requisições simultâneas para evitar esgotamento de sockets
    const CHUNK_SIZE = 50
    const results: PromiseSettledResult<{ success: boolean; endpoint: string; error?: string }>[] = []

    for (let i = 0; i < subscriptions.length; i += CHUNK_SIZE) {
      const chunk = subscriptions.slice(i, i + CHUNK_SIZE)
      const chunkPromises = chunk.map(async (sub: any) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth_key,
          },
        }

        try {
          await webpush.sendNotification(pushSubscription, payload)
          return { success: true, endpoint: sub.endpoint }
        } catch (err: any) {
          // Se a inscrição expirou no Google/Apple (410 Gone / 404 Not Found), deleta do banco
          if (err.statusCode === 410 || err.statusCode === 404) {
            console.log(`[Push] Inscrição expirada (${err.statusCode}). Removendo endpoint: ${sub.endpoint}`)
            await (supabaseAdmin as any).from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          } else {
            console.error('[Push] Erro ao enviar notificação para endpoint:', sub.endpoint, err.message || err)
          }
          return { success: false, endpoint: sub.endpoint, error: err.message }
        }
      })

      const chunkResults = await Promise.allSettled(chunkPromises)
      results.push(...chunkResults)

      if (i + CHUNK_SIZE < subscriptions.length) {
        await new Promise((resolve) => setTimeout(resolve, 40)) // 40ms de alívio
      }
    }

    const successCount = results.filter((r) => r.status === 'fulfilled' && r.value.success).length

    // Atualiza contadores de telemetria no comunicado, se aplicável
    if (comunicadoId) {
      await (supabaseAdmin.from('comunicados') as any)
        .update({
          total_disparos: subscriptions.length,
          total_entregues: successCount,
          disparado_em: new Date().toISOString(),
        })
        .eq('id', comunicadoId)
    }

    return NextResponse.json({
      ok: true,
      sent: successCount,
      totalSubscriptions: subscriptions.length,
    })
  } catch (err: any) {
    console.error('Exceção em POST /api/push/send:', err)
    return NextResponse.json({ error: 'Erro interno ao processar disparo de push' }, { status: 500 })
  }
}
