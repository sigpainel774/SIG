import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { blockIpInMemory } from '@/lib/security/ipBlockStore'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      tipo_ataque,
      severidade,
      status,
      ip_origem,
      pais,
      cidade,
      user_agent,
      rota_alvo,
      metodo_http,
      payload_detectado,
      headers_snapshot,
      user_id,
      email_tentativa,
      detalhes_analise,
    } = body

    // 1. Validação de autenticação interna (apenas proxy/middleware autorizado pode registrar ameaças)
    const expectedSecret = process.env.INTERNAL_WAF_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'waf-internal'
    const incomingSecret = request.headers.get('x-waf-internal-secret')

    if (!incomingSecret || incomingSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Acesso não autorizado: Endpoint de telemetria interna protegido.' }, { status: 401 })
    }

    if (!tipo_ataque || !ip_origem || !rota_alvo) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
    }

    // Persiste no Supabase com supabaseAdmin (Service Role) para blindagem
    const { error: insertError } = await (supabaseAdmin as any).from('security_threat_logs').insert({
      tipo_ataque,
      severidade: severidade ?? 'MEDIA',
      status: status ?? 'BLOQUEADO',
      ip_origem,
      pais: pais ?? null,
      cidade: cidade ?? null,
      user_agent: user_agent ?? null,
      rota_alvo,
      metodo_http: metodo_http ?? 'GET',
      payload_detectado: payload_detectado ?? null,
      headers_snapshot: headers_snapshot ?? {},
      user_id: user_id ?? null,
      email_tentativa: email_tentativa ?? null,
      detalhes_analise: detalhes_analise ?? {},
    })

    if (insertError) {
      console.error('Erro ao inserir security_threat_logs:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Se for ataque de severidade CRITICA ou ALTA, persiste também bloqueio preventivo na tabela de regras
    if (severidade === 'CRITICA') {
      blockIpInMemory(ip_origem, `Auto-bloqueio WAF: ${tipo_ataque}`, 120)
      const expiresAt = new Date(Date.now() + 120 * 60 * 1000).toISOString()

      await (supabaseAdmin as any).from('security_ip_rules').upsert(
        {
          ip_address: ip_origem,
          tipo_regra: 'BLOCK',
          motivo: `Auto-bloqueio por ataque crítico: ${tipo_ataque}`,
          bloqueado_ate: expiresAt,
          criado_por_id: null,
          criado_por_nome: 'Sistema WAF Automático',
          ativo: true,
        },
        { onConflict: 'ip_address' }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Erro inesperado em log-threat:', err)
    return NextResponse.json({ error: err.message ?? 'Erro interno' }, { status: 500 })
  }
}
