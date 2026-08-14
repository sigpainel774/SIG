import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createServerClient } from '@supabase/ssr'

// POST /api/admin/responsaveis
// Cria ou vincula um responsável e gera acesso no Supabase Auth com senha provisória
export async function POST(request: NextRequest) {
  try {
    // 1. Validar autenticação do operador (Staff Nível 1, 2 ou 3 ou Superadmin)
    let response = NextResponse.next()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
            response = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          }
        }
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: funcionario } = await supabaseAdmin
      .from('funcionarios')
      .select('id, nome, is_superadmin, acessos_usuarios(nivel, ativo)')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    const isSuperAdmin = funcionario?.is_superadmin === true
    const acessos = (funcionario?.acessos_usuarios || []).filter((a: any) => a.ativo)
    const isStaff = isSuperAdmin || acessos.some((a: any) => [1, 2, 3].includes(a.nivel))

    if (!isStaff) {
      return NextResponse.json({ error: 'Acesso negado: permissão insuficiente para gerenciar responsáveis' }, { status: 403 })
    }

    // 2. Extrair e validar dados do body
    const body = await request.json()
    const { cpf, nome, email, telefone, senha_provisoria, aluno_ids, parentesco, escola_id } = body

    if (!cpf || !nome || !email || !senha_provisoria || !aluno_ids || aluno_ids.length === 0) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes (CPF, Nome, E-mail, Senha e Alunos)' }, { status: 400 })
    }

    // Limpeza de máscara no CPF
    const cpfLimpo = cpf.replace(/\D/g, '')
    const emailLimpo = email.trim().toLowerCase()

    // 3. Verificar se o responsável já existe pelo CPF
    const { data: responsavelExistente } = await supabaseAdmin
      .from('responsaveis')
      .select('*')
      .eq('cpf', cpfLimpo)
      .maybeSingle()

    let responsavelId: string
    let authUserId: string | null = null
    let criadoAgora = false

    if (responsavelExistente) {
      responsavelId = responsavelExistente.id
      authUserId = responsavelExistente.auth_user_id

      // Atualizar dados cadastrais caso tenham mudado
      await supabaseAdmin
        .from('responsaveis')
        .update({
          nome: nome.trim(),
          email: emailLimpo,
          telefone: telefone?.trim() || null,
          must_change_password: true,
          ativo: true
        })
        .eq('id', responsavelId)

      // Se já tinha auth_user_id, resetar a senha para a nova senha provisória
      if (authUserId) {
        await supabaseAdmin.auth.admin.updateUserById(authUserId, {
          password: senha_provisoria,
          user_metadata: {
            tipo_conta: 'responsavel',
            must_change_password: true,
            nome: nome.trim()
          }
        })
      } else {
        // Se não tinha auth_user_id vinculado, criar no Auth
        const { data: authData, error: authCreateErr } = await supabaseAdmin.auth.admin.createUser({
          email: emailLimpo,
          password: senha_provisoria,
          email_confirm: true,
          user_metadata: {
            tipo_conta: 'responsavel',
            must_change_password: true,
            nome: nome.trim()
          }
        })
        if (authCreateErr) throw authCreateErr
        authUserId = authData.user.id
        await supabaseAdmin
          .from('responsaveis')
          .update({ auth_user_id: authUserId })
          .eq('id', responsavelId)
      }
    } else {
      // 4. Criar novo usuário no Supabase Auth com metadata tipo_conta: 'responsavel'
      const { data: authData, error: authCreateErr } = await supabaseAdmin.auth.admin.createUser({
        email: emailLimpo,
        password: senha_provisoria,
        email_confirm: true,
        user_metadata: {
          tipo_conta: 'responsavel',
          must_change_password: true,
          nome: nome.trim()
        }
      })

      if (authCreateErr) {
        // Se o email já existe no Auth mas não no responsaveis
        if (authCreateErr.message?.toLowerCase().includes('already registered')) {
          return NextResponse.json({ error: 'Este e-mail já está cadastrado no sistema para outro usuário.' }, { status: 409 })
        }
        throw authCreateErr
      }

      authUserId = authData.user.id
      criadoAgora = true

      // 5. Inserir em public.responsaveis com rollback automático se falhar
      try {
        const { data: novoResp, error: insertErr } = await supabaseAdmin
          .from('responsaveis')
          .insert({
            auth_user_id: authUserId,
            cpf: cpfLimpo,
            nome: nome.trim(),
            email: emailLimpo,
            telefone: telefone?.trim() || null,
            ativo: true,
            must_change_password: true,
            criado_por: user.id
          })
          .select('id')
          .single()

        if (insertErr) throw insertErr
        responsavelId = novoResp.id
      } catch (dbErr: any) {
        // Rollback: Deleta o usuário recém-criado em auth.users para não deixar conta órfã (ES-7)
        if (authUserId) {
          await supabaseAdmin.auth.admin.deleteUser(authUserId).catch(() => {})
        }
        throw dbErr
      }
    }

    // 6. Inserir vínculos com os alunos selecionados (ON CONFLICT DO NOTHING)
    const vinculosParaInserir = aluno_ids.map((alunoId: string) => ({
      responsavel_id: responsavelId,
      aluno_id: alunoId,
      parentesco: parentesco || 'Responsável'
    }))

    for (const v of vinculosParaInserir) {
      await supabaseAdmin
        .from('responsaveis_alunos')
        .upsert(v, { onConflict: 'responsavel_id,aluno_id' })
    }

    // 7. Gravar log de auditoria
    await supabaseAdmin
      .from('responsavel_audit_log')
      .insert({
        responsavel_id: responsavelId,
        acao: criadoAgora ? 'criacao_responsavel' : 'atualizacao_responsavel',
        executado_por: user.id,
        detalhes: {
          operador_nome: funcionario?.nome,
          alunos_vinculados: aluno_ids,
          escola_id: escola_id || null,
          timestamp: new Date().toISOString()
        }
      })

    return NextResponse.json({
      success: true,
      responsavel_id: responsavelId,
      mensagem: 'Responsável e acessos configurados com sucesso!'
    })
  } catch (error: any) {
    console.error('Erro na rota /api/admin/responsaveis:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao processar cadastro de responsável' },
      { status: 500 }
    )
  }
}

// GET /api/admin/responsaveis?escola_id=...
// Lista todos os responsáveis que possuem dependentes matriculados na escola solicitada
export async function GET(request: NextRequest) {
  try {
    // 1. Validar autenticação do operador (Staff Nível 1, 2 ou 3 ou Superadmin)
    let response = NextResponse.next()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
            response = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          }
        }
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: funcionario } = await supabaseAdmin
      .from('funcionarios')
      .select('id, is_superadmin, acessos_usuarios(nivel, ativo, escola_id)')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    const isSuperAdmin = funcionario?.is_superadmin === true
    const acessos = (funcionario?.acessos_usuarios || []).filter((a: any) => a.ativo)
    const isStaff = isSuperAdmin || acessos.some((a: any) => [1, 2, 3].includes(a.nivel))

    if (!isStaff) {
      return NextResponse.json({ error: 'Acesso negado: permissão insuficiente para visualizar responsáveis' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const escolaId = searchParams.get('escola_id')

    if (!escolaId) {
      return NextResponse.json({ error: 'Parâmetro escola_id obrigatório' }, { status: 400 })
    }

    // Busca os alunos matriculados nessa escola
    const { data: alunosEscola, error: alunosErr } = await supabaseAdmin
      .from('alunos')
      .select('id')
      .eq('escola_id', escolaId)
      .is('deleted_at', null)

    if (alunosErr) throw alunosErr

    const alunoIds = (alunosEscola || []).map(a => a.id)

    if (alunoIds.length === 0) {
      return NextResponse.json({ responsaveis: [] })
    }

    // Busca os vínculos desses alunos com seus responsáveis
    const { data: vinculos, error: vincErr } = await supabaseAdmin
      .from('responsaveis_alunos')
      .select(`
        id,
        parentesco,
        aluno_id,
        aluno:aluno_id (id, nome, numero_matricula, turma_id, turmas:turma_id(nome)),
        responsavel:responsavel_id (id, auth_user_id, cpf, nome, email, telefone, ativo, must_change_password, created_at)
      `)
      .in('aluno_id', alunoIds)

    if (vincErr) throw vincErr

    // Agrupar por responsável único (com lista de filhos)
    const responsaveisMap = new Map<string, any>()

    for (const item of (vinculos || [])) {
      const resp = item.responsavel
      if (!resp) continue

      if (!responsaveisMap.has(resp.id)) {
        responsaveisMap.set(resp.id, {
          ...resp,
          alunos: []
        })
      }

      if (item.aluno) {
        responsaveisMap.get(resp.id).alunos.push({
          id: item.aluno.id,
          nome: item.aluno.nome,
          numero_matricula: item.aluno.numero_matricula,
          turma_nome: item.aluno.turmas?.nome || '-',
          parentesco: item.parentesco
        })
      }
    }

    const lista = Array.from(responsaveisMap.values()).sort((a, b) => a.nome.localeCompare(b.nome))

    return NextResponse.json({ responsaveis: lista })
  } catch (error: any) {
    console.error('Erro ao buscar responsáveis da escola:', error)
    return NextResponse.json({ error: error?.message || 'Erro ao carregar responsáveis' }, { status: 500 })
  }
}
