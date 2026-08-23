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
        { error: 'Acesso negado. Apenas administradores ROOT podem criar contas de teste Alpha.' },
        { status: 403 }
      )
    }

    // 2. Leitura e sanitização dos dados do formulário
    const body = await request.json()
    const { nome, email, senha, cargo, escola_id } = body

    if (!nome || !email || !senha) {
      return NextResponse.json(
        { error: 'Nome, e-mail e senha são obrigatórios.' },
        { status: 400 }
      )
    }

    if (String(senha).length < 6) {
      return NextResponse.json(
        { error: 'A senha de teste deve ter no mínimo 6 caracteres.' },
        { status: 400 }
      )
    }

    const cleanEmail = String(email).trim().toLowerCase()
    const cleanNome = String(nome).trim()
    const cleanCargo = cargo ? String(cargo).trim() : 'Operador Alpha'

    // Verificar se já existe um funcionário oficial cadastrado com este e-mail
    const { data: funcionarioExistente } = await supabaseAdmin
      .from('funcionarios')
      .select('id, is_alpha, email, auth_user_id')
      .eq('email', cleanEmail)
      .maybeSingle()

    if (funcionarioExistente && !funcionarioExistente.is_alpha) {
      return NextResponse.json(
        { error: 'Já existe um funcionário oficial cadastrado com este e-mail no SIG. Use outro e-mail para a conta de teste.' },
        { status: 400 }
      )
    }

    // Se já existia um usuário auth anterior para esta conta de teste, limpamos antes de recriar
    if (funcionarioExistente?.auth_user_id) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(funcionarioExistente.auth_user_id)
      } catch (delErr) {
        console.warn('Usuário auth prévio não encontrado ou já excluído:', delErr)
      }
    }

    // 3. Criação do usuário autoconfirmado no Supabase Auth usando supabaseAdmin
    const { data: authData, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: String(senha),
      email_confirm: true,
      user_metadata: {
        nome: cleanNome,
        cargo: cleanCargo,
        is_alpha: true,
        tipo_conta: 'funcionario',
        must_change_password: false,
      },
    })

    if (authCreateError || !authData.user) {
      console.error('Erro ao criar usuário auth no Alpha:', authCreateError)
      return NextResponse.json(
        { error: authCreateError?.message || 'Falha ao criar usuário de autenticação.' },
        { status: 400 }
      )
    }

    const authUserId = authData.user.id

    // 4. Inserção / Atualização (Upsert) na tabela public.funcionarios
    // O trigger on_auth_user_created pode já ter inserido a linha básica ao criar o usuário auth.
    // Usamos upsert por onConflict email para garantir que todos os dados do Alpha fiquem preenchidos sem estourar duplicate key.
    const { data: novoFuncionario, error: upsertFuncError } = await supabaseAdmin
      .from('funcionarios')
      .upsert(
        {
          id: funcionarioExistente?.id,
          auth_user_id: authUserId,
          nome: cleanNome,
          email: cleanEmail,
          cargo: cleanCargo,
          status: 'ativo',
          primeiro_acesso: false,
          is_superadmin: false,
          is_alpha: true,
          observacoes: '[SISTEMA ALPHA] Conta de teste operacional autoconfirmada',
        },
        { onConflict: 'email' }
      )
      .select('id, nome, email, cargo, is_alpha, created_at')
      .single()

    if (upsertFuncError || !novoFuncionario) {
      console.error('Erro ao vincular funcionario Alpha:', upsertFuncError)
      // Rollback do usuário no auth e do registro criado
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUserId)
        await supabaseAdmin.from('funcionarios').delete().eq('email', cleanEmail)
      } catch (rollbackErr) {
        console.error('Erro no rollback:', rollbackErr)
      }
      return NextResponse.json(
        { error: `Falha ao vincular cadastro funcional da conta de teste: ${upsertFuncError?.message || 'Erro desconhecido'}` },
        { status: 500 }
      )
    }

    // 5. Criação de vínculo escolar se informado
    if (escola_id) {
      await supabaseAdmin.from('vinculos_funcionarios').delete().eq('funcionario_id', novoFuncionario.id)
      await supabaseAdmin.from('vinculos_funcionarios').insert({
        funcionario_id: novoFuncionario.id,
        escola_id: escola_id,
        cargo: cleanCargo,
        ativo: true,
        carga_horaria: 40,
      })
    }

    // 6. Criação de registro em acessos_usuarios com perfil operacional (Nível 4)
    const { data: acessoExistente } = await supabaseAdmin
      .from('acessos_usuarios')
      .select('id')
      .eq('funcionario_id', novoFuncionario.id)
      .maybeSingle()

    if (acessoExistente) {
      await supabaseAdmin
        .from('acessos_usuarios')
        .update({
          nivel: 4,
          escola_id: escola_id || null,
          ativo: true,
        })
        .eq('id', acessoExistente.id)
    } else {
      await supabaseAdmin.from('acessos_usuarios').insert({
        funcionario_id: novoFuncionario.id,
        escola_id: escola_id || null,
        nivel: 4, // Nível operacional / equipe de apoio
        ativo: true,
        pode_alunos: false,
        pode_turmas: false,
        pode_funcionarios: false,
        pode_matriculas: false,
        pode_ocorrencias: false,
        pode_mural: false,
        pode_atestados: false,
        pode_rh_rede: false,
        pode_eja: false,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Conta de teste Alpha criada e autoconfirmada com sucesso!',
      funcionario: novoFuncionario,
    })
  } catch (error: any) {
    console.error('Erro interno na criação de conta Alpha:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro interno no servidor ao criar conta Alpha.' },
      { status: 500 }
    )
  }
}
