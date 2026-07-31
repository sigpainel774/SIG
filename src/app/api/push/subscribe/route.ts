import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

export async function POST(req: Request) {
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
    const { endpoint, keys, userAgent } = body || {}

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Dados de inscrição inválidos' }, { status: 400 })
    }

    // Resolver id do funcionario correspondente ao auth.users.id
    const { data: funcData } = await supabaseAdmin
      .from('funcionarios')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    // UPSERT em push_subscriptions utilizando a constraint UNIQUE (endpoint)
    const { error: upsertError } = await (supabaseAdmin as any)
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          funcionario_id: funcData?.id ?? null,
          endpoint,
          p256dh: keys.p256dh,
          auth_key: keys.auth,
          user_agent: userAgent || null,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      )

    if (upsertError) {
      console.error('Erro ao salvar push_subscription:', upsertError)
      return NextResponse.json({ error: 'Falha ao salvar inscrição' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, message: 'Inscrição de push salva com sucesso' }, { status: 201 })
  } catch (err: any) {
    console.error('Exceção em POST /api/push/subscribe:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
