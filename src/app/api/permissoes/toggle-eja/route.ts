import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { invalidarCachePerfil } from '@/lib/invalidarCachePerfil'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabaseServer = createServerClient(
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
            } catch {
              // Ignorar contexto de execução se imutável
            }
          },
        },
      }
    )

    const {
      data: { user },
      error: userError,
    } = await supabaseServer.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado. Por favor, faça login.' },
        { status: 401 }
      )
    }

    const { acessoUsuarioId, podeEja, funcionarioId } = await request.json()

    if (!acessoUsuarioId || typeof podeEja !== 'boolean') {
      return NextResponse.json(
        { error: 'acessoUsuarioId e podeEja (boolean) são obrigatórios.' },
        { status: 400 }
      )
    }

    // 1. Obter dados do usuário solicitante
    const isSuperAdmin = user.app_metadata?.is_superadmin === true
    let solicitanteFuncionario: any = null

    const { data: func } = await supabaseAdmin
      .from('funcionarios')
      .select('id, is_superadmin')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    solicitanteFuncionario = func
    const isSuperAdminDb = Boolean(func?.is_superadmin || isSuperAdmin)

    // 2. Obter o registro de acesso que está sendo modificado
    const { data: targetAcesso, error: targetError } = await supabaseAdmin
      .from('acessos_usuarios')
      .select('id, funcionario_id, escola_id, pode_eja')
      .eq('id', acessoUsuarioId)
      .maybeSingle()

    if (targetError || !targetAcesso) {
      return NextResponse.json(
        { error: 'Registro de acesso não encontrado.' },
        { status: 404 }
      )
    }

    // 3. Validação de autorização: Superadmin OU Diretor (nível 2) da mesma escola
    if (!isSuperAdminDb) {
      if (!solicitanteFuncionario?.id || !targetAcesso.escola_id) {
        return NextResponse.json(
          { error: 'Acesso não autorizado para esta operação.' },
          { status: 403 }
        )
      }

      // Verificar se o solicitante possui nível 2 (Diretor) ou nível 1 na escola do targetAcesso
      const { data: solicitanteAcessos } = await supabaseAdmin
        .from('acessos_usuarios')
        .select('nivel, escola_id, ativo')
        .eq('funcionario_id', solicitanteFuncionario.id)
        .eq('ativo', true)

      const isDiretorDaEscola = (solicitanteAcessos || []).some(
        (a: any) =>
          (a.nivel === 2 && a.escola_id === targetAcesso.escola_id) ||
          a.nivel === 1
      )

      if (!isDiretorDaEscola) {
        return NextResponse.json(
          { error: 'Apenas a Direção da escola ou Administradores podem configurar o acesso EJA.' },
          { status: 403 }
        )
      }
    }

    // 4. Atualizar a flag pode_eja no banco usando supabaseAdmin
    const { error: updateError } = await supabaseAdmin
      .from('acessos_usuarios')
      .update({ pode_eja: podeEja })
      .eq('id', acessoUsuarioId)

    if (updateError) {
      console.error('Erro ao atualizar pode_eja via API:', updateError)
      return NextResponse.json(
        { error: 'Falha ao atualizar permissão EJA no banco.' },
        { status: 500 }
      )
    }

    // 5. Invalidar cache de perfil do funcionário alterado
    const targetFuncId = funcionarioId || targetAcesso.funcionario_id
    if (targetFuncId) {
      try {
        await invalidarCachePerfil(targetFuncId)
      } catch (err) {
        console.warn('Aviso ao invalidar cache do perfil:', err)
      }
    }

    return NextResponse.json({
      success: true,
      pode_eja: podeEja,
      message: podeEja
        ? 'Acesso ao módulo EJA liberado com sucesso.'
        : 'Acesso ao módulo EJA revogado.',
    })
  } catch (error: any) {
    console.error('Erro no endpoint toggle-eja:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro interno no servidor.' },
      { status: 500 }
    )
  }
}
