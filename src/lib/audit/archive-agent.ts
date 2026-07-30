import { SupabaseClient } from '@supabase/supabase-js'
import { logAudit } from './audit-agent'

export async function arquivarAluno(params: {
  supabase: SupabaseClient
  aluno: any
  motivo: string
  escolaOrigemId?: string
  arquivadoPor: { id: string; name: string; email: string }
  arquivosAnexos?: object[]
}) {
  try {
    const performedById = params.arquivadoPor.id && params.arquivadoPor.id !== '' ? params.arquivadoPor.id : null

    // 1. Gravar snapshot completo na tabela arquivados
    const { error: archiveError } = await params.supabase
      .from('arquivados')
      .insert({
        tipo: 'ALUNO',
        referencia_id: params.aluno.id,
        tabela_origem: 'alunos',
        motivo: params.motivo,
        escola_origem_id: params.escolaOrigemId || params.aluno.escola_id || null,
        arquivado_por: performedById,
        payload_completo: params.aluno,
        arquivos_anexos: params.arquivosAnexos || [],
        status: 'ARQUIVADO'
      })

    if (archiveError) throw archiveError

    // 2. Soft delete na tabela original
    const { error: deleteError } = await params.supabase
      .from('alunos')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', params.aluno.id)

    if (deleteError) throw deleteError

    // 3. Registrar na trilha de auditoria
    await logAudit({
      supabase: params.supabase,
      action: 'DELETE',
      entity: 'alunos (ARQUIVAMENTO)',
      entityId: params.aluno.id,
      oldData: params.aluno,
      performedBy: params.arquivadoPor,
      tenantId: params.escolaOrigemId
    })

    return { success: true }
  } catch (error: any) {
    console.error('Erro ao arquivar aluno:', error)
    return { success: false, error }
  }
}

export async function reverterArquivado(params: {
  supabaseAdmin: SupabaseClient // Must use admin client to bypass RLS/views if needed
  arquivadoId: string
  revertidoPor: { id: string; name: string; email: string }
}) {
  try {
    const performedById = params.revertidoPor.id && params.revertidoPor.id !== '' ? params.revertidoPor.id : null

    // 1. Obter registro arquivado
    const { data: arquivado, error: fetchError } = await params.supabaseAdmin
      .from('arquivados')
      .select('id, tipo, tabela_origem, motivo, referencia_id, arquivado_por, escola_origem_id, payload_completo, arquivos_anexos, status, revertido_em, revertido_por, excluido_por, excluido_em, created_at')
      .eq('id', params.arquivadoId)
      .single()

    if (fetchError || !arquivado) throw fetchError || new Error('Registro arquivado não encontrado')

    // 2. Restaurar registro na tabela original (limpar deleted_at)
    const { error: restoreError } = await params.supabaseAdmin
      .from(arquivado.tabela_origem)
      .update({ deleted_at: null })
      .eq('id', arquivado.referencia_id)

    if (restoreError) throw restoreError

    // 3. Atualizar status na tabela arquivados
    const { error: updateError } = await params.supabaseAdmin
      .from('arquivados')
      .update({
        status: 'REVERTIDO',
        revertido_em: new Date().toISOString(),
        revertido_por: performedById
      })
      .eq('id', params.arquivadoId)

    if (updateError) throw updateError

    // 4. Log
    await logAudit({
      supabase: params.supabaseAdmin,
      action: 'RESTORE',
      entity: `${arquivado.tabela_origem} (REVERSÃO ARQUIVO)`,
      entityId: arquivado.referencia_id,
      newData: arquivado.payload_completo as object,
      performedBy: params.revertidoPor,
      tenantId: arquivado.escola_origem_id || undefined
    })

    return { success: true }
  } catch (error: any) {
    console.error('Erro ao reverter arquivado:', error)
    return { success: false, error }
  }
}

export async function excluirDefinitivamenteArquivado(params: {
  supabaseAdmin: SupabaseClient
  arquivadoId: string
  excluidoPor: { id: string; name: string; email: string }
}) {
  try {
    const performedById = params.excluidoPor.id && params.excluidoPor.id !== '' ? params.excluidoPor.id : null

    const { data: arquivado, error: fetchError } = await params.supabaseAdmin
      .from('arquivados')
      .select('id, tipo, tabela_origem, motivo, referencia_id, arquivado_por, escola_origem_id, payload_completo, arquivos_anexos, status, revertido_em, revertido_por, excluido_por, excluido_em, created_at')
      .eq('id', params.arquivadoId)
      .single()

    if (fetchError || !arquivado) throw fetchError || new Error('Registro não encontrado')

    const refId = arquivado.referencia_id

    // Se for um aluno, desvincular/limpar tabelas dependentes
    if (arquivado.tabela_origem === 'alunos' || arquivado.tipo?.startsWith('ALUNO')) {
      await Promise.all([
        params.supabaseAdmin.from('alunos_anexos').delete().eq('aluno_id', refId),
        params.supabaseAdmin.from('notas').delete().eq('aluno_id', refId),
        params.supabaseAdmin.from('frequencias').delete().eq('aluno_id', refId),
        params.supabaseAdmin.from('ocorrencias').delete().eq('aluno_id', refId),
        params.supabaseAdmin.from('vinculos_turmas').delete().eq('funcionario_id', refId), // ou aluno_id se houver
        params.supabaseAdmin.from('recuperacoes_finais').delete().eq('aluno_id', refId),
        params.supabaseAdmin.from('assinatura').delete().eq('aluno_id', refId),
        params.supabaseAdmin.from('alunos_transporte').delete().eq('aluno_id', refId),
        params.supabaseAdmin.from('transferencias_alunos').delete().eq('aluno_id', refId),
        params.supabaseAdmin.from('solicitacoes_edicao_aluno').delete().eq('aluno_id', refId),
      ])
    }

    // 1. Excluir definitivamente da tabela original
    const { error: purgeError } = await params.supabaseAdmin
      .from(arquivado.tabela_origem)
      .delete()
      .eq('id', refId)

    if (purgeError) console.warn('Aviso: Registro original pode ter sido removido anteriormente:', purgeError)

    // 2. Atualizar status na tabela arquivados
    const { error: updateError } = await params.supabaseAdmin
      .from('arquivados')
      .update({
        status: 'EXCLUIDO',
        excluido_em: new Date().toISOString(),
        excluido_por: performedById
      })
      .eq('id', params.arquivadoId)

    if (updateError) throw updateError

    // 3. Log
    await logAudit({
      supabase: params.supabaseAdmin,
      action: 'PURGE',
      entity: `${arquivado.tabela_origem} (EXPURGO DE ARQUIVADO)`,
      entityId: refId,
      oldData: arquivado.payload_completo as object,
      performedBy: params.excluidoPor,
      tenantId: arquivado.escola_origem_id || undefined
    })

    return { success: true }
  } catch (error: any) {
    console.error('Erro ao excluir arquivado definitivamente:', error)
    return { success: false, error: error.message || error }
  }
}

export async function purgeAlunoArquivadoDirect(params: {
  supabaseAdmin: SupabaseClient
  alunoId: string
  performedBy: { id: string; name: string; email: string }
}) {
  try {
    const performedById = params.performedBy.id && params.performedBy.id !== '' ? params.performedBy.id : null
    const aid = params.alunoId

    // Buscar snapshot do aluno
    const { data: aluno } = await params.supabaseAdmin
      .from('alunos')
      .select('*')
      .eq('id', aid)
      .maybeSingle()

    // Limpar tabelas dependentes
    await Promise.all([
      params.supabaseAdmin.from('alunos_anexos').delete().eq('aluno_id', aid),
      params.supabaseAdmin.from('notas').delete().eq('aluno_id', aid),
      params.supabaseAdmin.from('frequencias').delete().eq('aluno_id', aid),
      params.supabaseAdmin.from('ocorrencias').delete().eq('aluno_id', aid),
      params.supabaseAdmin.from('recuperacoes_finais').delete().eq('aluno_id', aid),
      params.supabaseAdmin.from('assinatura').delete().eq('aluno_id', aid),
      params.supabaseAdmin.from('alunos_transporte').delete().eq('aluno_id', aid),
      params.supabaseAdmin.from('transferencias_alunos').delete().eq('aluno_id', aid),
      params.supabaseAdmin.from('solicitacoes_edicao_aluno').delete().eq('aluno_id', aid),
    ])

    // Deletar da tabela alunos
    await params.supabaseAdmin.from('alunos').delete().eq('id', aid)

    // Atualizar registros correspondentes em arquivados se existirem
    await params.supabaseAdmin
      .from('arquivados')
      .update({
        status: 'EXCLUIDO',
        excluido_em: new Date().toISOString(),
        excluido_por: performedById
      })
      .eq('referencia_id', aid)

    // Log auditoria
    await logAudit({
      supabase: params.supabaseAdmin,
      action: 'PURGE',
      entity: 'alunos (EXPURGO ARQUIVADO / SOFT DELETED)',
      entityId: aid,
      oldData: aluno || {},
      performedBy: params.performedBy,
    })

    return { success: true }
  } catch (error: any) {
    console.error('Erro ao expurgar aluno diretamente:', error)
    return { success: false, error: error.message || error }
  }
}


export async function arquivarAnexo(params: {
  supabase: SupabaseClient
  anexo: any
  motivo: string
  escolaId?: string
  arquivadoPor: { id: string; name: string; email: string }
}) {
  try {
    const performedById = params.arquivadoPor.id && params.arquivadoPor.id !== '' ? params.arquivadoPor.id : null

    // 1. Gravar snapshot na tabela arquivados
    const { error: archiveError } = await params.supabase
      .from('arquivados')
      .insert({
        tipo: 'ANEXO_ALUNO',
        referencia_id: params.anexo.id,
        tabela_origem: 'alunos_anexos',
        motivo: params.motivo,
        escola_origem_id: params.escolaId || null,
        arquivado_por: performedById,
        payload_completo: params.anexo,
        status: 'ARQUIVADO'
      })

    if (archiveError) throw archiveError

    // 2. Soft delete na tabela original
    const { error: deleteError } = await params.supabase
      .from('alunos_anexos')
      .update({
        deleted_at: new Date().toISOString(),
        arquivado_por: performedById,
        motivo_arquivamento: params.motivo
      })
      .eq('id', params.anexo.id)

    if (deleteError) throw deleteError

    // 3. Registrar na trilha de auditoria
    await logAudit({
      supabase: params.supabase,
      action: 'DELETE',
      entity: 'alunos_anexos (ARQUIVAMENTO)',
      entityId: params.anexo.id,
      oldData: params.anexo,
      performedBy: params.arquivadoPor,
      tenantId: params.escolaId
    })

    return { success: true }
  } catch (error: any) {
    console.error('Erro ao arquivar anexo:', error)
    return { success: false, error }
  }
}
