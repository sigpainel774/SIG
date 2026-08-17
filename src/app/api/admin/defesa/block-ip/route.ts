import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { blockIpInMemory, unblockIpInMemory, addWhitelistIp } from '@/lib/security/ipBlockStore'
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

  if (!user) return { authorized: false, user: null }

  const { data: func } = await supabaseAdmin
    .from('funcionarios')
    .select('id, nome, is_superadmin')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!func || !func.is_superadmin) {
    return { authorized: false, user }
  }

  return { authorized: true, user, funcionario: func }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const { authorized, funcionario } = await checkSuperadmin(cookieStore)

    if (!authorized) {
      return NextResponse.json({ error: 'Acesso restrito ao Superadmin' }, { status: 403 })
    }

    const body = await request.json()
    const { ip_address, tipo_regra = 'BLOCK', motivo, duration_minutes } = body

    if (!ip_address || !motivo) {
      return NextResponse.json({ error: 'IP e motivo são obrigatórios' }, { status: 400 })
    }

    let blockedUntil: string | null = null
    const durationNum = duration_minutes ? parseInt(duration_minutes, 10) : null
    if (durationNum && durationNum > 0) {
      blockedUntil = new Date(Date.now() + durationNum * 60 * 1000).toISOString()
    }

    // Persiste no Supabase
    const { error } = await (supabaseAdmin as any).from('security_ip_rules').upsert(
      {
        ip_address: ip_address.trim(),
        tipo_regra,
        motivo: motivo.trim(),
        bloqueado_ate: blockedUntil,
        criado_por_id: funcionario?.id ?? null,
        criado_por_nome: funcionario?.nome ?? 'Superadmin',
        ativo: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'ip_address' }
    )

    if (error) throw error

    // Sincroniza em memória no isolate
    if (tipo_regra === 'BLOCK') {
      blockIpInMemory(ip_address.trim(), motivo.trim(), durationNum)
    } else if (tipo_regra === 'ALLOW') {
      addWhitelistIp(ip_address.trim())
    }

    return NextResponse.json({ success: true, message: `Regra de IP atualizada com sucesso para ${ip_address}` })
  } catch (err: any) {
    console.error('Erro ao bloquear/liberar IP:', err)
    return NextResponse.json({ error: err.message ?? 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies()
    const { authorized } = await checkSuperadmin(cookieStore)

    if (!authorized) {
      return NextResponse.json({ error: 'Acesso restrito ao Superadmin' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const ip = searchParams.get('ip')

    if (!id && !ip) {
      return NextResponse.json({ error: 'ID ou IP é obrigatório' }, { status: 400 })
    }

    let query = (supabaseAdmin as any).from('security_ip_rules').delete()
    if (id) {
      query = query.eq('id', id)
    } else if (ip) {
      query = query.eq('ip_address', ip)
    }

    const { error } = await query
    if (error) throw error

    if (ip) {
      unblockIpInMemory(ip)
    }

    return NextResponse.json({ success: true, message: 'Regra de IP removida com sucesso' })
  } catch (err: any) {
    console.error('Erro ao remover regra de IP:', err)
    return NextResponse.json({ error: err.message ?? 'Erro interno' }, { status: 500 })
  }
}
