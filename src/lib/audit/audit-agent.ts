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

export async function purgeFromTrash(params: {
  supabaseAdmin: SupabaseClient
  trashItemId: string
  tableName: string
  recordId: string
  performedBy: { id: string; name: string; email: string; cargo?: string }
  note?: string
}) {
  try {
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
