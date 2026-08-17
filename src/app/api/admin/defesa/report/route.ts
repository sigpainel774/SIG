import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function checkSuperadmin(cookieStore: any) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }: any) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { authorized: false }

  const { data: func } = await supabaseAdmin
    .from('funcionarios')
    .select('id, is_superadmin')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!func || !func.is_superadmin) {
    return { authorized: false }
  }

  return { authorized: true }
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const { authorized } = await checkSuperadmin(cookieStore)

    if (!authorized) {
      return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const tipo = searchParams.get('tipo')
    const format = searchParams.get('format') ?? 'json'

    let query = (supabaseAdmin as any)
      .from('security_threat_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000)

    if (startDate) {
      query = query.gte('created_at', `${startDate}T00:00:00.000Z`)
    }
    if (endDate) {
      query = query.lte('created_at', `${endDate}T23:59:59.999Z`)
    }
    if (tipo && tipo !== 'ALL') {
      query = query.eq('tipo_ataque', tipo)
    }

    const { data: logs, error } = await query

    if (error) throw error

    if (format === 'csv') {
      const headers = 'ID,Data/Hora,Tipo de Ataque,Severidade,Status,IP de Origem,País,Rota Alvo,Método,Email Tentativa\n'
      const rows = (logs ?? []).map((l: any) => {
        const date = new Date(l.created_at).toLocaleString('pt-BR')
        return `"${l.id}","${date}","${l.tipo_ataque}","${l.severidade}","${l.status}","${l.ip_origem}","${l.pais ?? ''}","${l.rota_alvo}","${l.metodo_http}","${l.email_tentativa ?? ''}"`
      }).join('\n')

      return new Response(headers + rows, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="relatorio_seguranca_${Date.now()}.csv"`,
        },
      })
    }

    return NextResponse.json({
      total: logs?.length ?? 0,
      logs: logs ?? [],
      generatedAt: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('Erro ao gerar relatório de defesa:', err)
    return NextResponse.json({ error: err.message ?? 'Erro interno' }, { status: 500 })
  }
}
