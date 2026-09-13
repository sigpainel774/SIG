import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createClient } from '@/lib/supabaseServer'

function sanitizeUuid(id: any): string | null {
  if (!id || typeof id !== 'string') return null
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id.trim()) ? id.trim() : null
}

export async function POST(request: NextRequest) {
  try {
    let bodyData: any = null
    try {
      const text = await request.text()
      if (text) {
        bodyData = JSON.parse(text)
      }
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }

    if (!bodyData) {
      return NextResponse.json({ success: true })
    }

    // Identificar usuário autenticado
    let userId: string | null = null
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId = user.id
      }
    } catch {}

    if (!userId && bodyData.user_id) {
      userId = sanitizeUuid(bodyData.user_id)
    }

    if (!userId) {
      // Se não identificado, ignora silenciosamente para não onerar o cliente
      return NextResponse.json({ success: true, anonymous: true })
    }

    // Se for sinal de desconexão (Logout / Aba Fechada)
    if (bodyData.is_offline) {
      await (supabaseAdmin as any)
        .from('user_presence')
        .delete()
        .eq('user_id', userId)

      return NextResponse.json({ success: true, status: 'offline' })
    }

    const payload = {
      user_id: userId,
      funcionario_id: sanitizeUuid(bodyData.funcionario_id),
      funcionario_nome: typeof bodyData.funcionario_nome === 'string' ? bodyData.funcionario_nome.slice(0, 150) : 'Servidor',
      funcionario_cargo: typeof bodyData.funcionario_cargo === 'string' ? bodyData.funcionario_cargo.slice(0, 100) : 'Servidor',
      funcionario_email: typeof bodyData.funcionario_email === 'string' ? bodyData.funcionario_email.slice(0, 150) : '',
      foto_url: typeof bodyData.foto_url === 'string' ? bodyData.foto_url.slice(0, 500) : null,
      escola_id: sanitizeUuid(bodyData.escola_id),
      escola_nome: typeof bodyData.escola_nome === 'string' ? bodyData.escola_nome.slice(0, 150) : 'Rede Municipal',
      current_pathname: typeof bodyData.current_pathname === 'string' ? bodyData.current_pathname.slice(0, 255) : '/',
      last_action: typeof bodyData.last_action === 'string' ? bodyData.last_action.slice(0, 255) : 'Navegando no SIG',
      active_modal: typeof bodyData.active_modal === 'string' ? bodyData.active_modal.slice(0, 150) : null,
      is_actively_using: bodyData.is_actively_using ?? true,
      is_tab_focused: bodyData.is_tab_focused ?? true,
      rtt: typeof bodyData.rtt === 'number' ? Math.round(bodyData.rtt) : 45,
      downlink: typeof bodyData.downlink === 'number' ? Number(bodyData.downlink.toFixed(2)) : 10,
      effective_type: typeof bodyData.effective_type === 'string' ? bodyData.effective_type.slice(0, 20) : '4g',
      last_seen_at: new Date().toISOString()
    }

    // Upsert idempotente na tabela leve user_presence
    const { error } = await (supabaseAdmin as any)
      .from('user_presence')
      .upsert(payload, { onConflict: 'user_id' })

    if (error) {
      // Fallback de segurança se foreign key de funcionario/escola falhar
      const safePayload = { ...payload, funcionario_id: null, escola_id: null }
      await (supabaseAdmin as any).from('user_presence').upsert(safePayload, { onConflict: 'user_id' })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: true, fallback: true })
  }
}
