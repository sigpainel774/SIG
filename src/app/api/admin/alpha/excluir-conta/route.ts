import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Validação de autenticação e verificação de Superadmin
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    const { data: funcionarioExecutor, error: funcError } = await supabase
      .from('funcionarios')
      .select('id, is_superadmin')
      .eq('auth_user_id', user.id)
      .single()

    if (funcError || !funcionarioExecutor?.is_superadmin) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores ROOT podem excluir contas de teste Alpha.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { funcionario_id } = body

    if (!funcionario_id) {
      return NextResponse.json(
        { error: 'ID do funcionário de teste é obrigatório.' },
        { status: 400 }
      )
    }

    // 2. Busca do funcionário para checar se é realmente conta Alpha
    const { data: alvo, error: findError } = await supabaseAdmin
      .from('funcionarios')
      .select('id, auth_user_id, is_alpha, email')
      .eq('id', funcionario_id)
      .single()

    if (findError || !alvo) {
      return NextResponse.json({ error: 'Conta de teste não encontrada.' }, { status: 404 })
    }

    if (!alvo.is_alpha) {
      return NextResponse.json(
        { error: 'Segurança: Não é permitido excluir contas oficiais através do módulo Alpha.' },
        { status: 400 }
      )
    }

    // 3. Exclui acessos e vínculos associados
    await supabaseAdmin.from('acessos_usuarios').delete().eq('funcionario_id', alvo.id)
    await supabaseAdmin.from('vinculos_funcionarios').delete().eq('funcionario_id', alvo.id)

    // 4. Remove da tabela funcionarios
    await supabaseAdmin.from('funcionarios').delete().eq('id', alvo.id)

    // 5. Remove do Supabase Auth se houver auth_user_id
    if (alvo.auth_user_id) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(alvo.auth_user_id)
      } catch (authDelErr) {
        console.warn('Aviso: Usuário auth já não existia ou falhou ao deletar:', authDelErr)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Conta de teste Alpha excluída com sucesso.',
    })
  } catch (error: any) {
    console.error('Erro interno ao excluir conta Alpha:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro interno no servidor ao excluir conta Alpha.' },
      { status: 500 }
    )
  }
}
