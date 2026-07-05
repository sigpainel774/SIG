'use server'

import { restoreFromTrash, purgeFromTrash } from '@/lib/audit/audit-agent'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { revalidatePath } from 'next/cache'

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
