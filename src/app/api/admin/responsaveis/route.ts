import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createServerClient } from '@supabase/ssr'
import { parseUserAgent } from '@/lib/parseUserAgent'

// POST /api/admin/responsaveis
// Cria ou vincula um responsável e gera acesso no Supabase Auth com senha provisória
export async function POST(request: NextRequest) {
  try {
    // 1. Capturar metadados da sessão ativa do operador
    const clientIp = 
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      '127.0.0.1'
    const userAgentRaw = request.headers.get('user-agent') || ''
    const parsedUa = parseUserAgent(userAgentRaw)

    // 2. Validar autenticação do operador (Staff Nível 1, 2 ou 3 ou Superadmin)
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
      .select('id, nome, email, cargo, is_superadmin, acessos_usuarios(nivel, ativo, escola_id)')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    const isSuperAdmin = funcionario?.is_superadmin === true
    const acessos = (funcionario?.acessos_usuarios || []).filter((a: any) => a.ativo)
    const isStaff = isSuperAdmin || acessos.some((a: any) => [1, 2, 3].includes(a.nivel))

    if (!isStaff) {
      return NextResponse.json({ error: 'Acesso negado: permissão insuficiente para gerenciar responsáveis' }, { status: 403 })
    }

    // 3. Extrair e validar dados do body
    const body = await request.json()
    const { cpf, nome, email, telefone, senha_provisoria, aluno_ids, parentesco, escola_id } = body

    if (!cpf || !nome || !email || !aluno_ids || aluno_ids.length === 0) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes (CPF, Nome, E-mail e Alunos)' }, { status: 400 })
    }

    // Limpeza de máscara no CPF
    const cpfLimpo = cpf.replace(/\D/g, '')
    const emailLimpo = email.trim().toLowerCase()

    // Resolução segura de escola alvo para isolamento e auditoria (ES-1 / ES-3)
    const targetEscolaId = escola_id || acessos[0]?.escola_id || null

    // 4. Verificar se o responsável já existe pelo CPF
    const { data: responsavelExistente } = await supabaseAdmin
      .from('responsaveis')
      .select('*')
      .eq('cpf', cpfLimpo)
      .maybeSingle()

    let responsavelId: string
    let authUserId: string | null = null
    let criadoAgora = false
    let senhaRedefinida = false

    if (responsavelExistente) {
      responsavelId = responsavelExistente.id
      authUserId = responsavelExistente.auth_user_id

      // Atualizar dados cadastrais
      const updateData: any = {
        nome: nome.trim(),
        email: emailLimpo,
        telefone: telefone?.trim() || null,
        ativo: true
      }

      if (senha_provisoria && senha_provisoria.trim().length > 0) {
        updateData.must_change_password = true
        senhaRedefinida = true
      }

      await supabaseAdmin
        .from('responsaveis')
        .update(updateData)
        .eq('id', responsavelId)

      // Se informou nova senha provisória, atualizar no Supabase Auth
      if (senha_provisoria && senha_provisoria.trim().length > 0) {
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
      }
    } else {
      // Criação de novo responsável exige senha provisória
      if (!senha_provisoria || senha_provisoria.trim().length === 0) {
        return NextResponse.json({ error: 'A senha provisória é obrigatória para novos cadastros' }, { status: 400 })
      }

      // 5. Criar novo usuário no Supabase Auth com metadata tipo_conta: 'responsavel'
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
        if (authCreateErr.message?.toLowerCase().includes('already registered')) {
          return NextResponse.json({ error: 'Este e-mail já está cadastrado no sistema para outro usuário.' }, { status: 409 })
        }
        throw authCreateErr
      }

      authUserId = authData.user.id
      criadoAgora = true
      senhaRedefinida = true

      // 6. Inserir em public.responsaveis com rollback automático se falhar
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
        if (authUserId) {
          await supabaseAdmin.auth.admin.deleteUser(authUserId).catch(() => {})
        }
        throw dbErr
      }
    }

    // 7. Sincronizar vínculos com os alunos selecionados
    if (targetEscolaId) {
      // Buscar alunos da escola atual que o responsável possuía vínculo para desvincular os desmarcados
      const { data: alunosEscola } = await supabaseAdmin
        .from('alunos')
        .select('id')
        .eq('escola_id', targetEscolaId)
        .is('deleted_at', null)

      const idsAlunosEscola = (alunosEscola || []).map(a => a.id)
      const idsParaDesvincular = idsAlunosEscola.filter(id => !aluno_ids.includes(id))

      if (idsParaDesvincular.length > 0) {
        await supabaseAdmin
          .from('responsaveis_alunos')
          .delete()
          .eq('responsavel_id', responsavelId)
          .in('aluno_id', idsParaDesvincular)
      }
    }

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

    // 8. Buscar nomes e turmas dos alunos para enriquecer os logs de auditoria
    const { data: alunosData } = await supabaseAdmin
      .from('alunos')
      .select('id, nome, numero_matricula, turma_id, turmas:turma_id(nome)')
      .in('id', aluno_ids)

    const alunosDetalhes = (alunosData || []).map(a => ({
      id: a.id,
      nome: a.nome,
      matricula: a.numero_matricula || null,
      turma: (a.turmas as any)?.nome || 'Sem Turma'
    }))

    // 9. Registrar na Central de Atividades da Escola (public.audit_logs)
    const nivelOperador = acessos[0]?.nivel
    const cargoFallback = isSuperAdmin 
      ? 'Superadministrador' 
      : (nivelOperador === 2 ? 'Diretor(a) Escolar' : (nivelOperador === 1 ? 'Secretaria de Educação' : 'Secretário(a) Escolar'))
    
    const operadorNome = funcionario?.nome || user.email || 'Operador Escolar'
    const operadorCargo = funcionario?.cargo || cargoFallback
    const operadorEmail = funcionario?.email || user.email || ''
    const operadorId = funcionario?.id ?? user.id ?? null

    const sessaoOperador = {
      ip: clientIp,
      navegador: parsedUa.browser,
      sistema_operacional: parsedUa.os,
      dispositivo: parsedUa.deviceType,
      user_agent: userAgentRaw,
      data_hora: new Date().toISOString()
    }

    await supabaseAdmin
      .from('audit_logs')
      .insert({
        tenant_id: targetEscolaId,
        user_id: operadorId,
        user_name: operadorNome,
        user_email: operadorEmail,
        user_cargo: operadorCargo,
        action: criadoAgora ? 'CREATE' : 'UPDATE',
        entity: 'responsaveis',
        entity_id: responsavelId,
        ip_address: clientIp,
        old_data: responsavelExistente ? {
          nome: responsavelExistente.nome,
          email: responsavelExistente.email,
          telefone: responsavelExistente.telefone
        } : null,
        new_data: {
          responsavel_id: responsavelId,
          responsavel_nome: nome.trim(),
          responsavel_cpf: cpfLimpo,
          responsavel_email: emailLimpo,
          responsavel_telefone: telefone?.trim() || null,
          parentesco: parentesco || 'Responsável',
          senha_provisoria_gerada: senhaRedefinida,
          alunos_vinculados: alunosDetalhes,
          sessao_operador: sessaoOperador
        }
      })

    // 10. Gravar log especializado de responsáveis (public.responsavel_audit_log)
    await supabaseAdmin
      .from('responsavel_audit_log')
      .insert({
        responsavel_id: responsavelId,
        acao: criadoAgora ? 'criacao_responsavel' : 'atualizacao_responsavel',
        executado_por: user.id,
        detalhes: {
          operador_id: operadorId,
          operador_nome: operadorNome,
          operador_cargo: operadorCargo,
          operador_email: operadorEmail,
          alunos_vinculados: alunosDetalhes,
          escola_id: targetEscolaId,
          senha_provisoria_gerada: senhaRedefinida,
          sessao_operador: sessaoOperador
        }
      })

    return NextResponse.json({
      success: true,
      responsavel_id: responsavelId,
      mensagem: criadoAgora 
        ? 'Responsável e acesso criados com sucesso!' 
        : 'Cadastro do responsável atualizado com sucesso!'
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
    const checkCpf = searchParams.get('check_cpf') || searchParams.get('cpf')
    const escolaId = searchParams.get('escola_id')

    // Sub-fluxo 1: Verificação de existência de CPF na rede municipal
    if (checkCpf) {
      const cpfLimpo = checkCpf.replace(/\D/g, '')
      if (cpfLimpo.length !== 11) {
        return NextResponse.json({ error: 'CPF inválido: deve conter 11 dígitos' }, { status: 400 })
      }

      const { data: resp, error: respErr } = await supabaseAdmin
        .from('responsaveis')
        .select('id, auth_user_id, cpf, nome, email, telefone, ativo, must_change_password, created_at')
        .eq('cpf', cpfLimpo)
        .maybeSingle()

      if (respErr) throw respErr

      if (!resp) {
        return NextResponse.json({ responsavel: null })
      }

      // Buscar todos os dependentes já vinculados a este responsável na rede inteira
      const { data: vinculosRede, error: vincRedeErr } = await supabaseAdmin
        .from('responsaveis_alunos')
        .select(`
          id,
          parentesco,
          aluno_id,
          aluno:aluno_id (
            id, 
            nome, 
            numero_matricula, 
            escola_id, 
            turma_id,
            escolas:escola_id (id, nome),
            turmas:turma_id (id, nome)
          )
        `)
        .eq('responsavel_id', resp.id)

      if (vincRedeErr) throw vincRedeErr

      const dependentesRede = (vinculosRede || []).map((item: any) => ({
        id: item.aluno?.id || item.aluno_id,
        nome: item.aluno?.nome || 'Aluno',
        numero_matricula: item.aluno?.numero_matricula || null,
        escola_id: item.aluno?.escola_id,
        escola_nome: item.aluno?.escolas?.nome || 'Outra Escola da Rede',
        turma_nome: item.aluno?.turmas?.nome || 'Sem Turma',
        parentesco: item.parentesco || 'Responsável'
      }))

      return NextResponse.json({
        responsavel: {
          ...resp,
          dependentes_rede: dependentesRede
        }
      })
    }

    if (!escolaId) {
      return NextResponse.json({ error: 'Parâmetro escola_id ou check_cpf obrigatório' }, { status: 400 })
    }

    // Sub-fluxo 2: Busca os alunos matriculados nessa escola
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
