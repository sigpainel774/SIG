import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const SENSITIVE_KEYS = new Set([
  'cpf', 'rg', 'senha', 'password', 'token', 
  'codigo_temp_resp', 'codigo_temp_func', 'cartao_sus', 
  'nis', 'inep', 'hash_sha256', 'token_verificacao'
])

function maskPii(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(maskPii)
  
  const result: Record<string, any> = {}
  for (const [key, val] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase()) && val !== null && val !== undefined) {
      result[key] = '*** MASCARADO ***'
    } else if (typeof val === 'object' && val !== null) {
      result[key] = maskPii(val)
    } else {
      result[key] = val
    }
  }
  return result
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar autorização de superadmin
    const { data: func, error: funcError } = await supabaseAdmin
      .from('funcionarios')
      .select('is_superadmin')
      .eq('auth_user_id', user.id)
      .single()

    if (funcError || !func || !func.is_superadmin) {
      return NextResponse.json({ error: 'Acesso negado. Apenas ROOT/Superadmin pode visualizar o detalhe da auditoria.' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const logId = searchParams.get('id')

    if (!logId) {
      return NextResponse.json({ error: 'ID do log é obrigatório' }, { status: 400 })
    }

    const { data: log, error: logError } = await supabaseAdmin
      .from('audit_logs')
      .select('id, action, entity, entity_id, user_name, user_email, user_cargo, old_data, new_data, created_at')
      .eq('id', logId)
      .single()

    if (logError || !log) {
      return NextResponse.json({ error: 'Log de auditoria não encontrado' }, { status: 404 })
    }

    // Mascarar PII de forma recursiva antes de devolver a resposta
    const maskedOldData = maskPii(log.old_data)
    const maskedNewData = maskPii(log.new_data)

    return NextResponse.json({
      log: {
        ...log,
        old_data: maskedOldData,
        new_data: maskedNewData
      }
    })
  } catch (err: any) {
    console.error('Erro ao buscar detalhe do log de auditoria:', err)
    return NextResponse.json({ error: err.message || 'Erro interno no servidor' }, { status: 500 })
  }
}
