import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

function sanitizeUuid(id: any): string | null {
  if (!id || typeof id !== 'string') return null
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id.trim()) ? id.trim() : null
}

export async function POST(request: NextRequest) {
  try {
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    let ip = forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp || (request as any).ip || '127.0.0.1')

    const vercelCity = request.headers.get('x-vercel-ip-city')
      ? decodeURIComponent(request.headers.get('x-vercel-ip-city')!)
      : null
    const vercelRegion = request.headers.get('x-vercel-ip-country-region')
      ? decodeURIComponent(request.headers.get('x-vercel-ip-country-region')!)
      : null
    const vercelCountry = request.headers.get('x-vercel-ip-country')
      ? decodeURIComponent(request.headers.get('x-vercel-ip-country')!)
      : 'BR'
    const vercelLat = request.headers.get('x-vercel-ip-latitude')
    const vercelLng = request.headers.get('x-vercel-ip-longitude')

    let bodyData: any = null
    try {
      const text = await request.text()
      if (text) {
        bodyData = JSON.parse(text)
      }
    } catch {
      // Ignorar exceções de parseamento de payload mal formatado
    }

    if (!bodyData) {
      return NextResponse.json({ success: true, count: 0 })
    }

    const eventsArray: any[] = Array.isArray(bodyData)
      ? bodyData
      : Array.isArray(bodyData.events)
      ? bodyData.events
      : [bodyData]

    if (eventsArray.length === 0) {
      return NextResponse.json({ success: true, count: 0 })
    }

    const batchToInsert = eventsArray.map((evt) => ({
      session_id: typeof evt.session_id === 'string' ? evt.session_id : null,
      user_id: sanitizeUuid(evt.user_id),
      funcionario_id: sanitizeUuid(evt.funcionario_id),
      pathname: typeof evt.pathname === 'string' ? evt.pathname : '/',
      page_title: typeof evt.page_title === 'string' ? evt.page_title : null,
      opened_at: evt.opened_at || new Date().toISOString(),
      closed_at: evt.closed_at || null,
      duration_seconds: typeof evt.duration_seconds === 'number' ? Math.max(0, evt.duration_seconds) : 0,
      ip_address: ip,
      user_agent: typeof evt.user_agent === 'string' ? evt.user_agent : request.headers.get('user-agent'),
      geo_location: vercelCity || vercelRegion ? { city: vercelCity, region: vercelRegion, country: vercelCountry } : {},
    }))

    const { error } = await (supabaseAdmin as any).from('user_navigation_trail').insert(batchToInsert)

    if (error) {
      console.warn('[API Trilha] Erro ao inserir lote de navegação:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Se temos IP válido e informações da Vercel, salvar no cache de geolocalização
    if (ip && ip !== '127.0.0.1' && (vercelCity || vercelRegion)) {
      ;(supabaseAdmin as any)
        .from('ip_geolocation_cache')
        .upsert(
          {
            ip_address: ip,
            city: vercelCity || 'Sapeaçu',
            region: vercelRegion || 'Bahia',
            country: vercelCountry || 'Brasil',
            latitude: vercelLat ? parseFloat(vercelLat) : -12.723,
            longitude: vercelLng ? parseFloat(vercelLng) : -39.206,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'ip_address' }
        )
        .then()
    }

    return NextResponse.json({ success: true, count: batchToInsert.length })
  } catch (err: any) {
    console.error('[API Trilha] Exceção inesperada:', err)
    return NextResponse.json({ error: err?.message || 'Erro interno' }, { status: 500 })
  }
}
