import { SupabaseClient } from '@supabase/supabase-js'

export async function logAudit(params: {
  supabase: SupabaseClient
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'PURGE' | 'PERMISSION_CHANGE' | 'LOGIN' | 'LOGIN_FAILED' | 'LOGOUT'
  entity: string
  entityId: string
  oldData?: object | null
  newData?: object | null
  performedBy: { id: string | null; name: string; email: string; cargo?: string }
  tenantId?: string
}) {
  try {
    const { error } = await params.supabase.from('audit_logs').insert({
      tenant_id: params.tenantId || null,
      user_id: params.performedBy.id || null,
      user_name: params.performedBy.name,
      user_email: params.performedBy.email,
      user_cargo: params.performedBy.cargo || null,
      action: params.action,
      entity: params.entity,
      entity_id: params.entityId,
      old_data: params.oldData || null,
      new_data: params.newData || null,
      ip_address: null, // Pode ser adicionado futuramente via req headers
    })

    if (error) {
      console.error('Erro ao registrar log de auditoria:', error)
    }
  } catch (error) {
    console.error('Falha inesperada no logAudit:', error)
  }
}

export async function softDeleteToTrash(params: {
  supabase: SupabaseClient
  tableName: string
  recordId: string
  recordSummary: string
  recordPayload: object
  performedBy: { id: string | null; name: string; email: string }
  tenantId?: string
}) {
  try {
    // 1. Marcar como deletado na tabela original
    const { error: deleteError } = await params.supabase
      .from(params.tableName)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', params.recordId)

    if (deleteError) {
      console.error(`Erro no soft delete da tabela ${params.tableName}:`, deleteError)
      return { success: false, error: deleteError }
    }

    // 2. Inserir na lixeira global
    const { error: trashError } = await params.supabase.from('trash_bin').insert({
      tenant_id: params.tenantId || null,
      table_name: params.tableName,
      record_id: params.recordId,
      record_summary: params.recordSummary,
      record_payload: params.recordPayload,
      deleted_by_id: params.performedBy.id || null,
      deleted_by_name: params.performedBy.name,
      deleted_by_email: params.performedBy.email,
      status: 'PENDING',
    })

    if (trashError) {
      console.error('Erro ao inserir na trash_bin:', trashError)
      return { success: false, error: trashError }
    }

    // 3. Registrar auditoria
    await logAudit({
      supabase: params.supabase,
      action: 'DELETE',
      entity: params.tableName,
      entityId: params.recordId,
      oldData: params.recordPayload,
      performedBy: params.performedBy,
      tenantId: params.tenantId,
    })

    return { success: true }
  } catch (error) {
    console.error('Falha inesperada no softDeleteToTrash:', error)
    return { success: false, error }
  }
}

export async function restoreFromTrash(params: {
  supabaseAdmin: SupabaseClient
  trashItemId: string
  tableName: string
  recordId: string
  performedBy: { id: string; name: string; email: string; cargo?: string }
  note?: string
}) {
  try {
    // 1. Restaurar na tabela original (zerar deleted_at)
    const { error: restoreError } = await params.supabaseAdmin
      .from(params.tableName)
      .update({ deleted_at: null })
      .eq('id', params.recordId)

    if (restoreError) throw restoreError

    // 2. Atualizar status na lixeira
    const { error: updateError } = await params.supabaseAdmin
      .from('trash_bin')
      .update({
        status: 'RESTORED',
        resolved_by_id: params.performedBy.id,
        resolved_by_name: params.performedBy.name,
        resolved_at: new Date().toISOString(),
        resolution_note: params.note || null,
      })
      .eq('id', params.trashItemId)

    if (updateError) throw updateError

    // 3. Registrar auditoria
    await logAudit({
      supabase: params.supabaseAdmin,
      action: 'RESTORE',
      entity: params.tableName,
      entityId: params.recordId,
      performedBy: params.performedBy,
    })

    return { success: true }
  } catch (error) {
    console.error('Erro ao restaurar da lixeira:', error)
    return { success: false, error }
  }
}

export async function cleanFuncionarioDependencies(supabaseAdmin: SupabaseClient, fid: string) {
  // 1. Desvincular referências onde o funcionário é FK opcional (UPDATE to NULL)
  await Promise.all([
    supabaseAdmin.from('escolas').update({ diretor_id: null }).eq('diretor_id', fid),
    supabaseAdmin.from('materias').update({ professor_id: null }).eq('professor_id', fid),
    supabaseAdmin.from('veiculos').update({ motorista_id: null }).eq('motorista_id', fid),
    supabaseAdmin.from('rotas_transporte').update({ motorista_id: null }).eq('motorista_id', fid),
    supabaseAdmin.from('rotas_transporte').update({ motorista_tarde_id: null }).eq('motorista_tarde_id', fid),
    supabaseAdmin.from('transferencias_alunos').update({ solicitante_id: null }).eq('solicitante_id', fid),
    supabaseAdmin.from('transferencias_alunos').update({ respondido_por: null }).eq('respondido_por', fid),
    supabaseAdmin.from('transferencias_funcionarios').update({ solicitante_id: null }).eq('solicitante_id', fid),
    supabaseAdmin.from('transferencias_funcionarios').update({ respondido_por: null }).eq('respondido_por', fid),
    supabaseAdmin.from('solicitacoes_edicao_aluno').update({ solicitante_id: null }).eq('solicitante_id', fid),
    supabaseAdmin.from('solicitacoes_edicao_aluno').update({ aprovado_por: null }).eq('aprovado_por', fid),
    supabaseAdmin.from('ocorrencias').update({ registrado_por: null }).eq('registrado_por', fid),
    supabaseAdmin.from('comunicados').update({ criado_por: null }).eq('criado_por', fid),
    supabaseAdmin.from('alunos_anexos').update({ arquivado_por: null }).eq('arquivado_por', fid),
    supabaseAdmin.from('arquivados').update({ arquivado_por: null }).eq('arquivado_por', fid),
    supabaseAdmin.from('arquivados').update({ revertido_por: null }).eq('revertido_por', fid),
    supabaseAdmin.from('arquivados').update({ excluido_por: null }).eq('excluido_por', fid),
    supabaseAdmin.from('atividades_secretaria').update({ updated_by: null }).eq('updated_by', fid),
    supabaseAdmin.from('atividades_secretaria_historico').update({ alterado_por: null }).eq('alterado_por', fid),
    supabaseAdmin.from('agenda_aulas').update({ professor_id: null }).eq('professor_id', fid),
    supabaseAdmin.from('notifications').update({ processado_por: null }).eq('processado_por', fid),
    supabaseAdmin.from('desligamentos_programados').update({ programado_por: null }).eq('programado_por', fid),
    supabaseAdmin.from('adicionais_salario').update({ criado_por: null }).eq('criado_por', fid),
    supabaseAdmin.from('abastecimentos_veiculos').update({ registrado_por: null }).eq('registrado_por', fid),
    supabaseAdmin.from('manutencoes_veiculos').update({ registrado_por: null }).eq('registrado_por', fid),
    supabaseAdmin.from('trash_bin').update({ deleted_by_id: null }).eq('deleted_by_id', fid),
  ])

  // 2. Limpar tabelas dependentes vinculadas por funcionario_id
  await Promise.all([
    supabaseAdmin.from('vinculos_funcionarios').delete().eq('funcionario_id', fid),
    supabaseAdmin.from('acessos_usuarios').delete().eq('funcionario_id', fid),
    supabaseAdmin.from('desligamentos_programados').delete().eq('funcionario_id', fid),
    supabaseAdmin.from('solicitacoes_rh').delete().eq('funcionario_id', fid),
    supabaseAdmin.from('movimentacoes_funcionarios').delete().eq('funcionario_id', fid),
    supabaseAdmin.from('adicionais_salario').delete().eq('funcionario_id', fid),
    supabaseAdmin.from('escalas_servico').delete().eq('funcionario_id', fid),
    supabaseAdmin.from('atestados').delete().eq('funcionario_id', fid),
    supabaseAdmin.from('vinculos_turmas').delete().eq('funcionario_id', fid),
    supabaseAdmin.from('pontos_ronda').delete().eq('funcionario_id', fid),
    supabaseAdmin.from('rotas_ronda').delete().eq('funcionario_id', fid),
    supabaseAdmin.from('registros_ronda').delete().eq('funcionario_id', fid),
    supabaseAdmin.from('dispositivos').delete().eq('funcionario_id', fid),
    supabaseAdmin.from('transferencias_funcionarios').delete().eq('funcionario_id', fid),
    supabaseAdmin.from('performance_metrics').delete().eq('funcionario_id', fid),
  ])
}

export async function purgeFromTrash(params: {
  supabaseAdmin: SupabaseClient
  trashItemId: string
  tableName: string
  recordId: string
  performedBy: { id: string; name: string; email: string; cargo?: string }
  note?: string
}) {
  try {
    if (params.tableName === 'funcionarios') {
      await cleanFuncionarioDependencies(params.supabaseAdmin, params.recordId)
    }

    // 1. Excluir definitivamente da tabela original
    const { error: purgeError } = await params.supabaseAdmin
      .from(params.tableName)
      .delete()
      .eq('id', params.recordId)

    if (purgeError) throw purgeError

    // 2. Atualizar status na lixeira
    const { error: updateError } = await params.supabaseAdmin
      .from('trash_bin')
      .update({
        status: 'PURGED',
        resolved_by_id: params.performedBy.id,
        resolved_by_name: params.performedBy.name,
        resolved_at: new Date().toISOString(),
        resolution_note: params.note || null,
      })
      .eq('id', params.trashItemId)

    if (updateError) throw updateError

    // 3. Registrar auditoria
    await logAudit({
      supabase: params.supabaseAdmin,
      action: 'PURGE',
      entity: params.tableName,
      entityId: params.recordId,
      performedBy: params.performedBy,
    })

    return { success: true }
  } catch (error) {
    console.error('Erro ao expurgar da lixeira:', error)
    return { success: false, error }
  }
}

export async function purgeFuncionarioDesligado(params: {
  supabaseAdmin: SupabaseClient
  funcionarioId: string
  performedBy: { id: string | null; name: string; email: string; cargo?: string }
  note?: string
}) {
  try {
    const fid = params.funcionarioId
    const { data: func } = await params.supabaseAdmin
      .from('funcionarios')
      .select('*')
      .eq('id', fid)
      .maybeSingle()

    if (!func) {
      return { success: false, error: 'Funcionário não encontrado' }
    }

    // 1. Limpar e desvincular dependências
    await cleanFuncionarioDependencies(params.supabaseAdmin, fid)

    // 2. Excluir o registro de funcionarios
    const { error: purgeError } = await params.supabaseAdmin
      .from('funcionarios')
      .delete()
      .eq('id', fid)

    if (purgeError) throw purgeError

    // 3. Se possuir auth_user_id, tentar remover do auth
    if (func.auth_user_id) {
      try {
        await params.supabaseAdmin.auth.admin.deleteUser(func.auth_user_id)
      } catch (authErr) {
        console.warn('Aviso: Não foi possível excluir usuário do Auth Supabase:', authErr)
      }
    }

    // 4. Registrar auditoria
    await logAudit({
      supabase: params.supabaseAdmin,
      action: 'PURGE',
      entity: 'funcionarios (EXPURGO DESLIGADO)',
      entityId: fid,
      oldData: func,
      performedBy: params.performedBy,
    })

    return { success: true }
  } catch (error: any) {
    console.error('Erro ao expurgar funcionário desligado:', error)
    return { success: false, error: error.message || error }
  }
}


