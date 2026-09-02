import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { logAudit } from '@/lib/audit/audit-agent'
import { revalidateTag } from 'next/cache'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function getAuthenticatedSuperadmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: funcionario, error: funcErr } = await supabaseAdmin
    .from('funcionarios')
    .select('id, nome, email, is_superadmin')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (funcErr) {
    console.error('[create-auth] Erro ao buscar funcionário executor:', funcErr.message)
  }

  if (!funcionario?.is_superadmin) return null
  return funcionario
}

function getInitialNivelByCargo(cargo?: string | null): {
  nivel: number
  pode_turmas: boolean
  pode_alunos: boolean
  pode_mural: boolean
  pode_ocorrencias: boolean
  pode_matriculas: boolean
  pode_atestados: boolean
  pode_funcionarios: boolean
} {
  const cleanCargo = (cargo ?? '').toUpperCase()
  if (cleanCargo.includes('DIRETOR')) {
    return {
      nivel: 2,
      pode_turmas: true,
      pode_alunos: true,
      pode_mural: true,
      pode_ocorrencias: true,
      pode_matriculas: true,
      pode_atestados: true,
      pode_funcionarios: true,
    }
  }
  if (cleanCargo.includes('SECRETAR') || cleanCargo.includes('COORDENADOR')) {
    return {
      nivel: 3,
      pode_turmas: true,
      pode_alunos: true,
      pode_mural: true,
      pode_ocorrencias: true,
      pode_matriculas: true,
      pode_atestados: true,
      pode_funcionarios: false,
    }
  }
  if (cleanCargo.includes('VIGIA') || cleanCargo.includes('GUARDA') || cleanCargo.includes('MOTORISTA') || cleanCargo.includes('MERENDEIRA') || cleanCargo.includes('OPERACIONAL') || cleanCargo.includes('SERVIÇOS')) {
    return {
      nivel: 6,
      pode_turmas: false,
      pode_alunos: false,
      pode_mural: true,
      pode_ocorrencias: false,
      pode_matriculas: false,
      pode_atestados: false,
      pode_funcionarios: false,
    }
  }
  if (cleanCargo.includes('CHEFE') || cleanCargo.includes('FISCAL')) {
    return {
      nivel: 5,
      pode_turmas: false,
      pode_alunos: false,
      pode_mural: true,
      pode_ocorrencias: false,
      pode_matriculas: false,
      pode_atestados: false,
      pode_funcionarios: false,
    }
  }
  // Padrão: Professor / Docente (Nível 4)
  return {
    nivel: 4,
    pode_turmas: true,
    pode_alunos: true,
    pode_mural: true,
    pode_ocorrencias: true,
    pode_matriculas: false,
    pode_atestados: false,
    pode_funcionarios: false,
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAuthenticatedSuperadmin()
    if (!admin) {
      return NextResponse.json(
        { error: 'Acesso negado: Apenas Superadministradores podem criar credenciais de acesso para servidores.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { funcionarioId, email, senhaProvisoria } = body ?? {}

    if (!funcionarioId || typeof funcionarioId !== 'string' || !UUID_REGEX.test(funcionarioId)) {
      return NextResponse.json(
        { error: 'O identificador do funcionário (funcionarioId) é inválido ou nulo.' },
        { status: 400 }
      )
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'O e-mail de acesso é obrigatório.' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()

    if (!EMAIL_REGEX.test(cleanEmail)) {
      return NextResponse.json({ error: 'O formato do e-mail informado é inválido.' }, { status: 400 })
    }

    if (!senhaProvisoria || typeof senhaProvisoria !== 'string' || senhaProvisoria.length < 6) {
      return NextResponse.json({ error: 'A senha provisória deve possuir no mínimo 6 caracteres.' }, { status: 400 })
    }

    // 1. Obter dados do funcionário no banco
    const { data: funcionario, error: funcError } = await supabaseAdmin
      .from('funcionarios')
      .select('id, nome, email, cargo, auth_user_id, status, is_superadmin')
      .eq('id', funcionarioId)
      .maybeSingle()

    if (funcError || !funcionario) {
      return NextResponse.json({ error: 'Funcionário não localizado no cadastro municipal.' }, { status: 404 })
    }

    // 2. Verificar se o e-mail informado já está vinculado a outro funcionário diferente
    const { data: existingOtherFunc, error: errExisting } = await supabaseAdmin
      .from('funcionarios')
      .select('id, nome')
      .eq('email', cleanEmail)
      .neq('id', funcionarioId)
      .maybeSingle()

    if (errExisting) {
      console.error('[create-auth] Erro ao verificar duplicidade de e-mail:', errExisting.message)
    }

    if (existingOtherFunc) {
      return NextResponse.json(
        { error: `O e-mail "${cleanEmail}" já está cadastrado para outro funcionário (${existingOtherFunc.nome}).` },
        { status: 409 }
      )
    }

    let authUserId = funcionario.auth_user_id

    // 3. Provisionamento no Supabase Auth com email_confirm: true
    if (authUserId) {
      // Se já tem auth_user_id, atualiza a senha provisória e confirma o e-mail
      const { error: updateAuthErr } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        email: cleanEmail,
        password: senhaProvisoria,
        email_confirm: true,
        user_metadata: {
          nome: funcionario.nome,
          cargo: funcionario.cargo,
          primeiro_acesso: true,
        },
      })

      if (updateAuthErr) {
        console.error('[create-auth] Erro ao atualizar usuário existente no Auth:', updateAuthErr.message)
        return NextResponse.json(
          { error: `Falha ao atualizar conta no provedor de autenticação: ${updateAuthErr.message}` },
          { status: 500 }
        )
      }
    } else {
      // Tentar criar novo usuário autoconfirmado
      const { data: authData, error: createAuthErr } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: senhaProvisoria,
        email_confirm: true,
        user_metadata: {
          nome: funcionario.nome,
          cargo: funcionario.cargo,
          primeiro_acesso: true,
        },
      })

      if (createAuthErr) {
        // Blindagem contra e-mail já existente no auth.users sem vínculo em funcionarios
        if (createAuthErr.message?.toLowerCase().includes('already registered') || createAuthErr.message?.toLowerCase().includes('already exists')) {
          // Localizar o usuário pelo e-mail
          const { data: usersList, error: listErr } = await supabaseAdmin.auth.admin.listUsers()
          const matchedUser = !listErr ? usersList?.users?.find(u => u.email?.toLowerCase() === cleanEmail) : null

          if (matchedUser) {
            authUserId = matchedUser.id
            // Atualiza a senha provisória e confirma o e-mail da conta existente
            await supabaseAdmin.auth.admin.updateUserById(authUserId, {
              password: senhaProvisoria,
              email_confirm: true,
              user_metadata: {
                nome: funcionario.nome,
                cargo: funcionario.cargo,
                primeiro_acesso: true,
              },
            })
          } else {
            return NextResponse.json(
              { error: 'Este e-mail já possui uma conta no provedor de autenticação com status inconsistente.' },
              { status: 409 }
            )
          }
        } else {
          console.error('[create-auth] Erro ao criar usuário no Supabase Auth:', createAuthErr.message)
          return NextResponse.json(
            { error: `Falha ao criar conta no provedor de autenticação: ${createAuthErr.message}` },
            { status: 500 }
          )
        }
      } else if (authData?.user) {
        authUserId = authData.user.id
      }
    }

    if (!authUserId) {
      return NextResponse.json({ error: 'Não foi possível determinar o identificador da conta de autenticação.' }, { status: 500 })
    }

    // 4. Atualizar registro em public.funcionarios (vincular auth_user_id, primeiro_acesso e e-mail)
    const { error: updateFuncErr } = await supabaseAdmin
      .from('funcionarios')
      .update({
        auth_user_id: authUserId,
        email: cleanEmail,
        primeiro_acesso: true,
        status: funcionario.status?.toLowerCase() === 'inativo' ? 'ativo' : (funcionario.status ?? 'ativo'),
      })
      .eq('id', funcionarioId)

    if (updateFuncErr) {
      console.error('[create-auth] Erro ao vincular auth_user_id em public.funcionarios:', updateFuncErr.message)
      return NextResponse.json(
        { error: `Erro ao vincular conta ao funcionário no banco: ${updateFuncErr.message}` },
        { status: 500 }
      )
    }

    // 5. Garantir existência de registro em public.acessos_usuarios
    const { data: acessoExistente, error: errAcesso } = await supabaseAdmin
      .from('acessos_usuarios')
      .select('id')
      .eq('funcionario_id', funcionarioId)
      .maybeSingle()

    if (errAcesso) {
      console.error('[create-auth] Erro ao verificar acesso existente:', errAcesso.message)
    }

    if (!acessoExistente) {
      // Buscar escola vinculada ativa se houver
      const { data: vinculoAtivo, error: errVinculo } = await supabaseAdmin
        .from('vinculos_funcionarios')
        .select('escola_id')
        .eq('funcionario_id', funcionarioId)
        .eq('ativo', true)
        .limit(1)
        .maybeSingle()

      if (errVinculo) {
        console.error('[create-auth] Erro ao buscar vínculo escolar ativo:', errVinculo.message)
      }

      const initialPerms = getInitialNivelByCargo(funcionario.cargo)

      const { error: errInsertAcesso } = await supabaseAdmin.from('acessos_usuarios').insert({
        funcionario_id: funcionarioId,
        escola_id: vinculoAtivo?.escola_id ?? null,
        nivel: initialPerms.nivel,
        ativo: true,
        pode_turmas: initialPerms.pode_turmas,
        pode_alunos: initialPerms.pode_alunos,
        pode_mural: initialPerms.pode_mural,
        pode_ocorrencias: initialPerms.pode_ocorrencias,
        pode_matriculas: initialPerms.pode_matriculas,
        pode_atestados: initialPerms.pode_atestados,
        pode_funcionarios: initialPerms.pode_funcionarios,
      })

      if (errInsertAcesso) {
        console.error('[create-auth] Erro ao inserir acesso inicial do funcionário:', errInsertAcesso.message)
      }
    }

    // 6. Invalidar tags de cache de perfil no Next.js
    try {
      revalidateTag(`perfil-${authUserId}`, {})
      revalidateTag(`perfil-usuario-${authUserId}`, {})
    } catch (cacheErr) {
      console.warn('[create-auth] Aviso ao revalidar tag de cache:', cacheErr)
    }

    // 7. Registrar auditoria (NUNCA incluir a senha nos metadados)
    await logAudit({
      supabase: supabaseAdmin,
      action: 'CREATE',
      entity: 'auth.users (create_auth_user)',
      entityId: funcionarioId,
      newData: {
        funcionario_id: funcionarioId,
        auth_user_id: authUserId,
        email: cleanEmail,
        autoconfirmed: true,
        primeiro_acesso: true,
      },
      performedBy: {
        id: admin.id,
        name: admin.nome,
        email: admin.email,
        cargo: 'SUPERADMIN',
      },
    })

    return NextResponse.json({
      success: true,
      authUserId,
      email: cleanEmail,
      message: `Conta de acesso autoconfirmada criada com sucesso para ${funcionario.nome}!`,
    })
  } catch (err: any) {
    console.error('[create-auth] Erro inesperado:', err?.message || err)
    return NextResponse.json({ error: 'Erro interno ao criar conta de acesso do servidor.' }, { status: 500 })
  }
}
