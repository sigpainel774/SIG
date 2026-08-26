import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import webpush from 'web-push'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const privateKey = process.env.VAPID_PRIVATE_KEY
    const email = process.env.VAPID_EMAIL || 'mailto:suporte@sapeacu.ba.gov.br'

    if (!publicKey || !privateKey) {
      return NextResponse.json({ ok: false, reason: 'VAPID_KEYS_MISSING' }, { status: 200 })
    }

    webpush.setVapidDetails(email, publicKey, privateKey)

    const body = await req.json()
    const { comunicadoId, authUserIds } = body || {}

    if (!comunicadoId || !Array.isArray(authUserIds) || authUserIds.length === 0) {
      return NextResponse.json({ error: 'comunicadoId e authUserIds são obrigatórios' }, { status: 400 })
    }

    // Busca dados do comunicado
    const { data: comunicado, error: comErr } = await supabaseAdmin
      .from('comunicados')
      .select('id, title, body')
      .eq('id', comunicadoId)
      .maybeSingle()

    if (comErr || !comunicado) {
      return NextResponse.json({ error: 'Comunicado não encontrado' }, { status: 404 })
    }

    // Busca inscrições dos usuários pendentes
    const { data: subscriptions, error: subsErr } = await (supabaseAdmin as any)
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth_key, user_id')
      .in('user_id', authUserIds)

    if (subsErr || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, message: 'Nenhuma inscrição push encontrada para os usuários pendentes' })
    }

    const payload = JSON.stringify({
      title: `⚠️ Lembrete de Leitura: ${comunicado.title}`,
      body: `Você possui uma leitura pendente deste comunicado. Toque para visualizar.`,
      link: `/mural?comunicado_id=${comunicado.id}`,
      tag: `lembrete-comunicado-${comunicado.id}`,
      comunicado_id: comunicado.id,
    })

    const CHUNK_SIZE = 50
    const results: PromiseSettledResult<{ success: boolean; endpoint: string }>[] = []

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
          if (err.statusCode === 410 || err.statusCode === 404) {
            await (supabaseAdmin as any).from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          }
          return { success: false, endpoint: sub.endpoint }
        }
      })

      const chunkResults = await Promise.allSettled(chunkPromises)
      results.push(...chunkResults)

      if (i + CHUNK_SIZE < subscriptions.length) {
        await new Promise((resolve) => setTimeout(resolve, 40))
      }
    }

    const successCount = results.filter((r) => r.status === 'fulfilled' && r.value.success).length

    return NextResponse.json({
      ok: true,
      sent: successCount,
      totalAlvo: authUserIds.length,
      totalSubscriptions: subscriptions.length,
    })
  } catch (err: any) {
    console.error('Exceção em POST /api/comunicados/notify-pending:', err)
    return NextResponse.json({ error: 'Erro interno ao disparar lembrete' }, { status: 500 })
  }
}
