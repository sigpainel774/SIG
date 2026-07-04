import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    const supabase = await createClient()

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    const userId = authData.user.id

    // Busca perfil do funcionário
    const { data: funcionario } = await supabaseAdmin
      .from('funcionarios')
      .select('*')
      .ilike('email', email)
      .maybeSingle()

    if (!funcionario) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
    }

    // Registra log de acesso
    await supabaseAdmin.from('access_logs').insert({
      evento: 'login',
      email: email,
      detalhes: { tipo: funcionario.is_superadmin ? 'superadmin' : 'usuario_escolar' }
    })

    // Bifurcação SuperAdmin
    if (funcionario.is_superadmin) {
      return NextResponse.json({
        redirect: '/admin',
        funcionario,
        acessos: []
      })
    }

    // Busca acessos para usuários escolares
    const { data: acessos } = await supabaseAdmin
      .from('acessos_usuarios')
      .select('*')
      .eq('funcionario_id', funcionario.id)

    return NextResponse.json({
      redirect: '/home',
      funcionario,
      acessos: acessos || []
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}
