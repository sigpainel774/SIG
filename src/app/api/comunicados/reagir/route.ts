import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { comunicadoId, userId, tipo = 'ciente' } = body || {}

    if (!comunicadoId || !userId) {
      return NextResponse.json({ error: 'comunicadoId e userId são obrigatórios' }, { status: 400 })
    }

    // Verifica se a reação já existe para fazer toggle (adiciona ou remove)
    const { data: existente } = await (supabaseAdmin as any)
      .from('comunicados_reacoes')
      .select('id')
      .eq('comunicado_id', comunicadoId)
      .eq('user_id', userId)
      .eq('tipo', tipo)
      .maybeSingle()

    if (existente) {
      // Remove reação
      await (supabaseAdmin as any)
        .from('comunicados_reacoes')
        .delete()
        .eq('id', existente.id)

      return NextResponse.json({ ok: true, action: 'removed' })
    } else {
      // Insere reação
      const { error: insertErr } = await (supabaseAdmin as any)
        .from('comunicados_reacoes')
        .insert({
          comunicado_id: comunicadoId,
          user_id: userId,
          tipo,
        })

      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 500 })
      }

      return NextResponse.json({ ok: true, action: 'added' })
    }
  } catch (err: any) {
    console.error('[comunicados/reagir] Erro:', err)
    return NextResponse.json({ error: 'Erro interno ao processar reação' }, { status: 500 })
  }
}
