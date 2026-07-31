import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

export async function DELETE(req: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { endpoint } = body || {}

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint não fornecido' }, { status: 400 })
    }

    const { error: deleteError } = await (supabaseAdmin as any)
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint)

    if (deleteError) {
      console.error('Erro ao remover push_subscription:', deleteError)
      return NextResponse.json({ error: 'Falha ao remover inscrição' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, message: 'Inscrição removida com sucesso' }, { status: 200 })
  } catch (err: any) {
    console.error('Exceção em DELETE /api/push/unsubscribe:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
