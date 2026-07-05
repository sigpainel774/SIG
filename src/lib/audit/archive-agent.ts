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
    // 1. Gravar snapshot completo na tabela arquivados
    const { error: archiveError } = await params.supabase
      .from('arquivados')
      .insert({
        tipo: 'ALUNO',
        referencia_id: params.aluno.id,
        tabela_origem: 'alunos',
        motivo: params.motivo,
        escola_origem_id: params.escolaOrigemId || params.aluno.escola_id || null,
        arquivado_por: params.arquivadoPor.id,
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
    // 1. Obter registro arquivado
    const { data: arquivado, error: fetchError } = await params.supabaseAdmin
      .from('arquivados')
      .select('*')
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
        revertido_por: params.revertidoPor.id
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
    const { data: arquivado, error: fetchError } = await params.supabaseAdmin
      .from('arquivados')
      .select('*')
      .eq('id', params.arquivadoId)
      .single()

    if (fetchError || !arquivado) throw fetchError || new Error('Registro não encontrado')

    // 1. Excluir definitivamente da tabela original
    const { error: purgeError } = await params.supabaseAdmin
      .from(arquivado.tabela_origem)
      .delete()
      .eq('id', arquivado.referencia_id)

    if (purgeError) throw purgeError

    // 2. Atualizar status na tabela arquivados
    const { error: updateError } = await params.supabaseAdmin
      .from('arquivados')
      .update({
        status: 'EXCLUIDO'
      })
      .eq('id', params.arquivadoId)

    if (updateError) throw updateError

    // 3. Log
    await logAudit({
      supabase: params.supabaseAdmin,
      action: 'PURGE',
      entity: `${arquivado.tabela_origem} (EXPURGO DE ARQUIVADO)`,
      entityId: arquivado.referencia_id,
      oldData: arquivado.payload_completo as object,
      performedBy: params.excluidoPor,
      tenantId: arquivado.escola_origem_id || undefined
    })

    return { success: true }
  } catch (error: any) {
    console.error('Erro ao excluir arquivado definitivamente:', error)
    return { success: false, error }
  }
}
