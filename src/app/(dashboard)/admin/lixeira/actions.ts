'use server'

import { restoreFromTrash, purgeFromTrash, purgeFuncionarioDesligado } from '@/lib/audit/audit-agent'
import { excluirDefinitivamenteArquivado, purgeAlunoArquivadoDirect } from '@/lib/audit/archive-agent'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { revalidatePath } from 'next/cache'

const isUuid = (val: string | null | undefined) =>
  typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)

export async function restoreAction(trashItemId: string, tableName: string, recordId: string, performedBy: any, note?: string) {
  const result = await restoreFromTrash({
    supabaseAdmin,
    trashItemId,
    tableName,
    recordId,
    performedBy,
    note
  })
  if (result.success) {
    revalidatePath('/admin/lixeira')
    return { success: true }
  }
  return { success: false, error: result.error }
}

export async function purgeAction(trashItemId: string, tableName: string, recordId: string, performedBy: any, note?: string) {
  const result = await purgeFromTrash({
    supabaseAdmin,
    trashItemId,
    tableName,
    recordId,
    performedBy,
    note
  })
  if (result.success) {
    revalidatePath('/admin/lixeira')
    return { success: true }
  }
  return { success: false, error: result.error }
}

export async function purgeFuncionarioDesligadoAction(funcionarioId: string, performedBy: any, note?: string) {
  if (!isUuid(funcionarioId)) {
    return { success: false, error: 'ID do funcionário é um UUID inválido.' }
  }
  const result = await purgeFuncionarioDesligado({
    supabaseAdmin,
    funcionarioId,
    performedBy,
    note
  })
  if (result.success) {
    revalidatePath('/admin/lixeira')
    return { success: true }
  }
  return { success: false, error: result.error }
}

export async function purgeAlunoArquivadoAction(params: { alunoId?: string; arquivadoId?: string; performedBy: any; note?: string }) {
  let result: { success: boolean; error?: any }

  if (params.arquivadoId && isUuid(params.arquivadoId)) {
    result = await excluirDefinitivamenteArquivado({
      supabaseAdmin,
      arquivadoId: params.arquivadoId,
      excluidoPor: params.performedBy
    })
  } else if (params.alunoId && isUuid(params.alunoId)) {
    result = await purgeAlunoArquivadoDirect({
      supabaseAdmin,
      alunoId: params.alunoId,
      performedBy: params.performedBy
    })
  } else {
    return { success: false, error: 'Identificador do aluno ou registro arquivado não informado/inválido.' }
  }

  if (result.success) {
    revalidatePath('/admin/lixeira')
    return { success: true }
  }
  return { success: false, error: result.error }
}

