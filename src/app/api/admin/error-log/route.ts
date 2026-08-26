import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      message,
      context,
      severity = 'error',
      error_code = null,
      user_id = null,
      metadata = {}
    } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Mensagem de erro obrigatória.' }, { status: 400 })
    }

    const safeUserId = typeof user_id === 'string' && UUID_REGEX.test(user_id) ? user_id : null

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.headers.get('x-real-ip') || 
               '127.0.0.1'

    const enrichedMetadata = {
      ...metadata,
      client_ip: ip,
      server_received_at: new Date().toISOString()
    }

    const { error: insertError } = await (supabaseAdmin.from as any)('system_logs').insert({
      message: message.slice(0, 1000),
      context: (context || 'app').slice(0, 255),
      severity: ['info', 'warning', 'error', 'critical'].includes(severity) ? severity : 'error',
      error_code: error_code ? String(error_code).slice(0, 50) : null,
      user_id: safeUserId,
      metadata: enrichedMetadata,
      resolved: false
    })

    if (insertError) {
      console.error('Erro ao persistir system_log:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Exceção ao processar error-log:', err)
    return NextResponse.json({ error: err?.message || 'Erro interno.' }, { status: 500 })
  }
}
